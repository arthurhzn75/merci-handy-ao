import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getProductProfitability, getCategoryStats, computeDataQualityMetrics } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  abc: z.string().optional(),
  excludeGifts: z.string().optional(),
  groupVariants: z.string().optional(),
  minQuantity: z.string().optional(),
  maxReturnRate: z.string().optional(),
  minMargin: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  const lines = await getProductLines(from, to)

  // --- Tab 1: Filtered product analysis ---
  const groupVariants = query.groupVariants === 'true'
  let catalog = getProductProfitability(lines, groupVariants)

  if (query.excludeGifts === 'true') catalog = catalog.filter(p => !p.isGift)
  if (query.type) catalog = catalog.filter(p => p.type === query.type)
  if (query.abc) catalog = catalog.filter(p => p.abcClass === query.abc)
  if (query.search) {
    const s = query.search.toLowerCase()
    catalog = catalog.filter(p =>
      p.product.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      p.variants.some(v => v.toLowerCase().includes(s))
    )
  }
  if (query.minQuantity) {
    const min = parseInt(query.minQuantity)
    if (min > 0) catalog = catalog.filter(p => p.quantity >= min)
  }
  if (query.maxReturnRate) {
    const max = parseFloat(query.maxReturnRate)
    catalog = catalog.filter(p => p.returnRate <= max)
  }
  if (query.minMargin) {
    const min = parseFloat(query.minMargin)
    catalog = catalog.filter(p => p.marginRate >= min)
  }

  // Recompute ABC after filtering
  const totalNet = catalog.reduce((a, p) => a + p.netSales, 0)
  let cumulative = 0
  for (const p of catalog) {
    p.revenueShare = totalNet > 0 ? Math.round((p.netSales / totalNet) * 10000) / 100 : 0
    cumulative += p.netSales
    const cumPct = totalNet > 0 ? (cumulative / totalNet) * 100 : 0
    if (cumPct <= 80) p.abcClass = 'A'
    else if (cumPct <= 95) p.abcClass = 'B'
    else p.abcClass = 'C'
  }

  const abcSummary = { A: { count: 0, netSales: 0 }, B: { count: 0, netSales: 0 }, C: { count: 0, netSales: 0 } }
  for (const p of catalog) {
    const cls = (p.abcClass || 'C') as 'A' | 'B' | 'C'
    abcSummary[cls].count++
    abcSummary[cls].netSales += p.netSales
  }

  const bcgData = catalog.map(p => ({
    product: p.product, type: p.type, quantity: p.quantity,
    marginRate: p.marginRate, netSales: p.netSales, abcClass: p.abcClass, isGift: p.isGift
  }))

  // --- Tab 2: Category stats ---
  const categoryStats = getCategoryStats(lines)

  // Available types from all data
  const availableTypes = [...new Set(lines.map(l => l.productType).filter(Boolean))].sort()

  // Data quality
  const dataQuality = computeDataQualityMetrics(lines)

  // Concentration index (HHI)
  const hhi = Math.round(catalog.reduce((sum, p) => sum + Math.pow(p.revenueShare, 2), 0) * 100)
  const top1Share = catalog.length > 0 ? catalog[0]!.revenueShare : 0
  const top3Share = catalog.slice(0, 3).reduce((s, p) => s + p.revenueShare, 0)
  const negativeMarginCount = catalog.filter(p => p.marginRate < 0).length

  const portfolioHealth = { hhi, top1Share, top3Share, negativeMarginCount, productCount: catalog.length }

  return { catalog, abcSummary, bcgData, categoryStats, availableTypes, dataQuality, portfolioHealth }
})
