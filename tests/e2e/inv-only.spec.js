const { test, expect } = require('@playwright/test');
const { AppManager } = require('../../pages/appManager');
require('dotenv').config();

test.describe('Isolated Invoice Creation', () => {

    test.beforeEach(async ({ page }) => {
        const app = new AppManager(page);
        // 🚀 በ config ላይ ያለውን baseURL ይጠቀማል
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
        // ሰርቨሩ ዳሽቦርዱን አዘጋጅቶ እስኪጨርስ ትንሽ ፋታ ስጠው
        await page.waitForTimeout(5000);
    });

    test('Standalone Invoice Creation and Approval Flow', async ({ page }) => {
        test.setTimeout(450000);

        const app = new AppManager(page);
        const { invoiceDate, dueDate } = app.getInvoiceDates();

        console.log("Execution: Initiating Isolated Invoice creation...");

        // 🚀 ለውጥ 1: process.env.BASE_URL ከመጠቀም ይልቅ ቀጥታ path ተጠቀም
        // ይህ በ config ላይ ያለውን 'http://157.180.20.112:4173' ከፊት ይቀጥላል
        await page.goto('/receivables/invoices/new');

        // --- Customer Selection ---
        const customerSelector = page.getByRole('button', { name: 'Customer selector' });
        await customerSelector.waitFor({ state: 'visible', timeout: 60000 });
        await customerSelector.click();

        const customerOption = page.getByText('Base Ethiopia').first();
        await customerOption.waitFor({ state: 'visible' });
        await customerOption.click({ force: true });

        // --- Fill Dates ---
        await app.fillDate(0, invoiceDate);
        await app.fillDate(1, dueDate);

        // --- G/L Account Selection ---
        const glAccountBtn = page.locator('button#accounts_receivable_id');
        await glAccountBtn.waitFor({ state: 'visible' });
        await glAccountBtn.click();

        const glOption = page.getByText('Cash at Bank - CBE').first();
        await glOption.waitFor({ state: 'visible' });
        await glOption.click({ force: true });

        // --- Sales Order Selection ---
        console.log("Action: Selecting Sales Order...");
        const soBtn = page.getByText('Sales Order', { exact: true });
        await soBtn.waitFor({ state: 'visible' });
        await soBtn.click();

        const dropdownDialog = page.getByRole('dialog');
        await dropdownDialog.waitFor({ state: 'visible' });

        const singleSOItem = dropdownDialog.locator('div[role="group"], .chakra-stack div')
            .filter({ hasText: /^SO\/\d{4}/ })
            .first();

        await singleSOItem.waitFor({ state: 'visible' });
        await singleSOItem.click({ force: true });
        await page.keyboard.press('Escape');

        // --- Processing Items ---
        const releasedTab = page.getByRole('tab', { name: /Released Sales Order/i });
        await releasedTab.waitFor({ state: 'visible' });
        await releasedTab.click({ force: true });

        const releasedTabPanel = page.getByRole('tabpanel', { name: 'Released Sales Order' });
        await releasedTabPanel.locator('tbody').waitFor({ state: 'visible' });

        const rows = releasedTabPanel.locator('table tbody tr');
        const rowCount = await rows.count();

        for (let i = 0; i < rowCount; i++) {
            const currentRow = rows.nth(i);
            await currentRow.locator('.chakra-checkbox__control').waitFor({ state: 'visible' });
            await currentRow.locator('.chakra-checkbox__control').click({ force: true });

            const remainingVal = await currentRow.locator('td').nth(2).innerText();
            let qty = remainingVal.trim() || "1";

            const qtyInput = currentRow.locator('input[type="number"]');
            if (await qtyInput.isVisible()) {
                await qtyInput.fill(qty);
            }
        }

        // --- Save Invoice ---
        const addBtn = page.getByRole('button', { name: 'Add Now' }).first();
        await addBtn.waitFor({ state: 'visible' });
        await addBtn.click();

        // Wait for Detail Page
        await page.waitForURL(/\/receivables\/invoices\/.*\/detail$/, { timeout: 90000 });

        const capturedInvoiceNumber = (await page.locator('p.chakra-text').filter({ hasText: /^INV\// }).first().innerText()).trim();
        console.log(`Document Created: ${capturedInvoiceNumber}`);

        // --- Approval & Verification ---
        await app.handleApprovalFlow();

        // 🚀 ለውጥ 2: እዚህም ቢሆን ቀጥታ path ተጠቀም
        await page.goto('/receivables/customers');
        const searchInput = page.locator('input[placeholder="Search for customers..."]');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill("Base Ethiopia");

        await page.waitForTimeout(2000);
        await page.locator('table tbody tr').filter({ hasText: "Base Ethiopia" }).first().locator('td a').first().click({ force: true });

        await page.getByRole('tab', { name: 'Invoices' }).waitFor({ state: 'visible' });
        await page.getByRole('tab', { name: 'Invoices' }).click();

        const invLink = page.locator(`a:has-text("${capturedInvoiceNumber}")`);
        await expect(invLink.first()).toBeVisible({ timeout: 15000 });

        console.log("Status: Isolated Invoice flow completed and verified.");
        await page.close();
    });
});