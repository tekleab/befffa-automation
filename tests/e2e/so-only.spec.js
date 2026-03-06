const { test, expect } = require('@playwright/test');
const { AppManager } = require('../../pages/appManager');
require('dotenv').config();

test.describe('Isolated Sales Order Creation', () => {

    test.beforeEach(async ({ page }) => {
        const app = new AppManager(page);
        await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
    });

    test('Standalone SO Creation and Approval', async ({ page }) => {
        test.setTimeout(450000);
        const app = new AppManager(page);
        const { soDate } = app.getTransactionDates();

        console.log("Execution: Creating Isolated Sales Order...");
        await page.goto(`${process.env.BASE_URL}/receivables/sale-orders/new`);

        await app.fillDate(0, soDate);

        await page.getByRole('button', { name: 'Customer selector' }).click();
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

        const sharedOrderNumber = (await page.locator('//p[text()="SO Number:"]/following-sibling::p').first().innerText()).trim();
        const capturedCustomerName = (await page.locator('//p[text()="Customer:"]/following-sibling::p').first().innerText()).trim();

        console.log(`Document Created: ${sharedOrderNumber} | Customer: ${capturedCustomerName}`);

        await app.handleApprovalFlow();

        // -- VERIFICATION: Check Customer Sales Order Tab --
        console.log(`Verification: Searching for ${sharedOrderNumber} in Customer Details (${capturedCustomerName})...`);

        await page.goto(`${process.env.BASE_URL}/receivables/customers`);

        const searchInput = page.locator('input[placeholder="Search for customers..."]');
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await searchInput.fill(capturedCustomerName);
        await page.waitForTimeout(2000);

        const customerLink = page.locator('table tbody tr').filter({ hasText: capturedCustomerName }).first().locator('td a').first();
        await customerLink.click({ force: true });

        await page.waitForSelector('text=Customer Details', { timeout: 30000 });

        await page.getByRole('tab', { name: 'Sales Orders' }).click();
        await page.waitForTimeout(2000);

        let foundSO = false;
        let pageLoops = 0;

        while (!foundSO && pageLoops < 10) {
            pageLoops++;

            const soLink = page.locator(`a:has-text("${sharedOrderNumber}")`);

            if (await soLink.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`Success: Found ${sharedOrderNumber} on page ${pageLoops}.`);
                foundSO = true;
                break;
            }

            const nextBtnShape = 'M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z';
            const nextBtn = page.locator(`button:not([disabled]):has(svg > path[d="${nextBtnShape}"])`).first();
            const fallbackNextBtn = page.getByRole('button', { name: /next page/i });

            let clickedNext = false;

            if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await nextBtn.click();
                clickedNext = true;
            } else if (await fallbackNextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await fallbackNextBtn.click();
                clickedNext = true;
            }

            if (clickedNext) {
                console.log(`Pagination: Advancing to next page for ${sharedOrderNumber}...`);
                await page.waitForTimeout(2000);
            } else {
                console.log(`Status: Reached end of pagination. Document not found.`);
                break;
            }
        }

        expect(foundSO, `Sales Order ${sharedOrderNumber} was NOT found in ${capturedCustomerName}'s record.`).toBeTruthy();

        console.log("Status: Isolated Sales Order flow completed and verified.");

        await page.close();
    });
});

async function addLineItem(page, app, data) {
    console.log(`Action: Adding line item ${data.item}`);
    await page.click('button:has-text("Line Item")');
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
    console.log(`Action: Line item ${data.item} confirmed.`);
}