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
const selectedType = ref('')
const search = ref('')

interface ProductRow {
  product: string
  type: string
  sku: string
  quantity: number
  revenue: number
  cogs: number
  margin: number
  marginRate: number
  returnRate: number
}

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString(),
  type: selectedType.value || undefined,
  search: search.value || undefined
}))

const { data } = await useFetch('/api/products', {
  query: queryParams,
  default: () => ({ catalog: [], typeStats: [], availableTypes: [] })
})

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const columns: TableColumn<ProductRow>[] = [
  { accessorKey: 'product', header: 'Produit' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'sku', header: 'SKU' },
  {
    accessorKey: 'quantity',
    header: () => h('div', { class: 'text-right' }, 'Qte'),
    cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('quantity'))
  },
  {
    accessorKey: 'revenue',
    header: () => h('div', { class: 'text-right' }, 'CA'),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, formatCurrency(row.getValue('revenue') as number))
  },
  {
    accessorKey: 'cogs',
    header: () => h('div', { class: 'text-right' }, 'COGS'),
    cell: ({ row }) => h('div', { class: 'text-right' }, formatCurrency(row.getValue('cogs') as number))
  },
  {
    accessorKey: 'margin',
    header: () => h('div', { class: 'text-right' }, 'Marge'),
    cell: ({ row }) => h('div', { class: 'text-right' }, formatCurrency(row.getValue('margin') as number))
  },
  {
    accessorKey: 'marginRate',
    header: () => h('div', { class: 'text-right' }, 'Marge %'),
    cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('marginRate')}%`)
  },
  {
    accessorKey: 'returnRate',
    header: () => h('div', { class: 'text-right' }, 'Retour %'),
    cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('returnRate')}%`)
  }
]

function exportCsv() {
  const catalog = data.value?.catalog || []
  const headers = ['Produit', 'Type', 'SKU', 'Quantite', 'CA', 'COGS', 'Marge', 'Marge %', 'Retour %']
  const rows = catalog.map((p: ProductRow) => [p.product, p.type, p.sku, p.quantity, p.revenue, p.cogs, p.margin, p.marginRate, p.returnRate])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'produits-merci-handy.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <UDashboardPanel id="products">
    <template #header>
      <UDashboardNavbar title="Catalogue produits" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-download"
            label="Export CSV"
            color="neutral"
            variant="outline"
            @click="exportCsv"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />

          <USelect
            v-if="data?.availableTypes?.length"
            v-model="selectedType"
            :items="[{ label: 'Tous les types', value: '' }, ...(data?.availableTypes || []).map((t: string) => ({ label: t, value: t }))]"
            value-key="value"
            variant="ghost"
          />

          <UInput
            v-model="search"
            placeholder="Rechercher un produit..."
            icon="i-lucide-search"
            variant="ghost"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- Type KPIs -->
      <UPageGrid class="lg:grid-cols-3 gap-4">
        <UPageCard
          v-for="ts in (data?.typeStats || [])"
          :key="ts.type"
          :title="ts.type || 'Sans type'"
          variant="subtle"
          :ui="{
            container: 'gap-y-1',
            title: 'font-normal text-muted text-xs uppercase'
          }"
          class="mh-card-hover"
        >
          <div class="flex items-center gap-4 text-sm">
            <div>
              <span class="text-muted">Qte: </span>
              <span class="font-semibold">{{ ts.quantity }}</span>
            </div>
            <div>
              <span class="text-muted">CA: </span>
              <span class="font-semibold">{{ formatCurrency(ts.revenue) }}</span>
            </div>
            <div>
              <span class="text-muted">Marge: </span>
              <span class="font-semibold">{{ formatCurrency(ts.margin) }}</span>
            </div>
          </div>
        </UPageCard>
      </UPageGrid>

      <!-- Full table -->
      <UCard>
        <UTable
          :data="data?.catalog || []"
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
