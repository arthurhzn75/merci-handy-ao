import { z } from 'zod'
import { subDays, format, startOfMonth } from 'date-fns'
import { getProductLines, getCustomerStats } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  const lines = await getProductLines(from, to)
  const stats = getCustomerStats(lines)

  // Top cities
  const geoMap = new Map<string, { country: string; city: string; customers: Set<string> }>()
  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId) continue
    const key = `${line.shippingCountry}|||${line.shippingCity}`
    if (!geoMap.has(key)) {
      geoMap.set(key, { country: line.shippingCountry || 'Inconnu', city: line.shippingCity || 'Inconnu', customers: new Set() })
    }
    geoMap.get(key)!.customers.add(line.customerId)
  }
  const topCities = Array.from(geoMap.values())
    .map(g => ({ country: g.country, city: g.city, customers: g.customers.size }))
    .sort((a, b) => b.customers - a.customers)
    .slice(0, 15)

  // Cohorts
  const customerCohort = new Map<string, Set<string>>()
  const customerRevenue = new Map<string, number>()
  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId) continue
    customerRevenue.set(line.customerId, (customerRevenue.get(line.customerId) || 0) + line.netSales)
    if (line.customerCreatedAt) {
      const cohortKey = format(startOfMonth(line.customerCreatedAt), 'yyyy-MM')
      if (!customerCohort.has(cohortKey)) customerCohort.set(cohortKey, new Set())
      customerCohort.get(cohortKey)!.add(line.customerId)
    }
  }
  const cohorts = Array.from(customerCohort.entries())
    .map(([month, customers]) => ({
      month,
      customers: customers.size,
      revenue: Math.round(Array.from(customers).reduce((a, cId) => a + (customerRevenue.get(cId) || 0), 0) * 100) / 100
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return { stats, topCities, cohorts }
})
