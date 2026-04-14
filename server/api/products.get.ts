import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getProductProfitability } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  const lines = await getProductLines(from, to)
  let catalog = getProductProfitability(lines)

  if (query.type) catalog = catalog.filter(p => p.type === query.type)
  if (query.search) {
    const s = query.search.toLowerCase()
    catalog = catalog.filter(p => p.product.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
  }

  // ABC summary
  const abcSummary = {
    A: { count: 0, netSales: 0 },
    B: { count: 0, netSales: 0 },
    C: { count: 0, netSales: 0 }
  }
  for (const p of catalog) {
    const cls = (p.abcClass || 'C') as 'A' | 'B' | 'C'
    abcSummary[cls].count++
    abcSummary[cls].netSales += p.netSales
  }

  // BCG data: marginRate vs quantity, size = netSales
  const bcgData = catalog.map(p => ({
    product: p.product,
    type: p.type,
    quantity: p.quantity,
    marginRate: p.marginRate,
    netSales: p.netSales,
    abcClass: p.abcClass
  }))

  // Type stats
  const typeAgg = new Map<string, { quantity: number; netSales: number; grossProfit: number }>()
  for (const p of catalog) {
    if (!p.type) continue
    if (!typeAgg.has(p.type)) typeAgg.set(p.type, { quantity: 0, netSales: 0, grossProfit: 0 })
    const t = typeAgg.get(p.type)!
    t.quantity += p.quantity
    t.netSales += p.netSales
    t.grossProfit += p.grossProfit
  }
  const typeStats = Array.from(typeAgg.entries())
    .map(([type, s]) => ({ type, ...s, netSales: Math.round(s.netSales * 100) / 100, grossProfit: Math.round(s.grossProfit * 100) / 100 }))
    .sort((a, b) => b.netSales - a.netSales)

  const availableTypes = [...new Set(catalog.map(p => p.type).filter(Boolean))].sort()

  return { catalog, abcSummary, bcgData, typeStats, availableTypes }
})
