const { test, expect } = require('@playwright/test');
const { AppManager } = require('../../pages/appManager');
const fs = require('fs');
const path = require('path');

const addressData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/address_locations.json'), 'utf8')
);

test('Customer Validation: TIN and Phone Edge Cases', async ({ page }) => {
  test.setTimeout(120000);
  const app = new AppManager(page);

  await app.login('admin@beffa.com', 'Beff.$#!');

  const createBtn = page.getByRole('button', { name: /create customer/i });
  const rRegion = addressData[0];

  // --- Scenario 1: Short TIN Validation ---
  console.log("Validation Check: Short TIN Input...");

  await page.goto('/receivables/customers/new');

  await page.getByRole('textbox', { name: 'Customer Name *' }).fill("TIN Short Test");
  await page.getByLabel('Customer Type *').selectOption('individual');
  await page.getByRole('textbox', { name: 'Customer TIN *' }).fill("12345");
  await app.mainPhoneInput.fill("0911223344");

  await app.fillEthiopianAddress(
    rRegion.region,
    rRegion.zones[0].name,
    rRegion.zones[0].woredas[0]
  );

  await createBtn.click();

  await expect(
    page.getByText(/10 digit|must be 10/i)
  ).toBeVisible();

  console.log("Validation Passed: System blocked short TIN correctly.");

  // --- Scenario 2: Invalid Phone Validation ---
  console.log("Validation Check: Invalid Phone Input (3 digits)...");

  await page.reload();

  // refill required fields after reload
  await page.getByRole('textbox', { name: 'Customer Name *' }).fill("Phone Invalid Test");
  await page.getByLabel('Customer Type *').selectOption('individual');

  await page.getByRole('textbox', { name: 'Customer TIN *' }).fill("9876543210");
  await app.mainPhoneInput.fill("123");

  await app.fillEthiopianAddress(
    rRegion.region,
    rRegion.zones[0].name,
    rRegion.zones[0].woredas[0]
  );

  // check button state first
  await expect(createBtn).toBeDisabled();

  // if UI allows click anyway
  if (await createBtn.isEnabled()) {
    await createBtn.click();

    await expect(
      page.getByText(/invalid phone|must be 10 digit/i)
    ).toBeVisible();
  }

  console.log("Validation Passed: Invalid phone correctly rejected.");
});