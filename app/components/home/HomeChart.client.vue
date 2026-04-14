<script setup lang="ts">
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip, VisStackedBar } from '@unovis/vue'
import type { Period, Range } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  date: string
  revenue: number
  orders: number
}

const { width } = useElementSize(cardRef)

const queryParams = computed(() => ({
  from: props.range.start.toISOString(),
  to: props.range.end.toISOString(),
  granularity: props.period
}))

const { data: rawData } = await useFetch('/api/overview', {
  query: queryParams,
  default: () => ({ stats: null, timeSeries: [], topProducts: [] })
})

const data = computed<DataRecord[]>(() => {
  return (rawData.value?.timeSeries || []).map((entry: any) => ({
    date: entry.date,
    revenue: entry.revenue,
    orders: entry.orders
  }))
})

const x = (_: DataRecord, i: number) => i
const yRevenue = (d: DataRecord) => d.revenue
const yOrders = (d: DataRecord) => d.orders

const totalRevenue = computed(() => data.value.reduce((acc, { revenue }) => acc + revenue, 0))

const formatCurrency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  switch (props.period) {
    case 'daily':
      return format(date, 'd MMM', { locale: fr })
    case 'weekly':
      return format(date, 'd MMM', { locale: fr })
    case 'monthly':
      return format(date, 'MMM yyyy', { locale: fr })
    default:
      return dateStr
  }
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }
  return formatDate(data.value[i]!.date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}<br/>CA: ${formatCurrency(d.revenue)}<br/>Commandes: ${d.orders}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }" class="mh-rainbow-border">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Evolution du CA net
        </p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ formatCurrency(totalRevenue) }}
        </p>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisArea
        :x="x"
        :y="yRevenue"
        color="var(--color-mh-lilac)"
        :opacity="0.15"
      />
      <VisLine
        :x="x"
        :y="yRevenue"
        color="var(--color-mh-lilac)"
      />

      <VisStackedBar
        :x="x"
        :y="[yOrders]"
        :color="['var(--color-mh-mint)']"
        :bar-width="0.4"
        :rounded-corners="4"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--color-mh-lilac)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--color-mh-lilac);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--mh-border);
  --vis-axis-tick-color: var(--mh-border);
  --vis-axis-tick-label-color: var(--mh-muted);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--mh-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
