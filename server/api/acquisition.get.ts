import { z } from 'zod'
import { subDays } from 'date-fns'
import { getProductLines, getTrafficBreakdown } from '../utils/dataset'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  model: z.enum(['first', 'last']).optional().default('last'),
  channel: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from ? new Date(query.from) : subDays(to, 30)

  let lines = await getProductLines(from, to)
  if (query.channel) lines = lines.filter(l => l.salesChannel === query.channel)

  const breakdown = getTrafficBreakdown(lines, query.model)

  const sourceAgg = new Map<string, number>()
  for (const row of breakdown) {
    sourceAgg.set(row.source, (sourceAgg.get(row.source) || 0) + row.revenue)
  }
  const topSources = Array.from(sourceAgg.entries())
    .map(([source, revenue]) => ({ source, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const channels = [...new Set(lines.map(l => l.salesChannel).filter(Boolean))].sort()

  return { breakdown, topSources, channels }
})
