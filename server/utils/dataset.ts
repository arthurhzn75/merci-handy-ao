import Papa from 'papaparse'
import {
  startOfDay, endOfDay, startOfWeek, startOfMonth,
  isWithinInterval, format, parseISO
} from 'date-fns'
import { fr } from 'date-fns/locale'

export interface LineItem {
  orderId: string
  orderName: string
  orderCreatedAt: Date
  customerId: string
  customerEmail: string
  customerCreatedAt: Date | null
  customerOrderIndex: number
  customerSaleType: string
  productTitle: string
  productType: string
  productTags: string
  sku: string
  orderDiscountCode: string
  firstVisitSource: string
  firstVisitMedium: string
  firstVisitCampaign: string
  lastVisitSource: string
  lastVisitMedium: string
  lastVisitCampaign: string
  shopifyTrafficSource: string
  shopifyMedium: string
  shopifyCampaign: string
  salesChannel: string
  shippingCountry: string
  shippingCity: string
  saleLineType: string
  orderActionType: string
  saleActionType: string
  // New rich columns
  netSales: number
  grossSales: number
  grossProfit: number
  grossMargin: number
  discounts: number
  returns: number
  salesQuantity: number
  itemsSold: number
  itemsReturned: number
  unitPrice: number
  averageOrderValue: number
  taxes: number
  totalSales: number
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

function parseRows(csvContent: string): LineItem[] {
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  })

  const items = (parsed.data as Record<string, string>[]).map((row) => ({
    orderId: row['Order ID'] || '',
    orderName: row['Order Name'] || '',
    orderCreatedAt: parseDate(row['Order Created At']) || new Date(),
    customerId: row['Customer ID'] || '',
    customerEmail: row['Customer Email'] || '',
    customerCreatedAt: parseDate(row['Customer Created At']),
    customerOrderIndex: parseInt(row['Customer Order Index'] || '0') || 0,
    customerSaleType: row['Customer Sale Type'] || '',
    productTitle: row['Product Title'] || '',
    productType: row['Product Type'] || '',
    productTags: row['Product Tags'] || '',
    sku: row['SKU'] || '',
    orderDiscountCode: row['Order Discount Code'] || '',
    firstVisitSource: row['First Visit Source'] || '',
    firstVisitMedium: row['First Visit Medium'] || '',
    firstVisitCampaign: row['First Visit Campaign'] || '',
    lastVisitSource: row['Last Visit Source'] || '',
    lastVisitMedium: row['Last Visit Medium'] || '',
    lastVisitCampaign: row['Last Visit Campaign'] || '',
    shopifyTrafficSource: row['Shopify Traffic Source'] || '',
    shopifyMedium: row['Shopify Medium'] || '',
    shopifyCampaign: row['Shopify Campaign'] || '',
    salesChannel: row['Sales Channel'] || '',
    shippingCountry: row['Shipping Country'] || '',
    shippingCity: row['Shipping City'] || '',
    saleLineType: row['Sale Line Type'] || '',
    orderActionType: row['Order Action Type'] || '',
    saleActionType: row['Sale Action Type'] || '',
    netSales: parseNum(row['Net Sales (EUR)']),
    grossSales: parseNum(row['Gross Sales (EUR)']),
    grossProfit: parseNum(row['Gross Profit (EUR)']),
    grossMargin: parseNum(row['Gross Margin']),
    discounts: parseNum(row['Discounts (EUR)']),
    returns: parseNum(row['Returns (EUR)']),
    salesQuantity: parseNum(row['Sales Quantity']),
    itemsSold: parseNum(row['Items Sold']),
    itemsReturned: parseNum(row['Items Returned']),
    unitPrice: parseNum(row['Line Item Original Unit Price (EUR)']),
    averageOrderValue: parseNum(row['Average Order Value (EUR)']),
    taxes: parseNum(row['Taxes (EUR)']),
    totalSales: parseNum(row['Total Sales (EUR)']),
    newCustomerOrders: parseNum(row['New Customer Orders']),
    returningCustomerOrders: parseNum(row['Returning Customer Orders'])
  }))

  console.log(`[dataset] Parsed ${items.length} line items`)
  return items
}

