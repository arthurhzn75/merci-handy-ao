<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString()
}))

const { data } = await useFetch('/api/geography', {
  query: queryParams,
  default: () => ({ cities: [], countries: [] })
})

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

interface CountryRow {
  country: string
  orders: number
  revenue: number
  revenueShare: number
}

interface CityRow {
  country: string
  city: string
  orders: number
  revenue: number
  revenueShare: number
}

const countryColumns: TableColumn<CountryRow>[] = [
  { accessorKey: 'country', header: 'Pays' },
  {
    accessorKey: 'orders',
    header: () => h('div', { class: 'text-right' }, 'Commandes'),
    cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('orders'))
  },
  {
    accessorKey: 'revenue',
    header: () => h('div', { class: 'text-right' }, 'CA'),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, formatCurrency(row.getValue('revenue') as number))
  },
  {
    accessorKey: 'revenueShare',
    header: () => h('div', { class: 'text-right' }, '% CA'),
    cell: ({ row }) => {
      const share = row.getValue('revenueShare') as number
      return h('div', { class: 'flex items-center justify-end gap-2' }, [
        h('div', { class: 'w-20 h-2 bg-muted/10 rounded-full overflow-hidden' }, [
          h('div', {
            class: 'h-full rounded-full bg-mh-lilac',
            style: { width: `${share}%` }
          })
        ]),
        h('span', { class: 'text-sm' }, `${share}%`)
      ])
    }
  }
]

const cityColumns: TableColumn<CityRow>[] = [
  { accessorKey: 'city', header: 'Ville' },
  { accessorKey: 'country', header: 'Pays' },
  {
    accessorKey: 'orders',
    header: () => h('div', { class: 'text-right' }, 'Commandes'),
    cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('orders'))
  },
  {
    accessorKey: 'revenue',
    header: () => h('div', { class: 'text-right' }, 'CA'),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, formatCurrency(row.getValue('revenue') as number))
  },
  {
    accessorKey: 'revenueShare',
    header: () => h('div', { class: 'text-right' }, '% CA'),
    cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('revenueShare')}%`)
  }
]
</script>

<template>
  <UDashboardPanel id="geography">
    <template #header>
      <UDashboardNavbar title="Geographie" :ui="{ right: 'gap-3' }">
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
      <!-- Country breakdown -->
      <UCard class="mh-rainbow-border">
        <template #header>
          <p class="text-sm font-semibold text-highlighted">
            Repartition par pays
          </p>
        </template>

        <UTable
          :data="data?.countries || []"
          :columns="countryColumns"
          class="shrink-0"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs',
            td: 'border-b border-default text-sm'
          }"
        />
      </UCard>

      <!-- City breakdown -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-highlighted">
            Detail par ville
          </p>
        </template>

        <UTable
          :data="data?.cities || []"
          :columns="cityColumns"
          class="shrink-0"
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
