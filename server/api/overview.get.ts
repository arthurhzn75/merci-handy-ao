import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, computeOverviewStats, aggregateTimeSeries, getProductProfitability } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily')
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  const currentLines = await getProductLines(from, to)
  const currentStats = computeOverviewStats(currentLines)

  // Previous period
  const periodLength = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - periodLength)
  const prevLines = await getProductLines(prevFrom, prevTo)
  const prevStats = computeOverviewStats(prevLines)

  const variation = (current: number, prev: number): number => {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / Math.abs(prev)) * 10000) / 100
  }

  const timeSeries = aggregateTimeSeries(currentLines, query.granularity)
  const topProducts = getProductProfitability(currentLines).slice(0, 10)

  return {
    stats: {
      ...currentStats,
      netSalesVariation: variation(currentStats.netSales, prevStats.netSales),
      grossProfitVariation: variation(currentStats.grossProfit, prevStats.grossProfit),
      grossMarginRateVariation: variation(currentStats.grossMarginRate, prevStats.grossMarginRate),
      itemsSoldVariation: variation(currentStats.itemsSold, prevStats.itemsSold),
      ordersVariation: variation(currentStats.orders, prevStats.orders),
      aovVariation: variation(currentStats.aov, prevStats.aov),
      itemsPerOrderVariation: variation(currentStats.itemsPerOrder, prevStats.itemsPerOrder),
      returnRateVariation: variation(currentStats.returnRate, prevStats.returnRate)
    },
    timeSeries,
    topProducts
  }
})
