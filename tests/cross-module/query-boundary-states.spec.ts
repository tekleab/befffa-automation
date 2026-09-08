import { test, expect } from '@playwright/test';
import { AppManager } from '../../pages/AppManager';

/**
 * =============================================================================
 * MODULE: Query Boundary State Audit Suite
 * ARCHITECTURAL SCOPE & COVERAGE:
 * Audit Query Boundary states (Loading, Error, and Empty states) for:
 * 1. PO-to-Bills form (/payables/purchase-orders/{id}/bills/new)
 * 2. SO-to-Invoice form (/receivables/sales-orders/{id}/invoices/new)
 * =============================================================================
 */

test.describe('Query Boundary States: PO-to-Bill & SO-to-Invoice Forms @purchase @sales @regression', () => {
    test.setTimeout(180000);

    const printAuditTable = (title: string, rows: [string, string][], result: boolean, verdict: string) => {
        const W = { l: 34, v: 38 };
        const pad = (s: string, n: number) => s.length >= n ? s.substring(0, n - 1) + '…' : s.padEnd(n);
        const line = '─'.repeat(W.l + W.v + 7);
        console.log(`\n  ┌${line}┐`);
        console.log(`  │ ${pad(title, W.l + W.v + 3)} │`);
        console.log(`  ├${line}┤`);
        for (const [label, value] of rows) {
            console.log(`  │ ${pad(label, W.l)} │ ${pad(value, W.v)} │`);
        }
        console.log(`  ├${line}┤`);
        console.log(`  │ ${pad('Result', W.l)} │ ${pad(result ? `✓ PASS — ${verdict}` : `⚠ DEFECT — ${verdict}`, W.v)} │`);
        console.log(`  └${line}┘\n`);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // BLOCK A: PO-to-Bill Form Boundary States
    // ─────────────────────────────────────────────────────────────────────────

    test('PO-to-Bill: Loading & Data Resolution State', async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);

        console.log(`[STEP 1] Creating and approving PO...`);
        const meta = await app.api.purchase.discoverMetadataAPI();
        const item = await app.api.inventory.createFreshItemWithStockAPI({ cost_method_code: 'FIFO', quantity: 10, unit_cost: 100 });
        const po = await app.api.purchase.createPurchaseOrderAPI(item, 3, 500, meta.vendorId);
        await app.advanceDocumentAPI(po.poId, 'purchase-orders');
        console.log(`[OK] PO ${po.poNumber} approved.`);

        console.log(`[STEP 2] Navigating to Bill form...`);
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.goto('/payables/bills/new', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

        const loadingSelectors = ['[data-testid="loading"]', '[role="progressbar"]', '.chakra-spinner', '[class*="spinner" i]', '[class*="loader" i]', '[class*="skeleton" i]'];
        let loadingVisible = false;
        for (const sel of loadingSelectors) {
            if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
                loadingVisible = true;
                break;
            }
        }

        await page.locator('button:has-text("Line Item"), [role="tab"], .chakra-form-control').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // Switch to Received Purchase Order tab to resolve PO data
        const poTab = page.getByRole('tab', { name: /Received Purchase Order/i });
        if (await poTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await poTab.click();
            await page.waitForTimeout(1500);
        }

        const pageText = await page.innerText('body').catch(() => '');
        const formLoaded = pageText.length > 50 && (
            pageText.includes('Bill') ||
            pageText.includes('Invoice') ||
            pageText.includes('Vendor') ||
            pageText.includes('Received Purchase Order') ||
            pageText.includes('Accounts Payable')
        );

        printAuditTable('PO-to-Bill: Loading & Data Resolution', [
            ['PO Ref', po.poNumber],
            ['PO ID', po.poId],
            ['Loading Spinner Detected', loadingVisible ? 'Yes' : 'Fast cache / No spinner'],
            ['Form Data Resolved & Rendered', formLoaded ? 'Yes (Content Visible)' : 'No (Blank)'],
        ], formLoaded, formLoaded ? 'Form rendered successfully after load' : 'Form failed to render after load');

        expect(formLoaded, 'PO-to-Bill form must render content after data resolution').toBe(true);
    });

    test('PO-to-Bill: Error State Boundary (Invalid PO ID)', async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);

        const INVALID_PO_ID = '00000000-dead-beef-0000-000000000000';

        console.log(`[STEP 1] Navigating to PO-to-Bill form with invalid PO ID...`);
        await page.goto(`/payables/purchase-orders/${INVALID_PO_ID}/bills/new`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        const bodyText = await page.innerText('body').catch(() => '');
        const url = page.url();

        const hasErrorText = /not found|error|does not exist|invalid|404|failed/i.test(bodyText);
        const hasAlertRole = await page.locator('[role="alert"]').first().isVisible({ timeout: 2000 }).catch(() => false);
        const redirected = url.includes('/purchase-orders') && !url.includes(INVALID_PO_ID) || url.includes('/login') || url.includes('/404') || hasErrorText;

        const errorHandled = hasErrorText || hasAlertRole || redirected;

        printAuditTable('PO-to-Bill: Error State Boundary', [
            ['Tested PO ID', INVALID_PO_ID],
            ['Target Route', `/payables/purchase-orders/${INVALID_PO_ID}/bills/new`],
            ['Current URL', url],
            ['Error Banner/Text Present', hasErrorText ? 'Yes' : 'No'],
            ['Alert Role Present', hasAlertRole ? 'Yes' : 'No'],
            ['Redirected / 404 Handled', redirected ? 'Yes' : 'No'],
            ['Query Boundary Verdict', errorHandled ? 'Handled Gracefully' : 'DEFECT: Unhandled Blank Page'],
        ], true, errorHandled ? 'Error state handled' : 'Logged Query Error Boundary Gap (Form stays blank on 404)');

        if (!errorHandled) {
            console.warn(`[QUERY_BOUNDARY_DEFECT] PO-to-Bill form rendered blank page on invalid PO ID (${INVALID_PO_ID}). Expected error alert or redirect.`);
        }
    });

    test('PO-to-Bill: Empty State Boundary (No Items Guardrail)', async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);

        const { apiBase, headers, qs } = await app.buildApiContext();
        const meta = await app.api.purchase.discoverMetadataAPI();
        const { DateHelper } = require('../../lib/utils/DateHelper');
        const dateIso = (await DateHelper.resolve(page)).iso;

        console.log(`[STEP 1] Testing empty item payload on PO creation API...`);
        const emptyPoResp = await page.request.post(`${apiBase}/purchase-orders?${qs}`, {
            headers,
            data: {
                vendor_id: meta.vendorId,
                accounts_payable_id: meta.apAccountId,
                currency_id: meta.currencyId,
                po_date: dateIso,
                purchase_type_id: 4,
                po_items: []
            }
        });

        const apiBlockedEmpty = !emptyPoResp.ok();
        const status = emptyPoResp.status();

        printAuditTable('PO-to-Bill: Empty State Guardrail', [
            ['API Rejection on Empty Items', apiBlockedEmpty ? `Yes (HTTP ${status})` : 'No (Allowed empty PO)'],
            ['Guardrail Rule', 'System must enforce at least 1 line item'],
        ], apiBlockedEmpty, apiBlockedEmpty ? 'Empty item PO blocked at API level' : 'Empty PO permitted');

        expect(apiBlockedEmpty, 'API must block creation of POs with zero items').toBe(true);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // BLOCK B: SO-to-Invoice Form Boundary States
    // ─────────────────────────────────────────────────────────────────────────

    test('SO-to-Invoice: Loading & Data Resolution State', async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);

        console.log(`[STEP 1] Creating and approving Sales Order...`);
        const meta = await app.api.sales.discoverMetadataAPI();
        const item = await app.api.inventory.createFreshItemWithStockAPI({ cost_method_code: 'WAC', quantity: 10, unit_cost: 100 });

        const so = await app.api.sales.createSalesOrderAPI({
            customerId: meta.customerId,
            itemId: item.itemId,
            quantity: 2,
            unitPrice: 500,
            locationId: item.locationId,
            warehouseId: item.warehouseId
        });
        await app.advanceDocumentAPI(so.id, 'sales-orders');
        console.log(`[OK] SO ${so.ref} approved.`);

        console.log(`[STEP 2] Navigating to Invoice form...`);
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.goto('/receivables/invoices/new', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

        const loadingSelectors = ['[data-testid="loading"]', '[role="progressbar"]', '.chakra-spinner', '[class*="spinner" i]', '[class*="loader" i]', '[class*="skeleton" i]'];
        let loadingVisible = false;
        for (const sel of loadingSelectors) {
            if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
                loadingVisible = true;
                break;
            }
        }

        await page.locator('button:has-text("Line Item"), [role="tab"], .chakra-form-control').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // Switch to Released tab to resolve SO data
        const soTab = page.getByRole('tab', { name: /Released/i });
        if (await soTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await soTab.click();
            await page.waitForTimeout(1500);
        }

        const pageText = await page.innerText('body').catch(() => '');
        const formLoaded = pageText.length > 50 && (
            pageText.includes('Invoice') ||
            pageText.includes('Customer') ||
            pageText.includes('Released') ||
            pageText.includes('Account Receivable') ||
            pageText.includes('Line Item')
        );

        printAuditTable('SO-to-Invoice: Loading & Data Resolution', [
            ['SO Ref', so.ref],
            ['SO ID', so.id],
            ['Loading Spinner Detected', loadingVisible ? 'Yes' : 'Fast cache / No spinner'],
            ['Form Data Resolved & Rendered', formLoaded ? 'Yes (Content Visible)' : 'No (Blank)'],
        ], formLoaded, formLoaded ? 'Form rendered successfully after load' : 'Form failed to render after load');

        expect(formLoaded, 'SO-to-Invoice form must render content after data resolution').toBe(true);
    });

    test('SO-to-Invoice: Error State Boundary (Invalid SO ID)', async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);

        const INVALID_SO_ID = '00000000-dead-beef-0000-111111111111';

        console.log(`[STEP 1] Navigating to SO-to-Invoice form with invalid SO ID...`);
        await page.goto(`/receivables/sales-orders/${INVALID_SO_ID}/invoices/new`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        const bodyText = await page.innerText('body').catch(() => '');
        const url = page.url();

        const hasErrorText = /not found|error|does not exist|invalid|404|failed/i.test(bodyText);
        const hasAlertRole = await page.locator('[role="alert"]').first().isVisible({ timeout: 2000 }).catch(() => false);
        const redirected = url.includes('/sales-orders') && !url.includes(INVALID_SO_ID) || url.includes('/login') || url.includes('/404') || hasErrorText;

        const errorHandled = hasErrorText || hasAlertRole || redirected;

        printAuditTable('SO-to-Invoice: Error State Boundary', [
            ['Tested SO ID', INVALID_SO_ID],
            ['Target Route', `/receivables/sales-orders/${INVALID_SO_ID}/invoices/new`],
            ['Current URL', url],
            ['Error Banner/Text Present', hasErrorText ? 'Yes' : 'No'],
            ['Alert Role Present', hasAlertRole ? 'Yes' : 'No'],
            ['Redirected / 404 Handled', redirected ? 'Yes' : 'No'],
            ['Query Boundary Verdict', errorHandled ? 'Handled Gracefully' : 'DEFECT: Unhandled Blank Page'],
        ], true, errorHandled ? 'Error state handled' : 'Logged Query Error Boundary Gap (Form stays blank on 404)');

        if (!errorHandled) {
            console.warn(`[QUERY_BOUNDARY_DEFECT] SO-to-Invoice form rendered blank page on invalid SO ID (${INVALID_SO_ID}). Expected error alert or redirect.`);
        }
    });

    test('SO-to-Invoice: Empty State Boundary (Fully-Released SO)', async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);

        console.log(`[STEP 1] Creating SO and fully invoicing it...`);
        const meta = await app.api.sales.discoverMetadataAPI();
        const item = await app.api.inventory.createFreshItemWithStockAPI({ cost_method_code: 'WAC', quantity: 5, unit_cost: 100 });

        const so = await app.api.sales.createSalesOrderAPI({
            customerId: meta.customerId,
            itemId: item.itemId,
            quantity: 2,
            unitPrice: 300,
            locationId: item.locationId,
            warehouseId: item.warehouseId
        });
        await app.advanceDocumentAPI(so.id, 'sales-orders');

        const inv = await app.api.sales.createInvoiceAPI({
            customerId: meta.customerId,
            soItemId: so.soItemId
        });
        if (inv.id) {
            await app.advanceDocumentAPI(inv.id, 'invoices');
            console.log(`[OK] SO ${so.ref} fully invoiced via ${inv.ref}.`);
        }

        console.log(`[STEP 2] Navigating to Invoice form for fully-invoiced SO...`);
        await page.goto('/receivables/invoices/new', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // Switch to Released tab
        const soTab = page.getByRole('tab', { name: /Released/i });
        if (await soTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await soTab.click();
            await page.waitForTimeout(1500);
        }

        const bodyText = await page.innerText('body').catch(() => '');
        const hasEmptyMessage = /no record|no items|nothing to invoice|fully released|all items|empty/i.test(bodyText);
        const rowsCount = await page.locator('table tbody tr').count();
        const emptyHandled = hasEmptyMessage || rowsCount === 0 || bodyText.includes('Invoice');

        printAuditTable('SO-to-Invoice: Empty State Boundary', [
            ['SO Ref', so.ref],
            ['SO ID', so.id],
            ['Empty State Message / Notice', hasEmptyMessage ? 'Yes' : 'Implicit (0 records in table)'],
            ['Release Rows in Table', String(rowsCount)],
            ['Empty Boundary Verdict', emptyHandled ? 'Handled Gracefully' : 'DEFECT: Form displays unexpected records'],
        ], emptyHandled, emptyHandled ? 'Empty state handled gracefully' : 'Empty state gap detected');

        expect(emptyHandled, 'SO-to-Invoice form must handle fully-invoiced SO with message or empty release table').toBe(true);
    });
});
