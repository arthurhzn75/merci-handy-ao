import { readFileSync } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'
import {
  startOfDay, endOfDay, startOfWeek, startOfMonth,
  isWithinInterval, subDays, format, parseISO
} from 'date-fns'
import { fr } from 'date-fns/locale'

export interface LineItem {
  orderId: string
  orderName: string
  orderCreatedAt: Date
  orderUpdatedAt: Date
  fullyPaid: boolean
  customerId: string
  customerEmail: string
  customerCreatedAt: Date | null
  customerOrderIndex: number
  customerSaleType: string
  productTitle: string
  productType: string
  productTags: string
  productVendor: string
  sku: string
  variantTitle: string
  lineItemId: string
  lineItemName: string
  orderDiscountCode: string
  firstVisitSource: string
  firstVisitMedium: string
  firstVisitCampaign: string
  firstVisitContent: string
  lastVisitSource: string
  lastVisitMedium: string
  lastVisitCampaign: string
  lastVisitContent: string
  shopifyTrafficSource: string
  shopifyMedium: string
  shopifyCampaign: string
  salesChannel: string
  shippingCountry: string
  shippingCity: string
  shippingProvince: string
  shippingZipCode: string
  saleLineType: string
  saleId: string
  orderActionType: string
  saleActionType: string
  transactionTimestamp: Date
  compareAtPrice: number
  totalCostCogs: number
  duties: number
  tips: number
  averageOrderValue: number
  newCustomerOrders: number
  returningCustomerOrders: number
}

function parseNum(val: string | undefined): number {
  if (!val || val.trim() === '') return 0
  return parseFloat(val.replace(',', '.')) || 0
}

function parseDate(val: string | undefined): Date | null {
  if (!val || val.trim() === '') return null
  try {
    return parseISO(val)
  } catch {
    return null
  }
}

let _data: LineItem[] | null = null

export function loadDataset(): LineItem[] {
  if (_data) return _data

  const csvPath = join(process.cwd(), 'data', 'hzn_mh_data_funnel.io.csv')
  const csvContent = readFileSync(csvPath, 'utf-8')

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  })

  _data = (parsed.data as Record<string, string>[]).map((row) => ({
    orderId: row['Order ID'] || '',
    orderName: row['Order Name'] || '',
    orderCreatedAt: parseDate(row['Order Created At']) || new Date(),
    orderUpdatedAt: parseDate(row['Order Updated At']) || new Date(),
    fullyPaid: row['Fully Paid'] === 'True',
    customerId: row['Customer ID'] || '',
    customerEmail: row['Customer Email'] || '',
    customerCreatedAt: parseDate(row['Customer Created At']),
    customerOrderIndex: parseInt(row['Customer Order Index'] || '0') || 0,
    customerSaleType: row['Customer Sale Type'] || '',
    productTitle: row['Product Title'] || '',
    productType: row['Product Type'] || '',
    productTags: row['Product Tags'] || '',
    productVendor: row['Product Vendor'] || '',
    sku: row['SKU'] || '',
    variantTitle: row['Variant Title'] || '',
    lineItemId: row['Line Item ID'] || '',
    lineItemName: row['Line Item Name'] || '',
    orderDiscountCode: row['Order Discount Code'] || '',
    firstVisitSource: row['First Visit Source'] || '',
    firstVisitMedium: row['First Visit Medium'] || '',
    firstVisitCampaign: row['First Visit Campaign'] || '',
    firstVisitContent: row['First Visit Content'] || '',
    lastVisitSource: row['Last Visit Source'] || '',
    lastVisitMedium: row['Last Visit Medium'] || '',
    lastVisitCampaign: row['Last Visit Campaign'] || '',
    lastVisitContent: row['Last Visit Content'] || '',
    shopifyTrafficSource: row['Shopify Traffic Source'] || '',
    shopifyMedium: row['Shopify Medium'] || '',
    shopifyCampaign: row['Shopify Campaign'] || '',
    salesChannel: row['Sales Channel'] || '',
    shippingCountry: row['Shipping Country'] || '',
    shippingCity: row['Shipping City'] || '',
    shippingProvince: row['Shipping Province'] || '',
    shippingZipCode: row['Shipping Zip Code'] || '',
    saleLineType: row['Sale Line Type'] || '',
    saleId: row['Sale ID'] || '',
    orderActionType: row['Order Action Type'] || '',
    saleActionType: row['Sale Action Type'] || '',
    transactionTimestamp: parseDate(row['Transaction Timestamp']) || new Date(),
    compareAtPrice: parseNum(row['Compare At Price (EUR)']),
    totalCostCogs: parseNum(row['Total Cost - COGS (EUR)']),
    duties: parseNum(row['Duties (EUR)']),
    tips: parseNum(row['Tips (EUR)']),
    averageOrderValue: parseNum(row['Average Order Value (EUR)']),
    newCustomerOrders: parseNum(row['New Customer Orders']),
    returningCustomerOrders: parseNum(row['Returning Customer Orders'])
  }))

  console.log(`[dataset] Loaded ${_data.length} line items`)
  const dates = _data.map(d => d.orderCreatedAt.getTime())
  console.log(`[dataset] Date range: ${new Date(Math.min(...dates)).toISOString()} — ${new Date(Math.max(...dates)).toISOString()}`)

  return _data
}

