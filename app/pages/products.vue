<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({ start: sub(new Date(), { days: 30 }), end: new Date() })
const selectedType = ref('')
const search = ref('')
const abcFilter = ref('')
const excludeGifts = ref(true)
const groupVariants = ref(true)
const minQuantity = ref(0)
const maxReturnRate = ref(100)
const minMargin = ref(0)

const UBadge = resolveComponent('UBadge')

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
  default: () => ({ catalog: [], abcSummary: { A: { count: 0, netSales: 0 }, B: { count: 0, netSales: 0 }, C: { count: 0, netSales: 0 } }, bcgData: [], typeStats: [], availableTypes: [] })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'product',
    header: 'Produit',
    cell: ({ row }) => {
      const product = row.original
      const variants = product.variants || []
      const badge = product.isGift ? h(UBadge, { color: 'warning', variant: 'subtle', class: 'text-xs ml-1' }, () => 'Gift') : null
      const variantCount = variants.length > 0
        ? h('span', { class: 'text-xs text-muted ml-1', title: variants.join('\n') }, `(${variants.length} variantes)`)
        : null
      return h('div', { class: 'flex items-center gap-1 flex-wrap' }, [
        h('span', { class: 'font-medium' }, product.product),
        badge,
        variantCount
      ])
    }
  },
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
  { accessorKey: 'unitPrice', header: () => h('div', { class: 'text-right' }, 'Prix unit.'), cell: ({ row }) => h('div', { class: 'text-right' }, fmtCurrency(row.getValue('unitPrice') as number)) },
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
  },
  {
    accessorKey: 'revenueShare', header: () => h('div', { class: 'text-right' }, '% CA'),
    cell: ({ row }) => h('div', { class: 'text-right text-muted' }, `${row.getValue('revenueShare')}%`)
  }
]

