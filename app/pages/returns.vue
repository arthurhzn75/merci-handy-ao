<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({ start: sub(new Date(), { days: 30 }), end: new Date() })
const selectedCategory = ref('')
const showAllProducts = ref(false)

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString(),
  category: selectedCategory.value || undefined
}))

const { data } = await useFetch('/api/returns', {
  query: queryParams,
  default: () => ({
    byProduct: [], byType: [], totalReturns: 0, totalLostMargin: 0, globalReturnRate: 0, totalItemsSold: 0,
    dataQuality: null, returnsTrend: [], returnImpact: 0, returnCorrelation: null, availableTypes: []
  })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const UBadge = resolveComponent('UBadge')

const displayedProducts = computed(() => {
  const products = data.value?.byProduct || []
  return showAllProducts.value ? products : products.slice(0, 20)
})

const productColumns: TableColumn<any>[] = [
  { accessorKey: 'product', header: 'Produit' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'sold', header: () => h('div', { class: 'text-right' }, 'Vendus'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('sold')) },
  { accessorKey: 'returned', header: () => h('div', { class: 'text-right' }, 'Retournes'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('returned')) },
  {
    accessorKey: 'returnRate', header: () => h('div', { class: 'text-right' }, 'Taux'),
    cell: ({ row }) => {
      const rate = row.getValue('returnRate') as number
      const color = rate > 10 ? 'error' : rate > 5 ? 'warning' : 'success'
      return h('div', { class: 'text-right' }, [h(UBadge, { color, variant: 'subtle', class: 'text-xs' }, () => `${rate}%`)])
    }
  },
  { accessorKey: 'returnAmount', header: () => h('div', { class: 'text-right' }, 'CA perdu'), cell: ({ row }) => h('div', { class: 'text-right font-medium text-red-600' }, fmtCurrency(row.getValue('returnAmount') as number)) },
  { accessorKey: 'lostMargin', header: () => h('div', { class: 'text-right' }, 'Marge perdue'), cell: ({ row }) => h('div', { class: 'text-right text-red-600' }, fmtCurrency(row.getValue('lostMargin') as number)) }
]

const typeColumns: TableColumn<any>[] = [
  { accessorKey: 'type', header: 'Categorie' },
  { accessorKey: 'sold', header: () => h('div', { class: 'text-right' }, 'Vendus'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('sold')) },
  { accessorKey: 'returned', header: () => h('div', { class: 'text-right' }, 'Retournes'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('returned')) },
  {
    accessorKey: 'returnRate', header: () => h('div', { class: 'text-right' }, 'Taux'),
    cell: ({ row }) => {
      const rate = row.getValue('returnRate') as number
      const color = rate > 10 ? 'error' : rate > 5 ? 'warning' : 'success'
      return h('div', { class: 'text-right' }, [h(UBadge, { color, variant: 'subtle', class: 'text-xs' }, () => `${rate}%`)])
    }
  },
  { accessorKey: 'returnAmount', header: () => h('div', { class: 'text-right' }, 'CA perdu'), cell: ({ row }) => h('div', { class: 'text-right font-medium text-red-600' }, fmtCurrency(row.getValue('returnAmount') as number)) }
]

const tableUi = {
  base: 'table-fixed border-separate border-spacing-0',
  thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
  tbody: '[&>tr]:last:[&>td]:border-b-0',
  th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs',
  td: 'border-b border-default text-sm'
}
</script>

<template>
  <UDashboardPanel id="returns">
    <template #header>
      <UDashboardNavbar title="Analyse des Retours">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
          <USelect
            v-if="data?.availableTypes?.length"
            v-model="selectedCategory"
            :items="[{ label: 'Toutes categories', value: '' }, ...(data?.availableTypes || []).map((t: string) => ({ label: t, value: t }))]"
            value-key="value"
            class="ml-2 w-48"
          />
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

      <!-- KPIs -->
      <UPageGrid class="lg:grid-cols-5 gap-4 lg:gap-px">
        <UPageCard
          v-for="kpi in [
            { title: 'Taux de retour global', icon: 'i-lucide-undo-2', value: `${data?.globalReturnRate || 0}%` },
            { title: 'CA perdu en retours', icon: 'i-lucide-ban', value: fmtCurrency(data?.totalReturns || 0) },
            { title: 'Marge perdue', icon: 'i-lucide-trending-down', value: fmtCurrency(data?.totalLostMargin || 0) },
            { title: 'Impact retours', icon: 'i-lucide-alert-triangle', value: `${data?.returnImpact || 0}%`, subtitle: '% de la marge brute' },
            { title: 'Items vendus', icon: 'i-lucide-package', value: (data?.totalItemsSold || 0).toLocaleString('fr-FR') }
          ]"
          :key="kpi.title"
          :icon="kpi.icon"
          :title="kpi.title"
          variant="subtle"
          :ui="{ container: 'gap-y-1.5', wrapper: 'items-start', leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col', title: 'font-normal text-muted text-xs uppercase' }"
          class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1 mh-card-hover"
        >
          <span class="text-2xl font-semibold text-highlighted">{{ kpi.value }}</span>
        </UPageCard>
      </UPageGrid>

      <!-- Returns trend chart -->
      <UCard v-if="data?.returnsTrend?.length" class="mh-rainbow-border">
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Evolution du taux de retour</p>
        </template>
        <div class="space-y-2">
          <div v-for="point in data.returnsTrend" :key="point.date" class="flex items-center gap-3">
            <span class="text-xs text-muted w-20 shrink-0">{{ point.date }}</span>
            <div class="flex-1 h-5 bg-muted/10 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :style="{ width: `${Math.min(100, point.returnRate * 2)}%`, backgroundColor: point.returnRate > 10 ? 'var(--color-red-400)' : point.returnRate > 5 ? 'var(--color-yellow-400)' : 'var(--color-mh-mint)' }"
              />
            </div>
            <span class="text-xs font-medium w-12 text-right" :class="point.returnRate > 10 ? 'text-red-600' : point.returnRate > 5 ? 'text-yellow-600' : 'text-green-600'">{{ point.returnRate }}%</span>
            <span class="text-xs text-muted w-20 text-right">{{ point.returned }} / {{ point.sold }}</span>
          </div>
        </div>
      </UCard>

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- By type -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Taux de retour par categorie</p>
          </template>
          <UTable :data="data?.byType || []" :columns="typeColumns" :ui="tableUi" />
        </UCard>

        <!-- Correlation promo / retours -->
        <UCard v-if="data?.returnCorrelation">
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Correlation promotions / retours</p>
          </template>
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <UBadge color="warning" variant="subtle" class="shrink-0">Avec promo</UBadge>
              <div class="flex-1 h-5 bg-muted/10 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-mh-lilac" :style="{ width: `${Math.min(100, data.returnCorrelation.withDiscount.returnRate * 2)}%` }" />
              </div>
              <span class="text-sm font-medium w-16 text-right">{{ data.returnCorrelation.withDiscount.returnRate }}%</span>
            </div>
            <div class="flex items-center gap-3">
              <UBadge color="success" variant="subtle" class="shrink-0">Sans promo</UBadge>
              <div class="flex-1 h-5 bg-muted/10 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-mh-mint" :style="{ width: `${Math.min(100, data.returnCorrelation.withoutDiscount.returnRate * 2)}%` }" />
              </div>
              <span class="text-sm font-medium w-16 text-right">{{ data.returnCorrelation.withoutDiscount.returnRate }}%</span>
            </div>
            <p v-if="data.returnCorrelation.withDiscount.returnRate > data.returnCorrelation.withoutDiscount.returnRate" class="text-xs text-muted">
              Les commandes avec code promo ont un taux de retour {{ (data.returnCorrelation.withDiscount.returnRate - data.returnCorrelation.withoutDiscount.returnRate).toFixed(1) }} pp superieur.
            </p>
            <p v-else class="text-xs text-muted">
              Les promotions n'augmentent pas le taux de retour.
            </p>
          </div>
        </UCard>
      </div>

      <!-- Top returned products bar chart -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-highlighted">Top produits retournes</p>
            <UButton
              v-if="(data?.byProduct || []).length > 20"
              :label="showAllProducts ? 'Top 20' : 'Voir tout'"
              color="neutral" variant="ghost" size="xs"
              @click="showAllProducts = !showAllProducts"
            />
          </div>
        </template>
        <div class="space-y-2">
          <div v-for="p in displayedProducts" :key="p.product" class="flex items-center gap-2">
            <span class="text-xs w-40 truncate">{{ p.product }}</span>
            <div class="flex-1 h-4 bg-muted/10 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full bg-mh-blush"
                :style="{ width: `${Math.min(100, p.returnRate)}%` }"
              />
            </div>
            <span class="text-xs font-medium w-12 text-right" :class="p.returnRate > 10 ? 'text-red-600' : 'text-muted'">{{ p.returnRate }}%</span>
          </div>
        </div>
      </UCard>

      <!-- Full table -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Detail par produit</p>
        </template>
        <UTable :data="data?.byProduct || []" :columns="productColumns" :ui="tableUi" />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