export function reloadDataset(): LineItem[] {
  _data = null
  return loadDataset()
}

// Get product line items only (exclude SHIPPING, TIP, etc.)
export function getProductLines(from?: Date, to?: Date): LineItem[] {
  const data = loadDataset()
  return data.filter((item) => {
    if (item.saleLineType !== 'PRODUCT') return false
    if (from && to) {
      return isWithinInterval(item.orderCreatedAt, {
        start: startOfDay(from),
        end: endOfDay(to)
      })
    }
    return true
  })
}

// Get all lines within a date range
export function getLines(from?: Date, to?: Date): LineItem[] {
  const data = loadDataset()
  if (!from || !to) return data
  return data.filter((item) =>
    isWithinInterval(item.orderCreatedAt, {
      start: startOfDay(from),
      end: endOfDay(to)
    })
  )
}

// Collect AOV for each order across the entire dataset (order-level, not period-filtered)
function getOrderAovMap(): Map<string, number> {
  const data = loadDataset()
  const map = new Map<string, number>()
  for (const line of data) {
    if (line.averageOrderValue > 0 && !map.has(line.orderId)) {
      map.set(line.orderId, line.averageOrderValue)
    }
  }
  return map
}

// Compute net revenue: sum AOV of unique SALE orders minus REFUND orders
export function computeNetRevenue(lines: LineItem[]): number {
  const aovMap = getOrderAovMap()
  const saleOrderIds = new Set<string>()
  const refundOrderIds = new Set<string>()

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue

    if (line.orderActionType === 'ORDER' && line.saleActionType === 'ORDER') {
      saleOrderIds.add(line.orderId)
    } else if (line.orderActionType === 'REFUND' || line.saleActionType === 'RETURN') {
      refundOrderIds.add(line.orderId)
    }
  }

  let totalSales = 0
  for (const orderId of saleOrderIds) {
    totalSales += aovMap.get(orderId) || 0
  }

  let totalRefunds = 0
  for (const orderId of refundOrderIds) {
    if (saleOrderIds.has(orderId)) {
      totalRefunds += aovMap.get(orderId) || 0
    }
  }

  return Math.round((totalSales - totalRefunds) * 100) / 100
}

