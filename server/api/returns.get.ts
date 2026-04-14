import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getReturnsAnalysis, computeOverviewStats } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  const lines = await getProductLines(from, to)
  const analysis = getReturnsAnalysis(lines)
  const stats = computeOverviewStats(lines)

  return {
    ...analysis,
    globalReturnRate: stats.returnRate,
    totalItemsSold: stats.itemsSold
  }
})
