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

const { data } = await useFetch('/api/returns', {
  query: queryParams,
  default: () => ({ byProduct: [], byType: [], totalReturns: 0, totalLostMargin: 0, globalReturnRate: 0, totalItemsSold: 0 })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const UBadge = resolveComponent('UBadge')

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
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- KPIs -->
      <UPageGrid class="lg:grid-cols-4 gap-4 lg:gap-px">
        <UPageCard
          v-for="kpi in [
            { title: 'Taux de retour global', icon: 'i-lucide-undo-2', value: `${data?.globalReturnRate || 0}%` },
            { title: 'CA perdu en retours', icon: 'i-lucide-ban', value: fmtCurrency(data?.totalReturns || 0) },
            { title: 'Marge perdue', icon: 'i-lucide-trending-down', value: fmtCurrency(data?.totalLostMargin || 0) },
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

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- By type -->
        <UCard class="mh-rainbow-border">
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Taux de retour par categorie</p>
          </template>
          <UTable :data="data?.byType || []" :columns="typeColumns" :ui="{ base: 'table-fixed border-separate border-spacing-0', thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none', tbody: '[&>tr]:last:[&>td]:border-b-0', th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs', td: 'border-b border-default text-sm' }" />
        </UCard>

        <!-- Top returned products bar chart -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Top produits retournes</p>
          </template>
          <div class="space-y-2">
            <div v-for="p in (data?.byProduct || []).slice(0, 10)" :key="p.product" class="flex items-center gap-2">
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
      </div>

      <!-- Full table -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Detail par produit</p>
        </template>
        <UTable :data="data?.byProduct || []" :columns="productColumns" :ui="{ base: 'table-fixed border-separate border-spacing-0', thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none', tbody: '[&>tr]:last:[&>td]:border-b-0', th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs', td: 'border-b border-default text-sm' }" />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
