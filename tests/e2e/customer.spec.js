const { test, expect } = require('@playwright/test');
const { AppManager } = require('../../pages/appManager');
const fs = require('fs');
const path = require('path');

const addressData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/address_locations.json'), 'utf8'));

test('Full Customer CRUD Cycle', async ({ page }) => {
  test.setTimeout(480000);
  const app = new AppManager(page);

  const fixedTIN = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  const fixedPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  const customerName = `Kebede-${Math.floor(Math.random() * 10000)}`;
  const updatedName = `${customerName}-Updated`;

  await app.login('admin@beffa.com', 'Beff.$#!');

  // --- Step 1: Create ---
  await page.goto('http://157.180.20.112:4173/receivables/customers/new');
  await page.getByRole('textbox', { name: 'Customer Name *' }).fill(customerName);
  await page.getByLabel('Customer Type *').selectOption('individual');
  await page.getByRole('textbox', { name: 'Customer TIN *' }).fill(fixedTIN);
  await app.mainPhoneInput.fill(fixedPhone);
  await app.fillEthiopianAddress(addressData[0].region, addressData[0].zones[0].name, addressData[0].zones[0].woredas[0]);

  const createBtn = page.locator('button:has-text("Create customer"), button:has-text("Adding Customer")');
  await createBtn.click();
  await page.waitForURL(url => url.href.includes('/detail'), { timeout: 60000 });
  console.log("✅ Created.");

  // --- Step 2: Edit ---
  const editBtn = page.locator('button:has-text("Edit")').first();
  await editBtn.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(3000);
  await editBtn.click({ force: true });

  await page.getByRole('textbox', { name: 'Customer Name *' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'Customer Name *' }).clear();
  await page.getByRole('textbox', { name: 'Customer Name *' }).fill(updatedName);

  const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
  await saveBtn.click({ force: true });
  await page.waitForTimeout(4000);
  console.log("✅ Updated.");

  // --- Step 3: Remove ---
  const removeBtn = page.locator('button:has-text("Remove")');
  await removeBtn.waitFor({ state: 'visible' });
  await removeBtn.evaluate(el => el.style.border = '3px solid red');
  await page.waitForTimeout(2000);
  await removeBtn.click({ force: true });

  // Confirm Removal
  await page.waitForTimeout(5000);
  const confirmBtn = page.locator('section[role="dialog"] button:has-text("Yes"), button:has-text("Confirm")').first();
  await confirmBtn.evaluate(el => el.style.border = '4px solid green');
  await page.waitForTimeout(2000);
  await confirmBtn.click({ force: true });

  await page.waitForURL(url => url.href.includes('/receivables/customers'), { timeout: 30000 });
  console.log("🚀 CRUD COMPLETE!");
});