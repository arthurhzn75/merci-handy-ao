import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getMixByMonth, computeOverviewStats } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
})

export default defineEventHandler((event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 365)

  const lines = getProductLines(from, to)
  const mix = getMixByMonth(lines)

  // Type-level donut data
  const typeMap = new Map<string, number>()
  for (const line of lines) {
    if (!line.productType) continue
    typeMap.set(line.productType, (typeMap.get(line.productType) || 0) + line.netSales)
  }
  const donut = Array.from(typeMap.entries())
    .map(([type, netSales]) => ({ type, netSales: Math.round(netSales * 100) / 100 }))
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
      netSales: Math.round(netSales * 100) / 100,
      marginRate: netSales > 0 ? Math.round((grossProfit / netSales) * 10000) / 100 : 0
    }
  })

  return { mix, donut, priceAnalysis }
})
