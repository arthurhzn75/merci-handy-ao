export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

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

export interface DataQuality {
  totalLines: number
  cogsGapRate: number
  cogsGapCount: number
  validationRate: number
  validationErrors: number
  marginReliable: boolean
}

export interface CrossCheck {
  grossSales: number
  discounts: number
  returns: number
  expectedNetSales: number
  actualNetSales: number
  delta: number
}

export interface Insight {
  type: 'success' | 'warning' | 'info' | 'error'
  icon: string
  text: string
}
