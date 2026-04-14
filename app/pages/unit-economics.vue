<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({ start: sub(new Date(), { years: 1 }), end: new Date() })
const cac = ref(15)
const ncac = ref(25)

const UBadge = resolveComponent('UBadge')

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString()
}))

const { data } = await useFetch('/api/unit-economics', {
  query: queryParams,
  default: () => ({ byType: [], avgFrequency: 1, totalCustomers: 0 })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

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
      <!-- CAC / nCAC inputs -->
      <UCard class="mh-rainbow-border">
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
        <UTable
          :data="enrichedTypes"
          :columns="columns"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs',
            td: 'border-b border-default text-sm'
          }"
        />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
