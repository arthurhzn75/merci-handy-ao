<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({ start: sub(new Date(), { days: 30 }), end: new Date() })

// Tab 1 filters
const selectedType = ref('')
const search = ref('')
const abcFilter = ref('')
const excludeGifts = ref(true)
const groupVariants = ref(true)
const minQuantity = ref(0)
const maxReturnRate = ref(100)
const minMargin = ref(0)

// Tab 3 search
const catalogSearch = ref('')

// Active tab
const activeTab = ref('produits')

const UBadge = resolveComponent('UBadge')

const tabs = [
  { label: 'Produits', value: 'produits', icon: 'i-lucide-box' },
  { label: 'Categories', value: 'categories', icon: 'i-lucide-layout-grid' },
  { label: 'Catalogue complet', value: 'catalogue', icon: 'i-lucide-list' }
]

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString(),
  type: selectedType.value || undefined,
  search: search.value || undefined,
  abc: abcFilter.value || undefined,
  excludeGifts: excludeGifts.value ? 'true' : undefined,
  groupVariants: groupVariants.value ? 'true' : undefined,
  minQuantity: minQuantity.value > 0 ? String(minQuantity.value) : undefined,
  maxReturnRate: maxReturnRate.value < 100 ? String(maxReturnRate.value) : undefined,
  minMargin: minMargin.value > 0 ? String(minMargin.value) : undefined
}))

const { data } = await useFetch('/api/products', {
  query: queryParams,
  default: () => ({
    catalog: [], abcSummary: { A: { count: 0, netSales: 0 }, B: { count: 0, netSales: 0 }, C: { count: 0, netSales: 0 } },
    bcgData: [], categoryStats: [], fullCatalog: [], availableTypes: [],
    dataQuality: null, portfolioHealth: null
  })
})

const hhiColor = computed(() => {
  const hhi = data.value?.portfolioHealth?.hhi || 0
  if (hhi > 2500) return 'text-red-600'
  if (hhi > 1500) return 'text-yellow-600'
  return 'text-green-600'
})

const hhiLabel = computed(() => {
  const hhi = data.value?.portfolioHealth?.hhi || 0
  if (hhi > 2500) return 'Concentre'
  if (hhi > 1500) return 'Modere'
  return 'Diversifie'
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

// Filtered full catalog for Tab 3
const filteredFullCatalog = computed(() => {
  if (!catalogSearch.value) return data.value?.fullCatalog || []
  const s = catalogSearch.value.toLowerCase()
  return (data.value?.fullCatalog || []).filter((p: any) =>
    p.product.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.type.toLowerCase().includes(s)
  )
})

// Navigate to Tab 1 with type filter
function filterByType(type: string) {
  selectedType.value = type
  activeTab.value = 'produits'
}

function resetFilters() {
  selectedType.value = ''
  search.value = ''
  abcFilter.value = ''
  minQuantity.value = 0
  maxReturnRate.value = 100
  minMargin.value = 0
}

// ─── Table columns ───────────────────────────────────────────────

const productColumns: TableColumn<any>[] = [
  {
    accessorKey: 'product', header: 'Produit',
    cell: ({ row }) => {
      const p = row.original
      const parts: any[] = [h('span', { class: 'font-medium' }, p.product)]
      if (p.isGift) parts.push(h(UBadge, { color: 'warning', variant: 'subtle', class: 'text-xs ml-1' }, () => 'Gift'))
      if (p.variants?.length > 0) parts.push(h('span', { class: 'text-xs text-muted ml-1', title: p.variants.join('\n') }, `(${p.variants.length} var.)`))
      return h('div', { class: 'flex items-center gap-1 flex-wrap' }, parts)
    }
  },
  { accessorKey: 'type', header: 'Type' },
  {
    accessorKey: 'abcClass', header: 'ABC',
    cell: ({ row }) => {
      const cls = row.getValue('abcClass') as string
      return h(UBadge, { color: cls === 'A' ? 'success' : cls === 'B' ? 'warning' : 'neutral', variant: 'subtle', class: 'text-xs font-bold' }, () => cls)
    }
  },
  { accessorKey: 'quantity', header: () => h('div', { class: 'text-right' }, 'Qte'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('quantity')) },
  { accessorKey: 'unitPrice', header: () => h('div', { class: 'text-right' }, 'Prix'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('unitPrice') as number)) },
  { accessorKey: 'netSales', header: () => h('div', { class: 'text-right' }, 'CA Net'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('netSales') as number)) },
  { accessorKey: 'grossProfit', header: () => h('div', { class: 'text-right' }, 'Marge'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('grossProfit') as number)) },
  {
    accessorKey: 'marginRate', header: () => h('div', { class: 'text-right' }, 'Marge %'),
    cell: ({ row }) => {
      const r = row.getValue('marginRate') as number
      return h('div', { class: `text-right font-medium ${r >= 70 ? 'text-green-600' : r >= 50 ? 'text-yellow-600' : 'text-red-600'}` }, `${r}%`)
    }
  },
  {
    accessorKey: 'returnRate', header: () => h('div', { class: 'text-right' }, 'Retour %'),
    cell: ({ row }) => {
      const r = row.getValue('returnRate') as number
      return h('div', { class: `text-right ${r > 10 ? 'text-red-600' : r > 5 ? 'text-yellow-600' : 'text-green-600'}` }, `${r}%`)
    }
  },
  { accessorKey: 'revenueShare', header: () => h('div', { class: 'text-right' }, '% CA'), cell: ({ row }) => h('div', { class: 'text-right text-muted' }, `${row.getValue('revenueShare')}%`) }
]

