import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base-page';

export class PurchaseAPI extends BasePage {
  page: Page;
  emailInput: Locator;
  passwordInput: Locator;
  loginBtn: Locator;
  mainPhoneInput: Locator;
  customerNameInput: Locator;
  customerTinInput: Locator;
  approvedStatus: string;
  actionButtons: string;
  companyBtn: Locator;

  constructor(page: Page) {

    super(page);
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
    this.actionButtons = 'button:has-text("Submit For Review"), button:has-text("Approve"), button:has-text("Advance"), button:has-text("Submit For Approver"), button:has-text("Submit Forapprover"), button:has-text("Submit For Approve"), button:has-text("Submit For Apporver")';

    // Company Switcher Selectors (Top-left)
    this.companyBtn = page.locator('button.chakra-menu__menu-button').first();
  }

  async createVendorAPI(vendorName?: string): Promise<{ id: string; name: string }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const qs = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const acctResp = await this.safeGet(`${apiBase}/accounts?page=1&pageSize=50&${qs}`, { headers });
    const acctData = await acctResp.json().catch(() => ({}));
    const allAccounts = acctData.items || acctData.data || [];
    const apAccount = allAccounts.find((a: any) => (a.type || a.account_type || a.name || '').toLowerCase().includes('payable')) || allAccounts[0];

    const currResp = await this.safeGet(`${apiBase}/currency?${qs}`, { headers });
    const currData = await currResp.json().catch(() => ({}));
    const currency = currData.items?.[0] || currData.data?.[0];

    const name = vendorName || `Audit-Vendor-${Date.now()}`;
    const randomTin = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Query existing system vendor to extract valid 'type' property
    const sampleResp = await this.safeGet(`${apiBase}/vendors?page=1&pageSize=5&${qs}`, { headers });
    let existingType: string | null = null;
    if (sampleResp.ok()) {
      const sampleData = await sampleResp.json().catch(() => ({}));
      const items = sampleData.items || sampleData.data || [];
      const found = items.find((v: any) => v.type || v.vendor_type);
      if (found) {
        existingType = found.type || found.vendor_type;
        console.log(`[VENDOR_TYPE] Discovered system vendor type: "${existingType}"`);
      }
    }

    const typesToTry = existingType
      ? [existingType, 'Business', 'Organization', 'Person', 'business', 'organization', 'person', 'local', 'trade']
      : ['Business', 'Organization', 'Person', 'business', 'organization', 'person', 'local', 'trade'];

    let lastErr = '';
    for (const typeVal of typesToTry) {
      const dynamicPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
      const payload = {
        name,
        tin: randomTin,
        type: typeVal,
        phone: dynamicPhone,
        email: `vendor_${Date.now()}_${Math.floor(Math.random() * 1000)}@audit.com`,
        accounts_payable_id: apAccount?.id,
        currency_id: currency?.id,
        address: {
          region: 'Addis Ababa City Administration',
          zone: 'Bole Subcity',
          woreda: 'Woreda 2',
          kebele: '1'
        }
      };

      const response = await this.safePost(`${apiBase}/vendors?${qs}`, {
        data: payload,
        headers,
        label: `Create Vendor (${typeVal})`
      });

      if (response.ok()) {
        const json = await response.json();
        return { id: json.id, name: json.name || name };
      }
      lastErr = await response.text();
    }

