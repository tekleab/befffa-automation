import { Page } from '@playwright/test';
import { AuthManager } from '../lib/auth';
import { BasePage } from '../lib/base-page';
import { SalesAPI } from '../lib/api/SalesAPI';
import { PurchaseAPI } from '../lib/api/PurchaseAPI';
import { InventoryAPI } from '../lib/api/InventoryAPI';
import { HrAPI } from '../lib/api/HrAPI';
import { ProjectAPI } from '../lib/api/ProjectAPI';
import { SharedUI } from './components/SharedUI';
import { SalesPage } from './SalesPage';
import { PurchasePage } from './PurchasePage';
import { InventoryPage } from './InventoryPage';
import { ProjectPage } from './ProjectPage';

export class AppManager {
  page: Page;
  emailInput: ReturnType<Page['getByRole']>;
  passwordInput: ReturnType<Page['getByRole']>;
  loginBtn: ReturnType<Page['getByRole']>;
  mainPhoneInput: ReturnType<Page['getByRole']>;
  customerNameInput: ReturnType<Page['getByRole']>;
  customerTinInput: ReturnType<Page['getByRole']>;
  customerTypeSelect: ReturnType<Page['locator']>;
  customerPhoneInput: ReturnType<Page['locator']>;
  createCustomerBtn: ReturnType<Page['locator']>;
  editCustomerBtn: ReturnType<Page['locator']>;
  removeCustomerBtn: ReturnType<Page['locator']>;
  approvedStatus: string;
  actionButtons: string;
  companyBtn: ReturnType<Page['locator']>;
  auth: AuthManager;
  base: BasePage;
  api: {
    sales: SalesAPI;
    purchase: PurchaseAPI;
    inventory: InventoryAPI;
    hr: HrAPI;
    project: ProjectAPI;
    general: AppManager;
  };
  ui: {
    shared: SharedUI;
    sales: SalesPage;
    purchase: PurchasePage;
    inventory: InventoryPage;
    project: ProjectPage;
  };

