import { renderToBuffer } from '@react-pdf/renderer'
import QuoteTemplate from './quote-template'
import ProductionPlanTemplate from './production-plan-template'
import OrderSummaryTemplate from './order-summary-template'
import type { QuotePdfData, ProductionPlanPdfData, OrderSummaryPdfData } from './types'

export async function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return renderToBuffer(<QuoteTemplate data={data} />)
}

export async function renderProductionPlanPdf(data: ProductionPlanPdfData): Promise<Buffer> {
  return renderToBuffer(<ProductionPlanTemplate data={data} />)
}

export async function renderOrderPdf(data: OrderSummaryPdfData): Promise<Buffer> {
  return renderToBuffer(<OrderSummaryTemplate data={data} />)
}