// Count net orders (only orders with a known AOV, to be consistent with revenue)
export function computeNetOrders(lines: LineItem[]): number {
  const aovMap = getOrderAovMap()
  const saleOrderIds = new Set<string>()
  const refundOrderIds = new Set<string>()

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType === 'ORDER' && line.saleActionType === 'ORDER') {
      if (aovMap.has(line.orderId)) {
        saleOrderIds.add(line.orderId)
      }
    } else if (line.orderActionType === 'REFUND' || line.saleActionType === 'RETURN') {
      refundOrderIds.add(line.orderId)
    }
  }

  let refundCount = 0
  for (const id of refundOrderIds) {
    if (saleOrderIds.has(id)) {
      refundCount++
    }
  }

  return saleOrderIds.size - refundCount
}

// New customer rate
export function computeNewCustomerRate(lines: LineItem[]): number {
  const orderCustomerType = new Map<string, string>()
  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType === 'ORDER' && line.saleActionType === 'ORDER') {
      if (!orderCustomerType.has(line.orderId)) {
        orderCustomerType.set(line.orderId, line.customerSaleType)
      }
    }
  }
  const total = orderCustomerType.size
  if (total === 0) return 0
  const newCount = Array.from(orderCustomerType.values()).filter(t => t === 'First-time').length
  return (newCount / total) * 100
}

// Aggregate time series
export function aggregateTimeSeries(
  lines: LineItem[],
  granularity: 'daily' | 'weekly' | 'monthly'
): { date: string; revenue: number; orders: number }[] {
  const buckets = new Map<string, { revenue: Set<string>; orders: Set<string>; refundOrders: Set<string> }>()

  const getBucketKey = (date: Date): string => {
    switch (granularity) {
      case 'daily':
        return format(date, 'yyyy-MM-dd')
      case 'weekly':
        return format(startOfWeek(date, { locale: fr }), 'yyyy-MM-dd')
      case 'monthly':
        return format(startOfMonth(date), 'yyyy-MM')
    }
  }

  // First pass: collect order IDs per bucket with their AOVs
  const orderAovs = new Map<string, number>()
  const orderBuckets = new Map<string, string>() // orderId -> bucketKey

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    const key = getBucketKey(line.orderCreatedAt)

    if (!buckets.has(key)) {
      buckets.set(key, { revenue: new Set(), orders: new Set(), refundOrders: new Set() })
    }
    const bucket = buckets.get(key)!

    if (line.orderActionType === 'ORDER' && line.saleActionType === 'ORDER') {
      bucket.orders.add(line.orderId)
      if (line.averageOrderValue > 0 && !orderAovs.has(line.orderId)) {
        orderAovs.set(line.orderId, line.averageOrderValue)
      }
      orderBuckets.set(line.orderId, key)
    } else if (line.orderActionType === 'REFUND' || line.saleActionType === 'RETURN') {
      bucket.refundOrders.add(line.orderId)
    }
  }

  const result = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => {
      let revenue = 0
      for (const orderId of bucket.orders) {
        revenue += orderAovs.get(orderId) || 0
      }
      for (const orderId of bucket.refundOrders) {
        if (bucket.orders.has(orderId)) {
          revenue -= orderAovs.get(orderId) || 0
        }
      }

      const netOrders = bucket.orders.size - Array.from(bucket.refundOrders).filter(id => bucket.orders.has(id)).length

      return {
        date,
        revenue: Math.round(revenue * 100) / 100,
        orders: netOrders
      }
    })

  return result
}

