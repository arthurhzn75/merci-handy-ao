<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const route = useRoute()
const router = useRouter()

const range = shallowRef<Range>({ start: sub(new Date(), { years: 1 }), end: new Date() })
const cac = ref(Number(route.query.cac) || 15)
const ncac = ref(Number(route.query.ncac) || 25)

// Sync CAC/nCAC to URL
watch([cac, ncac], ([c, n]) => {
  router.replace({ query: { ...route.query, cac: String(c), ncac: String(n) } })
}, { flush: 'post' })

const UBadge = resolveComponent('UBadge')

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString()
}))

const { data } = await useFetch('/api/unit-economics', {
  query: queryParams,
  default: () => ({
    byType: [], avgFrequency: 1, totalCustomers: 0,
    overallSummary: null, frequencyDistribution: [], dataQuality: null
  })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

// Global LTV/CAC computed
const globalLtv = computed(() => {
  const summary = data.value?.overallSummary
  if (!summary) return { ltvMargin: 0, ltvCac: 0, ltvNcac: 0, breakeven: 0, sentence: '' }
  const ltvMargin = Math.round(summary.avgMarginPerOrder * summary.avgFrequency * 100) / 100
  const ltvCac = cac.value > 0 ? Math.round((ltvMargin / cac.value) * 100) / 100 : 0
  const ltvNcac = ncac.value > 0 ? Math.round((ltvMargin / ncac.value) * 100) / 100 : 0
  const breakeven = summary.avgMarginPerOrder > 0 ? Math.ceil(ncac.value / summary.avgMarginPerOrder) : 999
  return { ltvMargin, ltvCac, ltvNcac, breakeven }
})

// Compute LTV and ratios based on editable CAC/nCAC
const enrichedTypes = computed(() => {
  return (data.value?.byType || []).map((t: any) => {
    const ltvEstimate = t.aov * (data.value?.avgFrequency || 1)
    const marginPerOrder = t.avgMarginPerOrder
    const ltvMargin = marginPerOrder * (data.value?.avgFrequency || 1)
    const ltvCacRatio = cac.value > 0 ? Math.round((ltvMargin / cac.value) * 100) / 100 : 0
    const ltvNcacRatio = ncac.value > 0 ? Math.round((ltvMargin / ncac.value) * 100) / 100 : 0
    const monthsToBreakeven = marginPerOrder > 0 ? Math.ceil(ncac.value / marginPerOrder) : 999
    return {
      ...t,
      ltvEstimate: Math.round(ltvEstimate * 100) / 100,
      ltvMargin: Math.round(ltvMargin * 100) / 100,
      ltvCacRatio,
      ltvNcacRatio,
      monthsToBreakeven
    }
  })
})

// Sensitivity analysis
const sensitivityRows = computed(() => {
  const summary = data.value?.overallSummary
  if (!summary) return []
  const avgMargin = summary.avgMarginPerOrder
  const freq = data.value?.avgFrequency || 1
  const ltvMargin = avgMargin * freq
  return [5, 10, 15, 20, 25, 30, 35, 40].map(cacVal => ({
    cac: cacVal,
    ltvCac: cacVal > 0 ? Math.round((ltvMargin / cacVal) * 100) / 100 : 0,
    breakeven: avgMargin > 0 ? Math.ceil(cacVal / avgMargin) : 999
  }))
})

const columns: TableColumn<any>[] = [
  { accessorKey: 'type', header: 'Categorie' },
  { accessorKey: 'orders', header: () => h('div', { class: 'text-right' }, 'Commandes'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('orders')) },
  { accessorKey: 'aov', header: () => h('div', { class: 'text-right' }, 'AOV'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('aov') as number)) },
  { accessorKey: 'marginRate', header: () => h('div', { class: 'text-right' }, 'Marge %'), cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('marginRate')}%`) },
  { accessorKey: 'ltvMargin', header: () => h('div', { class: 'text-right' }, 'LTV Marge'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('ltvMargin') as number)) },
  {
    accessorKey: 'ltvCacRatio', header: () => h('div', { class: 'text-right' }, 'LTV/CAC'),
    cell: ({ row }) => {
      const ratio = row.getValue('ltvCacRatio') as number
      const color = ratio >= 3 ? 'success' : ratio >= 1 ? 'warning' : 'error'
      return h('div', { class: 'text-right' }, [h(UBadge, { color, variant: 'subtle', class: 'text-xs font-bold' }, () => `${ratio}x`)])
    }
  },
  {
    accessorKey: 'ltvNcacRatio', header: () => h('div', { class: 'text-right' }, 'LTV/nCAC'),
    cell: ({ row }) => {
      const ratio = row.getValue('ltvNcacRatio') as number
      const color = ratio >= 3 ? 'success' : ratio >= 1 ? 'warning' : 'error'
      return h('div', { class: 'text-right' }, [h(UBadge, { color, variant: 'subtle', class: 'text-xs font-bold' }, () => `${ratio}x`)])
    }
  },
  {
    accessorKey: 'monthsToBreakeven', header: () => h('div', { class: 'text-right' }, 'Breakeven'),
    cell: ({ row }) => {
      const months = row.getValue('monthsToBreakeven') as number
      return h('div', { class: 'text-right' }, months < 999 ? `${months} cmd` : '-')
    }
  },
  { accessorKey: 'newCustomerRate', header: () => h('div', { class: 'text-right' }, '% Nouveaux'), cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('newCustomerRate')}%`) }
]

