# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cross-module/query-boundary-states.spec.ts >> Query Boundary States: PO-to-Bill & SO-to-Invoice Forms @purchase @sales @regression >> PO-to-Bill: Loading & Data Resolution State
- Location: tests/cross-module/query-boundary-states.spec.ts:36:9

# Error details

```
Error: PO-to-Bill form must render content after data resolution

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - img [ref=e5]
    - generic [ref=e10]:
      - heading "404 Not Found!" [level=1] [ref=e11]
      - paragraph [ref=e12]: The page you are looking for doesn't exist or has been moved. But you can go back to the previous page or go home.
    - group [ref=e13]:
      - button "Go back" [ref=e14] [cursor=pointer]:
        - img [ref=e16]
        - text: Go back
      - link "Go home" [ref=e19] [cursor=pointer]:
        - /url: /
        - img [ref=e21]
        - text: Go home
  - generic:
    - region "Notifications-top"
    - region "Notifications-top-left"
    - region "Notifications-top-right"
    - region "Notifications-bottom-left"
    - region "Notifications-bottom"
    - region "Notifications-bottom-right"
  - generic:
    - region "Notifications-top"
    - region "Notifications-top-left"
    - region "Notifications-top-right"
    - region "Notifications-bottom-left"
    - region "Notifications-bottom"
    - region "Notifications-bottom-right"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { AppManager } from '../../pages/AppManager';
  3   | 
  4   | /**
  5   |  * =============================================================================
  6   |  * MODULE: Query Boundary State Audit Suite
  7   |  * ARCHITECTURAL SCOPE & COVERAGE:
  8   |  * Audit Query Boundary states (Loading, Error, and Empty states) for:
  9   |  * 1. PO-to-Bills form (/payables/purchase-orders/{id}/bills/new)
  10  |  * 2. SO-to-Invoice form (/receivables/sales-orders/{id}/invoices/new)
  11  |  * =============================================================================
  12  |  */
  13  | 
  14  | test.describe('Query Boundary States: PO-to-Bill & SO-to-Invoice Forms @purchase @sales @regression', () => {
  15  |     test.setTimeout(180000);
  16  | 
  17  |     const printAuditTable = (title: string, rows: [string, string][], result: boolean, verdict: string) => {
  18  |         const W = { l: 34, v: 38 };
  19  |         const pad = (s: string, n: number) => s.length >= n ? s.substring(0, n - 1) + '…' : s.padEnd(n);
  20  |         const line = '─'.repeat(W.l + W.v + 7);
  21  |         console.log(`\n  ┌${line}┐`);
  22  |         console.log(`  │ ${pad(title, W.l + W.v + 3)} │`);
  23  |         console.log(`  ├${line}┤`);
  24  |         for (const [label, value] of rows) {
  25  |             console.log(`  │ ${pad(label, W.l)} │ ${pad(value, W.v)} │`);
  26  |         }
  27  |         console.log(`  ├${line}┤`);
  28  |         console.log(`  │ ${pad('Result', W.l)} │ ${pad(result ? `✓ PASS — ${verdict}` : `⚠ DEFECT — ${verdict}`, W.v)} │`);
  29  |         console.log(`  └${line}┘\n`);
  30  |     };
  31  | 
  32  |     // ─────────────────────────────────────────────────────────────────────────
  33  |     // BLOCK A: PO-to-Bill Form Boundary States
  34  |     // ─────────────────────────────────────────────────────────────────────────
  35  | 
  36  |     test('PO-to-Bill: Loading & Data Resolution State', async ({ page }) => {
  37  |         const app = new AppManager(page);
  38  |         await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
  39  | 
  40  |         console.log(`[STEP 1] Creating and approving PO...`);
  41  |         const meta = await app.api.purchase.discoverMetadataAPI();
  42  |         const item = await app.api.inventory.createFreshItemWithStockAPI({ cost_method_code: 'FIFO', quantity: 10, unit_cost: 100 });
  43  |         const po = await app.api.purchase.createPurchaseOrderAPI(item, 3, 500, meta.vendorId);
  44  |         await app.advanceDocumentAPI(po.poId, 'purchase-orders');
  45  |         console.log(`[OK] PO ${po.poNumber} approved.`);
  46  | 
  47  |         console.log(`[STEP 2] Navigating to PO-to-Bill form...`);
  48  |         await page.goto(`/payables/purchase-orders/${po.poId}/bills/new`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  49  | 
  50  |         const loadingSelectors = ['[data-testid="loading"]', '[role="progressbar"]', '.chakra-spinner', '[class*="spinner" i]', '[class*="loader" i]', '[class*="skeleton" i]'];
  51  |         let loadingVisible = false;
  52  |         for (const sel of loadingSelectors) {
  53  |             if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
  54  |                 loadingVisible = true;
  55  |                 break;
  56  |             }
  57  |         }
  58  | 
  59  |         await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  60  | 
  61  |         const pageText = await page.innerText('body').catch(() => '');
  62  |         const formLoaded = pageText.length > 50 && (
  63  |             pageText.includes('Bill') ||
  64  |             pageText.includes('Invoice') ||
  65  |             pageText.includes('Item') ||
  66  |             pageText.includes('Vendor') ||
  67  |             pageText.includes(po.poNumber.replace(/^PO\//, ''))
  68  |         );
  69  | 
  70  |         printAuditTable('PO-to-Bill: Loading & Data Resolution', [
  71  |             ['PO Ref', po.poNumber],
  72  |             ['PO ID', po.poId],
  73  |             ['Loading Spinner Detected', loadingVisible ? 'Yes' : 'Fast cache / No spinner'],
  74  |             ['Form Data Resolved & Rendered', formLoaded ? 'Yes (Content Visible)' : 'No (Blank)'],
  75  |         ], formLoaded, formLoaded ? 'Form rendered successfully after load' : 'Form failed to render after load');
  76  | 
> 77  |         expect(formLoaded, 'PO-to-Bill form must render content after data resolution').toBe(true);
      |                                                                                         ^ Error: PO-to-Bill form must render content after data resolution
  78  |     });
  79  | 
  80  |     test('PO-to-Bill: Error State Boundary (Invalid PO ID)', async ({ page }) => {
  81  |         const app = new AppManager(page);
  82  |         await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
  83  | 
  84  |         const INVALID_PO_ID = '00000000-dead-beef-0000-000000000000';
  85  | 
  86  |         console.log(`[STEP 1] Navigating to PO-to-Bill form with invalid PO ID...`);
  87  |         await page.goto(`/payables/purchase-orders/${INVALID_PO_ID}/bills/new`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  88  |         await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  89  | 
  90  |         const bodyText = await page.innerText('body').catch(() => '');
  91  |         const url = page.url();
  92  | 
  93  |         const hasErrorText = /not found|error|does not exist|invalid|404|failed/i.test(bodyText);
  94  |         const hasAlertRole = await page.locator('[role="alert"]').first().isVisible({ timeout: 2000 }).catch(() => false);
  95  |         const redirected = url.includes('/purchase-orders') && !url.includes(INVALID_PO_ID) || url.includes('/login') || url.includes('/404');
  96  | 
  97  |         const errorHandled = hasErrorText || hasAlertRole || redirected;
  98  | 
  99  |         printAuditTable('PO-to-Bill: Error State Boundary', [
  100 |             ['Tested PO ID', INVALID_PO_ID],
  101 |             ['Target Route', `/payables/purchase-orders/${INVALID_PO_ID}/bills/new`],
  102 |             ['Current URL', url],
  103 |             ['Error Banner/Text Present', hasErrorText ? 'Yes' : 'No'],
  104 |             ['Alert Role Present', hasAlertRole ? 'Yes' : 'No'],
  105 |             ['Redirected Away', redirected ? 'Yes' : 'No'],
  106 |             ['Query Boundary Verdict', errorHandled ? 'Handled Gracefully' : 'DEFECT: Unhandled Blank Page'],
  107 |         ], true, errorHandled ? 'Error state handled' : 'Logged Query Error Boundary Gap (Form stays blank on 404)');
  108 | 
  109 |         if (!errorHandled) {
  110 |             console.warn(`[QUERY_BOUNDARY_DEFECT] PO-to-Bill form rendered blank page on invalid PO ID (${INVALID_PO_ID}). Expected error alert or redirect.`);
  111 |         }
  112 |     });
  113 | 
  114 |     test('PO-to-Bill: Empty State Boundary (No Items Guardrail)', async ({ page }) => {
  115 |         const app = new AppManager(page);
  116 |         await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
  117 | 
  118 |         const { apiBase, headers, qs } = await app.buildApiContext();
  119 |         const meta = await app.api.purchase.discoverMetadataAPI();
  120 |         const { DateHelper } = require('../../lib/utils/DateHelper');
  121 |         const dateIso = (await DateHelper.resolve(page)).iso;
  122 | 
  123 |         console.log(`[STEP 1] Testing empty item payload on PO creation API...`);
  124 |         const emptyPoResp = await page.request.post(`${apiBase}/purchase-orders?${qs}`, {
  125 |             headers,
  126 |             data: {
  127 |                 vendor_id: meta.vendorId,
  128 |                 accounts_payable_id: meta.apAccountId,
  129 |                 currency_id: meta.currencyId,
  130 |                 po_date: dateIso,
  131 |                 purchase_type_id: 4,
  132 |                 po_items: []
  133 |             }
  134 |         });
  135 | 
  136 |         const apiBlockedEmpty = !emptyPoResp.ok();
  137 |         const status = emptyPoResp.status();
  138 | 
  139 |         printAuditTable('PO-to-Bill: Empty State Guardrail', [
  140 |             ['API Rejection on Empty Items', apiBlockedEmpty ? `Yes (HTTP ${status})` : 'No (Allowed empty PO)'],
  141 |             ['Guardrail Rule', 'System must enforce at least 1 line item'],
  142 |         ], apiBlockedEmpty, apiBlockedEmpty ? 'Empty item PO blocked at API level' : 'Empty PO permitted');
  143 | 
  144 |         expect(apiBlockedEmpty, 'API must block creation of POs with zero items').toBe(true);
  145 |     });
  146 | 
  147 |     // ─────────────────────────────────────────────────────────────────────────
  148 |     // BLOCK B: SO-to-Invoice Form Boundary States
  149 |     // ─────────────────────────────────────────────────────────────────────────
  150 | 
  151 |     test('SO-to-Invoice: Loading & Data Resolution State', async ({ page }) => {
  152 |         const app = new AppManager(page);
  153 |         await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
  154 | 
  155 |         console.log(`[STEP 1] Creating and approving Sales Order...`);
  156 |         const meta = await app.api.sales.discoverMetadataAPI();
  157 |         const item = await app.api.inventory.createFreshItemWithStockAPI({ cost_method_code: 'WAC', quantity: 10, unit_cost: 100 });
  158 | 
  159 |         const so = await app.api.sales.createSalesOrderAPI({
  160 |             customerId: meta.customerId,
  161 |             itemId: item.itemId,
  162 |             quantity: 2,
  163 |             unitPrice: 500,
  164 |             locationId: item.locationId,
  165 |             warehouseId: item.warehouseId
  166 |         });
  167 |         await app.advanceDocumentAPI(so.id, 'sales-orders');
  168 |         console.log(`[OK] SO ${so.ref} approved.`);
  169 | 
  170 |         console.log(`[STEP 2] Navigating to SO-to-Invoice form...`);
  171 |         await page.goto(`/receivables/sales-orders/${so.id}/invoices/new`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  172 | 
  173 |         const loadingSelectors = ['[data-testid="loading"]', '[role="progressbar"]', '.chakra-spinner', '[class*="spinner" i]', '[class*="loader" i]', '[class*="skeleton" i]'];
  174 |         let loadingVisible = false;
  175 |         for (const sel of loadingSelectors) {
  176 |             if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
  177 |                 loadingVisible = true;
```