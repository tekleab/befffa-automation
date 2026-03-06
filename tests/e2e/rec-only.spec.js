const { test, expect } = require('@playwright/test');
const { AppManager } = require('../../pages/appManager');
require('dotenv').config();

test.describe('Receipt Creation and Customer Verification', () => {

    test.beforeEach(async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
    });

    test('Standalone Receipt Creation and Verification Flow', async ({ page }) => {
        test.setTimeout(450000);

        const app = new AppManager(page);
        const { soDate: receiptDate } = app.getTransactionDates();
        const CUSTOMER_NAME = "Base Ethiopia";

        // --- Step 1: Receipt Creation ---
        console.log("Execution: Navigating to New Receipt...");
        await page.goto(`${process.env.BASE_URL}/receivables/receipts/new`);

        // Select Customer
        await page.getByRole('button', { name: 'Customer selector' }).click();
        await page.waitForTimeout(1000);
        await page.getByText(CUSTOMER_NAME).first().click({ force: true });

        // Fill Date and Account
        await app.fillDate(0, receiptDate);
        await page.locator('button#cash_account_id').click();
        await page.getByText('Cash at Bank - CBE').first().click({ force: true });

        // Select Invoice
        console.log("Action: Opening Sales Invoices tab...");
        await page.getByRole('tab', { name: /Sales Invoices/i }).click({ force: true });
        await page.waitForTimeout(2000);

        // Select the first specific invoice checkbox
        console.log("Action: Selecting the first specific invoice checkbox...");
        const invoiceCheckbox = page.locator('div[role="tabpanel"] .chakra-checkbox__control').nth(1);
        await invoiceCheckbox.waitFor({ state: 'visible' });
        await invoiceCheckbox.click({ force: true });

        // Save Receipt
        console.log("Action: Committing Receipt...");
        const addNowBtn = page.getByRole('button', { name: 'Add Now' }).first();
        await addNowBtn.click();

        // Wait for detail view redirection
        await page.waitForURL(/\/receivables\/receipts\/.*\/detail$/, { timeout: 90000 });

        const capturedReceiptNumber = (await page.locator('p.chakra-text').filter({ hasText: /^RCPT\// }).first().innerText()).trim();
        console.log(`Document Created: ${capturedReceiptNumber}`);

        // --- Step 2: Approval Flow ---
        console.log("Execution: Starting Approval Flow via AppManager...");
        await app.handleApprovalFlow();
        console.log("Status: Approval process completed.");

        // --- Step 3: Verification ---
        console.log(`Verification: Searching for ${capturedReceiptNumber} in Customer Details...`);
        await page.goto(`${process.env.BASE_URL}/receivables/customers`);

        const searchInput = page.locator('input[placeholder="Search for customers..."]');
        await searchInput.fill(CUSTOMER_NAME);
        await page.waitForTimeout(2000);

        // Open Customer Detail page
        await page.locator('table tbody tr').filter({ hasText: CUSTOMER_NAME }).first().locator('td a').first().click({ force: true });
        await page.waitForSelector('text=Customer Details');

        // Check Receipts tab
        console.log("Action: Checking Receipts tab...");
        await page.getByRole('tab', { name: /Receipts|Transactions/i }).click();

        // Reload to ensure data sync after approval
        await page.reload();
        await page.getByRole('tab', { name: /Receipts|Transactions/i }).click();

        const rcptLocator = page.locator('table').getByText(capturedReceiptNumber);
        let foundRCPT = false;

        for (let pageLoops = 0; pageLoops < 5; pageLoops++) {
            console.log(`Search: Checking page ${pageLoops + 1}...`);

            if (await rcptLocator.isVisible()) {
                foundRCPT = true;
                break;
            }

            // Pagination logic
            const nextBtnShape = 'M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z';
            const nextBtn = page.locator(`button:not([disabled]):has(svg > path[d="${nextBtnShape}"])`).first();

            if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
                await nextBtn.click();
                await page.waitForTimeout(2000);
            } else {
                break;
            }
        }

        // Assertion
        await expect(rcptLocator).toBeVisible({ timeout: 15000 });
        console.log(`Status: ${capturedReceiptNumber} verified in customer profile.`);

        await page.close();
    });
});