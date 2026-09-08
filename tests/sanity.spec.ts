/**
 * SANITY SUITE  @sanity
 *
 * Purpose : Absolute minimal alive checks. Zero business logic.
 *           "Can the app be reached and are all module APIs responding?"
 *
 * Tier    : sanity  → runs on EVERY push, PR, and deployment trigger.
 * Target  : < 1 min total wall-clock (parallel, 4 workers).
 * Rule    : NO assertions beyond HTTP 2xx/3xx. NO data creation. NO UI navigation.
 *           If a test needs more than one API call, it belongs in @smoke.
 */

import { test, expect } from '@playwright/test';

const PARAMS = `year=${process.env.BEFFA_YEAR || '2019'}&period=${process.env.BEFFA_PERIOD || 'yearly'}&calendar=${process.env.BEFFA_CALENDAR || 'ec'}`;

// ─── Resolve API base from environment ──────────────────────────────────────
function apiBase(): string {
  const raw = process.env.API_URL || process.env.BASE_URL || 'http://localhost:8001';
  return raw.replace(/['"]+/g, '').replace(/\/$/, '');
}

test.describe('Sanity: ERP System Connectivity @sanity', () => {

  // ── Frontend reachability ────────────────────────────────────────────────
  test('Frontend: homepage returns 200', async ({ request }) => {
    const base = (process.env.BASE_URL || 'http://localhost:4173').replace(/['"]+/g, '').replace(/\/$/, '');
    const res = await request.get(base, { timeout: 20000 });
    expect(res.status(), `Frontend (${base}) did not respond with 200`).toBe(200);
  });

  // ── API server reachability ──────────────────────────────────────────────
  test('API: server root responds', async ({ request }) => {
    const base = apiBase();
    const res = await request.get(base, { timeout: 20000 });
    expect(res.status(), `API root (${base}) unreachable`).toBeLessThan(500);
  });

  // ── Authentication endpoint alive ────────────────────────────────────────
  test('API: /users/login endpoint accepts POST', async ({ request }) => {
    const res = await request.post(
      `${apiBase()}/api/users/login?${PARAMS}&month=6`,
      {
        data: {
          email: process.env.BEFFA_USER || 'admin@beffa.com',
          password: process.env.BEFFA_PASS || '',
        },
        timeout: 20000,
      }
    );
    // Accept 200/201 (success / session created) or 401 (wrong creds but endpoint alive) — anything else is a crash
    expect([200, 201, 401], `Login endpoint returned unexpected status ${res.status()}`).toContain(res.status());
  });

  // ── Module API alive checks (GET-only, auth-gated = 401 is healthy) ──────
  const moduleProbes: Array<{ module: string; path: string }> = [
    { module: 'Accounts (COA)',       path: '/api/accounts'         },
    { module: 'Sales Orders',         path: '/api/sales-orders'     },
    { module: 'Customers',            path: '/api/customers'        },
    { module: 'Invoices',             path: '/api/invoices'         },
    { module: 'Receipts',             path: '/api/receipts'         },
    { module: 'Purchase Orders',      path: '/api/purchase-orders'  },
    { module: 'Vendors',              path: '/api/vendors'          },
    { module: 'Bills',                path: '/api/bills'            },
    { module: 'Payments',             path: '/api/payments'         },
    { module: 'Inventory Items',      path: '/api/inventory-items'  },
    { module: 'Warehouses',           path: '/api/warehouses'       },
    { module: 'Locations',            path: '/api/locations'        },
    { module: 'HR Employees',         path: '/api/employees'        },
    { module: 'Projects',             path: '/api/projects'         },
    { module: 'Currency',             path: '/api/currency'         },
  ];

  for (const probe of moduleProbes) {
    test(`API: ${probe.module} endpoint is reachable`, async ({ request }) => {
      const url = `${apiBase()}${probe.path}?page=1&pageSize=1&${PARAMS}`;
      const res = await request.get(url, { timeout: 10000 });
      // 200 = success, 401 = auth-gated but alive, 403 = RBAC alive — all healthy
      // 500+ = server crashed, 0 = unreachable
      expect(
        res.status(),
        `${probe.module} (${probe.path}) returned unexpected status ${res.status()} — possible backend crash`
      ).toBeLessThan(500);
    });
  }
});
