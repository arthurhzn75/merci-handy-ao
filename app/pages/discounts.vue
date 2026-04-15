<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({ start: sub(new Date(), { days: 30 }), end: new Date() })

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString()
}))

const { data } = await useFetch('/api/discounts', {
  query: queryParams,
  default: () => ({
    withDiscount: { netSales: 0, grossProfit: 0, orders: 0, marginRate: 0 },
    withoutDiscount: { netSales: 0, grossProfit: 0, orders: 0, marginRate: 0 },
    topDiscounted: [], topCodes: [],
    dataQuality: null, discountsTrend: [],
    overallStats: { totalDiscountAmount: 0, avgDiscountRate: 0, promoShare: 0, marginErosion: 0 }
  })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const totalSales = computed(() => (data.value?.withDiscount?.netSales || 0) + (data.value?.withoutDiscount?.netSales || 0))

const erosionColor = computed(() => {
  const e = data.value?.overallStats?.marginErosion || 0
  if (e > 15) return 'text-red-600'
  if (e > 5) return 'text-yellow-600'
  return 'text-green-600'
})

const codeColumns: TableColumn<any>[] = [
  { accessorKey: 'code', header: 'Code promo' },
  { accessorKey: 'orders', header: () => h('div', { class: 'text-right' }, 'Commandes'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('orders')) },
  { accessorKey: 'totalDiscount', header: () => h('div', { class: 'text-right' }, 'Remise totale'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('totalDiscount') as number)) },
  { accessorKey: 'totalSales', header: () => h('div', { class: 'text-right' }, 'CA genere'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('totalSales') as number)) },
  {
    accessorKey: 'roi', header: () => h('div', { class: 'text-right' }, 'ROI'),
    cell: ({ row }) => {
      const roi = row.getValue('roi') as number
      return h('div', { class: `text-right font-medium ${roi >= 5 ? 'text-green-600' : roi >= 2 ? 'text-yellow-600' : 'text-red-600'}` }, `${roi}x`)
    }
  },
  { accessorKey: 'avgDiscountPerOrder', header: () => h('div', { class: 'text-right' }, 'Remise/cmd'), cell: ({ row }) => h('div', { class: 'text-right text-muted' }, fmtCurrency(row.getValue('avgDiscountPerOrder') as number)) }
]

