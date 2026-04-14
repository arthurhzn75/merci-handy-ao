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

const { data } = await useFetch('/api/customers', {
  query: queryParams,
  default: () => ({ stats: null, topCities: [], cohorts: [] })
})

const stats = computed(() => data.value?.stats)

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const kpis = computed(() => {
  if (!stats.value) return []
  return [
    { title: 'Clients uniques', icon: 'i-lucide-users', value: stats.value.uniqueCustomers.toString() },
    { title: '% Nouveaux clients', icon: 'i-lucide-user-plus', value: `${stats.value.newCustomerRate}%` },
    { title: 'LTV moyenne', icon: 'i-lucide-trending-up', value: formatCurrency(stats.value.avgLtv) },
    { title: 'Frequence moyenne', icon: 'i-lucide-repeat', value: stats.value.avgFrequency.toFixed(1) }
  ]
})

interface CityRow {
  country: string
  city: string
  customers: number
}

const cityColumns: TableColumn<CityRow>[] = [
  { accessorKey: 'country', header: 'Pays' },
  { accessorKey: 'city', header: 'Ville' },
  {
    accessorKey: 'customers',
    header: () => h('div', { class: 'text-right' }, 'Clients'),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, row.getValue('customers'))
  }
]

interface CohortRow {
  month: string
  customers: number
  revenue: number
}

const cohortColumns: TableColumn<CohortRow>[] = [
  { accessorKey: 'month', header: 'Cohorte' },
  {
    accessorKey: 'customers',
    header: () => h('div', { class: 'text-right' }, 'Clients'),
    cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('customers'))
  },
  {
    accessorKey: 'revenue',
    header: () => h('div', { class: 'text-right' }, 'CA'),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, formatCurrency(row.getValue('revenue') as number))
  }
]
</script>

<template>
  <UDashboardPanel id="customers">
    <template #header>
      <UDashboardNavbar title="Clients" :ui="{ right: 'gap-3' }">
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
      <!-- KPI cards -->
      <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
        <UPageCard
          v-for="(kpi, index) in kpis"
          :key="index"
          :icon="kpi.icon"
          :title="kpi.title"
          variant="subtle"
          :ui="{
            container: 'gap-y-1.5',
            wrapper: 'items-start',
            leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
            title: 'font-normal text-muted text-xs uppercase'
          }"
          class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1 mh-card-hover"
        >
          <span class="text-2xl font-semibold text-highlighted">
            {{ kpi.value }}
          </span>
        </UPageCard>
      </UPageGrid>

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Top cities -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">
              Top villes
            </p>
          </template>

          <UTable
            :data="data?.topCities || []"
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

        <!-- Cohorts -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">
              Cohortes par mois de creation
            </p>
          </template>

          <UTable
            :data="data?.cohorts || []"
            :columns="cohortColumns"
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
      </div>
    </template>
  </UDashboardPanel>
</template>
