<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range, AttributionModel } from '~/types'

useDashboard()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')
const model = ref<AttributionModel>('last')
const selectedChannel = ref('')

interface AcquisitionRow {
  source: string
  medium: string
  campaign: string
  orders: number
  revenue: number
  aov: number
  newCustomerRate: number
}

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString(),
  model: model.value,
  channel: selectedChannel.value || undefined
}))

const { data } = await useFetch('/api/acquisition', {
  query: queryParams,
  default: () => ({ breakdown: [], topSources: [], channels: [] })
})

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const columns: TableColumn<AcquisitionRow>[] = [
  { accessorKey: 'source', header: 'Source' },
  { accessorKey: 'medium', header: 'Medium' },
  { accessorKey: 'campaign', header: 'Campagne' },
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
    accessorKey: 'aov',
    header: () => h('div', { class: 'text-right' }, 'AOV'),
    cell: ({ row }) => h('div', { class: 'text-right' }, formatCurrency(row.getValue('aov') as number))
  },
  {
    accessorKey: 'newCustomerRate',
    header: () => h('div', { class: 'text-right' }, '% Nouveaux'),
    cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('newCustomerRate')}%`)
  }
]
</script>

<template>
  <UDashboardPanel id="acquisition">
    <template #header>
      <UDashboardNavbar title="Acquisition & trafic" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />

          <USelect
            v-model="model"
            :items="[
              { label: 'Last-touch', value: 'last' },
              { label: 'First-touch', value: 'first' }
            ]"
            value-key="value"
            variant="ghost"
          />

          <USelect
            v-if="data?.channels?.length"
            v-model="selectedChannel"
            :items="[{ label: 'Tous les canaux', value: '' }, ...(data?.channels || []).map((c: string) => ({ label: c, value: c }))]"
            value-key="value"
            variant="ghost"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- Top sources bar chart (simple visual) -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-highlighted">
            Top 10 sources par CA
          </p>
        </template>

        <div class="space-y-3">
          <div
            v-for="source in (data?.topSources || [])"
            :key="source.source"
            class="flex items-center gap-3"
          >
            <span class="text-sm text-muted w-32 truncate">{{ source.source }}</span>
            <div class="flex-1 h-6 bg-muted/10 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${Math.max(5, (source.revenue / ((data?.topSources?.[0]?.revenue) || 1)) * 100)}%`,
                  background: 'var(--mh-gradient-h)'
                }"
              />
            </div>
            <span class="text-sm font-medium w-24 text-right">{{ formatCurrency(source.revenue) }}</span>
          </div>
        </div>
      </UCard>

      <!-- Detailed table -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-highlighted">
            Detail par source / medium / campagne
          </p>
        </template>

        <UTable
          :data="data?.breakdown || []"
          :columns="columns"
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
