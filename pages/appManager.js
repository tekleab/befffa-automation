const { expect } = require('@playwright/test');

class AppManager {
  constructor(page) {
    this.page = page;

    // Login selectors
    this.emailInput = page.getByRole('textbox', { name: 'Email *' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password *' });
    this.loginBtn = page.getByRole('button', { name: 'Login' });

    // --- Customer Module Selectors ---
    this.mainPhoneInput = page.getByRole('textbox', { name: /Main Phone/i });
    this.customerNameInput = page.getByRole('textbox', { name: 'Customer Name *' });
    this.customerTinInput = page.getByRole('textbox', { name: 'Customer TIN *' });

    // Status and Button Selectors
    this.approvedStatus = 'span.css-1ny2kle:has-text("Approved"), span:has-text("Approved")';
    this.actionButtons = 'button:has-text("Submit For Review"), button:has-text("Approve"), button:has-text("Advance"), button:has-text("Submit For Approver")';
  }

  /**
   * --- LOGIN (Hardened for CI) ---
   * ጥቅሶችን ያጸዳል፣ የቀድሞ ዳታን ያጠፋል እና በተኑ እስኪበራ ይጠብቃል
   */
  async login(email, pass) {
    // ከ .env ሊመጡ የሚችሉ ጥቅሶችን (" ወይም ') በኮድ ደረጃ ማጥፋት
    const cleanEmail = (email || "").replace(/['"]+/g, '').trim();
    const cleanPass = (pass || "").replace(/['"]+/g, '').trim();

    await this.page.goto('/users/login');

    // ኤለመንቱ እስኪታይ በትዕግስት ይጠብቃል
    await this.emailInput.waitFor({ state: 'visible', timeout: 30000 });

    // የቆየ ዳታ (Autofill) ካለ ማጽዳት
    await this.emailInput.focus();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.emailInput.fill(cleanEmail);

    await this.passwordInput.focus();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.passwordInput.fill(cleanPass);

    // 🚀 ወሳኝ እርምጃ: የሎጊን በተኑ Enabled እስኪሆን (ቫሊዴሽን እስኪያልቅ) መጠበቅ
    console.log(`Attempting login with: ${cleanEmail}`);
    await expect(this.loginBtn).toBeEnabled({ timeout: 20000 });

    await this.loginBtn.click();

    // ዳሽቦርዱ ሙሉ በሙሉ እስኪጫን መጠበቅ
    await this.page.waitForURL('**/', { waitUntil: 'networkidle', timeout: 60000 });
  }

  /**
   * --- FILL ETHIOPIAN ADDRESS ---
   */
  async fillEthiopianAddress(region, zone, woreda) {
    console.log(`Filling address: ${region} -> ${zone} -> ${woreda}`);

    const regionSelect = this.page.getByRole('combobox', { name: 'Region' });
    await regionSelect.waitFor({ state: 'visible' });
    await regionSelect.selectOption({ label: region });
    await this.page.waitForTimeout(1500);

    const zoneSelect = this.page.getByRole('combobox', { name: 'Zone' });
    await zoneSelect.waitFor({ state: 'visible' });
    await zoneSelect.selectOption({ label: zone });
    await this.page.waitForTimeout(1500);

    const woredaSelect = this.page.getByRole('combobox', { name: 'Wereda' });
    await woredaSelect.waitFor({ state: 'visible' });
    await woredaSelect.selectOption({ label: woreda });
  }

  /**
   * --- SMART SEARCH (Robust for CI) ---
   */
  async smartSearch(dialog, text) {
    console.log(`Searching for: ${text}`);
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactPattern = new RegExp(`^${escapedText}$`, 'i');

    const resultLocator = this.page
      .locator('div[role="group"], div[role="option"], div[role="listitem"], button, li, label, [class*="option"]')
      .filter({ hasText: exactPattern })
      .first();

    for (let attempt = 1; attempt <= 3; attempt++) {
      let searchInput = dialog.getByRole('textbox', { name: 'Search...' });
      if (!(await searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
        searchInput = this.page.getByRole('textbox', { name: 'Search...' }).first();
      }

      await searchInput.clear();
      await this.page.waitForTimeout(500);
      await searchInput.fill(text);
      await this.page.waitForTimeout(2000);

      try {
        await resultLocator.waitFor({ state: 'visible', timeout: 10000 });
        await resultLocator.click({ force: true });
        console.log(`Selection confirmed: ${text}`);
        return;
      } catch (err) {
        console.log(`Search attempt ${attempt}/3 for ${text} failed.`);
        if (attempt < 3) await this.page.waitForTimeout(3000);
      }
    }
    throw new Error(`Failed to locate ${text} after 3 attempts.`);
  }

  /**
   * --- WAIT FOR LOADING ---
   */
  async waitForLoadingToFinish() {
    const skeleton = this.page.locator('.chakra-skeleton, .chakra-spinner, [data-testid="loading"]');
    try {
      if (await skeleton.first().isVisible({ timeout: 2000 })) {
        await skeleton.first().waitFor({ state: 'hidden', timeout: 45000 });
      }
    } catch { }
  }

  /**
   * --- REVIEWER SELECTION ---
   */
  async _handleReviewerSelection() {
    const reviewerSelector = this.page.locator('button[aria-label*="reviewer"], [placeholder*="Select Reviewer"]').first();

    if (await reviewerSelector.isVisible({ timeout: 10000 }).catch(() => false)) {
      await reviewerSelector.click();
      await this.page.waitForTimeout(2000);

      const adminOption = this.page.locator('div:not(.chakra-skeleton)').getByText('System Admin', { exact: true }).last();

      if (await adminOption.isVisible()) {
        await adminOption.click({ force: true });
        await this.page.waitForTimeout(2000);

        const advanceBtn = this.page.locator('section[role="dialog"] button:has-text("Advance"), section[role="dialog"] button:has-text("Submit")').first();
        if (await advanceBtn.isVisible()) {
          await advanceBtn.click({ force: true });
          await advanceBtn.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => { });
        }
      }
    }
  }

  /**
   * --- APPROVAL FLOW (Handles Multi-step Modals) ---
   */
  async handleApprovalFlow() {
    console.log("Initializing approval sequence...");
    let lastClickedModalText = null;
    let lastClickedTargetText = null;

    for (let i = 0; i < 30; i++) {
      if (this.page.isClosed()) return;
      await this.page.waitForTimeout(1500);

      const approvedVisible = await this.page.locator(this.approvedStatus).first().isVisible({ timeout: 1000 }).catch(() => false);
      if (approvedVisible) {
        console.log("Status: Document Approved.");
        return;
      }

      const modalAction = this.page.locator('section[role="dialog"] button').filter({ hasText: /^(Approve|Advance|Submit|Yes|Confirm)$/i }).first();
      if (await modalAction.isVisible({ timeout: 1500 }).catch(() => false)) {
        const btnText = await modalAction.innerText();
        if (lastClickedModalText === btnText) {
          await this.page.waitForTimeout(1500);
          continue;
        }
        console.log(`Modal Action: ${btnText}`);
        lastClickedModalText = btnText;
        await modalAction.click({ force: true });
        await modalAction.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => { });
        continue;
      }

      const targetButton = this.page.locator('button').filter({ hasText: /^(Submit For Review|Submit For Approver|Submit Forapprover|Advance|Approve|Submit)$/i }).first();
      if (await targetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        const btnText = await targetButton.innerText();
        if (lastClickedTargetText === btnText || await targetButton.isDisabled()) {
          await this.page.waitForTimeout(2000);
          continue;
        }
        console.log(`Executing: ${btnText}`);
        lastClickedTargetText = btnText;
        await targetButton.click({ force: true });
        await targetButton.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => { });
        if (btnText.includes("Submit")) await this._handleReviewerSelection();
      }
    }
  }

  /**
   * --- DATE HELPERS ---
   */
  getTransactionDates() {
    const today = new Date();
    const due = new Date();
    due.setDate(today.getDate() + 30);

    const fmt = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    return { soDate: fmt(today), invoiceDate: fmt(today), dueDate: fmt(due) };
  }

  getInvoiceDates() { return this.getTransactionDates(); }

  async fillDate(index, dateValue) {
    const dayToSelect = parseInt(dateValue.split('/')[0], 10).toString();
    const datePickerBtn = this.page.locator('button:has(span.formatted-date)').nth(index);

    await datePickerBtn.waitFor({ state: 'visible', timeout: 25000 });
    await datePickerBtn.click();
    await this.page.waitForTimeout(1000);

    const dayButton = this.page.locator('div[role="grid"] button').getByText(dayToSelect, { exact: true }).first();
    if (await dayButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dayButton.click();
    } else {
      await this.page.keyboard.type(dateValue);
      await this.page.keyboard.press('Enter');
    }
  }
}

module.exports = { AppManager };
