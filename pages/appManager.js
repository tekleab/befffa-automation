const { expect } = require('@playwright/test');

class AppManager {
  constructor(page) {
    this.page = page;

    // Login selectors
    this.emailInput = page.getByRole('textbox', { name: 'Email *' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password *' });
    this.loginBtn = page.getByRole('button', { name: 'Login' });

    // --- Customer Module Selectors (NEW) ---
    // ስህተት የፈጠረው Main Phone እዚህ ተስተካክሏል
    this.mainPhoneInput = page.getByRole('textbox', { name: /Main Phone/i });
    this.customerNameInput = page.getByRole('textbox', { name: 'Customer Name *' });
    this.customerTinInput = page.getByRole('textbox', { name: 'Customer TIN *' });

    // Status and Button Selectors
    this.approvedStatus = 'span.css-1ny2kle:has-text("Approved"), span:has-text("Approved")';
    this.actionButtons = 'button:has-text("Submit For Review"), button:has-text("Approve"), button:has-text("Advance"), button:has-text("Submit For Approver")';
  }

  // --- LOGIN ---
  async login(email, pass) {
    await this.page.goto('/users/login');
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.loginBtn.click();
    await this.page.waitForURL('**/', { waitUntil: 'load', timeout: 30000 });
  }

  /**
   * --- FILL ETHIOPIAN ADDRESS (NEW) ---
   * ደንበኛ ሲመዘገብ ክልል፣ ዞን እና ወረዳን በቅደም ተከተል ለመሙላት
   */
  async fillEthiopianAddress(region, zone, woreda) {
    console.log(`Filling address: ${region} -> ${zone} -> ${woreda}`);

    // Select Region
    await this.page.getByRole('combobox', { name: 'Region' }).selectOption({ label: region });
    await this.page.waitForTimeout(1000); // Wait for Zone to load

    // Select Zone
    await this.page.getByRole('combobox', { name: 'Zone' }).selectOption({ label: zone });
    await this.page.waitForTimeout(1000); // Wait for Woreda to load

    // Select Wereda
    await this.page.getByRole('combobox', { name: 'Wereda' }).selectOption({ label: woreda });
  }

  // --- SMART SEARCH ---
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
      const inputVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

      if (!inputVisible) {
        searchInput = this.page.getByRole('textbox', { name: 'Search...' }).first();
      }

      await searchInput.clear();
      await this.page.waitForTimeout(500);
      await searchInput.fill(text);
      await this.page.waitForTimeout(1000);

      try {
        await resultLocator.waitFor({ state: 'visible', timeout: 5000 });
        await resultLocator.click();
        console.log(`Selection confirmed: ${text}`);
        return;
      } catch (err) {
        console.log(`Search attempt ${attempt}/3 for ${text} failed.`);
        if (attempt < 3) await this.page.waitForTimeout(2000);
      }
    }
    throw new Error(`Failed to locate ${text} after 3 attempts.`);
  }

  // --- WAIT FOR LOADING ---
  async waitForLoadingToFinish() {
    const skeleton = this.page.locator('.chakra-skeleton, .chakra-spinner, [data-testid="loading"]');
    try {
      const isVisible = await skeleton.first().isVisible({ timeout: 1000 });
      if (isVisible) {
        await skeleton.first().waitFor({ state: 'hidden', timeout: 20000 });
      }
    } catch { }
  }

  // --- REVIEWER SELECTION ---
  async _handleReviewerSelection() {
    const reviewerSelector = this.page.locator('button[aria-label*="reviewer"], [placeholder*="Select Reviewer"]').first();

    if (await reviewerSelector.isVisible({ timeout: 10000 }).catch(() => false)) {
      await reviewerSelector.click();

      await this.page.locator('.chakra-skeleton').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => { });
      await this.page.waitForTimeout(2000);

      const adminOption = this.page.locator('div:not(.chakra-skeleton)').getByText('System Admin', { exact: true }).last();

      if (await adminOption.isVisible()) {
        await adminOption.click({ force: true });
        await this.page.waitForTimeout(2000);

        const advanceBtn = this.page.locator('section[role="dialog"] button:has-text("Advance"), section[role="dialog"] button:has-text("Submit")').first();
        if (await advanceBtn.isVisible()) {
          await advanceBtn.click({ force: true });
          console.log("Action: Advance/Submit modal confirmed.");
          await advanceBtn.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => { });
        }
      }
    }
  }

  // --- APPROVAL FLOW ---
  async handleApprovalFlow() {
    console.log("Initializing approval sequence...");

    let lastClickedModalText = null;
    let lastClickedTargetText = null;

    for (let i = 0; i < 30; i++) {
      if (this.page.isClosed()) return;
      await this.page.waitForTimeout(500);

      const approvedVisible = await this.page.locator(this.approvedStatus).first().isVisible({ timeout: 500 }).catch(() => false);
      if (approvedVisible) {
        console.log("Status: Document Approved.");
        return;
      }

      const modalAction = this.page.locator('section[role="dialog"] button').filter({ hasText: /^(Approve|Advance|Submit)$/i }).first();
      if (await modalAction.isVisible({ timeout: 1000 }).catch(() => false)) {
        const btnText = await modalAction.innerText();

        if (lastClickedModalText === btnText) {
          await this.page.waitForTimeout(1000);
          continue;
        }

        console.log(`Processing modal action: ${btnText}`);
        lastClickedModalText = btnText;
        await modalAction.click({ force: true });
        await modalAction.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
        continue;
      } else {
        lastClickedModalText = null;
      }

      const targetButton = this.page.locator('button').filter({ hasText: /^(Submit For Review|Submit For Approver|Submit Forapprover|Advance|Approve|Submit)$/i }).first();

      if (await targetButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        const btnText = await targetButton.innerText();

        if (lastClickedTargetText === btnText) {
          await this.page.waitForTimeout(1000);
          continue;
        }

        if (await targetButton.isDisabled()) {
          console.log(`Waiting for button activation: ${btnText}`);
          await this.page.waitForTimeout(1000);
          continue;
        }

        console.log(`Executing: ${btnText}`);
        lastClickedTargetText = btnText;
        await targetButton.click({ force: true });

        await targetButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });

        await this.page.waitForTimeout(1000);

        if (btnText.includes("Submit")) {
          await this._handleReviewerSelection();
        }
      } else {
        await this.page.waitForTimeout(1000);
      }
    }
    console.warn('Process timed out: loop limit reached.');
  }

  // --- DATE HELPERS ---
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

    return {
      soDate: fmt(today),
      invoiceDate: fmt(today),
      dueDate: fmt(due),
    };
  }

  getInvoiceDates() {
    const { invoiceDate, dueDate } = this.getTransactionDates();
    return { invoiceDate, dueDate };
  }

  async fillDate(index, dateValue) {
    const dayToSelect = parseInt(dateValue.split('/')[0], 10).toString();
    const datePickerBtn = this.page.locator('button:has(span.formatted-date)').nth(index);

    await datePickerBtn.click();
    await this.page.waitForTimeout(800);

    const dayButton = this.page
      .locator('div[role="grid"] button')
      .getByText(dayToSelect, { exact: true })
      .first();

    if (await dayButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayButton.click();
    } else {
      await this.page.keyboard.type(dateValue);
      await this.page.keyboard.press('Enter');
    }
  }
}

module.exports = { AppManager };