const { test, expect } = require('@playwright/test');
const { AppManager } = require('../../pages/appManager');
require('dotenv').config();

test.describe('Receipt Creation and Customer Verification', () => {

    test.beforeEach(async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
        // 🚀 ሎጊን እንደተደረገ ሰርቨሩ እንዲረጋጋ 5 ሰከንድ ፋታ ስጠው
        await page.waitForTimeout(5000);
    });

    test('Standalone Receipt Creation and Verification Flow', async ({ page }) => {
        test.setTimeout(450000);

        const app = new AppManager(page);
        const { soDate: receiptDate } = app.getTransactionDates();
        const CUSTOMER_NAME = "Base Ethiopia";

        // --- Step 1: Receipt Creation ---
        console.log("Execution: Navigating to New Receipt...");
        // 🚀 ለውጥ 1: baseURL በ Config ላይ ስላለ path ብቻ ተጠቀም
        await page.goto('/receivables/receipts/new');

        // Select Customer
        const customerBtn = page.getByRole('button', { name: 'Customer selector' });
        await customerBtn.waitFor({ state: 'visible' });
        await customerBtn.click();
        await page.waitForTimeout(2000); // ድሮፕ ዳውኑ ዳታ እስኪጭን
        await page.getByText(CUSTOMER_NAME).first().click({ force: true });

        // Fill Date and Account
        await app.fillDate(0, receiptDate);
        const accountBtn = page.locator('button#cash_account_id');
        await accountBtn.waitFor({ state: 'visible' });
        await accountBtn.click();
        await page.getByText('Cash at Bank - CBE').first().click({ force: true });

        // Select Invoice
        console.log("Action: Opening Sales Invoices tab...");
        const invoiceTab = page.getByRole('tab', { name: /Sales Invoices/i });
        await invoiceTab.waitFor({ state: 'visible' });
        await invoiceTab.click({ force: true });
        await page.waitForTimeout(3000); // ኢንቮይሶቹ እስኪመጡ

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
        // 🚀 ለውጥ 2: እዚህም path ብቻ ተጠቀም
        await page.goto('/receivables/customers');

        const searchInput = page.locator('input[placeholder="Search for customers..."]');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(CUSTOMER_NAME);
        await page.waitForTimeout(3000);

        // Open Customer Detail page
        await page.locator('table tbody tr').filter({ hasText: CUSTOMER_NAME }).first().locator('td a').first().click({ force: true });
        await page.waitForSelector('text=Customer Details');

        // Check Receipts tab
        console.log("Action: Checking Receipts tab...");
        await page.getByRole('tab', { name: /Receipts|Transactions/i }).click();

        // Reload to ensure data sync after approval
        await page.reload();
        await page.waitForTimeout(3000);
        await page.getByRole('tab', { name: /Receipts|Transactions/i }).click();

        const rcptLocator = page.locator('table').getByText(capturedReceiptNumber);

        // Assertion
        await expect(rcptLocator.first()).toBeVisible({ timeout: 30000 });
        console.log(`Status: ${capturedReceiptNumber} verified in customer profile.`);

        await page.close();
    });
});