const categoryColumns: TableColumn<any>[] = [
  { accessorKey: 'type', header: 'Categorie' },
  { accessorKey: 'productCount', header: () => h('div', { class: 'text-right' }, 'Produits'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('productCount')) },
  { accessorKey: 'quantity', header: () => h('div', { class: 'text-right' }, 'Qte vendue'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('quantity')) },
  { accessorKey: 'orders', header: () => h('div', { class: 'text-right' }, 'Commandes'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('orders')) },
  { accessorKey: 'netSales', header: () => h('div', { class: 'text-right' }, 'CA Net'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('netSales') as number)) },
  { accessorKey: 'grossProfit', header: () => h('div', { class: 'text-right' }, 'Marge'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('grossProfit') as number)) },
  {
    accessorKey: 'marginRate', header: () => h('div', { class: 'text-right' }, 'Marge %'),
    cell: ({ row }) => {
      const r = row.getValue('marginRate') as number
      return h('div', { class: `text-right font-medium ${r >= 70 ? 'text-green-600' : r >= 50 ? 'text-yellow-600' : 'text-red-600'}` }, `${r}%`)
    }
  },
  { accessorKey: 'aov', header: () => h('div', { class: 'text-right' }, 'AOV'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('aov') as number)) },
  {
    accessorKey: 'returnRate', header: () => h('div', { class: 'text-right' }, 'Retour %'),
    cell: ({ row }) => {
      const r = row.getValue('returnRate') as number
      return h('div', { class: `text-right ${r > 10 ? 'text-red-600' : r > 5 ? 'text-yellow-600' : 'text-green-600'}` }, `${r}%`)
    }
  },
  { accessorKey: 'revenueShare', header: () => h('div', { class: 'text-right' }, '% CA'), cell: ({ row }) => h('div', { class: 'text-right text-muted' }, `${row.getValue('revenueShare')}%`) },
  {
    id: 'action', header: '',
    cell: ({ row }) => h('button', {
      class: 'text-xs text-primary hover:underline cursor-pointer',
      onClick: () => filterByType(row.original.type)
    }, 'Voir produits →')
  }
]

const catalogColumns: TableColumn<any>[] = [
  {
    accessorKey: 'product', header: 'Produit',
    cell: ({ row }) => {
      const parts: any[] = [h('span', {}, row.original.product)]
      if (row.original.isGift) parts.push(h(UBadge, { color: 'warning', variant: 'subtle', class: 'text-xs ml-1' }, () => 'Gift'))
      return h('div', { class: 'flex items-center gap-1' }, parts)
    }
  },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'sku', header: 'SKU' },
  { accessorKey: 'quantity', header: () => h('div', { class: 'text-right' }, 'Qte'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('quantity')) },
  { accessorKey: 'unitPrice', header: () => h('div', { class: 'text-right' }, 'Prix'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('unitPrice') as number)) },
  { accessorKey: 'netSales', header: () => h('div', { class: 'text-right' }, 'CA Net'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('netSales') as number)) },
  {
    accessorKey: 'marginRate', header: () => h('div', { class: 'text-right' }, 'Marge %'),
    cell: ({ row }) => {
      const r = row.getValue('marginRate') as number
      return h('div', { class: `text-right ${r >= 70 ? 'text-green-600' : r >= 50 ? 'text-yellow-600' : 'text-red-600'}` }, `${r}%`)
    }
  },
  {
    accessorKey: 'returnRate', header: () => h('div', { class: 'text-right' }, 'Retour %'),
    cell: ({ row }) => {
      const r = row.getValue('returnRate') as number
      return h('div', { class: `text-right ${r > 10 ? 'text-red-600' : r > 5 ? 'text-yellow-600' : 'text-red-600'}` }, `${r}%`)
    }
  }
]