    throw new Error(`Vendor API Creation Failed: ${lastErr}`);
  }

  async discoverRandomVendorAPI(): Promise<{ id: string; name: string }> {
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY || 'sample';
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;

    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';

    const response = await this.safeGet(`${apiBase}/vendors?page=1&pageSize=10&${params}`, {
      headers: { 'x-company': company, 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    const vendor = (data.items || data.data || [])[0];
    if (!vendor) return this.createVendorAPI();

    return { id: vendor.id, name: vendor.name };
  }

  async discoverMetadataAPI(): Promise<{ apAccountId: string; currencyId: string; taxId: string; locationId: string; warehouseId: string; vendorId: string; vendorName: string; withholdingAccountId: string }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}` };

    const safeJson = async (resp: any, label: string) => {
      const text = await resp.text();
      if (!resp.ok()) throw new Error(`${label} HTTP ${resp.status()}: ${text.substring(0, 200)}`);
      try { return JSON.parse(text); } catch (e) { throw new Error(`${label} returned invalid JSON: ${text.substring(0, 150)}`); }
    };

    // 1. Fetch Accounts (with graceful fallback)
    let allAccounts: any[] = [];
    try {
      const accResp = await this.safeGet(`${apiBase}/accounts?page=1&pageSize=300&${params}`, { headers });
      if (accResp.ok()) {
        const accData = await accResp.json();
        allAccounts = accData.items || accData.data || [];
      }
    } catch (e) {
      console.warn(`[WARN] Accounts Discovery hit transient delay: ${e?.message || e}`);
    }

    const apAccount =
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('accounts payable')) ||
      allAccounts.find((a: any) => (a.type || a.account_type || '').toLowerCase().includes('payable')) ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('payable')) ||
      allAccounts.find((a: any) => a.type?.name?.toLowerCase().includes('payable')) ||
      allAccounts.find((a: any) => (a.type || a.account_type || '').toLowerCase().includes('liability')) ||
      allAccounts[1] || allAccounts[0];

    const wtAccount =
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('withholding tax payable')) ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('withholding payable')) ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('withholding')) ||
      apAccount;

    // 2. Fetch Currency (with graceful fallback)
    let currency: any = null;
    try {
      const currResp = await this.safeGet(`${apiBase}/currency?${params}`, { headers });
      if (currResp.ok()) {
        const currData = await currResp.json();
        currency = currData.items?.[0] || currData.data?.[0];
      }
    } catch (e) {
      console.warn(`[WARN] Currency Discovery hit transient delay: ${e?.message || e}`);
    }

    // 3. Fetch Tax (optional)
    let tax: any = null;
    try {
      const taxResp = await this.safeGet(`${apiBase}/taxes?${params}`, { headers });
      if (taxResp.ok()) {
        const taxData = await taxResp.json();
        tax = taxData.items?.[0] || taxData.data?.[0] || null;
      }
    } catch (e) { console.warn(`[WARN] Tax Discovery failed — continuing without tax`); }

    // 4. Fetch Location/Warehouse
    const locResp = await this.safeGet(`${apiBase}/locations?page=1&pageSize=10&${params}`, { headers });
    let locationId = '', warehouseId = '';
    if (locResp.ok()) {
      const locData = await locResp.json();
      const firstLoc = (locData.items || locData.data || [])[0];
      if (firstLoc) {
        locationId = firstLoc.id;
        warehouseId = await this.resolveWarehouseIdFromLocation(firstLoc);
      }
    }

    // 5. Fetch Vendor (with graceful fallback against transient API timeout)
    let vendor: any = null;
    try {
      const vendorResp = await this.safeGet(`${apiBase}/vendors?page=1&pageSize=5&${params}`, { headers });
      if (vendorResp.ok()) {
        const vendorData = await vendorResp.json();
        vendor = (vendorData.items || vendorData.data || [])[0];
      }
    } catch (e) {
      console.warn(`[WARN] Vendor Discovery hit transient delay: ${e?.message || e}`);
    }

    return {
      apAccountId: apAccount?.id || '',
      currencyId: currency?.id || '',
      taxId: tax?.id || '',
      locationId,
      warehouseId,
      vendorId: vendor?.id || process.env.BEFFA_VENDOR_ID || '',
      vendorName: vendor?.name || 'Default Vendor',
      withholdingAccountId: wtAccount?.id || ''
    };
  }

  async createPurchaseOrderAPI(itemData: Record<string, any> = {}, qty: number = 10, unitPrice: number = 5000, vendorId: string | null = null): Promise<{ success: boolean; poNumber: string; poId: string; poItems: any[] }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const safeJson = async (resp: any, label: string) => {
      const text = await resp.text();
      if (!resp.ok()) throw new Error(`${label} HTTP ${resp.status()}: ${text.substring(0, 200)}`);
      try { return JSON.parse(text); } catch (e) { throw new Error(`${label} invalid JSON: ${text.substring(0, 150)}`); }
    };

    // Use cached metadata to avoid firing 4x N GET requests under concurrent load
    let meta: any = null;
    try {
      meta = await this.discoverMetadataAPI();
    } catch { /* fallback to direct discovery if needed */ }

    let resolvedVendorId = vendorId || meta?.vendorId || process.env.BEFFA_VENDOR_ID || '';
    let apAccountId = meta?.apAccountId;
    let currencyId = meta?.currencyId;
    let locationId = itemData.locationId || meta?.locationId;
    let warehouseId = itemData.warehouseId || meta?.warehouseId;
    let glAccountId = meta?.apAccountId; // Fallback GL account

    if (!resolvedVendorId) {
      const vendorResp = await this.safeGet(`${apiBase}/vendors?page=1&pageSize=10&${params}`, { headers });
      const vendorData = await safeJson(vendorResp, 'Vendor Discovery');
      const vendor = vendorData.items?.[0] || vendorData.data?.[0];
      if (!vendor) throw new Error('PO Discovery Failed: No vendors found.');
      resolvedVendorId = vendor.id;
    }

    if (!apAccountId) {
      const acctResp = await this.safeGet(`${apiBase}/accounts?page=1&pageSize=50&${params}`, { headers });
      const acctData = await safeJson(acctResp, 'Accounts Discovery');
      const allAccounts = acctData.items || acctData.data || [];
      const typeOf = (a: any) => (a.type || a.account_type || '').toLowerCase();
      const apAccount = allAccounts.find((a: any) => typeOf(a).includes('payable')) || allAccounts[0];
      const glAccount = allAccounts.find((a: any) => typeOf(a).includes('expense')) || allAccounts[1] || allAccounts[0];
      apAccountId = apAccount?.id;
      glAccountId = glAccount?.id;
    }

    if (!locationId || !warehouseId) {
      const locResp = await this.safeGet(`${apiBase}/locations?page=1&pageSize=10&${params}`, { headers });
      const locData = await safeJson(locResp, 'Location Discovery');
      const firstLoc = (locData.items || locData.data || [])[0];
      if (firstLoc) {
        locationId = firstLoc.id;
        warehouseId = await this.resolveWarehouseIdFromLocation(firstLoc);
      }
    }

    if (!currencyId) {
      const currResp = await this.safeGet(`${apiBase}/currency?${params}`, { headers });
      const currData = await safeJson(currResp, 'Currency Discovery');
      const currency = (currData.items || currData.data || [])[0];
      currencyId = currency?.id;
    }

    const { DateHelper: _DH } = require('../utils/DateHelper');
    const _resolved = await _DH.resolve(this.page);
    const _dateIso = _resolved.iso;
    const payload = {
      accounts_payable_id: apAccountId,
      currency_id: currencyId,
      po_date: (itemData as any).orderDate || (itemData as any).po_date || _dateIso,
      po_items: [{
        item_id: itemData.itemId,
        general_ledger_account_id: glAccountId || apAccountId,
        location_id: locationId,
        quantity: qty,
        tax_id: itemData.taxId || null,
        unit_price: unitPrice,
        warehouse_id: warehouseId,
        description: `Purchase of ${itemData.itemName}`
      }],
      purchase_type_id: 4,
      vendor_id: resolvedVendorId
    };

    let response = await this.safePost(`${apiBase}/purchase-orders?year=${year}&period=${period}&calendar=${calendar}`, {
      data: payload,
      headers,
      label: 'Create Purchase Order'
    });

    for (let attempt = 1; attempt <= 3 && !response.ok(); attempt++) {
      const errText = await response.text();
      if (errText.includes('unique_po_company') || errText.includes('duplicate key') || response.status() === 500) {
        console.warn(`[WARN] PO creation hit sequence collision (attempt ${attempt}/3). Retrying in ${attempt * 500}ms...`);
        await this.page.waitForTimeout(attempt * 500);
        response = await this.safePost(`${apiBase}/purchase-orders?year=${year}&period=${period}&calendar=${calendar}`, {
          data: payload,
          headers,
          label: `Create Purchase Order (retry ${attempt})`
        });
      } else {
        break;
      }
    }

    if (!response.ok()) throw new Error(`PO API Creation Failed: ${response.status()} - ${await response.text()}`);
    const json = await response.json();
    // Return po_items from the creation response — GET /purchase-order/{id} strips them out
    return { success: true, poNumber: json.po_number, poId: json.id, poItems: json.po_items || [] };
  }


  async createBillAPI(params: { itemData?: Record<string, any>; itemId?: string; quantity?: number; qty?: number; unitPrice?: number; vendorId?: string | null; apAccountId?: string | null; glAccountId?: string | null; discount_amount?: number; description?: string; poId?: string } = {}): Promise<{ success: boolean; ref: string; id: string; error?: string }> {
    const { itemData = {}, itemId = null, quantity = 10, qty = 10, unitPrice = 5000, vendorId = null, apAccountId = null, glAccountId = undefined, discount_amount = 0, description = null, poId = null } = params;
    const finalQty = quantity || qty;
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const qs = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const safeJson = async (resp: any, label: string) => {
      const text = await resp.text();
      if (!resp.ok()) throw new Error(`${label} HTTP ${resp.status()}: ${text.substring(0, 200)}`);
      try { return JSON.parse(text); } catch (e) { throw new Error(`${label} invalid JSON: ${text.substring(0, 150)}`); }
    };

    // 1. Discover Vendor - always use company-scoped discovery (never trust hardcoded UUIDs)
    let resolvedVendorId = vendorId;
    if (!resolvedVendorId) {
      // Use same pattern as createPurchaseOrderAPI which works reliably
      const vendorResp = await this.safeGet(`${apiBase}/vendors?page=1&pageSize=10&${qs}`, { headers });
      const vendorData = await safeJson(vendorResp, 'Vendor Discovery');
      const vendor = vendorData.items?.[0] || vendorData.data?.[0];
      if (!vendor) throw new Error('Bill Discovery Failed: No vendors found in current company.');
      resolvedVendorId = vendor.id;
    }

    // 2. Discover Accounts (AP + GL)
    const acctResp = await this.safeGet(`${apiBase}/accounts?page=1&pageSize=50&${qs}`, { headers });
    const acctData = await safeJson(acctResp, 'Accounts Discovery');
    const allAccounts = acctData.items || acctData.data || [];

    // Improved strict AP discovery
    const _typeOf = (a: any) => {
      if (typeof a.type === 'string') return a.type.toLowerCase();
      if (a.type?.name && typeof a.type.name === 'string') return a.type.name.toLowerCase();
      if (typeof a.account_type === 'string') return a.account_type.toLowerCase();
      if (a.account_type?.name && typeof a.account_type.name === 'string') return a.account_type.name.toLowerCase();
      return '';
    };
    const discoveredAp =
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('accounts payable')) ||
      allAccounts.find((a: any) => _typeOf(a).includes('payable')) ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('payable')) ||
      allAccounts.find((a: any) => _typeOf(a).includes('liability')) ||
      allAccounts[0];

    const resolvedGlAccount = glAccountId !== undefined ? { id: glAccountId } : (allAccounts.find((a: any) => _typeOf(a).includes('expense')) || allAccounts[1] || allAccounts[0]);

    // 3. Discover Currency
    const currResp = await this.safeGet(`${apiBase}/currency?${qs}`, { headers });
    const currData = await safeJson(currResp, 'Currency Discovery');
    const currency = currData.items?.[0] || currData.data?.[0];

    // 4. Discover Locations if missing
    let locationId = itemData.locationId;
    let warehouseId = itemData.warehouseId;
    if (!locationId || !warehouseId) {
      const locResp = await this.safeGet(`${apiBase}/locations?page=1&pageSize=10&${qs}`, { headers });
      const locData = await safeJson(locResp, 'Location Discovery');
      const firstLoc = (locData.items || locData.data || [])[0];
      if (firstLoc) {
        locationId = firstLoc.id;
        warehouseId = await this.resolveWarehouseIdFromLocation(firstLoc);
      }
    }

    const { DateHelper: _DH } = require('../utils/DateHelper');
    const _dateIso = (await _DH.resolve(this.page)).iso;
    const payload = {
      accounts_payable_id: apAccountId || discoveredAp?.id,
      currency_id: currency?.id,
      invoice_date: (params as any).invoice_date || _dateIso,
      due_date: (params as any).due_date || _dateIso,
      items: [{
        item_id: itemData.itemId || itemData.id,
        general_ledger_account_id: resolvedGlAccount?.id || null,
        location_id: locationId,
        quantity: finalQty,
        tax_id: itemData.taxId || null,
        unit_price: unitPrice,
        warehouse_id: warehouseId,
        description: description || `Audit Bill of ${itemData.itemName || itemData.name}`,
        amount: finalQty * unitPrice,
        discount_amount: discount_amount
      }],
      vendor_id: resolvedVendorId,
      status: 'draft'
    };

    let response = await this.safePost(`${apiBase}/bills?${qs}`, {
      data: payload,
      headers,
      label: 'Create Bill'
    });

    if (response.status() === 401) {
      console.warn(`[WARN] Create Bill received 401 (likely invalid vendor ID ${resolvedVendorId}). Discovering fresh vendor...`);
      const freshVendor = await this.discoverRandomVendorAPI();
      payload.vendor_id = freshVendor.id;
      response = await this.safePost(`${apiBase}/bills?${qs}`, {
        data: payload,
        headers,
        label: 'Create Bill (fresh vendor retry)'
      });
    }

    if (!response.ok()) throw new Error(`Bill API Creation Failed: ${response.status()} - ${await response.text()}`);
    const json = await response.json();
    return { success: true, ref: json.invoice_number, id: json.id };
  }
  async createBillFromPoAPI(poId: string, poItems?: any[], apAccountId?: string | null): Promise<{ success: boolean; billNumber: string; billId: string; vendorId?: string }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const safeJson = async (resp: any, label: string) => {
      const text = await resp.text();
      if (!resp.ok()) throw new Error(`${label} HTTP ${resp.status()}: ${text.substring(0, 200)}`);
      try { return JSON.parse(text); } catch (e) { throw new Error(`${label} invalid JSON: ${text.substring(0, 150)}`); }
    };

    // Fetch PO header (vendor, currency) — po_items are NOT returned by GET, use passed poItems
    const poResp = await this.safeGet(`${apiBase}/purchase-order/${poId}?${params}`, { headers });
    const poData = await safeJson(poResp, `Fetch PO ${poId}`);

    // Use po_items passed from createPurchaseOrderAPI (creation response has ids).
    // If not passed, throw a clear error — GET /purchase-order/{id} never returns po_items.
    const rawItems: any[] = (poItems || []).filter((i: any) => i.id);
    if (rawItems.length === 0) {
      throw new Error(`[createBillFromPoAPI] po_items with ids are required. Pass the po_items array from createPurchaseOrderAPI's response. GET /purchase-order/{id} does not return po_items.`);
    }

    // Discover AP account
    const acctResp = await this.safeGet(`${apiBase}/accounts?page=1&pageSize=50&${params}`, { headers });
    const acctData = await safeJson(acctResp, 'Accounts Discovery');
    const allAccounts = acctData.items || acctData.data || [];

    const _typeOf = (a: any) => {
      if (typeof a.type === 'string') return a.type.toLowerCase();
      if (a.type?.name && typeof a.type.name === 'string') return a.type.name.toLowerCase();
      if (typeof a.account_type === 'string') return a.account_type.toLowerCase();
      if (a.account_type?.name && typeof a.account_type.name === 'string') return a.account_type.name.toLowerCase();
      return '';
    };

    const discoveredAp =
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('accounts payable')) ||
      allAccounts.find((a: any) => _typeOf(a).includes('payable')) ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('payable')) ||
      allAccounts.find((a: any) => _typeOf(a).includes('liability')) ||
      allAccounts[0];

    const apAccount = apAccountId ? { id: apAccountId } : discoveredAp;

    const receivedItems = rawItems.map((item: any) => ({
      po_item_id: item.id,
      received_quantity: item.quantity,
      received_unit_price: item.unit_price
    }));

    const { DateHelper: _DH } = require('../utils/DateHelper');
    const _dateIso = (await _DH.resolve(this.page)).iso;
    const payload = {
      accounts_payable_id: apAccount?.id,
      currency_id: poData.currency_id || poData.currency?.id,
      due_date: _dateIso,
      invoice_date: _dateIso,
      items: [],
      purchase_order_id: poId,
      vendor_id: poData.vendor_id || poData.vendor?.id,
      received_purchase_order_items: receivedItems,
      status: 'draft'
    };

    const response = await this.safePost(`${apiBase}/bills?${params}`, {
      data: payload,
      headers,
      label: 'Create API Bill from PO'
    });

    if (!response.ok()) throw new Error(`PO-to-Bill API Failed: ${response.status()} - ${await response.text()}`);
    const json = await response.json();
    return { success: true, billNumber: json.invoice_number, billId: json.id, vendorId: json.vendor_id || json.vendor?.id || payload.vendor_id };
  }


  async getPoReceiveStatusAPI(poId: string): Promise<{ poQty: number; receivedQty: number; remainingQty: number }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const poResp = await this.safeGet(`${apiBase}/purchase-order/${poId}?${params}`, { headers });
    if (!poResp.ok()) throw new Error(`Fetch PO ${poId} failed: ${poResp.status()}`);
    const poData = await poResp.json();
    const poItems = poData.po_items || [];

    let poQty = 0;
    let receivedQty = 0;
    for (const item of poItems) {
      const qty = parseFloat(item.quantity || '0');
      poQty += qty;
      const unreceived = item.unreceived_quantity ?? item.remaining_quantity ?? item.unreceived_qty;
      if (unreceived != null) {
        receivedQty += qty - parseFloat(unreceived);
      } else if (item.received_quantity != null) {
        receivedQty += parseFloat(item.received_quantity);
      }
    }

    // Fallback: if PO item fields don't reflect received qty, sum approved bills linked to this PO
    if (receivedQty === 0 && poQty > 0) {
      const billsResp = await this.safeGet(`${apiBase}/bills?purchase_order_id=${poId}&pageSize=50&${params}`, { headers });
      if (billsResp.ok()) {
        const billsData = await billsResp.json();
        const bills = billsData.data || billsData.items || [];
        const approvedBills = bills.filter((b: any) => b.status === 'approved');
        for (const bill of approvedBills) {
          const billDetail = await this.safeGet(`${apiBase}/bill/${bill.id}?${params}`, { headers });
          if (billDetail.ok()) {
            const bd = await billDetail.json();
            for (const ri of (bd.received_purchase_order_items || [])) {
              receivedQty += parseFloat(ri.received_quantity || '0');
            }
          }
        }
      }
    }

    return { poQty, receivedQty, remainingQty: poQty - receivedQty };
  }

  async createPartialBillFromPoAPI(
    poId: string,
    receivedItems: Array<{ po_item_id: string; received_quantity: number; received_unit_price: number }>
  ): Promise<{ success: boolean; billNumber: string; billId: string; status: number; error?: string }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const poResp = await this.safeGet(`${apiBase}/purchase-order/${poId}?${params}`, { headers });
    if (!poResp.ok()) throw new Error(`Fetch PO ${poId} failed: ${poResp.status()}`);
    const poData = await poResp.json();

    const acctResp = await this.safeGet(`${apiBase}/accounts?page=1&pageSize=50&${params}`, { headers });
    const acctData = await acctResp.json();
    const allAccounts = acctData.items || acctData.data || [];
    const apAccount = allAccounts.find((a: any) => (a.type || a.account_type || '').toLowerCase().includes('payable')) || allAccounts[0];

    const { DateHelper: _DH } = require('../utils/DateHelper');
    const _dateIso = (await _DH.resolve(this.page)).iso;
    const payload = {
      accounts_payable_id: apAccount?.id,
      currency_id: poData.currency_id || poData.currency?.id,
      due_date: _dateIso,
      invoice_date: _dateIso,
      items: [],
      purchase_order_id: poId,
      vendor_id: poData.vendor_id || poData.vendor?.id,
      received_purchase_order_items: receivedItems,
      status: 'draft'
    };

    const response = await this.page.request.post(`${apiBase}/bills?${params}`, { data: payload, headers, timeout: 30000 });
    if (!response.ok()) {
      return { success: false, billNumber: '', billId: '', status: response.status(), error: await response.text() };
    }
    const json = await response.json();
    return { success: true, billNumber: json.invoice_number, billId: json.id, status: response.status() };
  }

  async verifyBillInVendorAPI(vendorName: string, billNumber: string): Promise<boolean> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    // Use DateHelper-resolved year so the ledger query matches the bill's fiscal year
    const { DateHelper: _VDH } = require('../utils/DateHelper');
    const _vResolved = await _VDH.resolve(this.page).catch(() => null);
    const year = _vResolved ? String(_vResolved.ecYear) : (process.env.BEFFA_YEAR || '2019');
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}` };
    const safeJson = async (resp: any) => {
      const text = await resp.text();
      if (!resp.ok()) return null;
      try { return JSON.parse(text); } catch { return null; }
    };

    // 1. Resolve Vendor ID from Name or ID
    let vendorId = vendorName;
    const vendResp = await this.safeGet(`${apiBase}/vendors?page=1&pageSize=100&${params}`, { headers });
    const vendData = await safeJson(vendResp);
    const vendors = Array.isArray(vendData) ? vendData : (vendData?.items || vendData?.data || []);
    const vendor = vendors.find((v: any) => v.id === vendorName || v.name?.toLowerCase() === vendorName.toLowerCase());
    if (vendor) {
      vendorId = vendor.id;
    }

    // 2. Poll Vendor Bills Ledger — try direct bill lookup first, then paginate

    const findInPages = async (): Promise<boolean> => {
      // Fast path: direct bill lookup by ID (billNumber may be a ref, not UUID — try both)
      const directResp = await this.safeGet(
        `${apiBase}/bills?search=${encodeURIComponent(billNumber)}&pageSize=20&${params}`,
        { headers }
      );
      if (directResp && directResp.ok()) {
        const directData = await safeJson(directResp);
        const directBills: any[] = directData ? (Array.isArray(directData) ? directData : (directData.data || directData.items || [])) : [];
        const cleanTarget = billNumber.trim().toLowerCase();
        const targetSuffix = (billNumber.split('/').pop() || cleanTarget).toLowerCase();
        const directFound = directBills.find((b: any) => {
          const refStr = (b.invoice_number || b.bill_no || b.ref || b.bill_number || b.id || '').toString().toLowerCase();
          return refStr === cleanTarget || (targetSuffix.length >= 4 && refStr.endsWith(targetSuffix)) || refStr.includes(cleanTarget);
        });
        if (directFound) return true;
      }

      let page = 1;
      const pageSize = 100;
      while (true) {
        let billResp = await this.safeGet(
          `${apiBase}/bills?vendor_id=${vendorId}&page=${page}&pageSize=${pageSize}&${params}`,
          { headers }
        );
        let billData = await safeJson(billResp);

        if (!billData || (!Array.isArray(billData) && !billData.data && !billData.items && !billData.bills)) {
          billResp = await this.safeGet(
            `${apiBase}/bills?page=${page}&pageSize=${pageSize}&${params}`,
            { headers }
          );
          billData = await safeJson(billResp);
        }

        if (!billData) return false;

        const bills: any[] = Array.isArray(billData)
          ? billData
          : (billData.data || billData.items || billData.bills || []);

        const cleanTarget = billNumber.trim().toLowerCase();
        const targetSuffix = (billNumber.split('/').pop() || cleanTarget).toLowerCase();

        const found = bills.find((b: any) => {
          const refStr = (b.invoice_number || b.bill_no || b.ref || b.bill_number || b.id || '').toString().toLowerCase();
          const bVendorId = b.vendor_id || b.vendor?.id || '';
          const vendorMatch = !bVendorId || bVendorId === vendorId;
          return vendorMatch && (refStr === cleanTarget || (targetSuffix.length >= 4 && refStr.endsWith(targetSuffix)) || refStr.includes(cleanTarget));
        });
        if (found) return true;

        // Stop if this is the last page
        const total = billData.total ?? billData.count ?? billData.meta?.total ?? null;
        if (bills.length < pageSize || (total !== null && page * pageSize >= total)) break;
        page++;
      }
      return false;
    };

    for (let i = 0; i < 8; i++) {
      const found = await findInPages();
      if (found) {
        console.log(`[SUCCESS] API Confirmed: Bill ${billNumber} is physically present in ${vendorName}'s ledger.`);
        return true;
      }

      await this.page.waitForTimeout(2000);
    }

    throw new Error(`[ERROR] API Verification Failed: Bill ${billNumber} never appeared in "${vendorName}" ledger.`);
  }

  private async postPaymentWithCashTopUp(
    apiBase: string,
    params: string,
    headers: Record<string, string>,
    payload: Record<string, any>,
    label: string
  ): Promise<any> {
    const maxTopUpAttempts = 5;
    let response = await this.page.request.post(`${apiBase}/payments?${params}`, { data: payload, headers, timeout: 30000 });

    for (let attempt = 0; !response.ok() && attempt < maxTopUpAttempts; attempt++) {
      const errText = await response.text();
      const topUp = this.parseInsufficientCashTopUp(errText);
      if (response.status() !== 422 || topUp === null) {
        throw new Error(`${label} failed: ${response.status()} - ${errText}`);
      }

      const accountName = this.parseInsufficientCashAccountName(errText);
      const cashAccountId = await this.resolveCashAccountId(payload.cash_account_id, accountName);
      payload.cash_account_id = cashAccountId;

      console.log(`[CASH_TOPUP] ${label}: insufficient balance (attempt ${attempt + 1}/${maxTopUpAttempts}) — topping up ${topUp}...`);
      await this.seedCashBalanceAPI(topUp, cashAccountId);
      await this.page.waitForTimeout(6000);

      response = await this.page.request.post(`${apiBase}/payments?${params}`, { data: payload, headers, timeout: 30000 });
    }

    if (response.ok()) return response.json();
    throw new Error(`${label} failed after ${maxTopUpAttempts} cash top-up attempts: ${response.status()} - ${await response.text()}`);
  }

  private parseInsufficientCashAccountName(errorText: string): string | null {
    const match = errorText.match(/account\s+([^:]+):\s*available/i);
    return match ? match[1].trim() : null;
  }

  private async resolveCashAccountId(preferredId?: string, accountName?: string | null): Promise<string> {
    const accounts = await this.getAllAccountsAPI();
    if (accountName) {
      const byName = accounts.find((a: any) => a.name === accountName);
      if (byName) return byName.id;
    }
    if (preferredId && accounts.some((a: any) => a.id === preferredId)) return preferredId;
    const typeOf = (a: any) => (a.type || a.account_type || '').toLowerCase();
    const cashAccount =
      accounts.find((a: any) => (typeOf(a).includes('cash') || typeOf(a).includes('bank')) && parseFloat(a.balance || '0') >= 0) ||
      accounts.find((a: any) => typeOf(a).includes('cash') || typeOf(a).includes('bank')) ||
      accounts[0];
    return cashAccount?.id;
  }

  async createBillPaymentAPI(data: Record<string, any> = {}): Promise<{ success: boolean; ref: string; id: string }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const safeJson = async (resp: any, label: string) => {
      const text = await resp.text();
      if (!resp.ok()) throw new Error(`${label} HTTP ${resp.status()}: ${text.substring(0, 200)}`);
      try { return JSON.parse(text); } catch (e) { throw new Error(`${label} invalid JSON: ${text.substring(0, 150)}`); }
    };

    // 1. Discover Accounts
    const acctResp = await this.safeGet(`${apiBase}/accounts?page=1&pageSize=50&${params}`, { headers });
    const acctData = await safeJson(acctResp, 'Accounts Discovery');
    const allAccounts = acctData.items || acctData.data || [];
    const cashAccount =
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('bank') && parseFloat(a.balance || '0') > 0) ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('cbe')) ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('branch')) ||
      allAccounts.find((a: any) => (a.account_id || a.code || a.account_code) === '1002') ||
      allAccounts.find((a: any) => (a.type || a.account_type || '').toLowerCase().includes('bank')) ||
      allAccounts.find((a: any) => (a.type || a.account_type || '').toLowerCase().includes('cash')) ||
      allAccounts[0];

    // 2. Discover Currency
    const currResp = await this.safeGet(`${apiBase}/currency?${params}`, { headers });
    const currData = await safeJson(currResp, 'Currency Discovery');
    const currency = currData.items?.[0] || currData.data?.[0];

    let resolvedCashAccountId = data.cashAccountId || cashAccount?.id;

    // In test we sometimes explicitly pass null to trigger validation error
    if ('cashAccountId' in data && data.cashAccountId === null) {
      resolvedCashAccountId = null;
    }

    const { DateHelper: _DH } = require('../utils/DateHelper');
    const _dateIso = (await _DH.resolve(this.page)).iso;
    const payload = {
      amount: data.amount,
      cash_account_id: resolvedCashAccountId,
      vendor_id: data.vendorId, // Tests usually supply this
      date: (data as any).date || _dateIso,
      payment_method: 'cash',
      bill_payments: [{
        amount: data.amount,
        bill_id: data.billId
      }]
    };

    console.log(`[ACTION] Creating Bill Payment for ${data.billId} via API (CashAcct: ${resolvedCashAccountId})...`);
    const json = await this.postPaymentWithCashTopUp(apiBase, params, headers, payload, 'Bill-Payment API');
    console.log(`[SUCCESS] Payment created: ${json.ref} (ID: ${json.id})`);
    return { success: true, ref: json.ref, id: json.id };
  }

  async createMultiBillPaymentAPI(data: {
    amount: number;
    vendorId: string;
    billPayments: Array<{ amount: number; bill_id: string }>;
    cashAccountId?: string;
  }): Promise<{ success: boolean; ref: string; id: string }> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const acctResp = await this.safeGet(`${apiBase}/accounts?page=1&pageSize=50&${params}`, { headers });
    const acctData = await acctResp.json();
    const allAccounts = acctData.items || acctData.data || [];
    const cashAccount = allAccounts.find((a: any) =>
      (a.type || a.account_type || '').toLowerCase().includes('cash') || (a.type || a.account_type || '').toLowerCase().includes('bank')
    ) || allAccounts[0];

    const currResp = await this.safeGet(`${apiBase}/currency?${params}`, { headers });
    const currData = await currResp.json();
    const currency = currData.items?.[0] || currData.data?.[0];

    const { DateHelper: _DH } = require('../utils/DateHelper');
    const _dateIso = (await _DH.resolve(this.page)).iso;
    const payload = {
      amount: data.amount,
      cash_account_id: data.cashAccountId || cashAccount?.id,
      vendor_id: data.vendorId,
      date: _dateIso,
      payment_method: 'cash',
      currency_id: currency?.id,
      bill_payments: data.billPayments
    };

    console.log(`[ACTION] Creating multi-bill payment of ${data.amount} covering ${data.billPayments.length} bills...`);
    const json = await this.postPaymentWithCashTopUp(apiBase, params, headers, payload, 'Multi-bill payment');
    console.log(`[SUCCESS] Multi-bill payment created: ${json.ref} (ID: ${json.id})`);
    return { success: true, ref: json.ref, id: json.id };
  }

  async getBillAPI(billId: string, billNumber?: string): Promise<any> {
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const token = await this._getAuthToken();
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': process.env.BEFFA_COMPANY as string, 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' };

    const normalizeBill = (b: any) => {
      if (!b) return b;
      b.status = b.status || b.current_approval_step?.status_label || b.current_approval_step?.name || 'draft';
      const totalAmount = parseFloat(b.net_due ?? b.amount ?? b.total_amount ?? 0);
      const paid = parseFloat(b.paid_amount ?? b.total_paid ?? 0);
      const hasPaidField = b.paid_amount !== undefined && b.paid_amount !== null;
      if (b.unpaid_amount === undefined || b.unpaid_amount === null) {
        if (hasPaidField) {
          b.unpaid_amount = Math.max(0, totalAmount - paid);
        } else if (['paid', 'fully_paid', 'closed'].includes(String(b.status ?? '').toLowerCase())
            || b.current_approval_step?.status_label === 'paid'
            || b.current_approval_step?.name?.toLowerCase() === 'paid') {
          b.unpaid_amount = 0;
        } else {
          b.unpaid_amount = totalAmount;
        }
      }
      b.balance = b.unpaid_amount;
      return b;
    };


    // 1. Query /bills list first — fast, reliable, avoids 500 retries on singular /bill/{id}
    const listResp = await this.safeGet(`${apiBase}/bills?sortBy=created_at&sortOrder=desc&pageSize=100&${params}`, { headers }).catch(() => null);
    if (listResp && listResp.ok()) {
      const listData = await listResp.json().catch(() => ({}));
      const items = listData.data || listData.items || (Array.isArray(listData) ? listData : []);
      const matched = items.find((b: any) => b.id === billId || (billNumber && (b.invoice_number === billNumber || b.number === billNumber)));
      if (matched) return normalizeBill(matched);
    }

    // 2. Query /bills?search=${searchTarget} as second option
    const searchTarget = billNumber || billId;
    if (searchTarget) {
      const searchResp = await this.safeGet(`${apiBase}/bills?search=${encodeURIComponent(searchTarget)}&pageSize=50&${params}`, { headers }).catch(() => null);
      if (searchResp && searchResp.ok()) {
        const searchData = await searchResp.json().catch(() => ({}));
        const items = searchData.data || searchData.items || (Array.isArray(searchData) ? searchData : []);
        const matched = items.find((b: any) => b.id === billId || (billNumber && (b.invoice_number === billNumber || b.number === billNumber)));
        if (matched) return normalizeBill(matched);
      }
    }

    // 3. Optional single attempt at /bill/{id} without retry backoff loop
    if (billId) {
      try {
        const detailResp = await this.page.request.get(`${apiBase}/bill/${billId}?${params}`, { headers, timeout: 5000 });
        if (detailResp.ok()) {
          const json = await detailResp.json().catch(() => null);
          if (json) return normalizeBill(json);
        }
      } catch {
        // ignore singular detail failure
      }
    }

    throw new Error(`Failed to fetch Bill ${billId}: 500`);
  }



  async getPaymentAPI(paymentId: string): Promise<any> {
    const token = await this._getAuthToken();
    const year = process.env.BEFFA_YEAR || '2019';
    const params = `year=${year}&period=yearly&calendar=ec`;
    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    const response = await this.safeGet(`${apiBase}/payment/${paymentId}?${params}`, {
      headers: { 'x-company': process.env.BEFFA_COMPANY || 'sample', 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok()) throw new Error(`Failed to fetch Payment ${paymentId}: ${response.status()}`);
    return await response.json();
  }

  async reverseBillAPI(billId: string): Promise<boolean> {
    const token = await this._getAuthToken();
    const year = process.env.BEFFA_YEAR || '2019';
    const params = `year=${year}&period=yearly&calendar=ec`;

    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    console.log(`[ACTION] Reversing/Voiding Bill ${billId} via API...`);
    const response = await this.page.request.patch(`${apiBase}/bills/${billId}/void?${params}`, {
      data: { status: 'reversed' },
      headers: {
        'x-company': process.env.BEFFA_COMPANY as string,
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.ok()) {
      console.error(`[ERROR] Bill Reversal failed (${response.status()}): ${await response.text()}`);
      return false;
    }
    return true;
  }

  async reversePaymentAPI(paymentId: string): Promise<boolean> {
    const token = await this._getAuthToken();
    const year = process.env.BEFFA_YEAR || '2019';
    const params = `year=${year}&period=yearly&calendar=ec`;

    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    console.log(`[ACTION] Reversing/Voiding Payment ${paymentId} via API...`);
    const response = await this.page.request.patch(`${apiBase}/payments/${paymentId}/void?${params}`, {
      data: {}, // The void action is defined in the URL path for payments
      headers: {
        'x-company': process.env.BEFFA_COMPANY || 'sample',
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.ok()) {
      console.error(`[ERROR] Payment Reversal failed (${response.status()}): ${await response.text()}`);
      return false;
    }
    return true;
  }

  async approvePaymentAPI(paymentId: string): Promise<boolean> {
    const token = await this._getAuthToken();
    const year = process.env.BEFFA_YEAR || '2019';
    const params = `year=${year}&period=yearly&calendar=ec`;

    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    console.log(`[ACTION] Approving Payment ${paymentId} via API...`);
    const response = await this.page.request.patch(`${apiBase}/payments/${paymentId}?${params}`, {
      data: { status: 'approved' },
      headers: { 'x-company': process.env.BEFFA_COMPANY as string, 'Authorization': token ? `Bearer ${token}` : '' },
      timeout: 30000
    });
    return response.ok();
  }

  async findUnpaidBillAPI(): Promise<{ billId: string; billNumber: string; amount: number; vendorId: string; vendorName: string } | null> {
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY || 'sample';
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `status=approved&year=${year}&period=${period}&calendar=${calendar}`;

    let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001'); if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
    if (!apiBase.endsWith('/api')) apiBase += '/api';
    console.log(`[ACTION] API Discovery: Scanning for unpaid approved bills in "${company}"...`);
    const response = await this.safeGet(`${apiBase}/bills?pageSize=50&${params}`, {
      headers: { 'x-company': company, 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok()) return null;
    const json = await response.json();
    const unpaid = (json.data || json.items || []).find((b: any) => parseFloat(b.balance) > 0);

    if (unpaid) {
      console.log(`[OK] API Found Bill: ${unpaid.invoice_number} | Balance: ${unpaid.balance} | Vendor: ${unpaid.vendor?.name}`);
      return {
        billId: unpaid.id,
        billNumber: unpaid.invoice_number,
        amount: parseFloat(unpaid.balance),
        vendorId: unpaid.vendor_id,
        vendorName: unpaid.vendor?.name || 'Unknown Vendor'
      };
    }
    return null;
  }

  async getBillJournalEntriesAPI(billId: string): Promise<Array<{ accountCode: string; accountName: string; debit: number; credit: number }>> {
    const json = await this.getBillAPI(billId).catch(() => ({}));
    const journal = json.purchase_journal || json.journal || json;

    if (journal && Array.isArray(journal.journal_entries) && journal.journal_entries.length > 0) {
      return journal.journal_entries.map((entry: any) => ({
        accountCode: entry.account?.account_id || entry.account?.code || '',
        accountName: entry.account?.name || entry.account_name || 'GL Account',
        debit: parseFloat(entry.debit || 0),
        credit: parseFloat(entry.credit || 0)
      }));
    }

    // Fallback: Query /general-journals if purchase_journal is not embedded in the bill
    try {
      const token = await this._getAuthToken();
      const year = process.env.BEFFA_YEAR || '2019';
      const params = `year=${year}&period=yearly&calendar=ec`;
      let apiBase = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001').replace(/['"+]+/g, '').replace(/\/$/, '').replace(/:4173/, ':8001');
      if (!apiBase.startsWith('http')) apiBase = 'http://' + apiBase;
      if (!apiBase.endsWith('/api')) apiBase += '/api';
      const headers = { 'x-company': process.env.BEFFA_COMPANY as string, 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' };

      const gjResp = await this.page.request.get(`${apiBase}/general-journals?search=${encodeURIComponent(json.invoice_number || billId)}&pageSize=50&${params}`, { headers });
      if (gjResp.ok()) {
        const gjData = await gjResp.json().catch(() => ({}));
        const items = gjData.data || gjData.items || (Array.isArray(gjData) ? gjData : []);
        const matched = items.find((j: any) =>
          j.reference_id === billId ||
          j.id === billId ||
          j.description?.includes(billId) ||
          (json.invoice_number && (j.description?.includes(json.invoice_number) || j.reference_number === json.invoice_number))
        );

        if (matched) {
          let entriesList = matched.entries || matched.journal_entries || [];

          if (!entriesList || entriesList.length === 0) {
            const entriesResp = await this.page.request.get(`${apiBase}/general-journals/${matched.id}/entries?${params}`, { headers }).catch(() => null);
            if (entriesResp && entriesResp.ok()) {
              const entriesData = await entriesResp.json().catch(() => ({}));
              entriesList = entriesData.data || entriesData.items || (Array.isArray(entriesData) ? entriesData : []);
            }
          }

          if (!entriesList || entriesList.length === 0) {
            const singleGjResp = await this.page.request.get(`${apiBase}/general-journals/${matched.id}?${params}`, { headers }).catch(() => null);
            if (singleGjResp && singleGjResp.ok()) {
              const singleGjData = await singleGjResp.json().catch(() => ({}));
              entriesList = singleGjData.entries || singleGjData.journal_entries || singleGjData.data?.entries || [];
            }
          }

          if (Array.isArray(entriesList) && entriesList.length > 0) {
            return entriesList.map((entry: any) => ({
              accountCode: entry.account?.account_id || entry.account?.code || entry.account_id || '',
              accountName: entry.account?.name || entry.account_name || entry.account?.account_name || 'GL Account',
              debit: parseFloat(entry.debit || 0),
              credit: parseFloat(entry.credit || 0)
            }));
          }
        }
      }
    } catch {
      // ignore fallback failure
    }

    return [];
  }
}


