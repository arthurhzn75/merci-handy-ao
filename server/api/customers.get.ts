import { z } from 'zod'
import { subDays, format, startOfMonth } from 'date-fns'
import { getProductLines, getCustomerStats } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
})

export default defineEventHandler((event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 14)

  const lines = getProductLines(from, to)
  const stats = getCustomerStats(lines)

  // Geo breakdown (top cities)
  const geoMap = new Map<string, { country: string; city: string; customers: Set<string> }>()
  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId) continue

    const key = `${line.shippingCountry}|||${line.shippingCity}`
    if (!geoMap.has(key)) {
      geoMap.set(key, {
        country: line.shippingCountry || 'Inconnu',
        city: line.shippingCity || 'Inconnu',
        customers: new Set()
      })
    }
    geoMap.get(key)!.customers.add(line.customerId)
  }

  const topCities = Array.from(geoMap.values())
    .map(g => ({
      country: g.country,
      city: g.city,
      customers: g.customers.size
    }))
    .sort((a, b) => b.customers - a.customers)
    .slice(0, 15)

  // Cohorts by customer creation month
  const cohortMap = new Map<string, { total: number; revenue: number }>()
  const customerRevenue = new Map<string, number>()
  const orderAovs = new Map<string, number>()
  const orderCustomer = new Map<string, string>()

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId) continue

    if (line.averageOrderValue > 0 && !orderAovs.has(line.orderId)) {
      orderAovs.set(line.orderId, line.averageOrderValue)
    }
    if (!orderCustomer.has(line.orderId)) {
      orderCustomer.set(line.orderId, line.customerId)
    }
  }

  for (const [orderId, customerId] of orderCustomer) {
    customerRevenue.set(customerId, (customerRevenue.get(customerId) || 0) + (orderAovs.get(orderId) || 0))
  }

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId || !line.customerCreatedAt) continue

    const cohortKey = format(startOfMonth(line.customerCreatedAt), 'yyyy-MM')
    if (!cohortMap.has(cohortKey)) {
      cohortMap.set(cohortKey, { total: 0, revenue: 0 })
    }
    // Only count each customer once per cohort
    const c = cohortMap.get(cohortKey)!
    // We'll use a simple approach
  }

  // Simplified cohort: customers grouped by creation month
  const customerCohort = new Map<string, Set<string>>()
  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId || !line.customerCreatedAt) continue

    const cohortKey = format(startOfMonth(line.customerCreatedAt), 'yyyy-MM')
    if (!customerCohort.has(cohortKey)) {
      customerCohort.set(cohortKey, new Set())
    }
    customerCohort.get(cohortKey)!.add(line.customerId)
  }

  const cohorts = Array.from(customerCohort.entries())
    .map(([month, customers]) => ({
      month,
      customers: customers.size,
      revenue: Array.from(customers).reduce((a, cId) => a + (customerRevenue.get(cId) || 0), 0)
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    stats,
    topCities,
    cohorts
  }
})
