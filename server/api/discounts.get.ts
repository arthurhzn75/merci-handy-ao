import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getDiscountsAnalysis, computeDataQualityMetrics, getDiscountsTrend } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  const lines = await getProductLines(from, to)
  const analysis = getDiscountsAnalysis(lines)
  const dataQuality = computeDataQualityMetrics(lines)
  const discountsTrend = getDiscountsTrend(lines, 'monthly')

  // Margin erosion
  const marginErosion = Math.round((analysis.withoutDiscount.marginRate - analysis.withDiscount.marginRate) * 100) / 100

  // Overall stats
  const totalOrders = analysis.withDiscount.orders + analysis.withoutDiscount.orders
  const totalGrossSales = analysis.withDiscount.netSales + analysis.withoutDiscount.netSales
  const totalDiscountAmount = analysis.topCodes.reduce((s: number, c: any) => s + Math.abs(c.totalDiscount), 0)
  const avgDiscountRate = totalGrossSales > 0 ? Math.round((totalDiscountAmount / totalGrossSales) * 10000) / 100 : 0
  const promoShare = totalOrders > 0 ? Math.round((analysis.withDiscount.orders / totalOrders) * 10000) / 100 : 0

  const overallStats = {
    totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
    avgDiscountRate,
    promoShare,
    marginErosion
  }

  // Code effectiveness: add ROI
  const topCodesWithROI = analysis.topCodes.map((c: any) => ({
    ...c,
    roi: Math.abs(c.totalDiscount) > 0 ? Math.round((c.totalSales / Math.abs(c.totalDiscount)) * 100) / 100 : 0,
    avgDiscountPerOrder: c.orders > 0 ? Math.round((Math.abs(c.totalDiscount) / c.orders) * 100) / 100 : 0
  }))

  return {
    ...analysis,
    topCodes: topCodesWithROI,
    dataQuality,
    discountsTrend,
    overallStats
  }
})
