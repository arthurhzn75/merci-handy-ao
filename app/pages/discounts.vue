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
  default: () => ({ withDiscount: { netSales: 0, grossProfit: 0, orders: 0, marginRate: 0 }, withoutDiscount: { netSales: 0, grossProfit: 0, orders: 0, marginRate: 0 }, topDiscounted: [], topCodes: [] })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const totalSales = computed(() => (data.value?.withDiscount?.netSales || 0) + (data.value?.withoutDiscount?.netSales || 0))

const codeColumns: TableColumn<any>[] = [
  { accessorKey: 'code', header: 'Code promo' },
  { accessorKey: 'orders', header: () => h('div', { class: 'text-right' }, 'Commandes'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('orders')) },
  { accessorKey: 'totalDiscount', header: () => h('div', { class: 'text-right' }, 'Remise totale'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('totalDiscount') as number)) },
  { accessorKey: 'totalSales', header: () => h('div', { class: 'text-right' }, 'CA genere'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('totalSales') as number)) }
]

const productColumns: TableColumn<any>[] = [
  { accessorKey: 'product', header: 'Produit' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'occurrences', header: () => h('div', { class: 'text-right' }, 'Utilisations'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('occurrences')) },
  { accessorKey: 'discountTotal', header: () => h('div', { class: 'text-right' }, 'Remise totale'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('discountTotal') as number)) },
  { accessorKey: 'discountRate', header: () => h('div', { class: 'text-right' }, 'Taux remise'), cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('discountRate')}%`) }
]
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

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Top codes -->
        <UCard class="mh-rainbow-border">
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Top codes promo</p>
          </template>
          <UTable :data="data?.topCodes || []" :columns="codeColumns" :ui="{ base: 'table-fixed border-separate border-spacing-0', thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none', tbody: '[&>tr]:last:[&>td]:border-b-0', th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs', td: 'border-b border-default text-sm' }" />
        </UCard>

        <!-- Top discounted products -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Produits les plus remises</p>
          </template>
          <UTable :data="data?.topDiscounted || []" :columns="productColumns" :ui="{ base: 'table-fixed border-separate border-spacing-0', thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none', tbody: '[&>tr]:last:[&>td]:border-b-0', th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs', td: 'border-b border-default text-sm' }" />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
