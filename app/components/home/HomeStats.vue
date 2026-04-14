<script setup lang="ts">
import type { Period, Range } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

const queryParams = computed(() => ({
  from: props.range.start.toISOString(),
  to: props.range.end.toISOString(),
  granularity: props.period
}))

const { data } = await useFetch('/api/overview', {
  query: queryParams,
  default: () => ({ stats: null, timeSeries: [], topProducts: [] })
})

const stats = computed(() => data.value?.stats)

function fmtCurrency(v: number) {
  return v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

const kpis = computed(() => {
  if (!stats.value) return []
  return [
    { title: 'CA Net', icon: 'i-lucide-euro', value: fmtCurrency(stats.value.netSales), variation: stats.value.netSalesVariation },
    { title: 'Marge Brute', icon: 'i-lucide-trending-up', value: fmtCurrency(stats.value.grossProfit), variation: stats.value.grossProfitVariation },
    { title: 'Taux de Marge', icon: 'i-lucide-percent', value: `${stats.value.grossMarginRate}%`, variation: stats.value.grossMarginRateVariation },
    { title: 'Items Vendus', icon: 'i-lucide-package', value: stats.value.itemsSold.toLocaleString('fr-FR'), variation: stats.value.itemsSoldVariation },
    { title: 'Commandes', icon: 'i-lucide-shopping-cart', value: stats.value.orders.toLocaleString('fr-FR'), variation: stats.value.ordersVariation },
    { title: 'Panier Moyen', icon: 'i-lucide-receipt', value: fmtCurrency(stats.value.aov), variation: stats.value.aovVariation },
    { title: 'Articles / Commande', icon: 'i-lucide-layers', value: stats.value.itemsPerOrder.toFixed(1), variation: stats.value.itemsPerOrderVariation },
    { title: 'Taux de Retour', icon: 'i-lucide-undo-2', value: `${stats.value.returnRate}%`, variation: stats.value.returnRateVariation, invertColor: true }
  ]
})
</script>

<template>
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
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ kpi.value }}
        </span>

        <UBadge
          v-if="kpi.variation !== undefined"
          :color="(kpi.invertColor ? (kpi.variation ?? 0) <= 0 : (kpi.variation ?? 0) >= 0) ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ (kpi.variation ?? 0) >= 0 ? '+' : '' }}{{ kpi.variation ?? 0 }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