function exportCsv() {
  const catalog = data.value?.catalog || []
  const headers = ['Produit', 'Variantes', 'Type', 'ABC', 'Gift', 'Qte', 'Prix unit.', 'CA Brut', 'Remises', 'CA Net', 'Marge', 'Marge %', 'Retour %', '% CA']
  const rows = catalog.map((p: any) => [
    `"${p.product}"`, `"${(p.variants || []).join(', ')}"`, p.type, p.abcClass, p.isGift,
    p.quantity, p.unitPrice, p.grossSales, p.discounts, p.netSales, p.grossProfit, p.marginRate, p.returnRate, p.revenueShare
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'produits-merci-handy.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function resetFilters() {
  selectedType.value = ''
  search.value = ''
  abcFilter.value = ''
  minQuantity.value = 0
  maxReturnRate.value = 100
  minMargin.value = 0
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
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- Filters panel -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-highlighted">Filtres</p>
            <UButton label="Reinitialiser" color="neutral" variant="ghost" size="xs" @click="resetFilters" />
          </div>
        </template>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div>
            <label class="text-xs text-muted uppercase block mb-1">Recherche</label>
            <UInput v-model="search" placeholder="Nom, SKU..." icon="i-lucide-search" />
          </div>

          <!-- Product type -->
          <div>
            <label class="text-xs text-muted uppercase block mb-1">Categorie</label>
            <USelect
              v-model="selectedType"
              :items="[{ label: 'Toutes', value: '' }, ...(data?.availableTypes || []).map((t: string) => ({ label: t, value: t }))]"
              value-key="value"
            />
          </div>

          <!-- ABC class -->
          <div>
            <label class="text-xs text-muted uppercase block mb-1">Classe ABC</label>
            <USelect
              v-model="abcFilter"
              :items="[
                { label: 'Toutes', value: '' },
                { label: 'A — 80% du CA', value: 'A' },
                { label: 'B — 15% du CA', value: 'B' },
                { label: 'C — 5% du CA', value: 'C' }
              ]"
              value-key="value"
            />
          </div>

          <!-- Min quantity -->
          <div>
            <label class="text-xs text-muted uppercase block mb-1">Qte minimum</label>
            <UInput v-model.number="minQuantity" type="number" :min="0" placeholder="0" />
          </div>

          <!-- Min margin -->
          <div>
            <label class="text-xs text-muted uppercase block mb-1">Marge % minimum</label>
            <UInput v-model.number="minMargin" type="number" :min="0" :max="100" placeholder="0">
              <template #trailing>
                <span class="text-xs text-muted">%</span>
              </template>
            </UInput>
          </div>

          <!-- Max return rate -->
          <div>
            <label class="text-xs text-muted uppercase block mb-1">Retour % maximum</label>
            <UInput v-model.number="maxReturnRate" type="number" :min="0" :max="100" placeholder="100">
              <template #trailing>
                <span class="text-xs text-muted">%</span>
              </template>
            </UInput>
          </div>

          <!-- Toggles -->
          <div class="flex flex-col gap-2">
            <label class="text-xs text-muted uppercase block">Options</label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="groupVariants" type="checkbox" class="rounded" />
              Regrouper les variantes
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="excludeGifts" type="checkbox" class="rounded" />
              Exclure les cadeaux / 100% OFF
            </label>
          </div>

          <!-- Summary -->
          <div class="flex items-end">
            <p class="text-sm text-muted">
              <span class="text-highlighted font-semibold">{{ (data?.catalog || []).length }}</span> produits affiches
            </p>
          </div>
        </div>
      </UCard>

      <!-- ABC Summary -->
      <UPageGrid class="lg:grid-cols-3 gap-4">
        <UPageCard
          v-for="cls in (['A', 'B', 'C'] as const)"
          :key="cls"
          variant="subtle"
          class="mh-card-hover cursor-pointer"
          @click="abcFilter = abcFilter === cls ? '' : cls"
        >
          <div class="flex items-center gap-3">
            <UBadge
              :color="cls === 'A' ? 'success' : cls === 'B' ? 'warning' : 'neutral'"
              variant="subtle"
              class="text-lg font-bold px-3 py-1"
              :class="[abcFilter === cls && 'ring-2 ring-primary']"
            >
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

      <!-- BCG Matrix -->
      <UCard class="mh-rainbow-border">
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Matrice Performance : Marge % vs Volume</p>
          <p class="text-xs text-muted">Taille = CA Net | Couleur = Classe ABC | Cliquez sur les ABC pour filtrer</p>
        </template>
        <div class="relative h-80 border border-default rounded-lg overflow-hidden bg-white">
          <div class="absolute top-2 left-2 text-xs text-muted">Haute marge / Faible volume</div>
          <div class="absolute top-2 right-2 text-xs text-muted text-right">Stars</div>
          <div class="absolute bottom-2 left-2 text-xs text-muted">Dogs</div>
          <div class="absolute bottom-2 right-2 text-xs text-muted text-right">Volume / Faible marge</div>
          <div class="absolute left-1/2 top-0 bottom-0 w-px bg-mh-border" />
          <div class="absolute top-1/2 left-0 right-0 h-px bg-mh-border" />
          <div
            v-for="(p, i) in (data?.bcgData || []).slice(0, 50)"
            :key="i"
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

      <!-- Type stats -->
      <UPageGrid class="lg:grid-cols-3 gap-4">
        <UPageCard
          v-for="ts in (data?.typeStats || [])"
          :key="ts.type"
          :title="ts.type || 'Sans type'"
          variant="subtle"
          :ui="{ container: 'gap-y-1', title: 'font-normal text-muted text-xs uppercase' }"
          class="mh-card-hover cursor-pointer"
          @click="selectedType = selectedType === ts.type ? '' : ts.type"
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
          <p class="text-sm font-semibold text-highlighted">
            Profitabilite produit
            <span class="font-normal text-muted">({{ (data?.catalog || []).length }} produits)</span>
          </p>
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
