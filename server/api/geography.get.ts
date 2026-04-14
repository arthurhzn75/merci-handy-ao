import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getGeoBreakdown } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  const lines = await getProductLines(from, to)
  const breakdown = getGeoBreakdown(lines)

  const countryMap = new Map<string, { orders: number; revenue: number }>()
  for (const row of breakdown) {
    if (!countryMap.has(row.country)) countryMap.set(row.country, { orders: 0, revenue: 0 })
    const c = countryMap.get(row.country)!
    c.orders += row.orders
    c.revenue += row.revenue
  }
  const totalRevenue = Array.from(countryMap.values()).reduce((a, c) => a + c.revenue, 0)
  const countries = Array.from(countryMap.entries())
    .map(([country, s]) => ({
      country, orders: s.orders,
      revenue: Math.round(s.revenue * 100) / 100,
      revenueShare: totalRevenue > 0 ? Math.round((s.revenue / totalRevenue) * 10000) / 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)

  return { cities: breakdown, countries }
})
