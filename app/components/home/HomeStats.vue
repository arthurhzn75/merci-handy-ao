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

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  })
}

const kpis = computed(() => {
  if (!stats.value) return []
  return [
    {
      title: 'Chiffre d\'affaires net',
      icon: 'i-lucide-euro',
      value: formatCurrency(stats.value.revenue),
      variation: stats.value.revenueVariation
    },
    {
      title: 'Commandes nettes',
      icon: 'i-lucide-shopping-cart',
      value: stats.value.orders.toString(),
      variation: stats.value.ordersVariation
    },
    {
      title: 'Panier moyen',
      icon: 'i-lucide-receipt',
      value: formatCurrency(stats.value.aov),
      variation: stats.value.aovVariation
    },
    {
      title: 'Taux nouveaux clients',
      icon: 'i-lucide-user-plus',
      value: `${stats.value.newCustomerRate}%`,
      variation: stats.value.newCustomerRateVariation
    }
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
          :color="(kpi.variation ?? 0) >= 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ (kpi.variation ?? 0) >= 0 ? '+' : '' }}{{ kpi.variation ?? 0 }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
