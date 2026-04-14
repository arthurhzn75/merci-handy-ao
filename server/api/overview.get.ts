import { z } from 'zod'
import { subDays } from 'date-fns'
import {
  getProductLines, computeNetRevenue, computeNetOrders,
  computeNewCustomerRate, aggregateTimeSeries, getTopProducts
} from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily')
})

export default defineEventHandler((event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 14)

  // Current period
  const currentLines = getProductLines(from, to)
  const currentRevenue = computeNetRevenue(currentLines)
  const currentOrders = computeNetOrders(currentLines)
  const currentAov = currentOrders > 0 ? Math.round((currentRevenue / currentOrders) * 100) / 100 : 0
  const currentNewRate = computeNewCustomerRate(currentLines)

  // Previous period (same length)
  const periodLength = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - periodLength)

  const prevLines = getProductLines(prevFrom, prevTo)
  const prevRevenue = computeNetRevenue(prevLines)
  const prevOrders = computeNetOrders(prevLines)
  const prevAov = prevOrders > 0 ? Math.round((prevRevenue / prevOrders) * 100) / 100 : 0
  const prevNewRate = computeNewCustomerRate(prevLines)

  const variation = (current: number, prev: number): number => {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / Math.abs(prev)) * 10000) / 100
  }

  // Time series
  const timeSeries = aggregateTimeSeries(currentLines, query.granularity)

  // Top products
  const topProducts = getTopProducts(currentLines, 10)

  return {
    stats: {
      revenue: currentRevenue,
      revenueVariation: variation(currentRevenue, prevRevenue),
      orders: currentOrders,
      ordersVariation: variation(currentOrders, prevOrders),
      aov: currentAov,
      aovVariation: variation(currentAov, prevAov),
      newCustomerRate: Math.round(currentNewRate * 100) / 100,
      newCustomerRateVariation: variation(currentNewRate, prevNewRate)
    },
    timeSeries,
    topProducts
  }
})
