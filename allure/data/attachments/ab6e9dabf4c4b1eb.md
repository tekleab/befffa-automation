# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cross-module/line-item-miscellaneous-audit.spec.ts >> Line Item & Miscellaneous Audit @sales @purchase @regression >> SO-UI-01: Add inventory Line Item via modal → SO created and approved
- Location: tests/cross-module/line-item-miscellaneous-audit.spec.ts:404:9

# Error details

```
Error: [MODAL] Line item modal did not close after clicking Add/Save. Validation errors: Validation ErrorPlease check the highlighted fields below and try again.; ; Validation Error; Please check the highlighted fields below and try again.; Item ID is required; Selling price must be greater than 0
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e9]:
        - img [ref=e10]
        - generic [ref=e11]: Enterprise
      - generic [ref=e13]:
        - generic:
          - img
        - textbox "Search tasks" [ref=e14]
      - generic [ref=e15]:
        - navigation [ref=e17]:
          - link "Dashboard" [ref=e18] [cursor=pointer]:
            - /url: /dashboard
            - paragraph [ref=e21]: Dashboard
        - generic [ref=e23] [cursor=pointer]:
          - paragraph [ref=e26]: Accounting
          - paragraph [ref=e27]:
            - button "Toggle section" [ref=e28]:
              - img [ref=e29]
        - generic [ref=e32] [cursor=pointer]:
          - paragraph [ref=e35]: Account Reconciliation
          - paragraph [ref=e36]:
            - button "Toggle section" [ref=e37]:
              - img [ref=e38]
        - generic [ref=e41] [cursor=pointer]:
          - paragraph [ref=e44]: CRM
          - paragraph [ref=e45]:
            - button "Toggle section" [ref=e46]:
              - img [ref=e47]
        - generic [ref=e50] [cursor=pointer]:
          - paragraph [ref=e53]: HRM
          - paragraph [ref=e54]:
            - button "Toggle section" [ref=e55]:
              - img [ref=e56]
        - generic [ref=e59] [cursor=pointer]:
          - paragraph [ref=e62]: Project Management
          - paragraph [ref=e63]:
            - button "Toggle section" [ref=e64]:
              - img [ref=e65]
        - generic [ref=e68] [cursor=pointer]:
          - paragraph [ref=e71]: SCM
          - paragraph [ref=e72]:
            - button "Toggle section" [ref=e73]:
              - img [ref=e74]
        - generic [ref=e77] [cursor=pointer]:
          - paragraph [ref=e80]: Lease Management
          - paragraph [ref=e81]:
            - button "Toggle section" [ref=e82]:
              - img [ref=e83]
        - generic [ref=e86] [cursor=pointer]:
          - paragraph [ref=e89]: Service Management
          - paragraph [ref=e90]:
            - button "Toggle section" [ref=e91]:
              - img [ref=e92]
        - generic [ref=e95] [cursor=pointer]:
          - paragraph [ref=e98]: Report
          - paragraph [ref=e99]:
            - button "Toggle section" [ref=e100]:
              - img [ref=e101]
      - generic [ref=e103]:
        - button "Settings" [ref=e105] [cursor=pointer]:
          - generic:
            - generic:
              - img
              - paragraph: Settings
        - navigation [ref=e107]:
          - link "User Management" [ref=e109] [cursor=pointer]:
            - /url: /settings/general/users
            - generic [ref=e110]:
              - generic [ref=e111]:
                - img [ref=e112]
                - paragraph [ref=e114]: User Management
              - button [ref=e115]:
                - img [ref=e116]
        - button "Logout" [ref=e118] [cursor=pointer]:
          - img [ref=e120]
          - text: Logout
    - generic [ref=e122]:
      - generic [ref=e123]:
        - generic [ref=e124]:
          - img "BM Tech" [ref=e126]: BT
          - generic [ref=e127]:
            - button "BM Tech" [ref=e128] [cursor=pointer]:
              - generic: BM Tech
              - img [ref=e130]
            - generic [ref=e132] [cursor=pointer]:
              - button "Company Detail" [ref=e133]:
                - img [ref=e134]
              - button "Edit Company" [ref=e137]:
                - img [ref=e138]
              - button "Company Detail" [ref=e141]:
                - img [ref=e142]
        - generic [ref=e145]:
          - button "New" [ref=e146] [cursor=pointer]:
            - text: New
            - img [ref=e148]
          - generic [ref=e152] [cursor=pointer]:
            - generic [ref=e153]: "5"
            - img "Notifications" [ref=e154]
          - button "EC" [ref=e157] [cursor=pointer]:
            - img [ref=e158]
            - paragraph [ref=e160]: EC
          - button [ref=e161] [cursor=pointer]:
            - img [ref=e162]
          - generic [ref=e165] [cursor=pointer]:
            - img "System" [ref=e167]: S
            - generic [ref=e168]:
              - generic [ref=e169]: System
              - paragraph [ref=e170]: IT Administrator / User Manager
      - generic [ref=e171]:
        - generic [ref=e172]:
          - generic [ref=e173]:
            - navigation "breadcrumb" [ref=e174]:
              - list [ref=e175]:
                - navigation "breadcrumb" [ref=e176]:
                  - list [ref=e177]:
                    - listitem [ref=e178]:
                      - link "Home" [ref=e179] [cursor=pointer]:
                        - /url: /
                      - text: /
                    - listitem [ref=e180]:
                      - link "Receivables" [ref=e181] [cursor=pointer]:
                        - /url: /receivables/overview/
                      - text: /
                    - listitem [ref=e182]:
                      - link "SaleOrders" [ref=e183] [cursor=pointer]:
                        - /url: /receivables/sale-orders/?page=1&pageSize=15
                      - text: /
                    - listitem [ref=e184]:
                      - link "Add" [ref=e185] [cursor=pointer]:
                        - /url: /receivables/sale-orders/new
            - button "2019" [ref=e187] [cursor=pointer]:
              - generic [ref=e188]: "2019"
              - img [ref=e189]
          - generic [ref=e192]:
            - button "Toggle Visibility" [ref=e195] [cursor=pointer]:
              - img [ref=e196]
            - generic [ref=e198]:
              - paragraph [ref=e200]: Add Sale Order
              - generic [ref=e201]:
                - generic [ref=e203]:
                  - generic [ref=e205]:
                    - generic [ref=e206]:
                      - generic [ref=e207]:
                        - group [ref=e208]:
                          - generic [ref=e209]: Sale Order Number
                          - textbox "Sale Order Number" [disabled] [ref=e211]:
                            - /placeholder: N/A
                        - paragraph [ref=e212]: SO number is auto-generated
                      - generic [ref=e213]:
                        - generic [ref=e214]: Sale Order Date
                        - button "ጳጉሜ 01, 2018" [ref=e216] [cursor=pointer]:
                          - img [ref=e217]
                          - generic [ref=e219]: ጳጉሜ 01, 2018
                      - group [ref=e220]:
                        - generic [ref=e221]: Payment Term
                        - button "Payment Term selector" [ref=e222]
                      - group [ref=e223]:
                        - generic [ref=e224]: Posted Budget *
                        - button "Posted Budget * selector" [ref=e225]: Select a posted budget
                    - generic [ref=e226]:
                      - group [ref=e227]:
                        - generic [ref=e228]: Customer *
                        - button "Customer selector" [ref=e229]: Adyam Yimer
                      - group [ref=e230]:
                        - generic [ref=e231]: Accounts Receivable *
                        - button "Accounts Receivable selector" [ref=e232]: Accounts Receivable
                      - group [ref=e233]:
                        - generic [ref=e234]: Currency *
                        - button "Currency selector" [ref=e235]: Birr
                  - generic [ref=e237]:
                    - generic [ref=e238]:
                      - tablist [ref=e239]:
                        - tab "Sale Order Items *" [selected] [ref=e240] [cursor=pointer]
                        - tab "SO Journal" [ref=e241] [cursor=pointer]
                        - tab "Documents" [ref=e242] [cursor=pointer]
                      - button "Line Item" [expanded] [ref=e244] [cursor=pointer]:
                        - img [ref=e246]
                        - text: Line Item
                    - tabpanel "Sale Order Items *" [ref=e249]:
                      - table [ref=e253]:
                        - rowgroup [ref=e254]:
                          - row "Item Quantity Selling Price Description G/L Account * Project Before Tax * Tax Total" [ref=e255]:
                            - columnheader [ref=e256]
                            - columnheader "Item" [ref=e258]: Item
                            - columnheader "Quantity" [ref=e260]: Quantity
                            - columnheader "Selling Price" [ref=e262]: Selling Price
                            - columnheader "Description" [ref=e264]: Description
                            - columnheader "G/L Account *" [ref=e266]: G/L Account *
                            - columnheader "Project" [ref=e268]: Project
                            - columnheader "Before Tax *" [ref=e270]: Before Tax *
                            - columnheader "Tax" [ref=e272]: Tax
                            - columnheader "Total" [ref=e274]: Total
                            - columnheader [ref=e276]
                        - rowgroup [ref=e278]:
                          - row "No record found" [ref=e279]:
                            - cell "No record found" [ref=e280]:
                              - paragraph [ref=e282]: No record found
                        - rowgroup [ref=e283]:
                          - row "0.00 0.00 0.00" [ref=e284]:
                            - columnheader [ref=e285]
                            - columnheader [ref=e286]
                            - columnheader [ref=e287]
                            - columnheader [ref=e288]
                            - columnheader [ref=e289]
                            - columnheader [ref=e290]
                            - columnheader [ref=e291]
                            - columnheader "0.00" [ref=e292]
                            - columnheader "0.00" [ref=e293]
                            - columnheader "0.00" [ref=e294]
                            - columnheader [ref=e295]
                - group [ref=e297]:
                  - button "Add Now" [ref=e298] [cursor=pointer]
                  - button [ref=e299] [cursor=pointer]:
                    - generic:
                      - img
        - generic [ref=e300]: BM Technology © 2026
  - generic:
    - region "Notifications-top"
    - region "Notifications-top-left"
    - region "Notifications-top-right"
    - region "Notifications-bottom-left"
    - region "Notifications-bottom"
    - region "Notifications-bottom-right"
  - generic:
    - region "Notifications-top"
    - region "Notifications-top-left"
    - region "Notifications-top-right"
    - region "Notifications-bottom-left"
    - region "Notifications-bottom"
    - region "Notifications-bottom-right"
  - generic:
    - option "1950"
    - option "1951"
    - option "1952"
    - option "1953"
    - option "1954"
    - option "1955"
    - option "1956"
    - option "1957"
    - option "1958"
    - option "1959"
    - option "1960"
    - option "1961"
    - option "1962"
    - option "1963"
    - option "1964"
    - option "1965"
    - option "1966"
    - option "1967"
    - option "1968"
    - option "1969"
    - option "1970"
    - option "1971"
    - option "1972"
    - option "1973"
    - option "1974"
    - option "1975"
    - option "1976"
    - option "1977"
    - option "1978"
    - option "1979"
    - option "1980"
    - option "1981"
    - option "1982"
    - option "1983"
    - option "1984"
    - option "1985"
    - option "1986"
    - option "1987"
    - option "1988"
    - option "1989"
    - option "1990"
    - option "1991"
    - option "1992"
    - option "1993"
    - option "1994"
    - option "1995"
    - option "1996"
    - option "1997"
    - option "1998"
    - option "1999"
    - option "2000"
    - option "2001"
    - option "2002"
    - option "2003"
    - option "2004"
    - option "2005"
    - option "2006"
    - option "2007"
    - option "2008"
    - option "2009"
    - option "2010"
    - option "2011"
    - option "2012"
    - option "2013"
    - option "2014"
    - option "2015"
    - option "2016"
    - option "2017"
    - option "2018"
    - option "2019 (open)" [selected]
    - option "2020"
    - option "2021"
    - option "2022"
    - option "2023"
    - option "2024"
    - option "2025"
    - option "2026"
    - option "2027"
    - option "2028"
    - option "2029"
    - option "2030"
    - option "2031"
    - option "2032"
    - option "2033"
    - option "2034"
    - option "2035"
    - option "2036"
    - option "2037"
    - option "2038"
    - option "2039"
    - option "2040"
    - option "2041"
    - option "2042"
    - option "2043"
    - option "2044"
    - option "2045"
    - option "2046"
    - option "2047"
    - option "2048"
    - option "2049"
  - dialog [ref=e302]:
    - generic [ref=e305]:
      - alert [ref=e306]:
        - img [ref=e308]
        - generic [ref=e310]:
          - generic [ref=e311]: Validation Error
          - text: Please check the highlighted fields below and try again.
      - generic [ref=e312]:
        - generic [ref=e313]:
          - group [ref=e315]:
            - generic [ref=e316]: Item *
            - button "Item selector" [ref=e317]
            - generic [ref=e318]: Select an inventory item with an active selling price
            - generic [ref=e319]: Item ID is required
          - group [ref=e321]:
            - generic [ref=e322]: Warehouse *
            - button "Warehouse selector" [ref=e323]: Default Warehouse
          - group [ref=e325]:
            - generic [ref=e326]: Location *
            - button "Location selector" [ref=e327]: Default Warehouse Location
          - group [ref=e329]:
            - generic [ref=e330]: Quantity *
            - spinbutton "Quantity *" [ref=e332]: "3"
        - generic [ref=e333]:
          - group [ref=e335]:
            - generic [ref=e336]: G/L Account *
            - button "G/L Account selector" [ref=e337]: Shareholder Receivable
          - group [ref=e339]:
            - generic [ref=e340]: Project
            - button "Project selector" [ref=e341]
          - group [ref=e343]:
            - generic [ref=e344]: Selling Price
            - spinbutton "Selling Price" [disabled] [ref=e346]
            - generic [ref=e347]: Selling price must be greater than 0
          - group [ref=e349]:
            - generic [ref=e350]: Before Tax
            - spinbutton "Before Tax" [disabled] [ref=e352]
        - generic [ref=e353]:
          - generic [ref=e354]:
            - group [ref=e356]:
              - generic [ref=e357]: Description
              - textbox "Description" [ref=e358]:
                - /placeholder: Put your description here
            - generic [ref=e359]: "Total: 0"
          - group [ref=e361]:
            - generic [ref=e362]: Tax
            - button "Tax selector" [ref=e363]: VAT
      - generic [ref=e364]:
        - generic [ref=e365]: "Total: 0"
        - generic [ref=e366]:
          - button "Back" [ref=e367] [cursor=pointer]
          - button "Cancel" [ref=e368] [cursor=pointer]
          - button "Add" [active] [ref=e369] [cursor=pointer]
```