const tableUi = {
  base: 'table-fixed border-separate border-spacing-0',
  thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
  tbody: '[&>tr]:last:[&>td]:border-b-0',
  th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-xs',
  td: 'border-b border-default text-sm'
}

function exportCatalogCsv() {
  const catalog = filteredFullCatalog.value
  const headers = ['Produit', 'Type', 'SKU', 'Gift', 'Qte', 'Prix unit.', 'CA Net', 'Marge', 'Marge %', 'Retour %']
  const rows = catalog.map((p: any) => [
    `"${p.product}"`, p.type, p.sku, p.isGift, p.quantity, p.unitPrice, p.netSales, p.grossProfit, p.marginRate, p.returnRate
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'catalogue-merci-handy.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const pastelColors = ['var(--color-mh-mint)', 'var(--color-mh-sky)', 'var(--color-mh-lilac)', 'var(--color-mh-pink)', 'var(--color-mh-blush)', 'var(--color-mh-peach)']
</script>

<template>
  <UDashboardPanel id="products">
    <template #header>
      <UDashboardNavbar title="Matrice Produit">
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

      <!-- Portfolio Health -->
      <UPageGrid v-if="data?.portfolioHealth" class="lg:grid-cols-4 gap-4 mb-4">
        <UPageCard variant="subtle" class="mh-card-hover">
          <p class="text-xs text-muted uppercase">Indice HHI</p>
          <p class="text-2xl font-semibold" :class="hhiColor">{{ data.portfolioHealth.hhi }}</p>
          <p class="text-xs" :class="hhiColor">{{ hhiLabel }}</p>
        </UPageCard>
        <UPageCard variant="subtle" class="mh-card-hover">
          <p class="text-xs text-muted uppercase">Concentration Top 1</p>
          <p class="text-2xl font-semibold text-highlighted">{{ data.portfolioHealth.top1Share }}%</p>
          <p class="text-xs text-muted">du CA total</p>
        </UPageCard>
        <UPageCard variant="subtle" class="mh-card-hover">
          <p class="text-xs text-muted uppercase">Concentration Top 3</p>
          <p class="text-2xl font-semibold text-highlighted">{{ data.portfolioHealth.top3Share.toFixed(1) }}%</p>
          <p class="text-xs text-muted">du CA total</p>
        </UPageCard>
        <UPageCard variant="subtle" class="mh-card-hover">
          <p class="text-xs text-muted uppercase">Marge negative</p>
          <p class="text-2xl font-semibold" :class="data.portfolioHealth.negativeMarginCount > 0 ? 'text-red-600' : 'text-green-600'">{{ data.portfolioHealth.negativeMarginCount }}</p>
          <p class="text-xs text-muted">sur {{ data.portfolioHealth.productCount }} produits</p>
        </UPageCard>
      </UPageGrid>

      <UTabs v-model="activeTab" :items="tabs" class="w-full">
        <!-- ═══ TAB 1: PRODUITS ═══ -->
        <template #produits>
          <div class="space-y-4 pt-4">
            <!-- Filters -->
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold text-highlighted">Filtres</p>
                  <UButton label="Reinitialiser" color="neutral" variant="ghost" size="xs" @click="resetFilters" />
                </div>
              </template>
              <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label class="text-xs text-muted uppercase block mb-1">Recherche</label>
                  <UInput v-model="search" placeholder="Nom, SKU..." icon="i-lucide-search" />
                </div>
                <div>
                  <label class="text-xs text-muted uppercase block mb-1">Categorie</label>
                  <USelect v-model="selectedType" :items="[{ label: 'Toutes', value: '' }, ...(data?.availableTypes || []).map((t: string) => ({ label: t, value: t }))]" value-key="value" />
                </div>
                <div>
                  <label class="text-xs text-muted uppercase block mb-1">Classe ABC</label>
                  <USelect v-model="abcFilter" :items="[{ label: 'Toutes', value: '' }, { label: 'A — 80% du CA', value: 'A' }, { label: 'B — 15% du CA', value: 'B' }, { label: 'C — 5% du CA', value: 'C' }]" value-key="value" />
                </div>
                <div>
                  <label class="text-xs text-muted uppercase block mb-1">Qte minimum</label>
                  <UInput v-model.number="minQuantity" type="number" :min="0" />
                </div>
                <div>
                  <label class="text-xs text-muted uppercase block mb-1">Marge % min</label>
                  <UInput v-model.number="minMargin" type="number" :min="0" :max="100"><template #trailing><span class="text-xs text-muted">%</span></template></UInput>
                </div>
                <div>
                  <label class="text-xs text-muted uppercase block mb-1">Retour % max</label>
                  <UInput v-model.number="maxReturnRate" type="number" :min="0" :max="100"><template #trailing><span class="text-xs text-muted">%</span></template></UInput>
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-xs text-muted uppercase block">Options</label>
                  <label class="flex items-center gap-2 text-sm cursor-pointer"><input v-model="groupVariants" type="checkbox" class="rounded" /> Regrouper variantes</label>
                  <label class="flex items-center gap-2 text-sm cursor-pointer"><input v-model="excludeGifts" type="checkbox" class="rounded" /> Exclure cadeaux</label>
                </div>
                <div class="flex items-end">
                  <p class="text-sm text-muted"><span class="text-highlighted font-semibold">{{ (data?.catalog || []).length }}</span> produits</p>
                </div>
              </div>
            </UCard>

            <!-- ABC -->
            <UPageGrid class="lg:grid-cols-3 gap-4">
              <UPageCard v-for="cls in (['A', 'B', 'C'] as const)" :key="cls" variant="subtle" class="mh-card-hover cursor-pointer" @click="abcFilter = abcFilter === cls ? '' : cls">
                <div class="flex items-center gap-3">
                  <UBadge :color="cls === 'A' ? 'success' : cls === 'B' ? 'warning' : 'neutral'" variant="subtle" class="text-lg font-bold px-3 py-1" :class="[abcFilter === cls && 'ring-2 ring-primary']">{{ cls }}</UBadge>
                  <div>
                    <p class="text-xs text-muted uppercase">{{ cls === 'A' ? '80% du CA' : cls === 'B' ? '15% du CA' : '5% du CA' }}</p>
                    <p class="text-lg font-semibold">{{ (data?.abcSummary as any)?.[cls]?.count || 0 }} produits</p>
                    <p class="text-sm text-muted">{{ fmtCurrency((data?.abcSummary as any)?.[cls]?.netSales || 0) }}</p>
                  </div>
                </div>
              </UPageCard>
            </UPageGrid>

            <!-- BCG -->
            <UCard class="mh-rainbow-border">
              <template #header>
                <p class="text-sm font-semibold text-highlighted">Matrice Performance : Marge % vs Volume</p>
                <p class="text-xs text-muted">Taille = CA Net | Couleur = Classe ABC</p>
              </template>
              <div class="relative h-80 border border-default rounded-lg overflow-hidden bg-white">
                <div class="absolute top-2 left-2 text-xs text-muted">Haute marge / Faible vol.</div>
                <div class="absolute top-2 right-2 text-xs text-muted text-right">Stars</div>
                <div class="absolute bottom-2 left-2 text-xs text-muted">Dogs</div>
                <div class="absolute bottom-2 right-2 text-xs text-muted text-right">Vol. / Faible marge</div>
                <div class="absolute left-1/2 top-0 bottom-0 w-px bg-mh-border" />
                <div class="absolute top-1/2 left-0 right-0 h-px bg-mh-border" />
                <div
                  v-for="(p, i) in (data?.bcgData || []).slice(0, 50)" :key="i"
                  class="absolute rounded-full opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                  :title="`${p.product}\nMarge: ${p.marginRate}%\nQte: ${p.quantity}\nCA: ${p.netSales} EUR`"
                  :style="{
                    left: `${Math.min(95, Math.max(5, (p.quantity / Math.max(...(data?.bcgData || []).map((x: any) => x.quantity || 1))) * 90))}%`,
                    bottom: `${Math.min(95, Math.max(5, (p.marginRate / 100) * 90))}%`,
                    width: `${Math.max(8, Math.min(40, Math.sqrt(Math.abs(p.netSales) / 10)))}px`,
                    height: `${Math.max(8, Math.min(40, Math.sqrt(Math.abs(p.netSales) / 10)))}px`,
                    backgroundColor: p.abcClass === 'A' ? 'var(--color-mh-mint)' : p.abcClass === 'B' ? 'var(--color-mh-lilac)' : 'var(--color-mh-peach)'
                  }"
                />
              </div>
            </UCard>

            <!-- Product table -->
            <UCard>
              <template #header>
                <p class="text-sm font-semibold text-highlighted">Profitabilite produit <span class="font-normal text-muted">({{ (data?.catalog || []).length }})</span></p>
              </template>
              <UTable :data="data?.catalog || []" :columns="productColumns" :ui="tableUi" />
            </UCard>
          </div>
        </template>

        <!-- ═══ TAB 2: CATEGORIES ═══ -->
        <template #categories>
          <div class="space-y-4 pt-4">
            <!-- KPI cards per category -->
            <UPageGrid class="lg:grid-cols-3 gap-4">
              <UPageCard
                v-for="(cat, i) in (data?.categoryStats || [])" :key="cat.type"
                variant="subtle" class="mh-card-hover cursor-pointer"
                @click="filterByType(cat.type)"
              >
                <div class="flex items-start gap-3">
                  <span class="w-3 h-3 rounded-full mt-1 shrink-0" :style="{ backgroundColor: pastelColors[i % pastelColors.length] }" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-highlighted truncate">{{ cat.type }}</p>
                    <p class="text-xs text-muted">{{ cat.productCount }} produits | {{ cat.revenueShare }}% du CA</p>
                    <div class="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div><span class="text-muted block">CA Net</span><span class="font-semibold">{{ fmtCurrency(cat.netSales) }}</span></div>
                      <div><span class="text-muted block">Marge</span><span class="font-semibold">{{ cat.marginRate }}%</span></div>
                      <div><span class="text-muted block">AOV</span><span class="font-semibold">{{ fmtCurrency(cat.aov) }}</span></div>
                      <div><span class="text-muted block">Qte</span><span class="font-semibold">{{ cat.quantity }}</span></div>
                      <div><span class="text-muted block">Commandes</span><span class="font-semibold">{{ cat.orders }}</span></div>
                      <div><span class="text-muted block">Retour</span><span class="font-semibold" :class="cat.returnRate > 5 ? 'text-red-600' : ''">{{ cat.returnRate }}%</span></div>
                    </div>
                  </div>
                </div>
              </UPageCard>
            </UPageGrid>

            <!-- Bar chart CA by category -->
            <UCard class="mh-rainbow-border">
              <template #header>
                <p class="text-sm font-semibold text-highlighted">CA Net par categorie</p>
              </template>
              <div class="space-y-2">
                <div v-for="(cat, i) in (data?.categoryStats || [])" :key="cat.type" class="flex items-center gap-3 cursor-pointer hover:bg-elevated/50 rounded px-1 py-0.5" @click="filterByType(cat.type)">
                  <span class="text-sm w-36 truncate">{{ cat.type }}</span>
                  <div class="flex-1 h-5 bg-muted/10 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" :style="{ width: `${Math.max(3, cat.revenueShare)}%`, backgroundColor: pastelColors[i % pastelColors.length] }" />
                  </div>
                  <span class="text-sm font-medium w-24 text-right">{{ fmtCurrency(cat.netSales) }}</span>
                  <span class="text-xs text-muted w-12 text-right">{{ cat.revenueShare }}%</span>
                </div>
              </div>
            </UCard>

            <!-- Category comparison table -->
            <UCard>
              <template #header>
                <p class="text-sm font-semibold text-highlighted">Comparatif categories</p>
              </template>
              <UTable :data="data?.categoryStats || []" :columns="categoryColumns" :ui="tableUi" />
            </UCard>
          </div>
        </template>

        <!-- ═══ TAB 3: CATALOGUE COMPLET ═══ -->
        <template #catalogue>
          <div class="space-y-4 pt-4">
            <div class="flex items-center gap-3">
              <UInput v-model="catalogSearch" placeholder="Rechercher un produit, SKU, type..." icon="i-lucide-search" class="flex-1" />
              <UButton icon="i-lucide-download" label="Export CSV" color="neutral" variant="outline" @click="exportCatalogCsv" />
            </div>

            <p class="text-sm text-muted">
              <span class="text-highlighted font-semibold">{{ filteredFullCatalog.length }}</span> produits individuels (tous, sans regroupement ni exclusion)
            </p>

            <UCard>
              <UTable :data="filteredFullCatalog" :columns="catalogColumns" :ui="tableUi" />
            </UCard>
          </div>
        </template>
      </UTabs>
    </template>
  </UDashboardPanel>
</template>
