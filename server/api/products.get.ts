import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getProductsCatalog } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional()
})

export default defineEventHandler((event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 14)

  const lines = getProductLines(from, to)
  let catalog = getProductsCatalog(lines)

  if (query.type) {
    catalog = catalog.filter(p => p.type === query.type)
  }
  if (query.search) {
    const s = query.search.toLowerCase()
    catalog = catalog.filter(p => p.product.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
  }

  // Product types KPIs
  const typeAgg = new Map<string, { quantity: number; revenue: number; cogs: number }>()
  for (const p of catalog) {
    if (!p.type) continue
    if (!typeAgg.has(p.type)) {
      typeAgg.set(p.type, { quantity: 0, revenue: 0, cogs: 0 })
    }
    const t = typeAgg.get(p.type)!
    t.quantity += p.quantity
    t.revenue += p.revenue
    t.cogs += p.cogs
  }

  const typeStats = Array.from(typeAgg.entries())
    .map(([type, stats]) => ({
      type,
      quantity: stats.quantity,
      revenue: Math.round(stats.revenue * 100) / 100,
      margin: Math.round((stats.revenue - stats.cogs) * 100) / 100
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const availableTypes = [...new Set(lines.map(l => l.productType).filter(Boolean))].sort()

  return {
    catalog,
    typeStats,
    availableTypes
  }
})
