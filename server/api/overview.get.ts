import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, computeOverviewStats, aggregateTimeSeries, getProductProfitability, computeDataQualityMetrics, getDiscountsAnalysis } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily')
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  const currentLines = await getProductLines(from, to)
  const currentStats = computeOverviewStats(currentLines)

  // Previous period
  const periodLength = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - periodLength)
  const prevLines = await getProductLines(prevFrom, prevTo)
  const prevStats = computeOverviewStats(prevLines)

  const variation = (current: number, prev: number): number => {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / Math.abs(prev)) * 10000) / 100
  }

  const timeSeries = aggregateTimeSeries(currentLines, query.granularity)
  const topProducts = getProductProfitability(currentLines).slice(0, 10)
  const dataQuality = computeDataQualityMetrics(currentLines)

  // Cross-check
  const crossCheck = {
    grossSales: Math.round(currentStats.grossSales * 100) / 100,
    discounts: Math.round(currentStats.totalDiscounts * 100) / 100,
    returns: Math.round(currentStats.totalReturns * 100) / 100,
    expectedNetSales: Math.round((currentStats.grossSales + currentStats.totalDiscounts + currentStats.totalReturns) * 100) / 100,
    actualNetSales: Math.round(currentStats.netSales * 100) / 100,
    delta: Math.round((currentStats.netSales - (currentStats.grossSales + currentStats.totalDiscounts + currentStats.totalReturns)) * 100) / 100
  }

  // Insights strategiques
  const insights: { type: 'success' | 'warning' | 'info' | 'error'; icon: string; text: string }[] = []

  // 1. Concentration top 3
  const allProducts = getProductProfitability(currentLines)
  const totalRevenue = allProducts.reduce((s, p) => s + p.netSales, 0)
  if (totalRevenue > 0 && allProducts.length >= 3) {
    const top3Share = Math.round(allProducts.slice(0, 3).reduce((s, p) => s + p.netSales, 0) / totalRevenue * 10000) / 100
    if (top3Share > 70) {
      insights.push({ type: 'warning', icon: 'i-lucide-alert-triangle', text: `Le top 3 produits represente ${top3Share}% du CA — concentration elevee, risque de dependance.` })
    } else if (top3Share > 50) {
      insights.push({ type: 'info', icon: 'i-lucide-info', text: `Le top 3 produits represente ${top3Share}% du CA — concentration moderee.` })
    } else {
      insights.push({ type: 'success', icon: 'i-lucide-check-circle', text: `Le top 3 produits represente ${top3Share}% du CA — portefeuille diversifie.` })
    }
  }

  // 2. Marge vs periode precedente
  const margeDelta = variation(currentStats.grossMarginRate, prevStats.grossMarginRate)
  if (prevStats.grossMarginRate > 0) {
    if (margeDelta > 0) {
      insights.push({ type: 'success', icon: 'i-lucide-trending-up', text: `La marge brute est en hausse de ${Math.abs(margeDelta).toFixed(1)}% vs la periode precedente (${currentStats.grossMarginRate.toFixed(1)}%).` })
    } else if (margeDelta < -5) {
      insights.push({ type: 'error', icon: 'i-lucide-trending-down', text: `La marge brute est en baisse de ${Math.abs(margeDelta).toFixed(1)}% vs la periode precedente (${currentStats.grossMarginRate.toFixed(1)}%).` })
    } else if (margeDelta < 0) {
      insights.push({ type: 'warning', icon: 'i-lucide-trending-down', text: `La marge brute recule legerement de ${Math.abs(margeDelta).toFixed(1)}% vs la periode precedente (${currentStats.grossMarginRate.toFixed(1)}%).` })
    }
  }

  // 3. Taux de retour
  if (currentStats.returnRate > 10) {
    insights.push({ type: 'error', icon: 'i-lucide-package-x', text: `Taux de retour a ${currentStats.returnRate.toFixed(1)}% — niveau d'alerte, impact significatif sur la marge.` })
  } else if (currentStats.returnRate > 5) {
    insights.push({ type: 'warning', icon: 'i-lucide-package-x', text: `Taux de retour a ${currentStats.returnRate.toFixed(1)}% — a surveiller.` })
  } else {
    insights.push({ type: 'success', icon: 'i-lucide-package-check', text: `Taux de retour a ${currentStats.returnRate.toFixed(1)}% — niveau sain.` })
  }

  // 4. Part des commandes avec promo
  const discountData = getDiscountsAnalysis(currentLines)
  const totalOrders = discountData.withDiscount.orders + discountData.withoutDiscount.orders
  if (totalOrders > 0) {
    const promoShare = Math.round((discountData.withDiscount.orders / totalOrders) * 10000) / 100
    if (promoShare > 50) {
      insights.push({ type: 'warning', icon: 'i-lucide-tag', text: `${promoShare}% des commandes utilisent un code promo — attention a la dependance promotionnelle.` })
    } else {
      insights.push({ type: 'info', icon: 'i-lucide-tag', text: `${promoShare}% des commandes utilisent un code promo.` })
    }
  }

  return {
    stats: {
      ...currentStats,
      netSalesVariation: variation(currentStats.netSales, prevStats.netSales),
      grossProfitVariation: variation(currentStats.grossProfit, prevStats.grossProfit),
      grossMarginRateVariation: variation(currentStats.grossMarginRate, prevStats.grossMarginRate),
      itemsSoldVariation: variation(currentStats.itemsSold, prevStats.itemsSold),
      ordersVariation: variation(currentStats.orders, prevStats.orders),
      aovVariation: variation(currentStats.aov, prevStats.aov),
      itemsPerOrderVariation: variation(currentStats.itemsPerOrder, prevStats.itemsPerOrder),
      returnRateVariation: variation(currentStats.returnRate, prevStats.returnRate)
    },
    timeSeries,
    topProducts,
    dataQuality,
    crossCheck,
    insights
  }
})
