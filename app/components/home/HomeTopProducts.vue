<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

interface TopProduct {
  product: string
  type: string
  quantity: number
  revenue: number
  cogs: number
  margin: number
  revenueShare: number
}

const queryParams = computed(() => ({
  from: props.range.start.toISOString(),
  to: props.range.end.toISOString(),
  granularity: props.period
}))

const { data } = await useFetch('/api/overview', {
  query: queryParams,
  default: () => ({ stats: null, timeSeries: [], topProducts: [] })
})

const topProducts = computed<TopProduct[]>(() => data.value?.topProducts || [])

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const columns: TableColumn<TopProduct>[] = [
  {
    accessorKey: 'product',
    header: 'Produit'
  },
  {
    accessorKey: 'type',
    header: 'Type'
  },
  {
    accessorKey: 'quantity',
    header: 'Quantite',
    cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('quantity'))
  },
  {
    accessorKey: 'revenue',
    header: () => h('div', { class: 'text-right' }, 'CA'),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, formatCurrency(row.getValue('revenue') as number))
  },
  {
    accessorKey: 'margin',
    header: () => h('div', { class: 'text-right' }, 'Marge'),
    cell: ({ row }) => h('div', { class: 'text-right' }, formatCurrency(row.getValue('margin') as number))
  },
  {
    accessorKey: 'revenueShare',
    header: () => h('div', { class: 'text-right' }, '% CA'),
    cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('revenueShare')}%`)
  }
]
</script>

<template>
  <UCard>
    <template #header>
      <p class="text-sm font-semibold text-highlighted">
        Top 10 produits
      </p>
    </template>

    <UTable
      :data="topProducts"
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
