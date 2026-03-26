# PDF Generation — API Contracts

## Overview

PDF export allows users to generate professional documents for quotes, production plans, and order summaries. Documents use company branding from the `companies` table.

## API Routes

### 1. GET /api/pdf/quote/[id]

- **Auth**: Session (logged-in user, company scoped)
- **Returns**: `application/pdf`
- **Flow**: Validate session → fetch quote + quote_items + company from Supabase → map to `QuotePdfData` → render PDF → return `Response` with PDF buffer
- **Errors**: 401 (not authenticated), 404 (quote not found), 403 (wrong company)

### 2. GET /api/pdf/quote/view/[token]

- **Auth**: Token-based (public link, no session required)
- **Returns**: `application/pdf`
- **Flow**: Validate token format → fetch quote by token + company → map to `QuotePdfData` → render PDF → return `Response` with PDF buffer
- **Errors**: 400 (invalid token), 404 (quote not found or expired)
- **Notes**: Uses the existing `token` field on the `quotes` table (same as client portal)

### 3. GET /api/pdf/production-plan/[id]

- **Auth**: Session (logged-in user, company scoped)
- **Returns**: `application/pdf`
- **Flow**: Validate session → fetch production plan + operations + order + company → map to `ProductionPlanPdfData` → render PDF → return `Response`
- **Errors**: 401, 404, 403

### 4. GET /api/pdf/order/[id]

- **Auth**: Session (logged-in user, company scoped)
- **Returns**: `application/pdf`
- **Flow**: Validate session → fetch order + production_plans + company → map to `OrderSummaryPdfData` → render PDF → return `Response`
- **Errors**: 401, 404, 403

## Common Response Pattern

All routes follow the same pattern:

```typescript
// 1. Auth check
const { user, companyId } = await getSessionOrToken(request)

// 2. Fetch data from Supabase
const data = await supabase.from('...').select('...').eq('id', id).single()

// 3. Verify company ownership
if (data.company_id !== companyId) return new Response(null, { status: 403 })

// 4. Map DB row → PdfData type
const pdfData: QuotePdfData = mapQuoteToPdfData(data)

// 5. Render to buffer
const buffer = await renderQuotePdf(pdfData)

// 6. Return PDF response
return new Response(buffer, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${data.quote_number}.pdf"`,
  },
})
```

## Data Flow

```
DB tables ──► API route (fetch + map) ──► PdfData types ──► PDF template ──► Buffer ──► Response
```

## Types

All PDF data contracts live in `lib/pdf/types.ts`:

- `CompanyBranding` — shared company header/footer data
- `QuotePdfData` / `QuotePdfItem` — quote document
- `ProductionPlanPdfData` / `OperationPdfData` — production plan document
- `OrderSummaryPdfData` / `OrderProductionPlanSummary` — order summary document

## Migration

`migrations/add_company_branding_for_pdf.sql` adds three columns to `companies`:
- `nip` — Polish tax ID
- `bank_account` — bank account for payment info on quotes
- `website` — company URL for document headers
