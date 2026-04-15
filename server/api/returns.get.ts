import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getReturnsAnalysis, computeOverviewStats, computeDataQualityMetrics, getReturnsTrend } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  let lines = await getProductLines(from, to)

  if (query.category) {
    lines = lines.filter(l => l.productType === query.category)
  }

  const analysis = getReturnsAnalysis(lines)
  const stats = computeOverviewStats(lines)
  const dataQuality = computeDataQualityMetrics(lines)
  const returnsTrend = getReturnsTrend(lines, 'monthly')

  // Return impact: lost margin as % of total gross profit
  const returnImpact = stats.grossProfit > 0 ? Math.round((analysis.totalLostMargin / stats.grossProfit) * 10000) / 100 : 0

  // Correlation: return rate of orders with vs without discount
  const allLines = await getProductLines(from, to)
  const orderDiscountMap = new Map<string, boolean>()
  for (const l of allLines) {
    if (l.orderActionType === 'ORDER' && l.saleActionType === 'ORDER') {
      if (!orderDiscountMap.has(l.orderId)) {
        orderDiscountMap.set(l.orderId, !!l.orderDiscountCode)
      }
    }
  }
  const withDiscount = { sold: 0, returned: 0 }
  const withoutDiscount = { sold: 0, returned: 0 }
  for (const l of allLines) {
    if (l.saleLineType !== 'PRODUCT') continue
    const hasDiscount = orderDiscountMap.get(l.orderId) || false
    const bucket = hasDiscount ? withDiscount : withoutDiscount
    if (l.salesQuantity > 0) bucket.sold += l.salesQuantity
    bucket.returned += l.itemsReturned
  }
  const returnCorrelation = {
    withDiscount: {
      returned: withDiscount.returned,
      returnRate: (withDiscount.sold + withDiscount.returned) > 0 ? Math.round((withDiscount.returned / (withDiscount.sold + withDiscount.returned)) * 10000) / 100 : 0
    },
    withoutDiscount: {
      returned: withoutDiscount.returned,
      returnRate: (withoutDiscount.sold + withoutDiscount.returned) > 0 ? Math.round((withoutDiscount.returned / (withoutDiscount.sold + withoutDiscount.returned)) * 10000) / 100 : 0
    }
  }

  // Available types for filter
  const availableTypes = [...new Set(allLines.map(l => l.productType).filter(Boolean))].sort()

  return {
    ...analysis,
    globalReturnRate: stats.returnRate,
    totalItemsSold: stats.itemsSold,
    dataQuality,
    returnsTrend,
    returnImpact,
    returnCorrelation,
    availableTypes
  }
})
