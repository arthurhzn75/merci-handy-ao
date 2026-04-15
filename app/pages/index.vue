<script setup lang="ts">
import { sub } from 'date-fns'
import type { Period, Range } from '~/types'

useDashboard()

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')

const queryParams = computed(() => ({
  from: range.value.start.toISOString(),
  to: range.value.end.toISOString(),
  granularity: period.value
}))

const { data } = await useFetch('/api/overview', {
  query: queryParams,
  default: () => ({ stats: null, timeSeries: [], topProducts: [], dataQuality: null, crossCheck: null, insights: [] })
})

const insightColor = (type: string) => {
  if (type === 'success') return 'success'
  if (type === 'warning') return 'warning'
  if (type === 'error') return 'error'
  return 'info'
}
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Vue d'ensemble" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
          <HomePeriodSelect v-model="period" :range="range" />
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

      <HomeStats :period="period" :range="range" />

      <!-- Insights strategiques -->
      <UCard v-if="data?.insights?.length" class="mh-rainbow-border">
        <template #header>
          <p class="text-sm font-semibold text-highlighted">Insights strategiques</p>
        </template>
        <div class="flex flex-col gap-2">
          <div
            v-for="(insight, i) in data.insights"
            :key="i"
            class="flex items-start gap-2.5 text-sm"
          >
            <UBadge :color="insightColor(insight.type)" variant="subtle" class="mt-0.5 shrink-0">
              <UIcon :name="insight.icon" class="size-3.5" />
            </UBadge>
            <span class="text-muted">{{ insight.text }}</span>
          </div>
        </div>
      </UCard>

      <HomeChart :period="period" :range="range" />
      <HomeTopProducts :period="period" :range="range" />
    </template>
  </UDashboardPanel>
</template>
