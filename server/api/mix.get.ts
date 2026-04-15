import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getMixByMonth, computeDataQualityMetrics, isGiftProduct } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  excludeGifts: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 365)

  let lines = await getProductLines(from, to)

  if (query.excludeGifts === 'true') {
    lines = lines.filter(l => !isGiftProduct(l.productTitle))
  }

  const mix = getMixByMonth(lines)

  // Type-level donut data (revenue + margin)
  const typeMap = new Map<string, { netSales: number; grossProfit: number }>()
  for (const line of lines) {
    if (!line.productType) continue
    if (!typeMap.has(line.productType)) typeMap.set(line.productType, { netSales: 0, grossProfit: 0 })
    const t = typeMap.get(line.productType)!
    t.netSales += line.netSales
    t.grossProfit += line.grossProfit
  }
  const totalNetSales = Array.from(typeMap.values()).reduce((s, t) => s + t.netSales, 0)
  const donut = Array.from(typeMap.entries())
    .map(([type, t]) => ({
      type,
      netSales: Math.round(t.netSales * 100) / 100,
      grossProfit: Math.round(t.grossProfit * 100) / 100,
      marginRate: t.netSales > 0 ? Math.round((t.grossProfit / t.netSales) * 10000) / 100 : 0,
      revenueShare: totalNetSales > 0 ? Math.round((t.netSales / totalNetSales) * 10000) / 100 : 0
    }))
    .sort((a, b) => b.netSales - a.netSales)

  // Price point analysis
  const priceRanges = [
    { label: '0-5 EUR', min: 0, max: 5 },
    { label: '5-10 EUR', min: 5, max: 10 },
    { label: '10-20 EUR', min: 10, max: 20 },
    { label: '20-30 EUR', min: 20, max: 30 },
    { label: '30-50 EUR', min: 30, max: 50 },
    { label: '50+ EUR', min: 50, max: 9999 }
  ]
  const totalQuantity = lines.filter(l => l.salesQuantity > 0).reduce((a, l) => a + l.salesQuantity, 0)
  const priceAnalysis = priceRanges.map(range => {
    const rangeLines = lines.filter(l =>
      l.unitPrice >= range.min && l.unitPrice < range.max && l.salesQuantity > 0
    )
    const netSales = rangeLines.reduce((a, l) => a + l.netSales, 0)
    const grossProfit = rangeLines.reduce((a, l) => a + l.grossProfit, 0)
    const quantity = rangeLines.reduce((a, l) => a + l.salesQuantity, 0)
    return {
      label: range.label,
      quantity,
      quantityShare: totalQuantity > 0 ? Math.round((quantity / totalQuantity) * 10000) / 100 : 0,
      netSales: Math.round(netSales * 100) / 100,
      marginRate: netSales > 0 ? Math.round((grossProfit / netSales) * 10000) / 100 : 0
    }
  })

  const dataQuality = computeDataQualityMetrics(lines)

  return { mix, donut, priceAnalysis, dataQuality }
})
