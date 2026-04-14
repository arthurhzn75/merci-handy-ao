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

type DataRecord = { date: string; netSales: number; grossProfit: number; orders: number }

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

const data = computed<DataRecord[]>(() => rawData.value?.timeSeries || [])

const x = (_: DataRecord, i: number) => i
const yNetSales = (d: DataRecord) => d.netSales
const yGrossProfit = (d: DataRecord) => d.grossProfit

const totalNet = computed(() => data.value.reduce((a, d) => a + d.netSales, 0))

const fmtCurrency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return props.period === 'monthly'
    ? format(date, 'MMM yyyy', { locale: fr })
    : format(date, 'd MMM', { locale: fr })
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) return ''
  return formatDate(data.value[i]!.date)
}

const template = (d: DataRecord) =>
  `${formatDate(d.date)}<br/>CA Net: ${fmtCurrency(d.netSales)}<br/>Marge: ${fmtCurrency(d.grossProfit)}<br/>Commandes: ${d.orders}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }" class="mh-rainbow-border">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Evolution CA Net & Marge Brute
        </p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ fmtCurrency(totalNet) }}
        </p>
      </div>
    </template>

    <VisXYContainer :data="data" :padding="{ top: 40 }" class="h-96" :width="width">
      <VisArea :x="x" :y="yNetSales" color="var(--color-mh-lilac)" :opacity="0.12" />
      <VisLine :x="x" :y="yNetSales" color="var(--color-mh-lilac)" :line-width="2" />
      <VisLine :x="x" :y="yGrossProfit" color="var(--color-mh-mint)" :line-width="2" />
      <VisArea :x="x" :y="yGrossProfit" color="var(--color-mh-mint)" :opacity="0.08" />

      <VisAxis type="x" :x="x" :tick-format="xTicks" />
      <VisCrosshair color="var(--color-mh-lilac)" :template="template" />
      <VisTooltip />
    </VisXYContainer>

    <div class="flex items-center gap-4 px-6 pt-2 text-xs text-muted">
      <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-mh-lilac rounded" /> CA Net</span>
      <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-mh-mint rounded" /> Marge Brute</span>
    </div>
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