export async function loadDataset(): Promise<LineItem[]> {
  if (_data) return _data

  let csvContent: string | null = null

  // Try Nitro server assets (works in dev and production)
  try {
    const storage = useStorage('assets:server')
    const raw = await storage.getItemRaw('dataset.csv')
    if (raw) {
      // raw can be Buffer, ArrayBuffer, or string depending on runtime
      if (typeof raw === 'string') {
        csvContent = raw
      } else if (raw instanceof Buffer) {
        csvContent = raw.toString('utf-8')
      } else if (raw instanceof Uint8Array) {
        csvContent = new TextDecoder().decode(raw)
      } else {
        csvContent = String(raw)
      }
    }
  } catch (e) {
    console.warn('[dataset] Storage read failed, trying fallback:', e)
  }

  // Fallback: direct file read (dev environment)
  if (!csvContent) {
    try {
      const { readFileSync } = await import('fs')
      const { join } = await import('path')
      const filePath = join(process.cwd(), 'server', 'assets', 'dataset.csv')
      csvContent = readFileSync(filePath, 'utf-8')
    } catch (e) {
      console.error('[dataset] Fallback file read also failed:', e)
    }
  }

  if (!csvContent) {
    console.error('[dataset] CSV file not found')
    return []
  }

  _data = parseRows(csvContent)
  console.log(`[dataset] Loaded ${_data.length} line items`)
  return _data
}

export async function reloadDataset(): Promise<LineItem[]> {
  _data = null
  return loadDataset()
}

