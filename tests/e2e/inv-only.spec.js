const { test, expect } = require('@playwright/test');
const { AppManager } = require('../../pages/appManager');
require('dotenv').config();

/**
 * Isolated Invoice Creation and Approval Suite
 */
test.describe('Isolated Invoice Creation', () => {

    test.beforeEach(async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
    });

    test('Standalone Invoice Creation and Approval Flow', async ({ page }) => {
        test.setTimeout(450000);

        const app = new AppManager(page);
        const { invoiceDate, dueDate } = app.getInvoiceDates();

        // --- Step 1: Creation ---
        console.log("Execution: Initiating Isolated Invoice creation...");
        await page.goto(`${process.env.BASE_URL}/receivables/invoices/new`);

        // Customer Selection
        await page.getByRole('button', { name: 'Customer selector' }).click();
        await page.waitForTimeout(1000);
        await page.getByText('Base Ethiopia').first().click({ force: true });

        // Fill Dates
        await app.fillDate(0, invoiceDate);
        await app.fillDate(1, dueDate);

        // G/L Account Selection
        await page.locator('button#accounts_receivable_id').click();
        await page.getByText('Cash at Bank - CBE').first().click({ force: true });

        // Sales Order Selection
        console.log("Action: Selecting Sales Order from dropdown...");
        await page.getByText('Sales Order', { exact: true }).click();

        const dropdownDialog = page.getByRole('dialog');
        await dropdownDialog.waitFor({ state: 'visible' });

        const singleSOItem = dropdownDialog.locator('div[role="group"], .chakra-stack div')
            .filter({ hasText: /^SO\/\d{4}/ })
            .first();

        await singleSOItem.waitFor({ state: 'visible' });
        await singleSOItem.click({ force: true });
        await page.keyboard.press('Escape');

        // Processing Released Sales Order Items
        console.log("Action: Processing Released Sales Order items...");
        await page.getByRole('tab', { name: /Released Sales Order/i }).click({ force: true });
        const releasedTabPanel = page.getByRole('tabpanel', { name: 'Released Sales Order' });
        await releasedTabPanel.locator('tbody').waitFor({ state: 'visible' });

        const rows = releasedTabPanel.locator('table tbody tr');
        const rowCount = await rows.count();

        for (let i = 0; i < rowCount; i++) {
            const currentRow = rows.nth(i);
            await currentRow.locator('.chakra-checkbox__control').click({ force: true });

            const remainingVal = await currentRow.locator('td').nth(2).innerText();
            let qty = remainingVal.trim() || "1";

            const qtyInput = currentRow.locator('input[type="number"]');
            if (await qtyInput.isVisible()) {
                await qtyInput.fill(qty);
            }
        }

        // Save Invoice
        console.log("Action: Committing Invoice...");
        await page.getByRole('button', { name: 'Add Now' }).first().click();

        // Wait for Detail Page
        await page.waitForURL(/\/receivables\/invoices\/.*\/detail$/, { timeout: 90000 });

        const capturedInvoiceNumber = (await page.locator('p.chakra-text').filter({ hasText: /^INV\// }).first().innerText()).trim();
        console.log(`Document Created: ${capturedInvoiceNumber}`);

        // --- Step 2: Approval ---
        console.log("Execution: Starting Approval Flow via AppManager...");
        await app.handleApprovalFlow();
        console.log("Status: Approval process completed.");

        // --- Step 3: Verification ---
        console.log(`Verification: Locating ${capturedInvoiceNumber} in Customer Details...`);
        await page.goto(`${process.env.BASE_URL}/receivables/customers`);

        const searchInput = page.locator('input[placeholder="Search for customers..."]');
        await searchInput.fill("Base Ethiopia");
        await page.waitForTimeout(2000);

        await page.locator('table tbody tr').filter({ hasText: "Base Ethiopia" }).first().locator('td a').first().click({ force: true });
        await page.waitForSelector('text=Customer Details');

        await page.getByRole('tab', { name: 'Invoices' }).click();

        let foundINV = false;
        let pageLoops = 0;
        while (!foundINV && pageLoops < 10) {
            pageLoops++;
            const invLink = page.locator(`a:has-text("${capturedInvoiceNumber}")`);
            if (await invLink.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`Status: ${capturedInvoiceNumber} verified on page ${pageLoops}.`);
                foundINV = true;
                break;
            }

            // Pagination
            const nextBtnShape = 'M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z';
            const nextBtn = page.locator(`button:not([disabled]):has(svg > path[d="${nextBtnShape}"])`).first();

            if (await nextBtn.isVisible()) {
                await nextBtn.click();
                await page.waitForTimeout(2000);
            } else break;
        }

        expect(foundINV).toBeTruthy();
        console.log("Status: Isolated Invoice flow completed and verified.");
        await page.close();
    });
});