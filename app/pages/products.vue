<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({ start: sub(new Date(), { days: 30 }), end: new Date() })
const selectedType = ref('')
const search = ref('')

const UBadge = resolveComponent('UBadge')

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString(),
  type: selectedType.value || undefined,
  search: search.value || undefined
}))

const { data } = await useFetch('/api/products', {
  query: queryParams,
  default: () => ({ catalog: [], abcSummary: { A: { count: 0, netSales: 0 }, B: { count: 0, netSales: 0 }, C: { count: 0, netSales: 0 } }, bcgData: [], typeStats: [], availableTypes: [] })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const columns: TableColumn<any>[] = [
  { accessorKey: 'product', header: 'Produit' },
  { accessorKey: 'type', header: 'Type' },
  {
    accessorKey: 'abcClass', header: 'ABC',
    cell: ({ row }) => {
      const cls = row.getValue('abcClass') as string
      const color = cls === 'A' ? 'success' : cls === 'B' ? 'warning' : 'neutral'
      return h(UBadge, { color, variant: 'subtle', class: 'text-xs font-bold' }, () => cls)
    }
  },
  { accessorKey: 'quantity', header: () => h('div', { class: 'text-right' }, 'Qte'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('quantity')) },
  { accessorKey: 'grossSales', header: () => h('div', { class: 'text-right' }, 'CA Brut'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('grossSales') as number)) },
  { accessorKey: 'discounts', header: () => h('div', { class: 'text-right' }, 'Remises'), cell: ({ row }) => h('div', { class: 'text-right text-muted' }, fmtCurrency(row.getValue('discounts') as number)) },
  { accessorKey: 'netSales', header: () => h('div', { class: 'text-right' }, 'CA Net'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('netSales') as number)) },
  { accessorKey: 'grossProfit', header: () => h('div', { class: 'text-right' }, 'Marge'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('grossProfit') as number)) },
  {
    accessorKey: 'marginRate', header: () => h('div', { class: 'text-right' }, 'Marge %'),
    cell: ({ row }) => {
      const rate = row.getValue('marginRate') as number
      const color = rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'
      return h('div', { class: `text-right font-medium ${color}` }, `${rate}%`)
    }
  },
  {
    accessorKey: 'returnRate', header: () => h('div', { class: 'text-right' }, 'Retour %'),
    cell: ({ row }) => {
      const rate = row.getValue('returnRate') as number
      const color = rate > 10 ? 'text-red-600' : rate > 5 ? 'text-yellow-600' : 'text-green-600'
      return h('div', { class: `text-right ${color}` }, `${rate}%`)
    }
  }
]

function exportCsv() {
  const catalog = data.value?.catalog || []
  const headers = ['Produit', 'Type', 'SKU', 'ABC', 'Qte', 'CA Brut', 'Remises', 'CA Net', 'Marge', 'Marge %', 'Retour %']
  const rows = catalog.map((p: any) => [p.product, p.type, p.sku, p.abcClass, p.quantity, p.grossSales, p.discounts, p.netSales, p.grossProfit, p.marginRate, p.returnRate])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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
      <UDashboardNavbar title="Matrice Produit" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-download" label="Export CSV" color="neutral" variant="outline" @click="exportCsv" />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
          <USelect
            v-if="data?.availableTypes?.length"
            v-model="selectedType"
            :items="[{ label: 'Tous les types', value: '' }, ...(data?.availableTypes || []).map((t: string) => ({ label: t, value: t }))]"
            value-key="value" variant="ghost"
          />
          <UInput v-model="search" placeholder="Rechercher..." icon="i-lucide-search" variant="ghost" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- ABC Summary -->
      <UPageGrid class="lg:grid-cols-3 gap-4">
        <UPageCard
          v-for="cls in (['A', 'B', 'C'] as const)"
          :key="cls"
          variant="subtle"
          class="mh-card-hover"
        >
          <div class="flex items-center gap-3">
            <UBadge :color="cls === 'A' ? 'success' : cls === 'B' ? 'warning' : 'neutral'" variant="subtle" class="text-lg font-bold px-3 py-1">
              {{ cls }}
            </UBadge>
            <div>
              <p class="text-xs text-muted uppercase">
                {{ cls === 'A' ? '80% du CA' : cls === 'B' ? '15% du CA' : '5% du CA' }}
              </p>
              <p class="text-lg font-semibold">
                {{ (data?.abcSummary as any)?.[cls]?.count || 0 }} produits
              </p>
              <p class="text-sm text-muted">
                {{ fmtCurrency((data?.abcSummary as any)?.[cls]?.netSales || 0) }}
              </p>
            </div>
          </div>
        </UPageCard>
      </UPageGrid>

      <!-- BCG Matrix (simplified visual) -->
      <UCard class="mh-rainbow-border">
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Matrice Performance : Marge % vs Volume</p>
          <p class="text-xs text-muted">Taille = CA Net | Couleur = Classe ABC</p>
        </template>
        <div class="relative h-80 border border-default rounded-lg overflow-hidden bg-white">
          <!-- Quadrant labels -->
          <div class="absolute top-2 left-2 text-xs text-muted">Haute marge / Faible volume</div>
          <div class="absolute top-2 right-2 text-xs text-muted text-right">Stars</div>
          <div class="absolute bottom-2 left-2 text-xs text-muted">Dogs</div>
          <div class="absolute bottom-2 right-2 text-xs text-muted text-right">Volume / Faible marge</div>
          <!-- Axes -->
          <div class="absolute left-1/2 top-0 bottom-0 w-px bg-mh-border" />
          <div class="absolute top-1/2 left-0 right-0 h-px bg-mh-border" />
          <!-- Points -->
          <div
            v-for="(p, i) in (data?.bcgData || []).slice(0, 40)"
            :key="i"
            class="absolute rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
            :title="`${p.product}\nMarge: ${p.marginRate}%\nQte: ${p.quantity}\nCA: ${p.netSales} EUR`"
            :style="{
              left: `${Math.min(95, Math.max(5, (p.quantity / Math.max(...(data?.bcgData || []).map((x: any) => x.quantity || 1))) * 90))}%`,
              bottom: `${Math.min(95, Math.max(5, (p.marginRate / 100) * 90))}%`,
              width: `${Math.max(8, Math.min(40, Math.sqrt(p.netSales / 10)))}px`,
              height: `${Math.max(8, Math.min(40, Math.sqrt(p.netSales / 10)))}px`,
              backgroundColor: p.abcClass === 'A' ? 'var(--color-mh-mint)' : p.abcClass === 'B' ? 'var(--color-mh-lilac)' : 'var(--color-mh-peach)'
            }"
          />
        </div>
      </UCard>

      <!-- Type stats -->
      <UPageGrid class="lg:grid-cols-3 gap-4">
        <UPageCard
          v-for="ts in (data?.typeStats || [])"
          :key="ts.type"
          :title="ts.type || 'Sans type'"
          variant="subtle"
          :ui="{ container: 'gap-y-1', title: 'font-normal text-muted text-xs uppercase' }"
          class="mh-card-hover"
        >
          <div class="flex items-center gap-4 text-sm">
            <div><span class="text-muted">Qte: </span><span class="font-semibold">{{ ts.quantity }}</span></div>
            <div><span class="text-muted">CA: </span><span class="font-semibold">{{ fmtCurrency(ts.netSales) }}</span></div>
            <div><span class="text-muted">Marge: </span><span class="font-semibold">{{ fmtCurrency(ts.grossProfit) }}</span></div>
          </div>
        </UPageCard>
      </UPageGrid>

      <!-- Full profitability table -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Profitabilite produit</p>
        </template>
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