  constructor(page: Page) {
    this.page = page;

    // Login selectors
    this.emailInput = page.getByRole('textbox', { name: 'Email *' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password *' });
    this.loginBtn = page.getByRole('button', { name: 'Login' });

    // --- Customer Module Selectors ---
    this.mainPhoneInput = page.getByRole('textbox', { name: /Main Phone/i });
    this.customerNameInput = page.locator('#customer_name-input-id');
    this.customerTinInput = page.locator('#customer_tin-input-id');
    this.customerTypeSelect = page.locator('#type-select-id');
    this.customerPhoneInput = page.locator('input[name="phone.p1"]');
    this.createCustomerBtn = page.locator('button:has-text("Create Customer")');
    this.editCustomerBtn = page.getByRole('button', { name: /^edit$/i });
    this.removeCustomerBtn = page.getByRole('button', { name: /^remove$/i });


    // Status and Button Selectors
    this.approvedStatus = 'span.css-1ny2kle:has-text("Approved"), span:has-text("Approved")';
    this.actionButtons = 'button:has-text("Submit For Review"), button:has-text("Approve"), button:has-text("Advance"), button:has-text("Submit For Approver"), button:has-text("Submit Forapprover"), button:has-text("Submit For Approve"), button:has-text("Submit For Apporver")';

    // Company Switcher Selectors (Top-left Header)
    this.companyBtn = page.locator('header button.chakra-menu__menu-button, .chakra-stack button.chakra-menu__menu-button').first();

    // Module Mappings
    this.auth = new AuthManager(page);
    this.base = new BasePage(page);
    this.api = {
      sales: new SalesAPI(page),
      purchase: new PurchaseAPI(page),
      inventory: new InventoryAPI(page),
      hr: new HrAPI(page),
      project: new ProjectAPI(page),
      general: this
    };
    this.ui = {
      shared: new SharedUI(page),
      sales: new SalesPage(page),
      purchase: new PurchasePage(page),
      inventory: new InventoryPage(page),
      project: new ProjectPage(page)
    };

    // Core Dependencies bindings
    this.base._getAuthToken = this.auth._getAuthToken.bind(this.auth);
    this.api.sales._getAuthToken = this.auth._getAuthToken.bind(this.auth);
    this.api.purchase._getAuthToken = this.auth._getAuthToken.bind(this.auth);
    this.api.inventory._getAuthToken = this.auth._getAuthToken.bind(this.auth);
    this.api.hr._getAuthToken = this.auth._getAuthToken.bind(this.auth);
    this.api.project._getAuthToken = this.auth._getAuthToken.bind(this.auth);

    this.ui.shared.smartSearch = this.base.smartSearch.bind(this.base);
    // this.ui.shared.smartApprove = this.base.smartApprove.bind(this.base);
    this.ui.purchase.smartSearch = this.base.smartSearch.bind(this.base);
    this.ui.sales.smartSearch = this.base.smartSearch.bind(this.base);
    this.ui.inventory.smartSearch = this.base.smartSearch.bind(this.base);

    // Bind date helpers
    this.ui.shared.fillDate = this.base.fillDate.bind(this.base);
    this.ui.purchase.fillDate = this.base.fillDate.bind(this.base);
    this.ui.sales.fillDate = this.base.fillDate.bind(this.base);
  }

  get apiBase(): string { return this.base.apiBase; }

  async login(...args: Parameters<AuthManager['login']>) { return await this.auth.login(...args); }
  async apiLogin(...args: Parameters<AuthManager['apiLogin']>) { return await this.auth.apiLogin(...args); }
  async switchCompany(...args: Parameters<AuthManager['switchCompany']>) { return await this.auth.switchCompany(...args); }
  async resolveActiveCompanyAPI(...args: Parameters<BasePage['resolveActiveCompanyAPI']>) { return await this.base.resolveActiveCompanyAPI(...args); }
  async smartSearch(...args: Parameters<BasePage['smartSearch']>) { return await this.base.smartSearch(...args); }
  async handleApprovalFlow(...args: Parameters<SharedUI['handleApprovalFlow']>) { return await this.ui.shared.handleApprovalFlow(...args); }
  // smartApprove removed — approval is handled entirely by SharedUI.handleApprovalFlow
  async _handleReviewerSelection(...args: Parameters<SharedUI['_handleReviewerSelection']>) { return await this.ui.shared._handleReviewerSelection(...args); }
  getTransactionDates(...args: Parameters<BasePage['getTransactionDates']>) { return this.base.getTransactionDates(...args); }
  async getActiveCalendarDay(...args: Parameters<BasePage['getActiveCalendarDay']>) { return await this.base.getActiveCalendarDay(...args); }
  async fillDate(...args: Parameters<BasePage['fillDate']>) { return await this.base.fillDate(...args); }
  async pickDate(...args: Parameters<BasePage['pickDate']>) { return await this.base.pickDate(...args); }
  async selectRandomOption(...args: Parameters<BasePage['selectRandomOption']>) { return await this.base.selectRandomOption(...args); }
  async verifyDocInProfile(...args: Parameters<SharedUI['verifyDocInProfile']>) { return await this.ui.shared.verifyDocInProfile(...args); }
  async findApprovedUnpaidBill(...args: Parameters<PurchasePage['findApprovedUnpaidBill']>) { return await this.ui.purchase.findApprovedUnpaidBill(...args); }
  async findApprovedUnpaidInvoice(...args: Parameters<SalesPage['findApprovedUnpaidInvoice']>) { return await this.ui.sales.findApprovedUnpaidInvoice(...args); }
  async captureJournalEntries(...args: Parameters<SharedUI['captureJournalEntries']>) { return await this.ui.shared.captureJournalEntries(...args); }
  async handlePOReceiptTab(...args: Parameters<PurchasePage['handlePOReceiptTab']>) { return await this.ui.purchase.handlePOReceiptTab(...args); }
  async handleSOReleasedTab(...args: Parameters<SalesPage['handleSOReleasedTab']>) { return await this.ui.sales.handleSOReleasedTab(...args); }
  getInvoiceDates(...args: Parameters<BasePage['getInvoiceDates']>) { return this.base.getInvoiceDates(...args); }
  async captureRandomItemDataAPI(...args: Parameters<InventoryAPI['captureRandomItemDataAPI']>) { return await this.api.inventory.captureRandomItemDataAPI(...args); }
  async discoverMetadataAPI() { return await this.api.purchase.discoverMetadataAPI(); }
  async discoverRandomVendorAPI() { return await this.api.purchase.discoverRandomVendorAPI(); }
  async createFreshItemWithStockAPI(...args: Parameters<InventoryAPI['createFreshItemWithStockAPI']>) { return await this.api.inventory.createFreshItemWithStockAPI(...args); }
  async captureRandomItemDetails() {
    const target = await this.api.inventory.createFreshItemWithStockAPI({ cost_method_code: 'WAC', quantity: 20, unit_cost: 100 });
    console.log(`[OK] Created fresh item: "${target.itemName}" | Stock: ${target.currentStock}`);
    return target;
  }
  async extractDetailValue(...args: Parameters<BasePage['extractDetailValue']>) { return await this.base.extractDetailValue(...args); }
  async captureSODetailData(...args: Parameters<SalesPage['captureSODetailData']>) { return await this.ui.sales.captureSODetailData(...args); }
  async getCustomerNameAPI(...args: Parameters<SalesAPI['getCustomerNameAPI']>) { return await this.api.sales.getCustomerNameAPI(...args); }
  async captureRandomCustomerDetails(...args: Parameters<SalesPage['captureRandomCustomerDetails']>) { return await this.ui.sales.captureRandomCustomerDetails(...args); }
  async captureRandomVendorDetails(...args: Parameters<PurchasePage['captureRandomVendorDetails']>) { return await this.ui.purchase.captureRandomVendorDetails(...args); }
  async captureItemDetails(...args: Parameters<InventoryPage['captureItemDetails']>) { return await this.ui.inventory.captureItemDetails(...args); }
  async getItemDetailsAPI(...args: Parameters<InventoryAPI['getItemDetailsAPI']>) { return await this.api.inventory.getItemDetailsAPI(...args); }
  async _extractItemDetails(...args: Parameters<InventoryPage['_extractItemDetails']>) { return await this.ui.inventory._extractItemDetails(...args); }
  async verifyLedgerImpact(...args: Parameters<SharedUI['verifyLedgerImpact']>) { return await this.ui.shared.verifyLedgerImpact(...args); }
  async verifyAllJournalEntries(...args: Parameters<SharedUI['verifyAllJournalEntries']>) { return await this.ui.shared.verifyAllJournalEntries(...args); }
  async fillEthiopianAddress(...args: Parameters<SharedUI['fillEthiopianAddress']>) { return await this.ui.shared.fillEthiopianAddress(...args); }
  async _getAuthToken(...args: Parameters<AuthManager['_getAuthToken']>) { return await this.auth._getAuthToken(...args); }
  async createSalesOrderAPI(...args: Parameters<SalesAPI['createSalesOrderAPI']>) { return await this.api.sales.createSalesOrderAPI(...args); }
  async createInvoiceAPI(...args: Parameters<SalesAPI['createInvoiceAPI']>) { return await this.api.sales.createInvoiceAPI(...args); }
  async createStandaloneInvoiceAPI(...args: Parameters<SalesAPI['createStandaloneInvoiceAPI']>) { return await this.api.sales.createStandaloneInvoiceAPI(...args); }
  async createPurchaseOrderAPI(...args: Parameters<PurchaseAPI['createPurchaseOrderAPI']>) { return await this.api.purchase.createPurchaseOrderAPI(...args); }
  async createBillAPI(...args: Parameters<PurchaseAPI['createBillAPI']>) { return await this.api.purchase.createBillAPI(...args); }
  async createBillFromPoAPI(...args: Parameters<PurchaseAPI['createBillFromPoAPI']>) { return await this.api.purchase.createBillFromPoAPI(...args); }
  async verifyBillInVendorAPI(...args: Parameters<PurchaseAPI['verifyBillInVendorAPI']>) { return await this.api.purchase.verifyBillInVendorAPI(...args); }
  async createInventoryAdjustmentUI(...args: Parameters<InventoryPage['createInventoryAdjustmentUI']>) { return await this.ui.inventory.createInventoryAdjustmentUI(...args); }
  async createInventoryAdjustmentAPI(...args: Parameters<InventoryAPI['createInventoryAdjustmentAPI']>) { return await this.api.inventory.createInventoryAdjustmentAPI(...args); }
  async createInvoiceReceiptAPI(...args: Parameters<SalesAPI['createInvoiceReceiptAPI']>) { return await this.api.sales.createInvoiceReceiptAPI(...args); }
  async getInvoiceAPI(...args: Parameters<SalesAPI['getInvoiceAPI']>) { return await this.api.sales.getInvoiceAPI(...args); }
  async createReceiptAPI(...args: Parameters<SalesAPI['createReceiptAPI']>) { return await this.api.sales.createReceiptAPI(...args); }
  async getJournalEntriesAPI(...args: Parameters<InventoryAPI['getJournalEntriesAPI']>) { return await this.api.inventory.getJournalEntriesAPI(...args); }
  async reverseInvoiceAPI(...args: Parameters<SalesAPI['reverseInvoiceAPI']>) { return await this.api.sales.reverseInvoiceAPI(...args); }
  async reverseReceiptAPI(...args: Parameters<SalesAPI['reverseReceiptAPI']>) { return await this.api.sales.reverseReceiptAPI(...args); }
  async getBillAPI(...args: Parameters<PurchaseAPI['getBillAPI']>) { return await this.api.purchase.getBillAPI(...args); }
  async approvePaymentAPI(...args: Parameters<PurchaseAPI['approvePaymentAPI']>) { return await this.api.purchase.approvePaymentAPI(...args); }
  async approveInvoiceAPI(...args: Parameters<SalesAPI['approveInvoiceAPI']>) { return await this.api.sales.approveInvoiceAPI(...args); }
  async createBillPaymentAPI(...args: Parameters<PurchaseAPI['createBillPaymentAPI']>) { return await this.api.purchase.createBillPaymentAPI(...args); }
  async reverseBillAPI(...args: Parameters<PurchaseAPI['reverseBillAPI']>) { return await this.api.purchase.reverseBillAPI(...args); }
  async getPaymentAPI(...args: Parameters<PurchaseAPI['getPaymentAPI']>) { return await this.api.purchase.getPaymentAPI(...args); }
  async extractIdFromUrl(...args: Parameters<BasePage['extractIdFromUrl']>) { return await this.base.extractIdFromUrl(...args); }
  async advanceDocumentAPI(...args: Parameters<BasePage['advanceDocumentAPI']>) { return await this.base.advanceDocumentAPI(...args); }
  async pollStockAPI(...args: Parameters<InventoryAPI['pollStockAPI']>) { return await this.api.inventory.pollStockAPI(...args); }
  async createMoveOrderAPI(...args: Parameters<InventoryAPI['createMoveOrderAPI']>) { return await this.api.inventory.createMoveOrderAPI(...args); }
  async ensureTransferDestinationAPI(...args: Parameters<InventoryAPI['ensureTransferDestinationAPI']>) { return await this.api.inventory.ensureTransferDestinationAPI(...args); }
  async getAccountBalancesAPI() { return await this.base.getAllAccountsAPI(); }
  async getAllAccountsAPI() { return await this.base.getAllAccountsAPI(); }
  async getMultiAccountBalancesAPI(...args: Parameters<BasePage['getMultiAccountBalancesAPI']>) { return await this.base.getMultiAccountBalancesAPI(...args); }
  async getAccountBalanceAPI(...args: Parameters<BasePage['getAccountBalanceAPI']>) { return await this.base.getAccountBalanceAPI(...args); }
  async getBillJournalEntriesAPI(...args: Parameters<PurchaseAPI['getBillJournalEntriesAPI']>) { return await this.api.purchase.getBillJournalEntriesAPI(...args); }
  async buildApiContext(...args: Parameters<BasePage['buildApiContext']>) { return await this.base.buildApiContext(...args); }
  async topUpItemStockAPI(...args: Parameters<BasePage['topUpItemStockAPI']>) { return await this.base.topUpItemStockAPI(...args); }
  async seedCashBalanceAPI(...args: Parameters<BasePage['seedCashBalanceAPI']>) { return await this.base.seedCashBalanceAPI(...args); }
  parseInsufficientStock(...args: Parameters<BasePage['parseInsufficientStock']>) { return this.base.parseInsufficientStock(...args); }
  parseInsufficientCashTopUp(...args: Parameters<BasePage['parseInsufficientCashTopUp']>) { return this.base.parseInsufficientCashTopUp(...args); }

  async createSalesReceiptFromSoAPI(soId: string): Promise<{ receiptNumber: string; receiptId: string }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001')
      .replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001');
    if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this.auth._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const params = `year=${process.env.BEFFA_YEAR || '2019'}&period=${process.env.BEFFA_PERIOD || 'yearly'}&calendar=${process.env.BEFFA_CALENDAR || 'ec'}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Fetch SO to get invoice details
    const soResp = await this.page.request.get(`${apiBase}/sales-order/${soId}?${params}`, { headers });
    if (!soResp.ok()) throw new Error(`Failed to fetch SO ${soId}: ${soResp.status()}`);
    const soData = await soResp.json();

    // Find the linked approved invoice
    const invResp = await this.page.request.get(`${apiBase}/invoices?sales_order_id=${soId}&${params}`, { headers });
    let invoiceId: string | undefined;
    let invoiceAmount: number = 0;
    let customerId: string = soData.customer_id;

    if (invResp.ok()) {
      const invData = await invResp.json();
      const inv = (invData.items || invData.data || [])[0];
      if (inv) { invoiceId = inv.id; invoiceAmount = parseFloat(inv.total_amount || inv.net_total || '0'); }
    }

    if (!invoiceId) throw new Error(`No invoice found linked to SO ${soId}. Approve an invoice first.`);

    const meta = await this.api.sales.discoverMetadataAPI();
    const rct = await this.api.sales.createInvoiceReceiptAPI({
      invoiceId,
      customerId,
      amount: invoiceAmount || 1000,
      currencyId: meta.currencyId,
      cashAccountId: meta.cashAccountId
    });
    return { receiptNumber: rct.ref, receiptId: rct.id };
  }
}
