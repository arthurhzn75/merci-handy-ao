<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range } from '~/types'

const props = defineProps<{ period: Period; range: Range }>()
const router = useRouter()

const UBadge = resolveComponent('UBadge')

const queryParams = computed(() => ({
  from: props.range.start.toISOString(),
  to: props.range.end.toISOString(),
  granularity: props.period
}))

const { data } = await useFetch('/api/overview', {
  query: queryParams,
  default: () => ({ stats: null, timeSeries: [], topProducts: [] })
})

const topProducts = computed(() => data.value?.topProducts || [])

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const columns: TableColumn<any>[] = [
  { accessorKey: 'product', header: 'Produit' },
  { accessorKey: 'type', header: 'Type' },
  {
    accessorKey: 'abcClass',
    header: 'ABC',
    cell: ({ row }) => {
      const cls = row.getValue('abcClass') as string
      const color = cls === 'A' ? 'success' : cls === 'B' ? 'warning' : 'neutral'
      return h(UBadge, { color, variant: 'subtle', class: 'text-xs font-bold' }, () => cls)
    }
  },
  { accessorKey: 'quantity', header: () => h('div', { class: 'text-right' }, 'Qte'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('quantity')) },
  { accessorKey: 'netSales', header: () => h('div', { class: 'text-right' }, 'CA Net'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('netSales') as number)) },
  { accessorKey: 'grossProfit', header: () => h('div', { class: 'text-right' }, 'Marge'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('grossProfit') as number)) },
  {
    accessorKey: 'marginRate',
    header: () => h('div', { class: 'text-right' }, 'Marge %'),
    cell: ({ row }) => {
      const rate = row.getValue('marginRate') as number
      const color = rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'
      return h('div', { class: `text-right font-medium ${color}` }, `${rate}%`)
    }
  },
  {
    accessorKey: 'returnRate',
    header: () => h('div', { class: 'text-right' }, 'Retour %'),
    cell: ({ row }) => {
      const rate = row.getValue('returnRate') as number
      const color = rate > 10 ? 'text-red-600' : rate > 5 ? 'text-yellow-600' : 'text-green-600'
      return h('div', { class: `text-right ${color}` }, `${rate}%`)
    }
  },
  {
    accessorKey: 'revenueShare',
    header: () => h('div', { class: 'text-right' }, '% CA'),
    cell: ({ row }) => h('div', { class: 'text-right text-muted' }, `${row.getValue('revenueShare')}%`)
  }
]

function onRowClick(row: any) {
  router.push({ path: '/products', query: { search: row.original.product } })
}
</script>

<template>
  <UCard>
    <template #header>
      <p class="text-sm font-semibold text-highlighted">Top 10 produits</p>
    </template>
    <UTable
      :data="topProducts"
      :columns="columns"
      class="shrink-0"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0 [&>tr]:cursor-pointer [&>tr]:hover:bg-elevated/50',
        th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs',
        td: 'border-b border-default text-sm'
      }"
      @select="onRowClick"
    />
  </UCard>
</template>
