const { test, expect } = require('@playwright/test');
const { AppManager } = require('../../pages/appManager');
require('dotenv').config();

test.describe('End-to-End Business Flow: SO -> Invoice -> Receipt', () => {
    // 🚀 ቴስቶቹ አንዱ የሌላውን ውጤት ስለሚጠቀሙ በቅደም ተከተል እንዲሰሩ ያደርጋል
    test.describe.configure({ mode: 'serial' });

    let sharedOrderNumber = '';
    let capturedCustomerName = '';
    let sharedInvoiceNumber = '';

    test.beforeEach(async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
        // Allow server to stabilize after login
        await page.waitForTimeout(5000);
    });

    // --- STEP 1: SALES ORDER ---
    test('Step 1: Create and Approve Sales Order', async ({ page }) => {
        test.setTimeout(450000);
        const app = new AppManager(page);
        const { soDate } = app.getTransactionDates();

        console.log("Execution: Initiating Sales Order creation...");
        // Use relative path to avoid 404 errors
        await page.goto('/receivables/sale-orders/new');

        await app.fillDate(0, soDate);

        const customerBtn = page.getByRole('button', { name: 'Customer selector' });
        await customerBtn.waitFor({ state: 'visible' });
        await customerBtn.click();
        await page.getByText(/CUST\//).first().click();

        await addLineItem(page, app, {
            item: 'Control panal',
            quantity: '2',
            warehouse: 'Default Warehouse',
            location: 'Default Warehouse Location',
            glAccount: 'Cash at Bank - CBE'
        });

        await page.getByRole('button', { name: 'Accounts Receivable selector' }).click();
        const accDialog = page.getByRole('dialog');
        await app.smartSearch(accDialog, 'Accounts Receivable');
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: 'Add Now' }).click();
        await page.waitForSelector('text=Sales Order Details', { timeout: 60000 });

        sharedOrderNumber = (await page.locator('//p[text()="SO Number:"]/following-sibling::p').first().innerText()).trim();
        capturedCustomerName = (await page.locator('//p[text()="Customer:"]/following-sibling::p').first().innerText()).trim();

        console.log(`Document Created: ${sharedOrderNumber} | Customer: ${capturedCustomerName}`);

        await app.handleApprovalFlow();
    });

    // --- STEP 2: INVOICE GENERATION ---
    test('Step 2: Create Invoice from Sales Order', async ({ page }) => {
        test.setTimeout(450000);
        const app = new AppManager(page);
        const { invoiceDate, dueDate } = app.getInvoiceDates();

        console.log(`Execution: Generating Invoice for SO ${sharedOrderNumber}...`);
        await page.goto('/receivables/invoices/new');

        const custBtn = page.getByRole('button', { name: 'Customer selector' });
        await custBtn.waitFor({ state: 'visible' });
        await custBtn.click();
        const custDialog = page.getByRole('dialog');
        await app.smartSearch(custDialog, capturedCustomerName);
        await page.keyboard.press('Escape');

        await app.fillDate(0, invoiceDate);
        await app.fillDate(1, dueDate);

        await page.locator('button#accounts_receivable_id').click();
        await page.getByText('Cash at Bank - CBE').first().click();

        await page.getByText('Sales Order', { exact: true }).click();
        const soDialog = page.getByRole('dialog');
        await app.smartSearch(soDialog, sharedOrderNumber);
        await page.keyboard.press('Escape');

        const releasedTab = page.getByRole('tab', { name: /Released Sales Order/i });
        await releasedTab.waitFor({ state: 'visible' });
        await releasedTab.click({ force: true });

        const releasedTabPanel = page.getByRole('tabpanel', { name: 'Released Sales Order' });
        await releasedTabPanel.locator('tbody').waitFor({ state: 'visible', timeout: 30000 });

        const rows = releasedTabPanel.locator('table tbody tr');
        const rowCount = await rows.count();

        for (let i = 0; i < rowCount; i++) {
            const currentRow = rows.nth(i);
            await currentRow.locator('.chakra-checkbox__control').waitFor({ state: 'visible' });
            await currentRow.locator('.chakra-checkbox__control').click({ force: true });

            const remainingVal = await currentRow.locator('td').nth(5).innerText();
            let qty = remainingVal.replace(/[^0-9.]/g, '').split('.')[0] || "1";
            const qtyInput = currentRow.locator('input[type="number"], input[id*="quantity"]');
            if (await qtyInput.isVisible()) {
                await qtyInput.click({ clickCount: 3 });
                await qtyInput.fill(qty);
                await page.keyboard.press('Enter');
            }
        }

        await page.getByRole('button', { name: 'Add Now' }).first().click();
        await page.waitForURL(/\/receivables\/invoices\/.*\/detail$/, { timeout: 90000 });

        sharedInvoiceNumber = (await page.locator('p.chakra-text').filter({ hasText: /^INV\// }).first().innerText()).trim();
        console.log(`Document Created: ${sharedInvoiceNumber}`);

        await app.handleApprovalFlow();
    });

    // --- STEP 3: PAYMENT RECEIPT ---
    test('Step 3: Collect Receipt', async ({ page }) => {
        test.setTimeout(450000);
        const app = new AppManager(page);
        const { soDate: receiptDate } = app.getTransactionDates();

        console.log(`Execution: Processing Receipt for Invoice ${sharedInvoiceNumber}...`);
        await page.goto('/receivables/receipts/new');

        await app.fillDate(0, receiptDate);

        const custBtn = page.getByRole('button', { name: 'Customer selector' });
        await custBtn.waitFor({ state: 'visible' });
        await custBtn.click();
        const rcptDialog = page.getByRole('dialog');
        await app.smartSearch(rcptDialog, capturedCustomerName);
        await page.keyboard.press('Escape');

        await page.locator('button#cash_account_id').click();
        await page.getByText('Cash at Bank - CBE').first().click();

        console.log(`Searching Invoice Record: ${sharedInvoiceNumber}`);

        const invoiceTab = page.getByRole('tab', { name: /Sales Invoices/i });
        await invoiceTab.waitFor({ state: 'visible' });
        await invoiceTab.click({ force: true });
        await page.waitForTimeout(3000);

        const targetInvoiceRow = page.locator('.css-i8wwa4').filter({ hasText: sharedInvoiceNumber }).first();
        await expect(targetInvoiceRow).toBeVisible({ timeout: 20000 });
        await targetInvoiceRow.scrollIntoViewIfNeeded();

        await targetInvoiceRow.locator('span.chakra-checkbox__control').first().click({ force: true });
        await page.waitForTimeout(1000);

        await page.getByRole('button', { name: 'Add Now' }).first().click();
        await page.waitForURL(/\/receivables\/receipts\/.*\/detail$/, { timeout: 90000 });

        console.log("Success: Receipt entry created. Finalizing approval...");
        await app.handleApprovalFlow();
        console.log("Status: End-to-End flow completed successfully.");
    });
});

// Helper function with explicit waits
async function addLineItem(page, app, data) {
    console.log(`Action: Adding line item - ${data.item}`);
    const lineItemBtn = page.click('button:has-text("Line Item")');
    await page.locator('button').filter({ hasText: /^Item$/ }).first().click();

    await page.getByRole('button', { name: 'Item selector' }).click();
    const itemDialog = page.getByRole('dialog');
    await app.smartSearch(itemDialog, data.item);

    await page.getByRole('group').filter({ hasText: /^Quantity \*/ }).getByRole('spinbutton').fill(data.quantity);

    await page.locator('button#warehouse_id').click();
    await page.getByText(data.warehouse, { exact: true }).first().click();

    await page.locator('button#location_id').click();
    await page.getByText(data.location, { exact: true }).first().click();

    await page.getByRole('button', { name: 'G/L Account selector' }).click();
    const glDialog = page.getByRole('dialog');
    await app.smartSearch(glDialog, data.glAccount);

    await page.getByRole('button', { name: 'Tax selector' }).click();
    await page.getByText('VAT').first().click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Add$/, exact: true }).click();
    await page.waitForTimeout(2000); // Wait for line item processing to complete
    console.log(`Action: Line item ${data.item} confirmed.`);
}