# Test source

```ts
  292 |                 // Use React's nativeInputValueSetter to properly update controlled input state,
  293 |                 // then dispatch both input and change events so React re-renders the field.
  294 |                 // Plain fill() / evaluate(el.value=) do not trigger React's synthetic event system.
  295 |                 const forceReactFill = async (value: string) => {
  296 |                     await priceInput.evaluate((el: HTMLInputElement, v: string) => {
  297 |                         const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  298 |                         if (nativeSetter) {
  299 |                             nativeSetter.call(el, v);
  300 |                         } else {
  301 |                             el.value = v;
  302 |                         }
  303 |                         el.dispatchEvent(new Event('input', { bubbles: true }));
  304 |                         el.dispatchEvent(new Event('change', { bubbles: true }));
  305 |                     }, value);
  306 |                     await page.keyboard.press('Tab').catch(() => { });
  307 |                     await page.waitForTimeout(200);
  308 |                 };
  309 | 
  310 |                 await priceInput.click({ clickCount: 3, force: true }).catch(() => { });
  311 |                 await forceReactFill(targetItemPrice);
  312 | 
  313 |                 // Verify — if still 0, retry once more after a short wait
  314 |                 const updatedVal = parseFloat(await priceInput.inputValue().catch(() => '0')) || 0;
  315 |                 if (updatedVal <= 0) {
  316 |                     await page.waitForTimeout(500);
  317 |                     await priceInput.click({ clickCount: 3, force: true }).catch(() => { });
  318 |                     await forceReactFill(targetItemPrice);
  319 |                     console.log(`[ITEM MODAL] ⚠️ Price re-forced via React setter to: ${targetItemPrice}`);
  320 |                 } else {
  321 |                     console.log(`[ITEM MODAL] ✅ Price confirmed: $${updatedVal}`);
  322 |                 }
  323 |             }
  324 | 
  325 | 
  326 |             // Select Warehouse, Location & G/L Account
  327 |             if (await whBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
  328 |                 await app.selectRandomOption(whBtn, 'Warehouse', true);
  329 |                 await page.waitForTimeout(400);
  330 |             }
  331 |             if (await locBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
  332 |                 await app.selectRandomOption(locBtn, 'Location', true);
  333 |                 await page.waitForTimeout(400);
  334 |             }
  335 |             if (await glBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
  336 |                 await app.selectRandomOption(glBtn, 'G/L Account', true);
  337 |                 await page.waitForTimeout(400);
  338 |             }
  339 |         } else {
  340 |             // Miscellaneous modal
  341 |             if (await glBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
  342 |                 await app.selectRandomOption(glBtn, 'G/L Account', true);
  343 |                 await page.waitForTimeout(400);
  344 |             }
  345 | 
  346 | 
  347 |             // Fill description
  348 |             const descField = modal.locator('textarea, input[placeholder*="description" i], input[name*="description" i]').first();
  349 |             if (await descField.isVisible({ timeout: 3000 }).catch(() => false)) {
  350 |                 await descField.fill(opts.description || 'Miscellaneous charge');
  351 |                 await page.waitForTimeout(300);
  352 |             }
  353 | 
  354 |             const priceInput = modal.locator('.chakra-form-control').filter({
  355 |                 hasText: /Before Tax|Unit Price|Unit Rate|^Price/i
  356 |             }).locator('input:not([disabled]):not([readonly])').first();
  357 | 
  358 |             if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  359 |                 await priceInput.click({ clickCount: 3, force: true }).catch(() => { });
  360 |                 await priceInput.fill(opts.unitPrice || '100');
  361 |                 console.log(`[MODAL] Filled Miscellaneous Price: ${opts.unitPrice || '100'}`);
  362 |             }
  363 |         }
  364 | 
  365 |         // ── Quantity ──────────────────────────────────────────────────────────
  366 |         const qtyControl = modal.locator('.chakra-form-control').filter({
  367 |             hasText: /Quantity/i
  368 |         }).first();
  369 |         if (await qtyControl.isVisible({ timeout: 2000 }).catch(() => false)) {
  370 |             const qtyInput = qtyControl.locator('input').first();
  371 |             await qtyInput.click({ force: true }).catch(() => { });
  372 |             await qtyInput.fill(opts.qty);
  373 |             console.log(`[MODAL] Filled Quantity: ${opts.qty}`);
  374 |         }
  375 | 
  376 |         // ── Tax (optional) ────────────────────────────────────────────────────
  377 |         if (await taxBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
  378 |             await app.selectRandomOption(taxBtn, 'Tax', true);
  379 |         }
  380 | 
  381 |         // ── Click Add / Save and verify modal closes ──────────────────────────
  382 | 
  383 |         const addBtn = modal.locator('button:has-text("Add"), button:has-text("Save")').first();
  384 |         await addBtn.scrollIntoViewIfNeeded();
  385 |         await addBtn.click({ force: true }).catch(() => addBtn.evaluate((b: HTMLElement) => b.click()));
  386 | 
  387 |         const closed = await modal.waitFor({ state: 'hidden', timeout: 15000 }).then(() => true).catch(() => false);
  388 |         if (!closed) {
  389 |             const errorText = await modal.locator(
  390 |                 '[class*="error"], [class*="invalid"], [role="alert"], .chakra-form__error-message, [data-status="error"]'
  391 |             ).allTextContents().catch(() => []);
> 392 |             throw new Error(
      |                   ^ Error: [MODAL] Line item modal did not close after clicking Add/Save. Validation errors: Validation ErrorPlease check the highlighted fields below and try again.; ; Validation Error; Please check the highlighted fields below and try again.; Item ID is required; Selling price must be greater than 0
  393 |                 `[MODAL] Line item modal did not close after clicking Add/Save. ` +
  394 |                 `Validation errors: ${errorText.join('; ') || 'none visible'}`
  395 |             );
  396 |         }
  397 |         console.log(`[MODAL] ${type} line item added successfully`);
  398 |     }
  399 | 
  400 |     // =========================================================================
  401 |     // SALES ORDER
  402 |     // =========================================================================
  403 | 
  404 |     test('SO-UI-01: Add inventory Line Item via modal → SO created and approved', async ({ page }) => {
  405 |         const app = new AppManager(page);
  406 |         await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
  407 | 
  408 |         // Always use itemA — guaranteed 50 units created in beforeAll, avoids zero-stock random picks
  409 |         const targetItemName: string | undefined = (itemA as any).name || itemA.itemName;
  410 |         const targetUnitPrice = String(itemA.unitCost || 100);
  411 |         console.log(`[SO-UI-01] Using guaranteed-stock item "${targetItemName}" @ $${targetUnitPrice}`);
  412 | 
  413 |         // 2. Proceed to Sales Order creation UI
  414 |         await page.goto('/receivables/sale-orders/new', { waitUntil: 'domcontentloaded' });
  415 |         await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
  416 | 
  417 |         const lineItemBtn = page.locator('button:has-text("Line Item")').first().first();
  418 |         await lineItemBtn.waitFor({ state: 'visible', timeout: 60000 });
  419 | 
  420 |         await app.pickDate('Sales Order Date');
  421 |         await app.selectRandomOption(page.getByRole('button', { name: 'Customer selector' }), 'Customer');
  422 |         await app.selectRandomOption(page.locator('.flex-col, .chakra-form-control').filter({ hasText: /Account.?Receivable/i }).locator('button').first(), 'Accounts Receivable');
  423 |         await fillCurrencyField(page, app);
  424 | 
  425 |         await lineItemBtn.click();
  426 |         await addLineItemViaModal(page, app, 'Item', { qty: '3', unitPrice: targetUnitPrice, itemName: targetItemName });
  427 |         console.log('[OK] Inventory line item added to SO');
  428 | 
  429 |         // ── Stock-error guard: check if table shows "Insufficient stock" / disabled Add Now ─
  430 |         await page.waitForTimeout(800);
  431 |         const insufficientRow = page.locator('table tbody tr, [role="row"]')
  432 |             .filter({ hasText: /insufficient stock|available:\s*0[,\s]/i }).first();
  433 |         const addNowBtn = page.getByRole('button', { name: 'Add Now' }).first();
  434 |         const addNowDisabled = await addNowBtn.isDisabled().catch(() => true);
  435 | 
  436 |         if (await insufficientRow.isVisible({ timeout: 1500 }).catch(() => false) || addNowDisabled) {
  437 |             console.log('[SO-UI-01] ⚠️ Stock error / disabled Add Now detected — auto topping up item stock via API');
  438 |             const itemIdToTopUp = (itemA as any)?.id || (itemA as any)?.itemId;
  439 |             if (itemIdToTopUp) {
  440 |                 await app.topUpItemStockAPI(itemIdToTopUp, 50);
  441 |             }
  442 |             await page.waitForTimeout(2000);
  443 |         }
  444 | 
  445 |         // Ensure Add Now is enabled before clicking — throw with clear message if still disabled
  446 |         await expect(addNowBtn).toBeEnabled({ timeout: 10000 });
  447 |         await addNowBtn.click();
  448 |         await page.waitForURL(/sale-orders\/.*\/detail/, { timeout: 60000 });
  449 | 
  450 |         const soId = await app.extractIdFromUrl();
  451 |         await app.advanceDocumentAPI(soId, 'sales-orders');
  452 |         console.log('[PASS] SO with inventory line item created and approved');
  453 |     });
  454 | 
  455 |     test('SO-UI-02: Add Miscellaneous Line Item via modal → SO created and approved', async ({ page }) => {
  456 |         const app = new AppManager(page);
  457 |         await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
  458 |         await page.goto('/receivables/sale-orders/new', { waitUntil: 'domcontentloaded' });
  459 |         await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
  460 |         await page.locator('button:has-text("Line Item")').first().waitFor({ state: 'visible', timeout: 60000 });
  461 | 
  462 |         await app.pickDate('Sales Order Date');
  463 |         await app.selectRandomOption(page.getByRole('button', { name: 'Customer selector' }), 'Customer');
  464 |         await app.selectRandomOption(page.locator('.flex-col, .chakra-form-control').filter({ hasText: /Account.?Receivable/i }).locator('button').first(), 'Accounts Receivable');
  465 |         await fillCurrencyField(page, app);
  466 | 
  467 |         await page.locator('button:has-text("Line Item")').first().click();
  468 |         const modal = page.getByRole('dialog').last();
  469 |         await modal.waitFor({ state: 'visible', timeout: 15000 });
  470 | 
  471 |         const miscBtn = modal.getByRole('button', { name: 'Miscellaneous', exact: true });
  472 |         if (!await miscBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  473 |             console.log('[SKIP] Miscellaneous button not present in SO modal');
  474 |             await page.keyboard.press('Escape');
  475 |             return;
  476 |         }
  477 | 
  478 |         await addLineItemViaModal(page, app, 'Miscellaneous', { qty: '1', unitPrice: '750', description: 'Delivery fee' });
  479 |         console.log('[OK] Miscellaneous line item added to SO');
  480 | 
  481 |         await page.getByRole('button', { name: 'Add Now' }).first().click();
  482 |         await page.waitForURL(/sale-orders\/.*\/detail/, { timeout: 60000 });
  483 |         console.log('[PASS] SO with miscellaneous line item created');
  484 |     });
  485 | 
  486 |     test('SO-UI-03: Add both Item + Miscellaneous lines → totals shown in SO table', async ({ page }) => {
  487 |         const app = new AppManager(page);
  488 |         await app.login(process.env.BEFFA_USER, process.env.BEFFA_PASS);
  489 | 
  490 |         // Top up itemA stock BEFORE navigating — prevents "Insufficient stock" rows
  491 |         const itemIdToTopUp = (itemA as any)?.id || (itemA as any)?.itemId;
  492 |         if (itemIdToTopUp) {
```