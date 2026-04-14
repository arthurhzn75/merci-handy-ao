<script setup lang="ts">
import { h } from 'vue'
import { sub } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({ start: sub(new Date(), { years: 1 }), end: new Date() })

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString()
}))

const { data } = await useFetch('/api/mix', {
  query: queryParams,
  default: () => ({ mix: { months: [], types: [], data: [] }, donut: [], priceAnalysis: [] })
})

const fmtCurrency = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const donutTotal = computed(() => (data.value?.donut || []).reduce((a: number, d: any) => a + d.netSales, 0))

const pastelColors = ['var(--color-mh-mint)', 'var(--color-mh-sky)', 'var(--color-mh-lilac)', 'var(--color-mh-pink)', 'var(--color-mh-blush)', 'var(--color-mh-peach)']

const priceColumns: TableColumn<any>[] = [
  { accessorKey: 'label', header: 'Tranche de prix' },
  { accessorKey: 'quantity', header: () => h('div', { class: 'text-right' }, 'Qte'), cell: ({ row }) => h('div', { class: 'text-right' }, row.getValue('quantity')) },
  { accessorKey: 'netSales', header: () => h('div', { class: 'text-right' }, 'CA Net'), cell: ({ row }) => h('div', { class: 'text-right font-medium' }, fmtCurrency(row.getValue('netSales') as number)) },
  { accessorKey: 'marginRate', header: () => h('div', { class: 'text-right' }, 'Marge %'), cell: ({ row }) => h('div', { class: 'text-right' }, `${row.getValue('marginRate')}%`) }
]
</script>

<template>
  <UDashboardPanel id="mix">
    <template #header>
      <UDashboardNavbar title="Analyse du Mix Produit">
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
      <!-- Donut: repartition CA par type -->
      <div class="grid lg:grid-cols-2 gap-4">
        <UCard class="mh-rainbow-border">
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Repartition CA par categorie</p>
          </template>
          <div class="space-y-3">
            <div v-for="(d, i) in (data?.donut || [])" :key="d.type" class="flex items-center gap-3">
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: pastelColors[i % pastelColors.length] }" />
              <span class="text-sm flex-1 truncate">{{ d.type }}</span>
              <div class="w-32 h-4 bg-muted/10 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :style="{ width: `${donutTotal > 0 ? (d.netSales / donutTotal) * 100 : 0}%`, backgroundColor: pastelColors[i % pastelColors.length] }"
                />
              </div>
              <span class="text-sm font-medium w-20 text-right">{{ fmtCurrency(d.netSales) }}</span>
              <span class="text-xs text-muted w-12 text-right">{{ donutTotal > 0 ? ((d.netSales / donutTotal) * 100).toFixed(1) : 0 }}%</span>
            </div>
          </div>
        </UCard>

        <!-- Price point analysis -->
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-highlighted">Performance par tranche de prix</p>
          </template>
          <UTable
            :data="data?.priceAnalysis || []"
            :columns="priceColumns"
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

      <!-- Monthly mix stacked bars (simplified) -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Evolution du mix mensuel</p>
        </template>
        <div class="space-y-2 overflow-x-auto">
          <div v-for="row in (data?.mix?.data || [])" :key="row.month" class="flex items-center gap-2">
            <span class="text-xs text-muted w-16 shrink-0">{{ row.month }}</span>
            <div class="flex-1 h-6 flex rounded-full overflow-hidden">
              <div
                v-for="(type, i) in (data?.mix?.types || [])"
                :key="type"
                class="h-full"
                :style="{
                  width: `${Math.max(0, ((row as any)[type] || 0) / Math.max(1, Object.values(row as any).filter((v: any) => typeof v === 'number').reduce((a: number, b: number) => a + Math.max(0, b), 0) as number) * 100)}%`,
                  backgroundColor: pastelColors[i % pastelColors.length]
                }"
                :title="`${type}: ${fmtCurrency((row as any)[type] || 0)}`"
              />
            </div>
          </div>
          <!-- Legend -->
          <div class="flex flex-wrap gap-3 pt-2">
            <span v-for="(type, i) in (data?.mix?.types || [])" :key="type" class="flex items-center gap-1 text-xs text-muted">
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: pastelColors[i % pastelColors.length] }" />
              {{ type }}
            </span>
          </div>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