const productColumns: TableColumn<any>[] = [
  { accessorKey: 'product', header: 'Produit' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'occurrences', header: () => h('div', { class: 'text-right' }, 'Utilisations'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('occurrences')) },
  { accessorKey: 'discountTotal', header: () => h('div', { class: 'text-right' }, 'Remise totale'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('discountTotal') as number)) },
  { accessorKey: 'discountRate', header: () => h('div', { class: 'text-right' }, 'Taux remise'), cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('discountRate')}%`) }
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
  <UDashboardPanel id="discounts">
    <template #header>
      <UDashboardNavbar title="Impact des Promotions">
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

      <!-- KPIs -->
      <UPageGrid class="lg:grid-cols-4 gap-4 lg:gap-px">
        <UPageCard
          v-for="kpi in [
            { title: 'Total remises', icon: 'i-lucide-tag', value: fmtCurrency(data?.overallStats?.totalDiscountAmount || 0) },
            { title: 'Taux remise moyen', icon: 'i-lucide-percent', value: `${data?.overallStats?.avgDiscountRate || 0}%` },
            { title: 'Erosion de marge', icon: 'i-lucide-trending-down', value: `${data?.overallStats?.marginErosion || 0} pp`, colorClass: erosionColor },
            { title: 'Commandes avec promo', icon: 'i-lucide-ticket', value: `${data?.overallStats?.promoShare || 0}%` }
          ]"
          :key="kpi.title"
          :icon="kpi.icon"
          :title="kpi.title"
          variant="subtle"
          :ui="{ container: 'gap-y-1.5', wrapper: 'items-start', leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col', title: 'font-normal text-muted text-xs uppercase' }"
          class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1 mh-card-hover"
        >
          <span class="text-2xl font-semibold" :class="kpi.colorClass || 'text-highlighted'">{{ kpi.value }}</span>
        </UPageCard>
      </UPageGrid>

      <!-- With vs Without discount -->
      <UPageGrid class="lg:grid-cols-2 gap-4">
        <UPageCard variant="subtle" class="mh-card-hover">
          <div class="space-y-2">
            <p class="text-xs text-muted uppercase">Avec code promo</p>
            <p class="text-2xl font-semibold text-highlighted">{{ fmtCurrency(data?.withDiscount?.netSales || 0) }}</p>
            <div class="flex items-center gap-4 text-sm">
              <span><span class="text-muted">Commandes: </span><span class="font-medium">{{ data?.withDiscount?.orders || 0 }}</span></span>
              <span><span class="text-muted">Marge: </span><span class="font-medium">{{ data?.withDiscount?.marginRate || 0 }}%</span></span>
            </div>
            <div class="h-3 rounded-full overflow-hidden" style="background: var(--mh-gradient-h)">
              <div class="h-full bg-mh-lilac rounded-full" :style="{ width: `${totalSales > 0 ? ((data?.withDiscount?.netSales || 0) / totalSales) * 100 : 0}%` }" />
            </div>
          </div>
        </UPageCard>

        <UPageCard variant="subtle" class="mh-card-hover">
          <div class="space-y-2">
            <p class="text-xs text-muted uppercase">Sans code promo</p>
            <p class="text-2xl font-semibold text-highlighted">{{ fmtCurrency(data?.withoutDiscount?.netSales || 0) }}</p>
            <div class="flex items-center gap-4 text-sm">
              <span><span class="text-muted">Commandes: </span><span class="font-medium">{{ data?.withoutDiscount?.orders || 0 }}</span></span>
              <span><span class="text-muted">Marge: </span><span class="font-medium">{{ data?.withoutDiscount?.marginRate || 0 }}%</span></span>
            </div>
            <div class="h-3 rounded-full overflow-hidden bg-muted/10">
              <div class="h-full bg-mh-mint rounded-full" :style="{ width: `${totalSales > 0 ? ((data?.withoutDiscount?.netSales || 0) / totalSales) * 100 : 0}%` }" />
            </div>
          </div>
        </UPageCard>
      </UPageGrid>

      <!-- Margin erosion visualization -->
      <UCard class="mh-rainbow-border">
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Erosion de marge</p>
        </template>
        <div class="flex items-center gap-6">
          <div class="text-center">
            <p class="text-xs text-muted uppercase mb-1">Sans promo</p>
            <p class="text-2xl font-semibold text-green-600">{{ data?.withoutDiscount?.marginRate || 0 }}%</p>
          </div>
          <div class="flex-1 flex items-center">
            <div class="flex-1 h-px bg-default" />
            <div class="px-3">
              <UBadge
                :color="(data?.overallStats?.marginErosion || 0) > 15 ? 'error' : (data?.overallStats?.marginErosion || 0) > 5 ? 'warning' : 'success'"
                variant="subtle"
                class="text-sm font-bold"
              >
                -{{ data?.overallStats?.marginErosion || 0 }} pp
              </UBadge>
            </div>
            <div class="flex-1 h-px bg-default" />
          </div>
          <div class="text-center">
            <p class="text-xs text-muted uppercase mb-1">Avec promo</p>
            <p class="text-2xl font-semibold" :class="erosionColor">{{ data?.withDiscount?.marginRate || 0 }}%</p>
          </div>
        </div>
      </UCard>

      <!-- Discount trend -->
      <UCard v-if="data?.discountsTrend?.length">
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Evolution promotionnelle</p>
        </template>
        <div class="space-y-2">
          <div v-for="point in data.discountsTrend" :key="point.date" class="flex items-center gap-3">
            <span class="text-xs text-muted w-20 shrink-0">{{ point.date }}</span>
            <div class="flex-1 h-5 bg-muted/10 rounded-full overflow-hidden">
              <div class="h-full rounded-full bg-mh-lilac" :style="{ width: `${point.discountShare}%` }" />
            </div>
            <span class="text-xs w-12 text-right">{{ point.discountShare }}%</span>
            <span class="text-xs text-muted w-28 text-right">{{ point.discountOrders }} / {{ point.discountOrders + point.fullPriceOrders }} cmd</span>
          </div>
        </div>
      </UCard>

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Top codes -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Codes promo <span class="font-normal text-muted">({{ (data?.topCodes || []).length }})</span></p>
          </template>
          <UTable :data="data?.topCodes || []" :columns="codeColumns" :ui="tableUi" />
        </UCard>

        <!-- Top discounted products -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Produits les plus remises <span class="font-normal text-muted">({{ (data?.topDiscounted || []).length }})</span></p>
          </template>
          <UTable :data="data?.topDiscounted || []" :columns="productColumns" :ui="tableUi" />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