const tableUi = {
  base: 'table-fixed border-separate border-spacing-0',
  thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
  tbody: '[&>tr]:last:[&>td]:border-b-0',
  th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs',
  td: 'border-b border-default text-sm'
}

const ratioColor = (r: number) => r >= 3 ? 'success' : r >= 1 ? 'warning' : 'error'
</script>

<template>
  <UDashboardPanel id="unit-economics">
    <template #header>
      <UDashboardNavbar title="Unit Economics">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <DataQualityBanner
        v-if="data?.dataQuality"
        :cogs-gap-rate="data.dataQuality.cogsGapRate"
        :validation-rate="data.dataQuality.validationRate"
        :margin-reliable="data.dataQuality.marginReliable"
      />

      <!-- Global Summary -->
      <UCard v-if="data?.overallSummary" class="mh-rainbow-border">
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Resume global</p>
        </template>
        <div class="grid sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <div>
            <p class="text-xs text-muted uppercase">LTV Marge</p>
            <p class="text-xl font-semibold text-highlighted">{{ fmtCurrency(globalLtv.ltvMargin) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted uppercase">LTV/CAC</p>
            <UBadge :color="ratioColor(globalLtv.ltvCac)" variant="subtle" class="text-lg font-bold mt-1">{{ globalLtv.ltvCac }}x</UBadge>
          </div>
          <div>
            <p class="text-xs text-muted uppercase">LTV/nCAC</p>
            <UBadge :color="ratioColor(globalLtv.ltvNcac)" variant="subtle" class="text-lg font-bold mt-1">{{ globalLtv.ltvNcac }}x</UBadge>
          </div>
          <div>
            <p class="text-xs text-muted uppercase">Marge / commande</p>
            <p class="text-xl font-semibold text-highlighted">{{ fmtCurrency(data.overallSummary.avgMarginPerOrder) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted uppercase">Breakeven</p>
            <p class="text-xl font-semibold text-highlighted">{{ globalLtv.breakeven < 999 ? `${globalLtv.breakeven} cmd` : '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-muted uppercase">Frequence</p>
            <p class="text-xl font-semibold text-highlighted">{{ data.overallSummary.avgFrequency }}x</p>
          </div>
        </div>
        <p class="text-sm text-muted">
          A {{ fmtCurrency(cac) }} de CAC blended, chaque client genere
          <span class="font-semibold" :class="globalLtv.ltvCac >= 3 ? 'text-green-600' : globalLtv.ltvCac >= 1 ? 'text-yellow-600' : 'text-red-600'">{{ globalLtv.ltvCac }}x</span>
          son cout d'acquisition.
        </p>
      </UCard>

      <!-- CAC / nCAC inputs -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Parametres d'acquisition</p>
          <p class="text-xs text-muted">Modifiez les valeurs pour recalculer les ratios en temps reel</p>
        </template>
        <div class="grid sm:grid-cols-4 gap-6">
          <div>
            <label class="text-xs text-muted uppercase block mb-1">CAC (blended)</label>
            <UInput v-model.number="cac" type="number" :min="0" :step="0.5">
              <template #trailing>
                <span class="text-xs text-muted">EUR</span>
              </template>
            </UInput>
          </div>
          <div>
            <label class="text-xs text-muted uppercase block mb-1">nCAC (nouveau client)</label>
            <UInput v-model.number="ncac" type="number" :min="0" :step="0.5">
              <template #trailing>
                <span class="text-xs text-muted">EUR</span>
              </template>
            </UInput>
          </div>
          <div>
            <label class="text-xs text-muted uppercase block mb-1">Frequence moyenne</label>
            <p class="text-2xl font-semibold text-highlighted mt-1">{{ data?.avgFrequency || '-' }}x</p>
          </div>
          <div>
            <label class="text-xs text-muted uppercase block mb-1">Clients totaux</label>
            <p class="text-2xl font-semibold text-highlighted mt-1">{{ (data?.totalCustomers || 0).toLocaleString('fr-FR') }}</p>
          </div>
        </div>
      </UCard>

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Frequency distribution -->
        <UCard v-if="data?.frequencyDistribution?.length">
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Distribution des frequences d'achat</p>
          </template>
          <div class="space-y-3">
            <div v-for="bucket in data.frequencyDistribution" :key="bucket.bucket" class="flex items-center gap-3">
              <span class="text-sm w-20 shrink-0">{{ bucket.bucket }} commande{{ bucket.bucket !== '1' ? 's' : '' }}</span>
              <div class="flex-1 h-6 bg-muted/10 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-mh-lilac" :style="{ width: `${bucket.share}%` }" />
              </div>
              <span class="text-sm font-medium w-16 text-right">{{ bucket.customers }}</span>
              <span class="text-xs text-muted w-12 text-right">{{ bucket.share }}%</span>
            </div>
          </div>
        </UCard>

        <!-- Sensitivity analysis -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Analyse de sensibilite CAC</p>
          </template>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-elevated/50">
                  <th class="px-3 py-2 text-left text-xs font-medium text-muted">CAC</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-muted">LTV/CAC</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-muted">Breakeven</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in sensitivityRows" :key="row.cac"
                  class="border-b border-default"
                  :class="row.cac === cac ? 'bg-primary/5 font-semibold' : ''"
                >
                  <td class="px-3 py-2">{{ fmtCurrency(row.cac) }}</td>
                  <td class="px-3 py-2 text-right">
                    <UBadge :color="ratioColor(row.ltvCac)" variant="subtle" class="text-xs font-bold">{{ row.ltvCac }}x</UBadge>
                  </td>
                  <td class="px-3 py-2 text-right">{{ row.breakeven < 999 ? `${row.breakeven} cmd` : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>

      <!-- Synthesis table -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-highlighted">Rentabilite par categorie</p>
            <div class="flex items-center gap-2 text-xs">
              <UBadge color="success" variant="subtle">LTV/CAC &ge; 3x</UBadge>
              <UBadge color="warning" variant="subtle">1-3x</UBadge>
              <UBadge color="error" variant="subtle">&lt; 1x</UBadge>
            </div>
          </div>
        </template>
        <UTable :data="enrichedTypes" :columns="columns" :ui="tableUi" />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
