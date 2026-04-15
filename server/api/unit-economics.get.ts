import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getUnitEconomics, computeOverviewStats, computeDataQualityMetrics } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 365)

  const lines = await getProductLines(from, to)
  const economics = getUnitEconomics(lines)
  const stats = computeOverviewStats(lines)
  const dataQuality = computeDataQualityMetrics(lines)

  // Overall summary
  const overallSummary = {
    orders: stats.orders,
    aov: stats.aov,
    marginRate: stats.grossMarginRate,
    avgMarginPerOrder: stats.orders > 0 ? Math.round((stats.grossProfit / stats.orders) * 100) / 100 : 0,
    avgFrequency: economics.avgFrequency,
    totalCustomers: economics.totalCustomers
  }

  // Frequency distribution
  const customerFreq = new Map<string, Set<string>>()
  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId) continue
    if (!customerFreq.has(line.customerId)) customerFreq.set(line.customerId, new Set())
    customerFreq.get(line.customerId)!.add(line.orderId)
  }
  const freqBuckets = new Map<string, number>()
  for (const orders of customerFreq.values()) {
    const key = orders.size >= 4 ? '4+' : String(orders.size)
    freqBuckets.set(key, (freqBuckets.get(key) || 0) + 1)
  }
  const frequencyDistribution = ['1', '2', '3', '4+'].map(bucket => ({
    bucket,
    customers: freqBuckets.get(bucket) || 0,
    share: customerFreq.size > 0 ? Math.round(((freqBuckets.get(bucket) || 0) / customerFreq.size) * 10000) / 100 : 0
  }))

  return {
    ...economics,
    overallSummary,
    frequencyDistribution,
    dataQuality
  }
})