// Top products
export function getTopProducts(lines: LineItem[], limit = 10): {
  product: string
  type: string
  quantity: number
  revenue: number
  cogs: number
  margin: number
  revenueShare: number
}[] {
  const products = new Map<string, { type: string; quantity: number; revenue: number; cogs: number }>()

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT' || !line.productTitle) continue

    const sign = (line.orderActionType === 'REFUND' || line.saleActionType === 'RETURN') ? -1 : 1
    const key = line.productTitle

    if (!products.has(key)) {
      products.set(key, { type: line.productType, quantity: 0, revenue: 0, cogs: 0 })
    }
    const p = products.get(key)!
    p.quantity += sign
    p.revenue += sign * line.compareAtPrice
    p.cogs += Math.abs(line.totalCostCogs) * sign
  }

  const totalRevenue = Array.from(products.values()).reduce((a, p) => a + p.revenue, 0)

  return Array.from(products.entries())
    .map(([name, p]) => ({
      product: name,
      type: p.type,
      quantity: p.quantity,
      revenue: Math.round(p.revenue * 100) / 100,
      cogs: Math.round(p.cogs * 100) / 100,
      margin: Math.round((p.revenue - p.cogs) * 100) / 100,
      revenueShare: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 10000) / 100 : 0
    }))
    .filter(p => p.quantity > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

// Traffic breakdown
export function getTrafficBreakdown(
  lines: LineItem[],
  model: 'first' | 'last' = 'last'
): {
  source: string
  medium: string
  campaign: string
  orders: number
  revenue: number
  aov: number
  newCustomerRate: number
}[] {
  const groups = new Map<string, {
    orders: Set<string>
    orderAovs: Map<string, number>
    newOrders: number
    totalOrders: number
  }>()

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue

    const source = model === 'first' ? (line.firstVisitSource || 'direct') : (line.lastVisitSource || 'direct')
    const medium = model === 'first' ? (line.firstVisitMedium || '(none)') : (line.lastVisitMedium || '(none)')
    const campaign = model === 'first' ? (line.firstVisitCampaign || '(none)') : (line.lastVisitCampaign || '(none)')

    const key = `${source}|||${medium}|||${campaign}`

    if (!groups.has(key)) {
      groups.set(key, { orders: new Set(), orderAovs: new Map(), newOrders: 0, totalOrders: 0 })
    }
    const g = groups.get(key)!

    if (!g.orders.has(line.orderId)) {
      g.orders.add(line.orderId)
      if (line.averageOrderValue > 0) {
        g.orderAovs.set(line.orderId, line.averageOrderValue)
      }
      g.totalOrders++
      if (line.customerSaleType === 'First-time') {
        g.newOrders++
      }
    }
  }

  return Array.from(groups.entries())
    .map(([key, g]) => {
      const [source, medium, campaign] = key.split('|||')
      const revenue = Array.from(g.orderAovs.values()).reduce((a, b) => a + b, 0)
      return {
        source: source!,
        medium: medium!,
        campaign: campaign!,
        orders: g.orders.size,
        revenue: Math.round(revenue * 100) / 100,
        aov: g.orders.size > 0 ? Math.round((revenue / g.orders.size) * 100) / 100 : 0,
        newCustomerRate: g.totalOrders > 0 ? Math.round((g.newOrders / g.totalOrders) * 10000) / 100 : 0
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

// Products full catalog
export function getProductsCatalog(lines: LineItem[]): {
  product: string
  type: string
  sku: string
  quantity: number
  revenue: number
  cogs: number
  margin: number
  marginRate: number
  returnRate: number
}[] {
  const products = new Map<string, {
    type: string
    sku: string
    sold: number
    returned: number
    revenue: number
    cogs: number
  }>()

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT' || !line.productTitle) continue
    const key = line.productTitle

    if (!products.has(key)) {
      products.set(key, { type: line.productType, sku: line.sku, sold: 0, returned: 0, revenue: 0, cogs: 0 })
    }
    const p = products.get(key)!

    if (line.orderActionType === 'REFUND' || line.saleActionType === 'RETURN') {
      p.returned++
      p.revenue -= line.compareAtPrice
      p.cogs -= Math.abs(line.totalCostCogs)
    } else {
      p.sold++
      p.revenue += line.compareAtPrice
      p.cogs += Math.abs(line.totalCostCogs)
    }
  }

  return Array.from(products.entries())
    .map(([name, p]) => {
      const margin = p.revenue - p.cogs
      return {
        product: name,
        type: p.type,
        sku: p.sku,
        quantity: p.sold - p.returned,
        revenue: Math.round(p.revenue * 100) / 100,
        cogs: Math.round(p.cogs * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        marginRate: p.revenue > 0 ? Math.round((margin / p.revenue) * 10000) / 100 : 0,
        returnRate: p.sold > 0 ? Math.round((p.returned / p.sold) * 10000) / 100 : 0
      }
    })
    .filter(p => p.quantity > 0)
    .sort((a, b) => b.revenue - a.revenue)
}

// Customer stats
export function getCustomerStats(lines: LineItem[]): {
  uniqueCustomers: number
  newCustomerRate: number
  avgLtv: number
  avgFrequency: number
} {
  const customers = new Map<string, {
    revenue: number
    maxIndex: number
    isNew: boolean
  }>()

  const orderAovs = new Map<string, number>()

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId) continue

    if (line.averageOrderValue > 0 && !orderAovs.has(line.orderId)) {
      orderAovs.set(line.orderId, line.averageOrderValue)
    }

    if (!customers.has(line.customerId)) {
      customers.set(line.customerId, {
        revenue: 0,
        maxIndex: 0,
        isNew: line.customerSaleType === 'First-time'
      })
    }
    const c = customers.get(line.customerId)!
    c.maxIndex = Math.max(c.maxIndex, line.customerOrderIndex)
  }

  // Assign revenue per customer from order AOVs
  const orderCustomer = new Map<string, string>()
  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!orderCustomer.has(line.orderId) && line.customerId) {
      orderCustomer.set(line.orderId, line.customerId)
    }
  }
  for (const [orderId, customerId] of orderCustomer) {
    const aov = orderAovs.get(orderId) || 0
    const c = customers.get(customerId)
    if (c) c.revenue += aov
  }

  const total = customers.size
  if (total === 0) {
    return { uniqueCustomers: 0, newCustomerRate: 0, avgLtv: 0, avgFrequency: 0 }
  }

  const newCount = Array.from(customers.values()).filter(c => c.isNew).length
  const totalRevenue = Array.from(customers.values()).reduce((a, c) => a + c.revenue, 0)
  const totalFreq = Array.from(customers.values()).reduce((a, c) => a + c.maxIndex, 0)

  return {
    uniqueCustomers: total,
    newCustomerRate: Math.round((newCount / total) * 10000) / 100,
    avgLtv: Math.round((totalRevenue / total) * 100) / 100,
    avgFrequency: Math.round((totalFreq / total) * 100) / 100
  }
}