// Filter PRODUCT lines by date range
export async function getProductLines(from?: Date, to?: Date): Promise<LineItem[]> {
  const data = await loadDataset()
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

// ─── Overview KPIs ───────────────────────────────────────────────

export function computeOverviewStats(lines: LineItem[]) {
  let netSales = 0
  let grossProfit = 0
  let grossSales = 0
  let totalDiscounts = 0
  let totalReturns = 0
  let totalItemsSold = 0
  let totalItemsReturned = 0
  const orderIds = new Set<string>()
  const orderCustomerType = new Map<string, string>()

  for (const line of lines) {
    netSales += line.netSales
    grossProfit += line.grossProfit
    grossSales += line.grossSales
    totalDiscounts += line.discounts
    totalReturns += line.returns
    if (line.salesQuantity > 0) totalItemsSold += line.salesQuantity
    totalItemsReturned += line.itemsReturned

    if (line.orderActionType === 'ORDER' && line.saleActionType === 'ORDER') {
      orderIds.add(line.orderId)
      if (!orderCustomerType.has(line.orderId)) {
        orderCustomerType.set(line.orderId, line.customerSaleType)
      }
    }
  }

  const orders = orderIds.size
  const newCount = Array.from(orderCustomerType.values()).filter(t => t === 'First-time').length
  const totalTyped = orderCustomerType.size

  return {
    netSales: Math.round(netSales * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginRate: netSales !== 0 ? Math.round((grossProfit / netSales) * 10000) / 100 : 0,
    itemsSold: totalItemsSold,
    orders,
    aov: orders > 0 ? Math.round((netSales / orders) * 100) / 100 : 0,
    itemsPerOrder: orders > 0 ? Math.round((totalItemsSold / orders) * 100) / 100 : 0,
    returnRate: (totalItemsSold + totalItemsReturned) > 0
      ? Math.round((totalItemsReturned / (totalItemsSold + totalItemsReturned)) * 10000) / 100
      : 0,
    newCustomerRate: totalTyped > 0 ? Math.round((newCount / totalTyped) * 10000) / 100 : 0,
    grossSales: Math.round(grossSales * 100) / 100,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    totalReturns: Math.round(totalReturns * 100) / 100
  }
}

// ─── Time series ─────────────────────────────────────────────────

export function aggregateTimeSeries(
  lines: LineItem[],
  granularity: 'daily' | 'weekly' | 'monthly'
) {
  const buckets = new Map<string, { netSales: number; grossProfit: number; orders: Set<string> }>()

  const getBucketKey = (date: Date): string => {
    switch (granularity) {
      case 'daily': return format(date, 'yyyy-MM-dd')
      case 'weekly': return format(startOfWeek(date, { locale: fr }), 'yyyy-MM-dd')
      case 'monthly': return format(startOfMonth(date), 'yyyy-MM')
    }
  }

  for (const line of lines) {
    const key = getBucketKey(line.orderCreatedAt)
    if (!buckets.has(key)) {
      buckets.set(key, { netSales: 0, grossProfit: 0, orders: new Set() })
    }
    const b = buckets.get(key)!
    b.netSales += line.netSales
    b.grossProfit += line.grossProfit
    if (line.orderActionType === 'ORDER' && line.saleActionType === 'ORDER') {
      b.orders.add(line.orderId)
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      netSales: Math.round(b.netSales * 100) / 100,
      grossProfit: Math.round(b.grossProfit * 100) / 100,
      orders: b.orders.size
    }))
}

// ─── Product profitability ───────────────────────────────────────

export interface ProductStats {
  product: string
  type: string
  sku: string
  quantity: number
  grossSales: number
  discounts: number
  returnAmount: number
  netSales: number
  grossProfit: number
  marginRate: number
  unitPrice: number
  itemsReturned: number
  returnRate: number
  abcClass?: string
  revenueShare: number
}

export function getProductProfitability(lines: LineItem[]): ProductStats[] {
  const products = new Map<string, {
    type: string; sku: string
    quantity: number; grossSales: number; discounts: number; returnAmount: number
    netSales: number; grossProfit: number; unitPrice: number
    itemsSold: number; itemsReturned: number
  }>()

  for (const line of lines) {
    if (!line.productTitle) continue
    const key = line.productTitle

    if (!products.has(key)) {
      products.set(key, {
        type: line.productType, sku: line.sku,
        quantity: 0, grossSales: 0, discounts: 0, returnAmount: 0,
        netSales: 0, grossProfit: 0, unitPrice: line.unitPrice,
        itemsSold: 0, itemsReturned: 0
      })
    }
    const p = products.get(key)!
    p.quantity += line.salesQuantity
    p.grossSales += line.grossSales
    p.discounts += line.discounts
    p.returnAmount += line.returns
    p.netSales += line.netSales
    p.grossProfit += line.grossProfit
    if (line.salesQuantity > 0) p.itemsSold += line.salesQuantity
    p.itemsReturned += line.itemsReturned
    if (line.unitPrice > 0) p.unitPrice = line.unitPrice
  }

  const allProducts = Array.from(products.entries())
    .map(([name, p]) => ({
      product: name,
      type: p.type,
      sku: p.sku,
      quantity: p.quantity,
      grossSales: Math.round(p.grossSales * 100) / 100,
      discounts: Math.round(p.discounts * 100) / 100,
      returnAmount: Math.round(p.returnAmount * 100) / 100,
      netSales: Math.round(p.netSales * 100) / 100,
      grossProfit: Math.round(p.grossProfit * 100) / 100,
      marginRate: p.netSales > 0 ? Math.round((p.grossProfit / p.netSales) * 10000) / 100 : 0,
      unitPrice: Math.round(p.unitPrice * 100) / 100,
      itemsReturned: p.itemsReturned,
      returnRate: p.itemsSold > 0 ? Math.round((p.itemsReturned / p.itemsSold) * 10000) / 100 : 0,
      revenueShare: 0
    }))
    .filter(p => p.quantity > 0)
    .sort((a, b) => b.netSales - a.netSales)

  // Compute revenue share and ABC classification
  const totalNet = allProducts.reduce((a, p) => a + p.netSales, 0)
  let cumulative = 0
  for (const p of allProducts) {
    p.revenueShare = totalNet > 0 ? Math.round((p.netSales / totalNet) * 10000) / 100 : 0
    cumulative += p.netSales
    const cumPct = totalNet > 0 ? (cumulative / totalNet) * 100 : 0
    if (cumPct <= 80) p.abcClass = 'A'
    else if (cumPct <= 95) p.abcClass = 'B'
    else p.abcClass = 'C'
  }

  return allProducts
}

// ─── Mix analysis (by product type over months) ──────────────────

export function getMixByMonth(lines: LineItem[]) {
  const buckets = new Map<string, Map<string, number>>()
  const allTypes = new Set<string>()

  for (const line of lines) {
    if (!line.productType) continue
    const month = format(startOfMonth(line.orderCreatedAt), 'yyyy-MM')
    allTypes.add(line.productType)
    if (!buckets.has(month)) buckets.set(month, new Map())
    const m = buckets.get(month)!
    m.set(line.productType, (m.get(line.productType) || 0) + line.netSales)
  }

  const months = Array.from(buckets.keys()).sort()
  const types = Array.from(allTypes).sort()

  return {
    months,
    types,
    data: months.map(month => {
      const m = buckets.get(month)!
      const row: Record<string, number> = { }
      for (const type of types) {
        row[type] = Math.round((m.get(type) || 0) * 100) / 100
      }
      return { month, ...row }
    })
  }
}

// ─── Returns analysis ────────────────────────────────────────────

export function getReturnsAnalysis(lines: LineItem[]) {
  const products = new Map<string, {
    type: string; sold: number; returned: number; returnAmount: number; lostMargin: number
  }>()

  for (const line of lines) {
    if (!line.productTitle) continue
    const key = line.productTitle
    if (!products.has(key)) {
      products.set(key, { type: line.productType, sold: 0, returned: 0, returnAmount: 0, lostMargin: 0 })
    }
    const p = products.get(key)!
    if (line.salesQuantity > 0) p.sold += line.salesQuantity
    p.returned += line.itemsReturned
    p.returnAmount += line.returns
    if (line.saleActionType === 'RETURN') {
      p.lostMargin += Math.abs(line.grossProfit)
    }
  }

  // By product
  const byProduct = Array.from(products.entries())
    .map(([name, p]) => ({
      product: name,
      type: p.type,
      sold: p.sold,
      returned: p.returned,
      returnRate: p.sold > 0 ? Math.round((p.returned / p.sold) * 10000) / 100 : 0,
      returnAmount: Math.round(p.returnAmount * 100) / 100,
      lostMargin: Math.round(p.lostMargin * 100) / 100
    }))
    .filter(p => p.returned > 0)
    .sort((a, b) => b.returnRate - a.returnRate)

  // By type
  const typeMap = new Map<string, { sold: number; returned: number; returnAmount: number }>()
  for (const [, p] of products) {
    if (!p.type) continue
    if (!typeMap.has(p.type)) typeMap.set(p.type, { sold: 0, returned: 0, returnAmount: 0 })
    const t = typeMap.get(p.type)!
    t.sold += p.sold
    t.returned += p.returned
    t.returnAmount += p.returnAmount
  }

  const byType = Array.from(typeMap.entries())
    .map(([type, t]) => ({
      type,
      sold: t.sold,
      returned: t.returned,
      returnRate: t.sold > 0 ? Math.round((t.returned / t.sold) * 10000) / 100 : 0,
      returnAmount: Math.round(t.returnAmount * 100) / 100
    }))
    .sort((a, b) => b.returnRate - a.returnRate)

  const totalReturns = Array.from(products.values()).reduce((a, p) => a + p.returnAmount, 0)
  const totalLostMargin = Array.from(products.values()).reduce((a, p) => a + p.lostMargin, 0)

  return {
    byProduct,
    byType,
    totalReturns: Math.round(totalReturns * 100) / 100,
    totalLostMargin: Math.round(totalLostMargin * 100) / 100
  }
}

// ─── Discounts analysis ──────────────────────────────────────────

export function getDiscountsAnalysis(lines: LineItem[]) {
  // With vs without discount
  let withDiscountSales = 0, withDiscountProfit = 0, withDiscountOrders = new Set<string>()
  let noDiscountSales = 0, noDiscountProfit = 0, noDiscountOrders = new Set<string>()

  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (line.orderDiscountCode) {
      withDiscountSales += line.netSales
      withDiscountProfit += line.grossProfit
      withDiscountOrders.add(line.orderId)
    } else {
      noDiscountSales += line.netSales
      noDiscountProfit += line.grossProfit
      noDiscountOrders.add(line.orderId)
    }
  }

  // Most discounted products
  const productDiscounts = new Map<string, { type: string; discountTotal: number; grossSales: number; netSales: number; orders: number }>()
  for (const line of lines) {
    if (!line.productTitle || line.discounts <= 0) continue
    const key = line.productTitle
    if (!productDiscounts.has(key)) {
      productDiscounts.set(key, { type: line.productType, discountTotal: 0, grossSales: 0, netSales: 0, orders: 0 })
    }
    const p = productDiscounts.get(key)!
    p.discountTotal += line.discounts
    p.grossSales += line.grossSales
    p.netSales += line.netSales
    p.orders++
  }

  const topDiscounted = Array.from(productDiscounts.entries())
    .map(([name, p]) => ({
      product: name,
      type: p.type,
      discountTotal: Math.round(p.discountTotal * 100) / 100,
      grossSales: Math.round(p.grossSales * 100) / 100,
      discountRate: p.grossSales > 0 ? Math.round((p.discountTotal / p.grossSales) * 10000) / 100 : 0,
      occurrences: p.orders
    }))
    .sort((a, b) => b.discountTotal - a.discountTotal)
    .slice(0, 20)

  // Top discount codes
  const codes = new Map<string, { orders: Set<string>; discount: number; sales: number }>()
  for (const line of lines) {
    if (!line.orderDiscountCode) continue
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    const code = line.orderDiscountCode
    if (!codes.has(code)) codes.set(code, { orders: new Set(), discount: 0, sales: 0 })
    const c = codes.get(code)!
    c.orders.add(line.orderId)
    c.discount += line.discounts
    c.sales += line.netSales
  }

  const topCodes = Array.from(codes.entries())
    .map(([code, c]) => ({
      code,
      orders: c.orders.size,
      totalDiscount: Math.round(c.discount * 100) / 100,
      totalSales: Math.round(c.sales * 100) / 100
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 15)

  return {
    withDiscount: {
      netSales: Math.round(withDiscountSales * 100) / 100,
      grossProfit: Math.round(withDiscountProfit * 100) / 100,
      orders: withDiscountOrders.size,
      marginRate: withDiscountSales > 0 ? Math.round((withDiscountProfit / withDiscountSales) * 10000) / 100 : 0
    },
    withoutDiscount: {
      netSales: Math.round(noDiscountSales * 100) / 100,
      grossProfit: Math.round(noDiscountProfit * 100) / 100,
      orders: noDiscountOrders.size,
      marginRate: noDiscountSales > 0 ? Math.round((noDiscountProfit / noDiscountSales) * 10000) / 100 : 0
    },
    topDiscounted,
    topCodes
  }
}

// ─── Unit economics ──────────────────────────────────────────────

export function getUnitEconomics(lines: LineItem[]) {
  // Per product type: avg order value, avg margin, frequency
  const types = new Map<string, {
    netSales: number; grossProfit: number; orders: Set<string>; customers: Set<string>
    newCustomers: number; totalCustomers: number
  }>()

  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    const type = line.productType || 'Sans type'
    if (!types.has(type)) {
      types.set(type, { netSales: 0, grossProfit: 0, orders: new Set(), customers: new Set(), newCustomers: 0, totalCustomers: 0 })
    }
    const t = types.get(type)!
    t.netSales += line.netSales
    t.grossProfit += line.grossProfit
    t.orders.add(line.orderId)
    if (line.customerId && !t.customers.has(line.customerId)) {
      t.customers.add(line.customerId)
      if (line.customerSaleType === 'First-time') t.newCustomers++
      t.totalCustomers++
    }
  }

  // Global customer frequency
  const customerOrders = new Map<string, Set<string>>()
  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId) continue
    if (!customerOrders.has(line.customerId)) customerOrders.set(line.customerId, new Set())
    customerOrders.get(line.customerId)!.add(line.orderId)
  }
  const frequencies = Array.from(customerOrders.values()).map(s => s.size)
  const avgFrequency = frequencies.length > 0 ? frequencies.reduce((a, b) => a + b, 0) / frequencies.length : 1

  return {
    byType: Array.from(types.entries())
      .map(([type, t]) => ({
        type,
        netSales: Math.round(t.netSales * 100) / 100,
        grossProfit: Math.round(t.grossProfit * 100) / 100,
        marginRate: t.netSales > 0 ? Math.round((t.grossProfit / t.netSales) * 10000) / 100 : 0,
        orders: t.orders.size,
        customers: t.customers.size,
        aov: t.orders.size > 0 ? Math.round((t.netSales / t.orders.size) * 100) / 100 : 0,
        avgMarginPerOrder: t.orders.size > 0 ? Math.round((t.grossProfit / t.orders.size) * 100) / 100 : 0,
        newCustomerRate: t.totalCustomers > 0 ? Math.round((t.newCustomers / t.totalCustomers) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.netSales - a.netSales),
    avgFrequency: Math.round(avgFrequency * 100) / 100,
    totalCustomers: customerOrders.size
  }
}

// ─── Traffic breakdown (kept from before) ────────────────────────

export function getTrafficBreakdown(lines: LineItem[], model: 'first' | 'last' = 'last') {
  const groups = new Map<string, {
    orders: Set<string>; netSales: number; newOrders: number; totalOrders: number
  }>()

  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue

    const source = model === 'first' ? (line.firstVisitSource || 'direct') : (line.lastVisitSource || 'direct')
    const medium = model === 'first' ? (line.firstVisitMedium || '(none)') : (line.lastVisitMedium || '(none)')
    const campaign = model === 'first' ? (line.firstVisitCampaign || '(none)') : (line.lastVisitCampaign || '(none)')
    const key = `${source}|||${medium}|||${campaign}`

    if (!groups.has(key)) {
      groups.set(key, { orders: new Set(), netSales: 0, newOrders: 0, totalOrders: 0 })
    }
    const g = groups.get(key)!
    g.netSales += line.netSales
    if (!g.orders.has(line.orderId)) {
      g.orders.add(line.orderId)
      g.totalOrders++
      if (line.customerSaleType === 'First-time') g.newOrders++
    }
  }

  return Array.from(groups.entries())
    .map(([key, g]) => {
      const [source, medium, campaign] = key.split('|||')
      return {
        source: source!, medium: medium!, campaign: campaign!,
        orders: g.orders.size,
        revenue: Math.round(g.netSales * 100) / 100,
        aov: g.orders.size > 0 ? Math.round((g.netSales / g.orders.size) * 100) / 100 : 0,
        newCustomerRate: g.totalOrders > 0 ? Math.round((g.newOrders / g.totalOrders) * 10000) / 100 : 0
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

// ─── Customer stats ──────────────────────────────────────────────

export function getCustomerStats(lines: LineItem[]) {
  const customers = new Map<string, { revenue: number; orders: Set<string>; isNew: boolean }>()

  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    if (!line.customerId) continue

    if (!customers.has(line.customerId)) {
      customers.set(line.customerId, { revenue: 0, orders: new Set(), isNew: line.customerSaleType === 'First-time' })
    }
    const c = customers.get(line.customerId)!
    c.revenue += line.netSales
    c.orders.add(line.orderId)
  }

  const total = customers.size
  if (total === 0) return { uniqueCustomers: 0, newCustomerRate: 0, avgLtv: 0, avgFrequency: 0 }

  const newCount = Array.from(customers.values()).filter(c => c.isNew).length
  const totalRevenue = Array.from(customers.values()).reduce((a, c) => a + c.revenue, 0)
  const totalOrders = Array.from(customers.values()).reduce((a, c) => a + c.orders.size, 0)

  return {
    uniqueCustomers: total,
    newCustomerRate: Math.round((newCount / total) * 10000) / 100,
    avgLtv: Math.round((totalRevenue / total) * 100) / 100,
    avgFrequency: Math.round((totalOrders / total) * 100) / 100
  }
}

// ─── Geo breakdown ───────────────────────────────────────────────

export function getGeoBreakdown(lines: LineItem[]) {
  const geos = new Map<string, { orders: Set<string>; netSales: number }>()

  for (const line of lines) {
    if (line.orderActionType !== 'ORDER' || line.saleActionType !== 'ORDER') continue
    const country = line.shippingCountry || 'Inconnu'
    const city = line.shippingCity || 'Inconnu'
    const key = `${country}|||${city}`

    if (!geos.has(key)) geos.set(key, { orders: new Set(), netSales: 0 })
    const g = geos.get(key)!
    g.orders.add(line.orderId)
    g.netSales += line.netSales
  }

  const totalRevenue = Array.from(geos.values()).reduce((a, g) => a + g.netSales, 0)

  return Array.from(geos.entries())
    .map(([key, g]) => {
      const [country, city] = key.split('|||')
      return {
        country: country!, city: city!,
        orders: g.orders.size,
        revenue: Math.round(g.netSales * 100) / 100,
        revenueShare: totalRevenue > 0 ? Math.round((g.netSales / totalRevenue) * 10000) / 100 : 0
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}
