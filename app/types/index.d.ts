export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export type AttributionModel = 'first' | 'last'

export interface OverviewStats {
  revenue: number
  revenueVariation: number
  orders: number
  ordersVariation: number
  aov: number
  aovVariation: number
  newCustomerRate: number
  newCustomerRateVariation: number
}

export interface TimeSeriesPoint {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  product: string
  type: string
  quantity: number
  revenue: number
  cogs: number
  margin: number
  revenueShare: number
}

export interface AcquisitionRow {
  source: string
  medium: string
  campaign: string
  orders: number
  revenue: number
  aov: number
  newCustomerRate: number
}

export interface ProductRow {
  product: string
  type: string
  sku: string
  quantity: number
  revenue: number
  cogs: number
  margin: number
  marginRate: number
  returnRate: number
}

export interface CustomerStats {
  uniqueCustomers: number
  newCustomerRate: number
  avgLtv: number
  avgFrequency: number
}

export interface GeoRow {
  country: string
  city: string
  orders: number
  revenue: number
  revenueShare: number
}
