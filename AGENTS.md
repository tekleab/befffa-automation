# BEFFA PRIVATE — Project Context & Engineering Rules

## 1. Project Overview & Identity
- **Project Name:** BEFFA PRIVATE (Internal ERP)
- **Domain:** Core Financial ERP Backend & Business Automation
- **Target Backend:** Go API (Port 8001 / Staging IP: 168.119.175.142)
- **Framework:** Playwright (TypeScript) + Zod Runtime Schema Validation + Allure Reporting
- **Multi-Tenancy:** Strictly requires `x-company: BM Tech` header on all requests
- **Fiscal Calendar:** Ethiopian Calendar (EC), Year: 2019, Period: Yearly

## 2. Core Modules & Architecture
- `tests/sales/`: Sales Orders, Standalone Invoices, Receipts, AR Sub-ledger, Multi-item COGS
- `tests/purchase/`: Purchase Orders, Vendor Bills, AP Settlement, 3-Way Match Audit
- `tests/cross-module/`: Order-to-Cash, Procure-to-Pay, RBAC Security, Zod API Contracts
- `tests/inventory/`: WAC Costing, Stock Adjustments, Location Stock Conservation
- `tests/hr/`: Timesheets, Payroll Runs, Salary Structures, Leave Requests
- `tests/project/`: Project Costing, Budgets, Milestones

## 3. Strict Accounting Invariants & Guardrails
- **Double-Entry General Ledger:** Every financial posting must maintain $\sum\text{Debits} === \sum\text{Credits}$ (delta $\le 0.01$).
- **Inventory Valuation:** Weighted Average Cost (WAC) valuation is enforced on stock depletions.
- **Selling Price Immutability:** Sales item unit prices must be strictly locked to catalog prices.
- **Data Isolation:** All parallel test workers must use dynamic on-demand fixtures (`lib/fixtures/isolated-fixtures.ts`) to prevent cross-worker database collisions.

## 4. Communication & Defect Policy
- Always provide clean, copyable `curl` reproduction commands for backend defects.
- Distinguish between Real Backend Bugs (500s/Constraint leaks), Schema Regressions, and UI Timing issues.
- **Git Push Policy:** Always ask the user for confirmation before executing git push commands.

