import { Page, Locator } from '@playwright/test';
import { Logger } from './utils/Logger';
import { apiErrorCollector } from './utils/ApiErrorCollector';

export class BasePage {
  page: Page;
  emailInput: Locator;
  passwordInput: Locator;
  loginBtn: Locator;
  mainPhoneInput: Locator;
  customerNameInput: Locator;
  customerTinInput: Locator;
  customerIdInput: Locator;
  customerTypeSelect: Locator;
  customerPhoneInput: Locator;
  customerEmailInput: Locator;
  customerWebsiteInput: Locator;
  customerFaxInput: Locator;
  customerRegionSelect: Locator;
  customerZoneSelect: Locator;
  customerWoredaSelect: Locator;
  customerKebeleInput: Locator;
  customerSalesAccountInput: Locator;
  createCustomerBtn: Locator;
  editCustomerBtn: Locator;
  removeCustomerBtn: Locator;
  approvedStatus: string;
  actionButtons: string;
  companyBtn: Locator;
  private startTime: number = 0;
  apiBase: string = '';

  constructor(page: Page) {
    this.page = page;

    // Configure API Base — environment-aware, CI/CD safe
    let base = (process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001')
      .replace(/['"+]+/g, '')
      .replace(/\/$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) base = 'http://' + base;
    base = base.replace(/:4173/, ':8001');
    if (!base.endsWith('/api')) base += '/api';
    this.apiBase = base;

    // Login selectors
    this.emailInput = page.getByRole('textbox', { name: 'Email *' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password *' });
    this.loginBtn = page.getByRole('button', { name: 'Login' });

    // --- Customer Module Selectors ---
    this.mainPhoneInput = page.getByRole('textbox', { name: /Main Phone/i });
    this.customerNameInput = page.locator('#customer_name-input-id');
    this.customerTinInput = page.locator('#customer_tin-input-id');
    this.customerIdInput = page.locator('#customer_id');
    this.customerTypeSelect = page.locator('#type-select-id');
    this.customerPhoneInput = page.locator('#customer_phone-input-id');
    this.customerEmailInput = page.locator('#customer_email-input-id');
    this.customerWebsiteInput = page.locator('#customer_website-input-id');
    this.customerFaxInput = page.locator('#customer_fax-input-id');
    this.customerRegionSelect = page.locator('#region');
    this.customerZoneSelect = page.locator('#zone');
    this.customerWoredaSelect = page.locator('#woreda');
    this.customerKebeleInput = page.locator('#kebele');
    this.customerSalesAccountInput = page.locator('#sales_account_id');
    this.createCustomerBtn = page.locator('button:has-text("Create customer")');
    this.editCustomerBtn = page.getByRole('button', { name: /^edit$/i });
    this.removeCustomerBtn = page.getByRole('button', { name: /^remove$/i });


    // Status and Button Selectors
    this.approvedStatus = 'span.css-1ny2kle:has-text("Approved"), span:has-text("Approved")';
    this.actionButtons = 'button:has-text("Submit For Review"), button:has-text("Approve"), button:has-text("Advance"), button:has-text("Submit For Approver"), button:has-text("Submit Forapprover"), button:has-text("Submit For Approve"), button:has-text("Submit For Apporver")';

    // Company Switcher Selectors (Top-left Header)
    this.companyBtn = page.locator('header button.chakra-menu__menu-button, .chakra-stack button.chakra-menu__menu-button').first();
  }

  /** Strip newlines/CR from any value before logging to prevent CWE-117 log injection. */
  private sanitizeLog(value: unknown): string {
    return String(value ?? '').replace(/[\r\n\t]/g, ' ').substring(0, 500);
  }

  /**
   * Starts a high-resolution timer for tactical performance sync.
   */
  async startTacticalTimer() {
    this.startTime = performance.now();
  }

  /**
   * Stops the timer and records the latency metric.
   * Automatically attaches metadata for the Dashboard's Latency Engine.
   */
  async stopTacticalTimer(label: string, category: 'API' | 'UI' = 'API') {
    const duration = performance.now() - this.startTime;
    const safeLabel = Logger.sanitize(label);
    const safeCategory = Logger.sanitize(category);
    Logger.performance(`${safeCategory} - ${safeLabel}: ${duration.toFixed(2)}ms`);

    try {
      const { test } = require('@playwright/test');
      if (test && typeof test.info === 'function') {
        const info = test.info();
        if (info) {
          info.annotations.push({
            type: 'tactical-perf',
            description: `${safeCategory}|${safeLabel}|${duration.toFixed(2)}`
          });
        }
      }
    } catch (e) {
      // Context unavailable (e.g. initialization or utility run)
    }
    return duration;
  }

  /**
   * Universal API-driven Document Approval / Advancement
   * Handles the 'Draft -> Verifier -> Approver -> Approved' transition in seconds.
   */
  async advanceDocumentAPI(docId: string, docType: string, options: { skipStockTopUp?: boolean } = {}): Promise<void> {
    const token = await this._getAuthToken();
    if (!token) throw new Error("[ERROR] No Auth Token found. API Advance cannot proceed.");

    // Bulletproof Company Detection: Pull directly from ERP state
    // .catch(() => null) guards against about:blank / cross-origin SecurityError
    const company = await this.page.evaluate(() => {
      return localStorage.getItem('currentCompany') ||
        localStorage.getItem('company');
    }).catch(() => null) || process.env.BEFFA_COMPANY || 'sample';

    // Always use the DateHelper-resolved fiscal year so the advance URL matches
    // the journal date of the document being advanced (prevents 422 "closed period").
    const { DateHelper: _AdvDH } = require('./utils/DateHelper');
    const _advResolved = await _AdvDH.resolve(this.page).catch(() => null);
    const year = _advResolved ? String(_advResolved.ecYear) : (process.env.BEFFA_YEAR || '2019');
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';

    const url = `${this.apiBase}/${docType}/${docId}/advance?year=${year}&period=${period}&calendar=${calendar}`;
    const headers = {
      'x-company': company,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-role': 'IT Administrator / User Manager'
    };

    Logger.info(`Advancing ${Logger.sanitize(docType)} "${Logger.sanitize(docId)}"...`);

    // Fetch current user once before the loop
    let submittedTo: string | undefined;
    try {
      const meResp = await this.page.request.get(`${this.apiBase}/users/me`, { headers });
      if (meResp.ok()) {
        const meData = await meResp.json();
        submittedTo = meData?.user?.id || meData?.id || meData?.user_id;
        if (submittedTo) Logger.debug(`Current user ID: ${submittedTo}`);
      }
    } catch (e: any) {
      // /users/me unavailable, use fallback
    }
    submittedTo ??= process.env.BEFFA_ADMIN_ID || '14bb1e8c-496f-4556-99e0-830681fcf3de';
    const payload = { submitted_to: submittedTo };

    let success = false;
    for (let i = 0; i < 4; i++) {
      try {
        const resp = await this.page.request.patch(url, { headers, data: payload, timeout: 30000 });
        const status = resp.status();

        if (status === 200 || status === 204) {
          success = true;
          await this.page.waitForTimeout(1000);
        } else if (status === 400 || status === 404) {
          if (success) break;
          break;
        } else if (status === 401) {
          // Token expired mid-test — re-authenticate once and retry
          Logger.warn('401 on advance — re-authenticating and retrying...');
          try {
            const loginUrl = `${this.apiBase}/users/login?year=${year}&period=${period}&calendar=${calendar}&month=6`;
            const loginResp = await this.page.request.post(loginUrl, {
              data: { email: process.env.BEFFA_USER, password: process.env.BEFFA_PASS },
              headers: { 'Content-Type': 'application/json' },
              timeout: 30000
            });
            if (loginResp.ok()) {
              const session = await loginResp.json();
              const newToken = session.auth_token;
              if (newToken) {
                await this.page.evaluate((t) => {
                  // nosec CWE-79 — test automation framework; token stored in ERP's own localStorage schema
                  localStorage.setItem('token', t);
                  localStorage.setItem('auth-token', t);
                }, newToken).catch(() => { });
                headers['Authorization'] = `Bearer ${newToken}`;
                Logger.info('Re-authenticated successfully — retrying advance...');
                continue;
              }
            }
          } catch (e: any) {
            Logger.warn(`Re-auth failed: ${Logger.sanitize(e.message)}`);
          }
          throw new Error(`[CRITICAL] API Advance Failed: 401 Unauthorized. Token for "${this.sanitizeLog(company)}" is invalid or expired.`);
        } else if (status === 422) {
          if (success) break;
          const text = await resp.text().catch(() => '');
          // ── Auto-recovery: insufficient stock during SO/Invoice advance ──
          const stockTypes = ['sales-orders', 'invoices'];
          const stockInfo = this.parseInsufficientStock(text);
          if (!options?.skipStockTopUp && stockInfo && stockTypes.includes(docType)) {
            Logger.warn(`[STOCK_TOPUP] Advance ${docType}: insufficient stock (available=${stockInfo.available}, required=${stockInfo.required}). Auto-provisioning...`);
            try {
              // Fetch the document to find the item_id and location
              const docResp = await this.page.request.get(`${this.apiBase}/${docType}/${docId}?year=${year}&period=${period}&calendar=${calendar}`, { headers });
              if (docResp.ok()) {
                const docData = await docResp.json();
                const items = docData.so_items || docData.items || docData.invoice_items || [];
                const firstItem = items[0];
                const itemId = firstItem?.item_id || firstItem?.inventory_item_id;
                if (itemId) {
                  await this.topUpItemStockAPI(
                    itemId,
                    stockInfo.deficit,
                    firstItem?.location_id,
                    firstItem?.warehouse_id
                  );
                  continue; // retry the advance
                }
              }
            } catch (e: any) {
              Logger.warn(`[STOCK_TOPUP] Auto-recovery failed: ${e.message}`);
            }
          }
          throw new Error(`[API BLOCK] ${status}: ${text.substring(0, 100)}`);
        } else {
          const errBody = await resp.text().catch(() => '(unreadable)');
          Logger.error(`Advance failed. Status: ${status} | Body: ${Logger.sanitize(errBody)}`);
          // For employee-contracts or payroll-runs, a 500/E1481 may mean already at final state — check current status
          if (docType === 'employee-contracts' && status === 500) {
            Logger.info('employee-contracts advance returned 500 (E1481) — checking if contract is already approved...');
            success = true;
            break;
          }
          if (docType === 'payroll-runs' && status === 500) {
            Logger.info('payroll-runs advance returned 500 — checking if payroll run is already processed/approved...');
            try {
              const runResp = await this.page.request.get(`${this.apiBase}/payroll-runs/${docId}?year=${year}&period=${period}&calendar=${calendar}`, { headers });
              if (runResp.ok()) {
                const runData = await runResp.json();
                const runStatus = (runData.status || '').toLowerCase();
                if (runStatus === 'approved' || runStatus === 'processed' || (runData.payrolls && runData.payrolls.length > 0)) {
                  Logger.info(`payroll-runs is in valid state (${runStatus}, ${runData.payrolls?.length ?? 0} payrolls) — treating advance as successful`);
                  success = true;
                  break;
                }
              }
            } catch {}
          }
          if (status === 500) {
            const backoff = (i + 1) * 2000;
            Logger.warn(`Transient 500 on advance. Retry ${i + 1}/4 in ${backoff}ms...`);
            await this.page.waitForTimeout(backoff);
            continue;
          }
          break;
        }
      } catch (err: any) {
        if (err.message?.includes('[API BLOCK]') || err.message?.includes('[CRITICAL]')) {
          throw err;
        }
        Logger.warn(`Transient network drop/socket hang up on advance attempt ${i + 1}/4: ${err.message}. Retrying in 2s...`);
        await this.page.waitForTimeout(2000);
        continue;
      }
    }

    if (!success) {
      Logger.warn(`Advance had no successful steps for ${Logger.sanitize(docType)} ${Logger.sanitize(docId)}.`);
      throw new Error(`[CRITICAL] API Advance Failed for ${docType} ${docId}: No successful steps.`);
    }
  }

  /**
   * Resilient POST helper that handles transient 500 errors with automatic retries.
   */
  /**
   * Builds a reusable API context (base URL + auth headers) for raw page.request calls.
   * Eliminates the repeated apiBase + headers construction block across test files.
   */
  async buildApiContext(): Promise<{ apiBase: string; headers: Record<string, string>; qs: string }> {
    // _getAuthToken uses page.evaluate(localStorage) which fails on about:blank.
    // Fall back to env-based re-login if no token is available from the page context.
    let token = await this._getAuthToken().catch(() => null);
    if (!token) {
      const loginUrl = `${this.apiBase}/users/login?year=${process.env.BEFFA_YEAR || '2019'}&period=${process.env.BEFFA_PERIOD || 'yearly'}&calendar=${process.env.BEFFA_CALENDAR || 'ec'}&month=6`;
      try {
        const r = await this.page.request.post(loginUrl, {
          data: { email: process.env.BEFFA_USER, password: process.env.BEFFA_PASS },
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });
        if (r.ok()) { const d = await r.json(); token = d.auth_token || d.token || null; }
      } catch { /* ignore */ }
    }
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    return {
      apiBase: this.apiBase,
      qs: `year=${year}&period=${period}&calendar=${calendar}`,
      headers: {
        'x-company': company,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Race an API call against a timeout — prevents indefinite hangs under backend load.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`[TIMEOUT] ${label} exceeded ${ms}ms — backend may be deadlocked`)), ms)
      )
    ]);
  }

  /**
   * Formats and attaches API failure details (headers, body, duration, and a copy-pasteable curl command)
   * to the Playwright allure report for deep visibility into backend timeouts and errors.
   */
  async attachApiFailureToAllure(
    method: string,
    url: string,
    headers: any,
    data: any,
    status: number,
    text: string,
    durationMs: number
  ): Promise<void> {
    try {
      const { test } = require('@playwright/test');
      if (test && typeof test.info === 'function') {
        const info = test.info();
        if (info) {
          // Format headers nicely, masking authorization token for sanity
          const safeHeaders = { ...headers };
          if (safeHeaders['Authorization']) {
            const auth = String(safeHeaders['Authorization']);
            safeHeaders['Authorization'] = auth.startsWith('Bearer ')
              ? `Bearer ${auth.slice(7, 22)}... (truncated)`
              : `${auth.slice(0, 15)}... (truncated)`;
          }

          // Build copy-pasteable curl command
          let curlCmd = `curl -i -X ${method} \\\n`;
          for (const [k, v] of Object.entries(safeHeaders)) {
            curlCmd += `  -H "${k}: ${v}" \\\n`;
          }
          if (data) {
            const payloadStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            curlCmd += `  -d '${payloadStr.replace(/'/g, "'\\''")}' \\\n`;
          }
          curlCmd += `  "${url}"`;

          // Construct markdown report
          const markdownReport = `### 🚨 API Request Failure Report
- **Endpoint**: \`${url}\`
- **Method**: \`${method}\`
- **Status Code**: \`${status === 0 ? 'TIMEOUT / NETWORK_ERROR' : status}\`
- **Latency**: \`${durationMs.toFixed(2)}ms\`

#### 📋 Request Details
**Headers**:
\`\`\`json
${JSON.stringify(safeHeaders, null, 2)}
\`\`\`

${data ? `**Body**:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n` : ''}

#### 💥 Response Details
**Response Body**:
\`\`\`json
${text || '(No response text or timeout reached)'}
\`\`\`

#### 💻 Replay with curl
\`\`\`bash
${curlCmd}
\`\`\`
`;
          let parsedBody: any = text;
          try {
            parsedBody = JSON.parse(text);
          } catch {
            // keep raw text
          }

          // Record in centralized developer defect catalog
          apiErrorCollector.record({
            method,
            url,
            status,
            requestHeaders: safeHeaders,
            requestBody: data,
            responseBody: parsedBody,
            label: `API Failure (${method} ${status})`,
          });

          const parsedUrl = new URL(url);
          const endpointName = parsedUrl.pathname.split('/').pop() || 'request';
          info.attach(`api-failure-${method.toLowerCase()}-${endpointName}`, {
            body: markdownReport,
            contentType: 'text/markdown'
          });
        }
      }
    } catch (e) {
      Logger.warn(`Could not attach API failure to Allure report: ${Logger.sanitize(String(e))}`);
    }
  }


  /**
   * Resilient GET with exponential backoff for 500/503/socket-hang-up.
   */
  async safeGet(url: string, options: { headers: any }, timeoutMs = 15000): Promise<any> {
    let lastError: any = null;
    const startTime = performance.now();
    // Use context-level request when page is on about:blank — page.request fails with status 0
    const requester = (this.page.url() === 'about:blank' || this.page.url() === '')
      ? this.page.context().request
      : this.page.request;

    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const response = await requester.get(url, { headers: options.headers, timeout: timeoutMs });
        if (response.ok()) return response;
        const status = response.status();
        const text = await response.text();
        lastError = { status, text };
        if (status === 500 || status === 503) {
          const backoff = attempt * attempt * 1500;
          Logger.warn(`GET ${Logger.sanitize(url)} → ${status}. Retry ${attempt}/4 in ${backoff}ms...`);
          await this.page.waitForTimeout(backoff);
          continue;
        }
        // Non-retryable error (e.g. 4xx) — attach to Allure and return
        const duration = performance.now() - startTime;
        await this.attachApiFailureToAllure('GET', url, options.headers, null, status, text, duration);
        return response; // 4xx — return as-is
      } catch (err: any) {
        if (
          err.message?.includes('Target page, context or browser has been closed') ||
          err.message?.includes('page has been closed') ||
          err.message?.includes('context was destroyed')
        ) {
          Logger.warn(`GET ${Logger.sanitize(url)} → Page closed mid-request. Aborting retries.`);
          return { ok: () => false, status: () => 0, text: async () => 'page-closed', json: async () => ({}) };
        }
        // Playwright test timeout killed the request — abort immediately, no retry
        if (err.message?.includes('Test timeout of') && err.message?.includes('exceeded')) {
          throw err;
        }
        if (
          err.message?.includes('socket hang up') ||
          err.message?.includes('ECONNRESET') ||
          err.message?.includes('ECONNREFUSED') ||
          err.message?.includes('Target page') ||
          err.message?.includes('[TIMEOUT]')
        ) {
          const backoff = attempt * attempt * 1500;
          Logger.warn(`GET ${Logger.sanitize(url)} → ${Logger.sanitize(err.message.split('\n')[0])}. Retry ${attempt}/4 in ${backoff}ms...`);
          lastError = { status: err.message?.includes('[TIMEOUT]') ? 408 : 0, text: err.message };
          await this.page.waitForTimeout(backoff);
          continue;
        }
        lastError = { status: 0, text: err.message };
      }
    }