// Geo breakdown
export function getGeoBreakdown(lines: LineItem[]): {
  country: string
  city: string
  orders: number
  revenue: number
  revenueShare: number
}[] {
  const geos = new Map<string, { orders: Set<string>; orderAovs: Map<string, number> }>()

  for (const line of lines) {
    if (line.saleLineType !== 'PRODUCT') continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue

    const country = line.shippingCountry || 'Inconnu'
    const city = line.shippingCity || 'Inconnu'
    const key = `${country}|||${city}`

    if (!geos.has(key)) {
      geos.set(key, { orders: new Set(), orderAovs: new Map() })
    }
    const g = geos.get(key)!
    g.orders.add(line.orderId)
    if (line.averageOrderValue > 0 && !g.orderAovs.has(line.orderId)) {
      g.orderAovs.set(line.orderId, line.averageOrderValue)
    }
  }

  const allRevenue = Array.from(geos.values())
    .reduce((a, g) => a + Array.from(g.orderAovs.values()).reduce((x, y) => x + y, 0), 0)

  return Array.from(geos.entries())
    .map(([key, g]) => {
      const [country, city] = key.split('|||')
      const revenue = Array.from(g.orderAovs.values()).reduce((a, b) => a + b, 0)
      return {
        country: country!,
        city: city!,
        orders: g.orders.size,
        revenue: Math.round(revenue * 100) / 100,
        revenueShare: allRevenue > 0 ? Math.round((revenue / allRevenue) * 10000) / 100 : 0
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}