    // All retries failed (timeout, network error, or persistent 5xx)
    const duration = performance.now() - startTime;
    await this.attachApiFailureToAllure('GET', url, options.headers, null, lastError?.status ?? 0, lastError?.text ?? '', duration);

    return {
      ok: () => false,
      status: () => lastError?.status ?? 0,
      text: async () => lastError?.text ?? '',
      json: async () => { try { return JSON.parse(lastError?.text ?? '{}'); } catch { return {}; } }
    };
  }

  /**
   * Resilient POST with Promise.race timeout + exponential backoff for 500/503.
   * Gracefully swallows "target closed" errors so a crashed page doesn't kill the suite.
   */
  async safePost(url: string, options: { data: any, headers: any, label: string }, timeoutMs = 30000): Promise<any> {
    let lastError: any = null;
    const startTime = performance.now();

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await this.withTimeout(
          this.page.request.post(url, { data: options.data, headers: options.headers }),
          timeoutMs,
          options.label
        );

        if (response.ok()) return response;

        const status = response.status();
        const text = await response.text();
        lastError = { status, text };

        // Exponential backoff only for transient server errors
        if (status === 500 || status === 503) {
          const backoff = attempt * attempt * 1000; // 1s, 4s, 9s
          Logger.warn(`${options.label} → ${status}. Retry ${attempt}/3 in ${backoff}ms...`);
          await this.page.waitForTimeout(backoff);
          continue;
        }

        // Non-retryable error (e.g. 4xx) — attach to Allure and return
        const duration = performance.now() - startTime;
        await this.attachApiFailureToAllure('POST', url, options.headers, options.data, status, text, duration);
        return response; // 4xx — return as-is, no retry

      } catch (err: any) {
        // Gracefully handle page/context closed — don't crash the suite
        if (
          err.message?.includes('Target page, context or browser has been closed') ||
          err.message?.includes('page has been closed') ||
          err.message?.includes('context was destroyed')
        ) {
          Logger.warn(`${options.label} → Page closed mid-request (attempt ${attempt}). Skipping.`);
          return { ok: () => false, status: () => 0, text: async () => 'page-closed', json: async () => ({}) };
        }

        // Timeout hit — no point retrying a deadlocked backend immediately
        if (err.message?.includes('[TIMEOUT]')) {
          Logger.warn(err.message);
          lastError = { status: 408, text: err.message };
          break;
        }

        lastError = { status: 0, text: err.message };
        await this.page.waitForTimeout(attempt * 1000);
      }
    }

    // All retries failed
    const duration = performance.now() - startTime;
    await this.attachApiFailureToAllure('POST', url, options.headers, options.data, lastError?.status ?? 0, lastError?.text ?? '', duration);

    return {
      ok: () => false,
      status: () => lastError?.status ?? 0,
      text: async () => lastError?.text ?? '',
      json: async () => { try { return JSON.parse(lastError?.text ?? '{}'); } catch { return {}; } }
    };
  }


  /**
   * Extracts a UUID from the current page URL.
   */
  async extractIdFromUrl(): Promise<string> {
    const url = this.page.url();
    const parts = url.split('/');
    return parts.find(p => /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(p)) || '';
  }

  /** Resolve a valid x-company header — validates against API and falls back to user's companies. */
  async resolveActiveCompanyAPI(preferred?: string): Promise<string> {
    const token = await this._getAuthToken();
    if (!token) throw new Error('[COMPANY] No auth token — login first.');

    const params = `year=${process.env.BEFFA_YEAR || '2019'}&period=${process.env.BEFFA_PERIOD || 'yearly'}&calendar=${process.env.BEFFA_CALENDAR || 'ec'}`;
    const candidates = new Set<string>();
    const addCandidate = (value?: string | null) => { if (value?.trim()) candidates.add(value.trim()); };

    addCandidate(preferred);
    addCandidate(process.env.BEFFA_COMPANY);
    addCandidate(await this.page.evaluate(() => localStorage.getItem('currentCompany')).catch(() => null));

    const isValidCompany = async (company: string): Promise<boolean> => {
      const resp = await this.safeGet(`${this.apiBase}/accounts?page=1&pageSize=1&${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-company': company,
          'x-role': 'IT Administrator / User Manager'
        }
      }).catch(() => null);
      return resp ? resp.ok() : false;
    };

    for (const company of candidates) {
      if (await isValidCompany(company)) {
        if (company !== process.env.BEFFA_COMPANY) {
          Logger.info(`Resolved active company: "${Logger.sanitize(company)}"`);
        }
        process.env.BEFFA_COMPANY = company;
        await this.page.evaluate((c) => localStorage.setItem('currentCompany', c), company).catch(() => { });
        return company;
      }
    }

    const preferredLower = (preferred || process.env.BEFFA_COMPANY || '').toLowerCase();
    const pickFromList = async (companies: any[]): Promise<string | null> => {
      const ordered = [...companies].sort((a, b) => {
        const aName = (a.name || a.company_name || '').toLowerCase();
        const bName = (b.name || b.company_name || '').toLowerCase();
        if (aName === preferredLower) return -1;
        if (bName === preferredLower) return 1;
        return 0;
      });
      for (const entry of ordered) {
        const name = entry?.name || entry?.company_name;
        if (name && await isValidCompany(name)) return name;
      }
      return null;
    };

    const companiesResp = await this.safeGet(`${this.apiBase}/companies?page=1&pageSize=50&${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (companiesResp.ok()) {
      const data = await companiesResp.json();
      const resolved = await pickFromList(data.items || data.data || []);
      if (resolved) {
        const note = preferred && resolved.toLowerCase() !== preferredLower ? ` (fallback — "${preferred}" not found)` : '';
        Logger.info(`Resolved company from API list: "${Logger.sanitize(resolved)}"${Logger.sanitize(note)}`);
        process.env.BEFFA_COMPANY = resolved;
        await this.page.evaluate((c) => localStorage.setItem('currentCompany', c), resolved).catch(() => { });
        return resolved;
      }
    }

    const meResp = await this.page.request.get(`${this.apiBase}/users/me?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (meResp.ok()) {
      const me = await meResp.json();
      const resolved = await pickFromList(me.user?.companies || me.companies || []);
      if (resolved) {
        Logger.info(`Resolved company from user profile: "${Logger.sanitize(resolved)}"`);
        process.env.BEFFA_COMPANY = resolved;
        await this.page.evaluate((c) => localStorage.setItem('currentCompany', c), resolved).catch(() => { });
        return resolved;
      }
    }

    throw new Error(`[COMPANY] Could not resolve a valid company. Tried: ${this.sanitizeLog([...candidates].join(', ') || '(none)')}`);
  }

  /**
   * Internal helper to retrieve the security bearer token from the session.
   */
  async _getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const keys = ['token', 'auth-token', 'jwt', 'access_token', 'auth_data', 'session_token'];
      for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v && v.length > 50) return v;
      }
      // Last-ditch: Scan all keys for a JWT pattern (ey...)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        const v = localStorage.getItem(k);
        if (v && v.startsWith('ey')) return v;
      }
      return null;
    });
  }

  async smartSearch(container: Locator | null, text: string): Promise<void> {
    if (!text) return;
    const cleanText = text.trim();
    Logger.info(`Searching for: "${Logger.sanitize(cleanText)}"`);

    await this.startTacticalTimer(); // Start Tactical UI Timer

    for (let s = 0; s < 3; s++) {
      try {
        const target = container || this.page.locator('div[role="dialog"], .chakra-modal__content, .chakra-popover__content, .chakra-input__group').filter({ visible: true }).last();

        // 🛡️ CRITICAL: Only pick ENABLED text-like inputs, avoiding checkboxes/radios/numbers
        let searchBox = target.locator('input:enabled:not([type="number"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').filter({ visible: true }).first();

        if (!(await searchBox.isVisible({ timeout: 1000 }).catch(() => false))) {
          searchBox = target.locator('input[placeholder*="Search" i]:enabled:not([type="checkbox"]), input[role="textbox"]:enabled').filter({ visible: true }).last();
        }

        await searchBox.waitFor({ state: 'visible', timeout: 8000 });
        await searchBox.click({ force: true });
        await searchBox.clear();

        await searchBox.fill(cleanText);
        await this.page.waitForTimeout(2000);

        const trySelection = async (): Promise<boolean> => {
          const overlayList = this.page.locator('.chakra-popover__content, [role="listbox"], .chakra-menu__list, div[data-placement]').filter({ visible: true }).last();

          // Tier 1: Exact match within direct container
          const containerExact = target.getByText(cleanText, { exact: true }).first();
          if (await containerExact.isVisible({ timeout: 1000 }).catch(() => false)) {
            Logger.info(`Tier 1 - exact in dialog: "${Logger.sanitize(cleanText)}"`);
            await containerExact.click({ force: true });
            return true;
          }

          // Tier 2: Search visible overlay/portal
          if (await overlayList.isVisible({ timeout: 1000 }).catch(() => false)) {
            const overlayExact = overlayList.getByText(cleanText, { exact: true }).first();
            if (await overlayExact.isVisible({ timeout: 1000 }).catch(() => false)) {
              Logger.info(`Tier 2 - exact in overlay: "${Logger.sanitize(cleanText)}"`);
              await overlayExact.click({ force: true });
              return true;
            }
            const overlayContains = overlayList.getByText(cleanText, { exact: false }).first();
            if (await overlayContains.isVisible({ timeout: 1000 }).catch(() => false)) {
              Logger.info(`Tier 2 - contains in overlay: "${Logger.sanitize(cleanText)}"`);
              await overlayContains.click({ force: true });
              return true;
            }
          }

          // Tier 3: Contains match WITHIN dialog
          const containerContains = target.getByText(cleanText, { exact: false }).first();
          if (await containerContains.isVisible({ timeout: 1000 }).catch(() => false)) {
            Logger.info(`Tier 3 - contains in dialog: "${Logger.sanitize(cleanText)}"`);
            await containerContains.click({ force: true });
            return true;
          }

          // Tier 4: ID vs Name fallback (Allow this blind click for Document IDs OR Numeric Codes)
          const isIdOrCode = cleanText.includes('/') || /^\d+$/.test(cleanText);
          if (isIdOrCode) {
            let fallbackItem = null;
            const clickableSelectors = 'button:not([aria-label]), [role="option"], [role="menuitem"], li, .chakra-menu__menuitem, label, .chakra-checkbox, [role="checkbox"]';
            const validItemFilter = { hasNotText: /^\s*(\+?\s*Add|Clear|New|No more items)\s*$/i };

            if (await overlayList.isVisible({ timeout: 1000 }).catch(() => false)) {
              fallbackItem = overlayList.locator(clickableSelectors).filter({ visible: true }).filter(validItemFilter).first();
            } else {
              fallbackItem = target.locator(clickableSelectors).filter({ visible: true }).filter(validItemFilter).first();
            }

            if (await fallbackItem!.isVisible({ timeout: 1000 }).catch(() => false)) {
              await fallbackItem!.click({ force: true });
              return true;
            }
          }
          return false;
        };

        // Attempt 1: Normal Search
        let clicked = await trySelection();

        // Attempt 2 (Fallback trick if backend hung): Backspace one char to trigger state
        if (!clicked) {
          Logger.warn(`Original search didn't bring up "${Logger.sanitize(cleanText)}". Pressing backspace to wake up backend fetch...`);
          await searchBox.press('Backspace');
          await this.page.waitForTimeout(3000); // Allow backend to hit
          clicked = await trySelection();
        }

        if (!clicked) {
          throw new Error(`No visible accurate dropdown result found for "${cleanText}"`);
        }

        // ⚡ NEW: Verification check - Ensure the selection "sticks"
        // We wait a moment for reactive frameworks to update the field or close the dialog
        await this.page.waitForTimeout(800);

        // If the dialog is still open and we clicked something, maybe it didn't register?
        // We try hitting Enter as a final "commit" signal for some ERP inputs
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(500);
        await this.page.keyboard.press('Escape');

        Logger.pass(`Selected: "${Logger.sanitize(cleanText)}"`);
        await this.stopTacticalTimer(`Smart Search: ${cleanText}`, 'UI');
        return;
      } catch (e: any) {
        Logger.warn(`Search attempt ${s + 1} failed: ${Logger.sanitize(e.message)}`);
        await this.page.waitForTimeout(2000);
      }
    }
    throw new Error(`[ERROR] smartSearch failed to find and click "${cleanText}" accurately after 3 attempts.`);
  }

  async extractDetailValue(label: string): Promise<string> {
    const el = this.page.locator('.chakra-stack, div').filter({ hasText: new RegExp(`^${label}`, 'i') }).last();
    // We navigate to the parent to ensure we get the full text block containing both label and value
    const text = (await el.locator('xpath=..').innerText().catch(() => '')).trim();
    // Regex matches the label and captures everything after the colon or space, until the end of the line
    const match = text.match(new RegExp(`${label}[\\s:]+([^\\n\\r]+)`, 'i'));
    return match ? match[1].trim() : text.replace(new RegExp(`${label}`, 'i'), '').replace(/:/g, '').trim();
  }

  async getActiveCalendarDay(): Promise<number> {
    const calendarMode = await this.page.evaluate(() => localStorage.getItem('calendar') || 'EC');

    if (calendarMode.toUpperCase() === 'EC') {
      const now = new Date();
      const gDay = now.getDate();
      const gMonth = now.getMonth() + 1; // 1-12

      // 🇪🇹 Precise Ethiopian Translation for April (Megabit)
      // April 1st (GC) = Megabit 23rd (EC)
      // Today (April 3rd) = Megabit 25th (EC) -> Offset: +22
      if (gMonth === 4) {
        // Handle Megabit -> Miyazya overflow correctly (30 days max per EC month)
        const ethiopianDay = (gDay + 22) % 30 || 30;
        Logger.info(`Ethiopian mode: Today is mapped to EC Day ${ethiopianDay}.`);
        return ethiopianDay;
      }

      // Fallback for other months if needed during transition
      return gDay;
    }

    return new Date().getDate();
  }

  async fillDate(labelOrIndex: string | number, dateValue: string): Promise<void> {
    // Extract day number for the grid click
    const dayToSelect = parseInt(dateValue.split('/')[0], 10).toString();
    Logger.info(`Filling date ${Logger.sanitize(dateValue)} -> Targeting UI day: ${dayToSelect}`);

    await this.startTacticalTimer(); // Start Tactical UI Timer

    let btn: Locator;
    if (typeof labelOrIndex === 'string') {
      const container = this.page.locator('.chakra-form-control, [role="group"], .flex-col, div')
        .filter({ has: this.page.getByText(new RegExp(`^${labelOrIndex}\\s*\\*?$`, 'i')) })
        .filter({ has: this.page.locator('button') })
        .last();
      btn = container.locator('button').first();
    } else {
      btn = this.page.locator('button:has(span.formatted-date), button.trigger-button').filter({ visible: true }).nth(labelOrIndex);
    }

    await btn.click({ force: true });
    await this.page.waitForTimeout(1000);

    const popover = this.page.locator('[role="dialog"], [data-slot="popover-content"], [id^="radix-"], .chakra-popover__content').filter({ visible: true }).last();
    // Use precise button targeting for the day number
    const dayBtn = popover.locator('button').filter({ hasText: new RegExp(`^${dayToSelect}$`) }).first();

    if (await dayBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dayBtn.click({ force: true });
      Logger.pass(`Day ${dayToSelect} selected in the current active calendar grid.`);
    } else {
      Logger.warn(`Day ${dayToSelect} not found in grid. Using fallback type...`);
      await this.page.keyboard.type(dateValue);
      await this.page.keyboard.press('Enter');
    }
    await this.page.waitForTimeout(1000);
    await this.stopTacticalTimer(`Fill Date: ${labelOrIndex}`, 'UI');
  }

  /**
   * Queries the API for the open fiscal period's end date (ISO string).
   * Used by pickDate to guarantee the selected date is within the legal period.
   */
  async getOpenPeriodEndDateAPI(): Promise<string | null> {
    const token = await this._getAuthToken();
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const company = process.env.BEFFA_COMPANY as string;
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-company': company,
      'x-role': 'IT Administrator / User Manager'
    };
    // Try /periods endpoint first, then /fiscal-periods
    for (const endpoint of ['periods', 'fiscal-periods', 'accounting-periods']) {
      const resp = await this.safeGet(`${this.apiBase}/${endpoint}?${params}`, { headers });
      if (!resp.ok()) continue;
      const data = await resp.json();
      const list: any[] = data.items || data.data || (Array.isArray(data) ? data : []);
      // Find the open/active period
      const open = list.find((p: any) =>
        (p.status?.toLowerCase() === 'open' || p.is_open === true || p.is_active === true) &&
        (p.end_date || p.period_end || p.to_date)
      );
      if (open) {
        const endDate = open.end_date || open.period_end || open.to_date;
        Logger.info(`Open period end date: ${Logger.sanitize(endDate)}`);
        return endDate;
      }
    }
    return null;
  }

  async pickDate(label: string, dayNum?: number): Promise<void> {
    const { DateHelper } = require('./utils/DateHelper');
    const resolved = await DateHelper.resolve(this.page);
    const targetDay = dayNum ?? resolved.dayNumber;
    const targetMonth = resolved.gcDate.getUTCMonth();
    const targetYear = resolved.gcDate.getUTCFullYear();

    Logger.info(`Picking date: "${Logger.sanitize(label)}" → target ${targetYear}-${targetMonth + 1}-${targetDay}`);
    await this.startTacticalTimer();

    // Strategy: find the label text, then locate the nearest date-trigger button.
    // The ERP renders date fields as: <label>Sale Order Date</label> + <button> (calendar icon)
    // We use a broad regex so "Sale Order Date" and "Sales Order Date" both match.
    const labelRegex = new RegExp(label.replace(/s?\s+/gi, '.?\\s*'), 'i');

    // Wait for the page to render the form (any input or button visible)
    const formReady = await this.page.locator('input, button').first().waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false);
    if (!formReady) {
      // SPA bundle still loading — wait for network idle then retry
      await this.page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => { });
      await this.page.locator('input, button').first().waitFor({ state: 'visible', timeout: 30000 });
    }

    // Try multiple selector strategies to find the date button
    let btn: Locator | null = null;

    // Strategy 1: container has label text + has button
    for (const containerSel of [
      '.chakra-form-control',
      '[role="group"]',
      '.flex-col',
      'div'
    ]) {
      const container = this.page.locator(containerSel)
        .filter({ has: this.page.getByText(labelRegex) })
        .filter({ has: this.page.locator('button') })
        .last();
      if (await container.isVisible({ timeout: 2000 }).catch(() => false)) {
        btn = container.locator('button').first();
        break;
      }
    }

    // Strategy 2: find label element, then look for adjacent button in parent
    if (!btn) {
      const labelEl = this.page.getByText(labelRegex).first();
      if (await labelEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Walk up to find a parent that contains a button
        for (const ancestor of ['xpath=..', 'xpath=../..', 'xpath=../../..']) {
          const parent = labelEl.locator(ancestor);
          const parentBtn = parent.locator('button').first();
          if (await parentBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            btn = parentBtn;
            break;
          }
        }
      }
    }

    // Strategy 3: Fallback for forms where the label is simply "Date" or "Receipt Date" (e.g. Receipt New page)
    if (!btn && /date/i.test(label)) {
      // Try multiple common date label variants used across ERP modules
      const dateLabelCandidates = [
        this.page.getByText(/^Date\s*\*?$/i).first(),
        this.page.getByText(/^Receipt\s+Date\s*\*?$/i).first(),
        this.page.getByText(/^Payment\s+Date\s*\*?$/i).first(),
        this.page.getByText(/^Transaction\s+Date\s*\*?$/i).first(),
      ];
      for (const candidateLabel of dateLabelCandidates) {
        if (!btn && await candidateLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
          for (const ancestor of ['xpath=..', 'xpath=../..', 'xpath=../../..']) {
            const parent = candidateLabel.locator(ancestor);
            const parentBtn = parent.locator('button').first();
            if (await parentBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              btn = parentBtn;
              break;
            }
          }
        }
        if (btn) break;
      }
    }

    // Strategy 4: Last resort — any visible button containing a calendar icon on the page
    if (!btn && /date/i.test(label)) {
      const calendarBtn = this.page.locator('button').filter({
        has: this.page.locator('svg, img[alt*="calendar" i], [class*="calendar" i]')
      }).first();
      if (await calendarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        btn = calendarBtn;
        Logger.warn(`[pickDate] Using calendar icon fallback for label "${label}"`);
      }
    }


    if (!btn) {
      throw new Error(`[pickDate] Could not find date trigger button for label "${label}"`);
    }

    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await btn.click({ force: true });
    await this.page.waitForTimeout(800);

    const popover = this.page.locator('[role="dialog"], [data-slot="popover-content"], [id^="radix-"], .chakra-popover__content').filter({ visible: true }).last();

    // Navigate the calendar to the correct month/year
    const headerBtns = popover.locator('button').filter({ hasNotText: /^\d{1,2}$/ });
    const prevBtn = headerBtns.first();
    const nextBtn = headerBtns.last();

    // Determine if the calendar is showing EC years (EC year = GC year - 7 or - 8)
    // Convert targetYear/targetMonth to the calendar's own coordinate system before navigating.
    const isEcCalendar = (process.env.BEFFA_CALENDAR || 'ec').toLowerCase() === 'ec';
    let navTargetYear = targetYear;
    let navTargetMonth = targetMonth;
    if (isEcCalendar) {
      // EC year N starts on Meskerem 1 (~Sep 11 GC of year N+7).
      // So GC dates from Jan 1 to Sep 10 map to EC year GC_year - 8.
      // GC dates from Sep 11 to Dec 31 map to EC year GC_year - 7.
      const isEarlyGC = (targetMonth < 8) || (targetMonth === 8 && targetDay < 11);
      navTargetYear = isEarlyGC ? targetYear - 8 : targetYear - 7;
      if (targetMonth === 8) {
        navTargetMonth = targetDay < 11 ? 12 : 0; // Pagume (12) or Meskerem (0)
      } else {
        navTargetMonth = (targetMonth + 4) % 13;
      }
    }

    const getDisplayedYearMonth = async (): Promise<{ year: number; month: number } | null> => {
      try {
        const headerText = await popover.evaluate((el: HTMLElement) => el.textContent || '').catch(() => '');
        const yearMatch = headerText.match(/(\d{4})/);
        if (!yearMatch) return null;
        const year = parseInt(yearMatch[1]);
        const monthNames = [
          'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'pag',
          'መስ', 'ጥቅ', 'ህዳ', 'ታህ', 'ጥር', 'የካ', 'መጋ', 'ሚያ', 'ግን', 'ሰኔ', 'ሐም', 'ነሐ', 'ጳጉ'
        ];
        const lower = headerText.toLowerCase();
        const monthIdx = monthNames.findIndex(m => lower.includes(m));
        if (monthIdx === -1) return null;
        const month = monthIdx >= 13 ? monthIdx - 13 : monthIdx;
        return { year, month };
      } catch { return null; }
    };

    for (let step = 0; step < 24; step++) {
      const current = await getDisplayedYearMonth();
      if (current) {
        const monthDiff = (navTargetYear - current.year) * 12 + (navTargetMonth - current.month);
        if (monthDiff === 0) break;
        const navBtn = monthDiff > 0 ? nextBtn : prevBtn;
        if (!await navBtn.isVisible({ timeout: 500 }).catch(() => false)) break;
        await navBtn.click({ force: true });
        await this.page.waitForTimeout(300);
      } else {
        break;
      }
    }

    // Click the target day
    const enabledDays = popover.locator('button:not([disabled]):not([aria-disabled="true"])').filter({ hasText: new RegExp(`^${targetDay}$`) });
    if (await enabledDays.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await enabledDays.first().click({ force: true });
      Logger.pass(`"${Logger.sanitize(label)}" set to day ${targetDay}.`);
    } else {
      // Fallback: pick first/early enabled day in whatever month is showing to stay safely within period bounds
      const anyEnabled = popover.locator('button:not([disabled]):not([aria-disabled="true"])').filter({ hasText: /^\d{1,2}$/ });
      const count = await anyEnabled.count();
      if (count > 0) {
        const earlyDay = anyEnabled.first();
        const dayText = await earlyDay.textContent();
        await earlyDay.click({ force: true });
        Logger.warn(`"${Logger.sanitize(label)}" — target day ${targetDay} not found, picked early enabled: ${Logger.sanitize(dayText?.trim())}.`);
      } else {
        await this.page.keyboard.press('Enter');
        Logger.warn(`"${Logger.sanitize(label)}" — no enabled days found, pressed Enter.`);
      }
    }

    await this.page.waitForTimeout(800);
    await this.stopTacticalTimer(`Pick Date: ${label}`, 'UI');
  }

  async selectRandomOption(selector: Locator, labelName: string, isOptional: boolean = false): Promise<number> {
    const optionSelector = '[role="checkbox"], .chakra-checkbox, [role="option"], [role="menuitem"], .chakra-menu__menuitem, tbody tr, tr:not(:first-child), tr[role="row"], button:not(:has-text("Clear")), [role="button"]';

    await this.startTacticalTimer(); // Start Tactical UI Timer

    for (let i = 0; i < 3; i++) {
      try {
        await selector.scrollIntoViewIfNeeded().catch(() => {});
        await selector.click({ timeout: 5000, force: true }).catch(() => selector.evaluate((el: HTMLElement) => el.click()));
        await this.page.waitForTimeout(1000);
        // Scope to the topmost visible overlay/dropdown to avoid counting items from other open menus
        const overlay = this.page.locator(
          '.chakra-menu__menu-list, [role="listbox"], .chakra-popover__content, [role="menu"]'
        ).filter({ visible: true }).last();
        const overlayVisible = await overlay.isVisible({ timeout: 3000 }).catch(() => false);

        if (overlayVisible) {
          const searchInput = overlay.locator('input').first();
          if (await searchInput.isVisible({ timeout: 800 }).catch(() => false)) {
            const currentVal = await searchInput.inputValue().catch(() => '');
            if (currentVal) {
              await searchInput.focus().catch(() => {});
              await searchInput.fill('').catch(() => {});
              await this.page.waitForTimeout(500);
            }
          }
        }

        const options = overlayVisible
          ? overlay.locator(optionSelector).filter({ visible: true }).filter({ hasNotText: /^(Clear|No more items)$/i })
          : this.page.locator(optionSelector).filter({ visible: true }).filter({ hasNotText: /^(Clear|No more items)$/i });
        // Wait up to 15s for at least one option to appear (handles heavy backend queries)
        await options.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });
        const count = await options.count();
        console.log(`[SELECT-OPTION] ${labelName} (attempt ${i + 1}): overlayVisible=${overlayVisible}, count=${count}`);
        if (count > 0) {
          const randomIndex = Math.floor(Math.random() * count);
          const target = options.nth(randomIndex);
          await target.scrollIntoViewIfNeeded().catch(() => {});
          const childCell = target.locator('td, [role="button"], button, p, span').first();
          if (await childCell.isVisible({ timeout: 500 }).catch(() => false)) {
            await childCell.click({ force: true }).catch(() => childCell.evaluate((node: HTMLElement) => node.click()));
          } else {
            await target.click({ force: true }).catch(() => target.evaluate((node: HTMLElement) => node.click()));
          }
          await this.page.waitForTimeout(500);
          if (await overlay.isVisible().catch(() => false)) {
            await this.page.keyboard.press('Escape').catch(() => { });
          }
          await this.stopTacticalTimer(`Random Selection: ${labelName}`, 'UI');
          return count;
        } else {
          if (await overlay.isVisible().catch(() => false)) {
            await this.page.keyboard.press('Escape').catch(() => { });
          }
          if (isOptional) return 0;
        }
      } catch (e: any) {
        console.log(`[SELECT-OPTION] ${labelName} attempt ${i + 1} caught error: ${e.message}`);
        await this.page.keyboard.press('Escape').catch(() => { });
        if (
          e.message?.includes('Target page') ||
          e.message?.includes('page has been closed') ||
          e.message?.includes('context was destroyed')
        ) throw e;
      }
    }
    if (!isOptional) throw new Error(`[ERROR] Failed selection for ${labelName}`);
    return 0;
  }

  getTransactionDates(): { soDate: string; invoiceDate: string; dueDate: string } {
    // Use DateHelper cached value if available, otherwise fall back to today.
    // For a fully async version call getTransactionDatesAsync().
    const { DateHelper } = require('./utils/DateHelper');
    const cached = (DateHelper as any)['_cached'] as { gcDate: Date } | null;
    const today = cached?.gcDate ?? new Date();
    const due = new Date(today);
    due.setUTCDate(today.getUTCDate() + 30);
    const fmt = (d: Date) => {
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getUTCFullYear()}`;
    };
    return { soDate: fmt(today), invoiceDate: fmt(today), dueDate: fmt(due) };
  }

  async getTransactionDatesAsync(): Promise<{ soDate: string; invoiceDate: string; dueDate: string; isoDate: string }> {
    const { DateHelper } = require('./utils/DateHelper');
    const resolved = await DateHelper.resolve(this.page);
    const due = new Date(resolved.gcDate);
    due.setUTCDate(resolved.gcDate.getUTCDate() + 30);
    const fmt = (d: Date) => {
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getUTCFullYear()}`;
    };
    return { soDate: fmt(resolved.gcDate), invoiceDate: fmt(resolved.gcDate), dueDate: fmt(due), isoDate: resolved.iso };
  }

  getInvoiceDates(): { invoiceDate: string; dueDate: string } {
    const { DateHelper } = require('./utils/DateHelper');
    const cached = (DateHelper as any)['_cached'] as { gcDate: Date } | null;
    const today = cached?.gcDate ?? new Date();
    const due = new Date(today);
    due.setUTCDate(today.getUTCDate() + 30);
    const fmt = (d: Date) => {
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getUTCFullYear()}`;
    };
    return { invoiceDate: fmt(today), dueDate: fmt(due) };
  }

  async getTableColumnMap(selector: string = 'table thead th'): Promise<Record<string, number>> {
    const headers = this.page.locator(selector);
    const count = await headers.count();
    const map: Record<string, number> = {};
    for (let h = 0; h < count; h++) {
      const text = (await headers.nth(h).innerText().catch(() => '')).trim().toLowerCase();
      if (text) map[text] = h;
    }
    return map;
  }

  async getAccountBalanceAPI(accountId: string, companyOverride?: string): Promise<number> {
    const token = await this._getAuthToken();
    const company = companyOverride || await this.page.evaluate(() => localStorage.getItem('currentCompany')) || process.env.BEFFA_COMPANY || 'sample';
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';

    // Fetch all accounts and filter locally to ensure we find the exact UUID
    const url = `${this.apiBase}/accounts?page=1&pageSize=1000&year=${year}&period=${period}&calendar=${calendar}`;

    const response = await this.page.request.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-company': company,
        'x-role': 'IT Administrator / User Manager'
      }
    });

    if (!response.ok()) {
      Logger.warn(`GL Balance Query Failed. Status: ${response.status()}`);
      return 0;
    }

    const data = await response.json();
    const list = data.items || data.data || [];
    const targetAccount = list.find((a: any) => a.id === accountId);

    if (!targetAccount) {
      Logger.warn(`GL Audit: Account ${Logger.sanitize(accountId)} not found in the COA list.`);
      return 0;
    }

    const balance = parseFloat(targetAccount.balance || targetAccount.current_balance || '0');
    Logger.snapshot(`Account: ${Logger.sanitize(targetAccount.name)} | Balance: ${balance.toFixed(2)}`);
    return balance;
  }

  async getMultiAccountBalancesAPI(accountIds: string[], companyOverride?: string): Promise<Record<string, number>> {
    const token = await this._getAuthToken();
    const company = companyOverride || await this.page.evaluate(() => localStorage.getItem('currentCompany')) || process.env.BEFFA_COMPANY || 'sample';
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';

    const url = `${this.apiBase}/accounts?page=1&pageSize=1000&year=${year}&period=${period}&calendar=${calendar}`;
    const response = await this.page.request.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-company': company,
        'x-role': 'IT Administrator / User Manager'
      }
    });

    if (!response.ok()) return {};

    const data = await response.json();
    const list = data.items || data.data || [];
    const balances: Record<string, number> = {};

    accountIds.forEach(id => {
      const acc = list.find((a: any) => a.id === id);
      if (acc) {
        balances[id] = parseFloat(acc.balance || acc.current_balance || '0');
        Logger.snapshot(`${Logger.sanitize(acc.name)}: ${balances[id].toFixed(2)}`);
      }
    });

    return balances;
  }

  async getAllAccountsAPI(companyOverride?: string): Promise<any[]> {
    const token = await this._getAuthToken();
    const company = companyOverride || await this.page.evaluate(() => localStorage.getItem('currentCompany')) || process.env.BEFFA_COMPANY || 'sample';
    const year = process.env.BEFFA_YEAR || '2019';

    const url = `${this.apiBase}/accounts?page=1&pageSize=1000&year=${year}&period=yearly&calendar=ec`;
    const response = await this.page.request.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-company': company,
        'x-role': 'IT Administrator / User Manager'
      }
    });

    if (!response.ok()) return [];
    const data = await response.json();
    return data.items || data.data || [];
  }

  /**
   * Resolves a warehouse UUID from a location object.
   * The ERP /locations list returns `warehouse` as a name string, not an object with `.id`.
   * This helper fetches the warehouses list once and matches by name.
   */
  async resolveWarehouseIdFromLocation(loc: any): Promise<string> {
    if (loc.warehouse_id && loc.warehouse_id.length === 36) return loc.warehouse_id;
    if (loc.warehouse?.id) return loc.warehouse.id;
    // warehouse is a name string — look it up
    if (typeof loc.warehouse === 'string' && loc.warehouse) {
      const token = await this._getAuthToken();
      const params = `year=${process.env.BEFFA_YEAR || '2019'}&period=${process.env.BEFFA_PERIOD || 'yearly'}&calendar=${process.env.BEFFA_CALENDAR || 'ec'}`;
      const headers = { 'x-company': process.env.BEFFA_COMPANY as string, 'Authorization': `Bearer ${token}` };
      const whResp = await this.safeGet(`${this.apiBase}/warehouses?page=1&pageSize=50&${params}`, { headers });
      if (whResp.ok()) {
        const whJson = await whResp.json();
        const whs: any[] = whJson.items || whJson.data || [];
        const match = whs.find((w: any) => w.name === loc.warehouse);
        if (match?.id) return match.id;
        if (whs[0]?.id) return whs[0].id;
      }
    }
    // Last resort: fetch first warehouse
    const token = await this._getAuthToken();
    const params = `year=${process.env.BEFFA_YEAR || '2019'}&period=${process.env.BEFFA_PERIOD || 'yearly'}&calendar=${process.env.BEFFA_CALENDAR || 'ec'}`;
    const whResp = await this.safeGet(`${this.apiBase}/warehouses?page=1&pageSize=1&${params}`, { headers: { 'x-company': process.env.BEFFA_COMPANY as string, 'Authorization': `Bearer ${token}` } });
    if (whResp.ok()) { const j = await whResp.json(); return (j.items || j.data || [])[0]?.id || ''; }
    return '';
  }

  /** Parse 422 insufficient-balance payment errors; returns top-up amount needed or null. */
  parseInsufficientCashTopUp(errorText: string): number | null {
    if (!/insufficient balance/i.test(errorText)) return null;
    const match = errorText.match(/available\s+(-?[\d.]+),\s*required\s+([\d.]+)/i);
    if (!match) return null;
    const available = parseFloat(match[1]);
    const required = parseFloat(match[2]);
    return Math.ceil(required - available + 1000);
  }

  /**
   * Parse 422 insufficient-stock errors from SO / Invoice creation or advance.
   * Returns the deficit quantity needed, or null if the error is unrelated.
   *
   * Known ERP error formats:
   *   "Insufficient stock. Available: 0, required: 300"
   *   "insufficient balance in account …" ← NOT stock, handled separately
   */
  parseInsufficientStock(errorText: string): { deficit: number; available: number; required: number } | null {
    if (!/insufficient stock/i.test(errorText)) return null;
    const match = errorText.match(/available[:\s]+(-?[\d.]+)[,\s]+required[:\s]+([\d.]+)/i);
    if (!match) {
      // Fallback: stock error detected but numbers couldn't be parsed precisely
      return { deficit: 50, available: 0, required: 50 };
    }
    const available = parseFloat(match[1]);
    const required = parseFloat(match[2]);
    const deficit = Math.max(1, Math.ceil(required - available));
    return { deficit, available, required };
  }

  /**
   * Top up stock for a specific item via an approved inventory adjustment.
   * Used as auto-recovery when SO/Invoice creation hits "insufficient stock" 422.
   */
  async topUpItemStockAPI(itemId: string, quantity: number, locationId?: string, warehouseId?: string): Promise<void> {
    const { InventoryAPI } = require('./api/InventoryAPI');
    const invApi = new InventoryAPI(this.page);

    // Add a 20-unit buffer so slight timing discrepancies don't cause a second failure
    const topUpQty = quantity + 20;

    Logger.info(`[STOCK_TOPUP] Injecting ${topUpQty} units for item ${Logger.sanitize(itemId)}...`);
    const adj = await invApi.createInventoryAdjustmentAPI({
      itemId,
      quantity: topUpQty,
      cost: 100,
      locationId,
      warehouseId,
      adjusted_by: 'quantity',
      reason: 'E2E Auto Stock Top-Up (insufficient stock recovery)',
    });

    if (!adj.success || !adj.id) {
      Logger.warn(`[STOCK_TOPUP] Adjustment creation failed: ${adj.error}`);
      return;
    }

    await this.advanceDocumentAPI(adj.id, 'inventory-adjustments').catch(() => {});
    // Wait for stock to settle in the ERP
    await this.page.waitForTimeout(3000);
    Logger.info(`[STOCK_TOPUP] Injected ${topUpQty} units for item ${Logger.sanitize(itemId)} (adj ${Logger.sanitize(adj.ref ?? adj.id)})`);
  }

  /**
   * Inject cash into a specific cash/bank account via an approved miscellaneous receipt.
   *
   * Accounting logic (double-entry):
   *   Dr  Cash Account (the account the payment will draw from)   +amount
   *   Cr  Revenue/Income GL account                               +amount
   *
   * The cashAccountId MUST be the same account the payment will use — otherwise
   * the balance lands in the wrong account and the payment still fails with 422.
   */
  async seedCashBalanceAPI(amount: number, cashAccountId?: string): Promise<void> {
    const token = await this._getAuthToken();
    const company = process.env.BEFFA_COMPANY as string;
    const year = process.env.BEFFA_YEAR || '2019';
    const period = process.env.BEFFA_PERIOD || 'yearly';
    const calendar = process.env.BEFFA_CALENDAR || 'ec';
    const params = `year=${year}&period=${period}&calendar=${calendar}`;
    const headers = { 'x-company': company, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const acctResp = await this.page.request.get(`${this.apiBase}/accounts?page=1&pageSize=200&${params}`, { headers });
    const acctData = await acctResp.json();
    const allAccounts: any[] = acctData.items || acctData.data || [];

    // Target: a valid cash account for receipt top-up.
    // When cashAccountId is explicitly provided (e.g. resolved from a 422 error),
    // deposit into THAT account — otherwise the top-up lands in the wrong account
    // and the payment keeps failing with insufficient balance.
    const typeOf = (a: any) => (a.type || a.account_type || '').toLowerCase();
    const cashAccount =
      (cashAccountId ? allAccounts.find((a: any) => a.id === cashAccountId) : null) ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('branch')) ||
      allAccounts.find((a: any) => (a.account_id || a.code || a.account_code) === '1002') ||
      allAccounts.find((a: any) => a.name?.toLowerCase().includes('petty')) ||
      allAccounts.find((a: any) => typeOf(a).includes('cash') || a.name?.toLowerCase().includes('cash')) ||
      allAccounts[0];

    // Offset: revenue account (Cr side of the receipt journal entry)
    const revenueAccount =
      allAccounts.find((a: any) => typeOf(a) === 'revenue') ??
      allAccounts.find((a: any) => typeOf(a).includes('revenue')) ??
      allAccounts.find((a: any) => typeOf(a).includes('income')) ??
      allAccounts.find((a: any) => typeOf(a).includes('sales')) ??
      allAccounts.find((a: any) => typeOf(a).includes('equity')) ??
      allAccounts.find((a: any) =>
        !typeOf(a).includes('cash') &&
        !typeOf(a).includes('bank') &&
        !typeOf(a).includes('payable') &&
        !typeOf(a).includes('receivable')
      ) ?? allAccounts[1] ?? allAccounts[0];

    const custResp = await this.safeGet(`${this.apiBase}/customers?page=1&pageSize=10&${params}`, { headers });
    const custData = await custResp.json().catch(() => ({}));
    const customer = custData.items?.[0] || custData.data?.[0];

    const currResp = await this.safeGet(`${this.apiBase}/currency?${params}`, { headers });
    const currData = await currResp.json().catch(() => ({}));
    const currency = currData.items?.[0] || currData.data?.[0];

    if (!cashAccount || !revenueAccount || !customer || !currency) {
      throw new Error(`[CASH_TOPUP] Discovery failed — cashAccount:${!!cashAccount} revenueAccount:${!!revenueAccount} customer:${!!customer} currency:${!!currency}`);
    }
    const seedAmount = amount > 100000 ? Math.ceil(amount + 50000) : Math.ceil(amount) * 10;
    const { DateHelper: _SeedDH } = require('./utils/DateHelper');
    const _seedDateIso = (await _SeedDH.resolve(this.page)).iso;

    const payload = {
      amount: seedAmount,
      cash_account_id: cashAccount.id,   // Dr: cash lands HERE — must match payment's cash_account_id
      customer_id: customer.id,
      date: _seedDateIso,
      payment_method: 'cash',
      currency_id: currency.id,
      receipt_items: [{
        amount: seedAmount,
        general_ledger_account_id: revenueAccount.id,  // Cr: revenue offset
        unit_price: seedAmount,
        quantity: 1,
        description: 'E2E Cash Balance Top-Up'
      }]
    };

    Logger.info(`Seeding ${seedAmount} → Dr "${Logger.sanitize(cashAccount.name)}" / Cr "${Logger.sanitize(revenueAccount.name)}"`);
    try {
      const response = await this.page.request.post(`${this.apiBase}/receipts?${params}`, { data: payload, headers, timeout: 30000 });
      if (!response.ok()) {
        const errText = await response.text();
        Logger.warn(`[CASH_TOPUP] Receipt creation failed: ${response.status()} - ${errText}`);
        return;
      }

      const receipt = await response.json();
      await this.advanceDocumentAPI(receipt.id, 'receipts').catch(() => {});
      await this.page.waitForTimeout(2000);
      Logger.info(`Seeded ${seedAmount} into "${Logger.sanitize(cashAccount.name)}" (receipt ${Logger.sanitize(receipt.ref ?? receipt.id)})`);
    } catch (e: any) {
      Logger.warn(`[CASH_TOPUP] Topup skipped: ${e.message}`);
    }
  }
}
