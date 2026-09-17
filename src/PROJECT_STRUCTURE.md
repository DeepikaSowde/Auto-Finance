1. Project Purpose

Update (backend added): A real backend now exists at /backend (Express + SQLite via node:sqlite, see backend/README.md). All application data is now stored in a SQLite database and served over a REST API: customers, vehicles and their seize/release/sale lifecycle, loans, repayment schedules, collections, investors and their funding transactions, expenses, re-loan rules and login. Loan figures and the payment-allocation waterfall are computed server-side, and login checks scrypt-hashed passwords instead of the hardcoded DEMO_USERS array. The service modules under src/services call the API via src/services/api.js and their read functions are async, so callers must await them. The ledger is a read model computed across collections, vehicle sales and expenses. Treat every "localStorage" reference below as historical; the only modules still using it are the dead customerService.js and vehicleSaleStorage.js, which no page imports.

This project is a frontend-first Auto Finance / Loan Management application built with React, Vite, Tailwind CSS and React Router. The customer module is the root business entity. Customer onboarding collects customer, KYC, vehicle/RC, optional guarantor and loan information. The completed record is persisted locally for the frontend prototype and reused by the Customers and Loan Management modules.

2. High-Level Business Flow

Customer list → Add Customer

Customer Onboarding Step 1 → Customer information

Step 2 → KYC & required document selection/upload

Step 3 → Vehicle and RC information

Step 4 → Optional guarantor

Step 5 → Loan, interest, tenure and repayment calculation

Step 6 → Compact review

Create Customer → save customer + related loan to localStorage

Confirmed loan → repayment schedule is generated and can be shown in a separate schedule modal

Customers page and Loan Management page read the saved record rather than hardcoded business rows

3. Current Folder Structure

Finance-Frontend/
├── node_modules/
├── public/
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── customers/
│   │   │   └── onboarding/
│   │   │       ├── CustomerInfoStep.jsx
│   │   │       ├── GuarantorStep.jsx
│   │   │       ├── KycDocumentsStep.jsx
│   │   │       ├── LoanDetailsStep.jsx
│   │   │       ├── ReviewStep.jsx
│   │   │       ├── SummaryCard.jsx
│   │   │       └── VehicleRcStep.jsx
│   │   │
│   │   ├── loans/
│   │   │   └── RepaymentScheduleModal.jsx
│   │   │
│   │   └── SideBar.jsx
│   │
│   ├── context/
│   │   └── CustomerContext.jsx
│   │
│   ├── data/
│   │   └── schemas/
│   │       └── customerSchema.js
│   │
│   ├── pages/
│   │   ├── customers/
│   │   │   ├── CustomerDetails.jsx
│   │   │   ├── CustomerOnboarding.jsx
│   │   │   └── CustomerPage.jsx
│   │   │
│   │   └── loan/
│   │       └── Loan.jsx
│   │
│   ├── services/
│   │   ├── customerService.js
│   │   ├── customerStorage.js
│   │   ├── loanCalculator.js
│   │   └── repaymentSchedule.js
│   │
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── package.json
├── vite.config.js
└── README.md

4. File-by-File Responsibilities

File

Responsibility

src/main.jsx

Application entry point. Mounts the React application into the browser DOM.

src/App.jsx

Top-level routing/layout. Renders the sidebar and routes for Customers, Customer Onboarding, Customer Details and Loan Management.

src/App.css

Application-level CSS that is not handled by Tailwind utilities.

src/index.css

Global CSS / Tailwind base styles and global browser styling.

src/components/SideBar.jsx

Persistent left navigation. Holds main navigation items, active-state styling and sidebar collapse behavior.

src/data/schemas/customerSchema.js

Canonical shape of a customer onboarding record and createEmptyCustomer() for a fresh independent record.

src/context/CustomerContext.jsx

React context for customer data/state. Current Customers page reads storage directly, so avoid creating a second source of truth.

src/services/customerStorage.js

Local persistence layer. Reads/writes customer records in localStorage, sanitizes file data before persistence, exposes customer/loan retrieval helpers and broadcasts update events.

src/services/customerService.js

Customer business/service operations. Review before adding logic that might duplicate customerStorage.js.

src/services/loanCalculator.js

Calculates loan-level summary values from amount, rate, tenure, interest type, repayment method and frequency.

src/services/repaymentSchedule.js

Generates period-by-period repayment rows after loan confirmation and provides schedule totals.

src/pages/customers/CustomerPage.jsx

Customer LIST page: summary cards, search/filter toolbar, customer table/mobile cards and onboarding/details navigation.

src/pages/customers/CustomerOnboarding.jsx

Six-step centered modal wizard. Owns onboarding state, navigation, validation state, final save and repayment schedule modal launch.

src/pages/customers/CustomerDetails.jsx

Single customer DETAIL page opened from the eye/View action.

src/pages/loan/Loan.jsx

Loan Management LIST page. Derives loan rows from saved customer records and shows loan-level information.

src/components/customers/onboarding/CustomerInfoStep.jsx

Step 1 customer personal/contact information UI.

src/components/customers/onboarding/KycDocumentsStep.jsx

Step 2 KYC fields and required document selection/upload. Minimum two selected documents with files.

src/components/customers/onboarding/VehicleRcStep.jsx

Step 3 vehicle, registration, RC, compliance and insurance UI. Permit/FC are conditional for commercial vehicles.

src/components/customers/onboarding/GuarantorStep.jsx

Step 4 optional guarantor flow.

src/components/customers/onboarding/LoanDetailsStep.jsx

Step 5 loan inputs, interest configuration, automatic calculations and optional charges/initial payment sections.

src/components/customers/onboarding/ReviewStep.jsx

Step 6 compact final review of customer, KYC, vehicle and loan essentials.

src/components/customers/onboarding/SummaryCard.jsx

Reusable compact summary card for calculated financial values.

src/components/loans/RepaymentScheduleModal.jsx

Separate post-confirmation repayment schedule popup showing installment rows.

5. Core Data Model

The customer is the root business record. Vehicle, RC, guarantor and loan are related portions of the same onboarding record.

{
  customer: {
    id,
    customerNumber,
    status,
    personal,
    kyc,
    documents,
    photo
  },

  vehicle: {
    vehicleType,
    brand,
    model,
    variant,
    colour,
    manufacturingYear,
    fuelType,
    vehicleValue
  },

  rc: {
    registrationNumber,
    rcBookNumber,
    location,
    chassisNumber,
    engineNumber,
    taxExpiry,
    permitExpiry,
    fcExpiry,
    insurance,
    endorsement
  },

  guarantor: {
    hasGuarantor,
    personal,
    kyc,
    documents,
    photo
  },

  loan: {
    id,
    loanNumber,
    vehicleAmount,
    loanAmount,
    downPayment,
    interest,
    repayment,
    calculation,
    charges,
    collection,
    firstDueDate,
    repaymentSchedule,
    status
  }
}

6. Onboarding Step Responsibilities

Step

Purpose

Step 1 – Customer

Basic customer identity/contact information. Date is automatically assigned; avoid unnecessary duplicates.

Step 2 – KYC & Documents

Identity fields plus selection/upload of at least two document types. File contents should not be persisted in localStorage.

Step 3 – Vehicle & RC

Vehicle data, registration/RC identifiers, compliance and insurance. Do not duplicate the RC document upload.

Step 4 – Guarantor

Optional guarantor. Ask whether one exists; show guarantor form only when applicable.

Step 5 – Loan

Loan amount, interest type/rate, repayment method, frequency and tenure. Calculate principal, interest, total payable and payment amount.

Step 6 – Review

Compact confirmation showing only important customer, KYC, vehicle and loan information.

7. Persistence & Single Source of Truth

The frontend prototype uses localStorage under the key "fleetopz_customers". CustomerPage and Loan.jsx should both read this same source.

saveCustomer(finalCustomer) persists the complete business record.

getCustomers() returns the root customer records.

getLoans() derives loan rows from those customer records.

getOutstandingAmount(loan) should be the shared outstanding calculation used by both customer and loan views.

The storage layer removes Base64 photo/document/insurance file data before saving.

The storage layer dispatches fleetopz:data-updated so the same browser tab can refresh UI state.

8. Financial Calculation Concepts

Principal = financed loan amount.

Interest = interest generated by the selected calculation method.

Total Payable = principal + interest under the current design.

EMI / Payment Amount = amount due per payment period according to the selected repayment method.

Outstanding = total payable minus actual payments received; it should not remain equal to original total payable after payments begin.

9. Page Responsibilities

Route

Business Focus

Primary Data Source

/customers

Customer portfolio / customer list

getCustomers()

/customers/onboarding

Create customer + initial loan

React onboarding state → saveCustomer()

/customers/:customerId

Single customer details

getCustomerById()

/loan

Loan portfolio / loan management

getLoans()

10. Common Pitfalls

Do not introduce a second customer data source when customerStorage.js already owns persistence.

Do not hardcode customer or loan rows.

Do not store photo/PDF Base64 contents in localStorage.

Do not put the repayment table inside LoanDetailsStep.jsx; use the separate repayment schedule modal/view.

Do not use calculation.totalDue as true outstanding once payments are recorded.

Keep CustomerPage (list) separate from CustomerDetails (single record).

Keep schema paths consistent: registration is rc.registrationNumber, while vehicle identity is stored under vehicle.*.

11. Recommended Development Order

1. Read customerSchema.js to understand the canonical record shape.

2. Read CustomerOnboarding.jsx to understand how the record is built.

3. Read customerStorage.js to understand persistence and shared retrieval.

4. Read loanCalculator.js and repaymentSchedule.js for financial behavior.

5. Read CustomerPage.jsx for the customer list and CustomerDetails.jsx for one customer.

6. Read Loan.jsx for loan portfolio presentation.

7. Add paymentHistory/payment logic before implementing collections and true outstanding balances.

8. When a backend is introduced, replace the persistence layer rather than duplicating business data in every page.

12. Quick Start for a New Developer

Start with these files in this order to understand the system quickly:

App.jsx — routes and application layout

customerSchema.js — master data structure

CustomerOnboarding.jsx — record creation workflow

customerStorage.js — local persistence and shared access

CustomerPage.jsx — customer list

CustomerDetails.jsx — single customer view

Loan.jsx — loan list

loanCalculator.js — loan summary calculations

repaymentSchedule.js — installment schedule generation

13. Architecture Overview

CustomerPage
    │
    └── Add Customer
            │
            ▼
CustomerOnboarding
    │
    ├── CustomerInfoStep
    ├── KycDocumentsStep
    ├── VehicleRcStep
    ├── GuarantorStep
    ├── LoanDetailsStep
    └── ReviewStep
            │
            ▼
      finalCustomer object
            │
            ├── loanCalculator.js
            ├── repaymentSchedule.js
            │
            ▼
      customerStorage.js
            │
            ▼
    localStorage
    "fleetopz_customers"
            │
       ┌────┴─────┐
       ▼          ▼
 CustomerPage   Loan.jsx
       │
       ▼
CustomerDetails

14. Recent Loan Management Architecture Updates

The Loan Management module was refactored from a large single `Loan.jsx` implementation into smaller reusable components and hooks.

This change was made to keep the page maintainable as loan features grow.

### New Loan Components

New files:

```text
src/components/loans/
├── LoanKpiCards.jsx
├── LoanToolbar.jsx
├── LoanTable.jsx
├── LoanTableRow.jsx
├── LoanActionMenu.jsx
├── LoanDetailsDrawer.jsx
└── RepaymentScheduleModal.jsx

LoanKpiCards.jsx

Purpose:

Displays compact loan-level KPI cards.

Current KPI concepts:

Total Loans
Active Loans
Overdue Loans
Total Outstanding

Used by:

src/pages/loan/Loan.jsx

The component receives loan data and should not directly access localStorage.


LoanToolbar.jsx

Purpose:

Contains the primary loan-management filtering and action controls.

Current controls include:

Search
Status
Loan Type
Due Status
Date Range
Sort
Export
New Loan

Used by:

src/pages/loan/Loan.jsx

Filtering state is managed by:

src/hooks/loans/useLoanFilters.js
LoanTable.jsx

Purpose:

Owns the loan table structure and table-level interactions.

Responsibilities:

Column headers
Select-all checkbox
Row rendering
Bulk selection
Bulk action bar
Empty state

Current columns:

Select
Loan Number
Customer
Vehicle
Loan Amount
Down Payment
EMI
Tenure
Next Due Date
Outstanding
Overdue
Status
Actions

Used by:

src/pages/loan/Loan.jsx
LoanTableRow.jsx

Purpose:

Owns the UI for one loan record.

It displays:

Loan number
Customer
Customer ID / phone
Vehicle
Registration number
Loan amount
Down payment
EMI
Tenure
Next due date
Outstanding
Overdue count
Loan status
Three-dot action button

It uses shared helpers from:

src/utils/loan/loanHelpers.js

This prevents duplicated formatting and loan calculations across components.

LoanActionMenu.jsx

Purpose:

Provides the three-dot action menu for one loan.

Current actions:

View Loan
Record Payment
View Repayment Schedule
Edit Loan
Download Statement
Send Reminder
Close Loan
More

The menu receives callbacks from the parent component rather than owning the loan data itself.

Expected pattern:

LoanTableRow
    |
    v
LoanActionMenu
    |
    +-- View Loan
    +-- Record Payment
    +-- Repayment Schedule
    +-- Edit Loan
    +-- Statement
    +-- Reminder
    +-- Close Loan
Single Open Action Menu Rule

Only one loan action menu should be visible at a time.

Use one shared identifier at the table/page level:

const [openMenuId, setOpenMenuId] = useState(null);

Desired behavior:

Click Loan A ⋮
    -> Loan A menu opens

Click Loan B ⋮
    -> Loan A menu closes
    -> Loan B menu opens

Do not maintain separate independent menu state for every row when the table needs only one active menu.

Action Menu Positioning

The action menu is positioned using the action button's viewport coordinates.

The button uses:

event.currentTarget.getBoundingClientRect()

to calculate:

top
left

The menu can then use:

position: fixed;

This prevents the menu from being clipped by:

overflow-x-auto
overflow-hidden
table containers

The menu should also:

Stay inside the viewport
Open above when there is insufficient space below
Avoid right-edge clipping
Have a high z-index
Bulk Selection

LoanTable now supports multiple-selection behavior.

State should have one source of truth:

const [selectedIds, setSelectedIds] = useState([]);

Do not maintain both:

selectedIds
selectedLoans

for the same selection mechanism.

Selection flow:

Row Checkbox
     |
     v
selectedIds
     |
     v
Bulk Action Bar
     |
     +-- Send Reminder
     +-- Export Selected
     +-- Clear Selection

Select-all behavior should support:

Nothing selected
Some selected
Everything selected
Loan Hooks

The Loan Management page now uses custom hooks to keep state and data logic out of the page component.

src/hooks/loans/useLoans.js

Purpose:

Centralized loan loading.

Responsibilities:

Call getLoans()
Maintain loans
Maintain loading
Provide reloadLoans()
Listen for fleetopz:data-updated
Listen for browser storage updates

Concept:

useLoans()
    |
    +-- loans
    +-- loading
    +-- reloadLoans()

The page should not duplicate loan-loading logic.

src/hooks/loans/useLoanFilters.js

Purpose:

Centralized loan filtering and sorting.

Responsibilities:

Search
Loan status filter
Loan type filter
Due status filter
Date filter
Sorting
Generate filteredLoans

Concept:

loans
   |
   v
useLoanFilters()
   |
   +-- search
   +-- status
   +-- loan type
   +-- due status
   +-- date
   +-- sort
   |
   v
filteredLoans

This hook is the preferred place for loan-list filtering logic.

Loan Utility Layer
src/utils/loan/loanHelpers.js

Shared loan helpers were introduced to prevent duplicated logic between:

Loan.jsx
LoanTable.jsx
LoanTableRow.jsx
LoanDetailsDrawer.jsx
Future payment/collection screens

Typical helpers include:

money()
formatDate()

getCustomerName()
getCustomerId()
getCustomerMobile()

getVehicleName()
getRegistration()

getEmi()
getTenure()

getNextDue()

getLoanOutstanding()
getOverdueCount()

getDisplayLoanStatus()
getLoanDueStatus()

Important rule:

If a loan display/calculation value is already available through loanHelpers.js, do not recreate the same logic inside another component.

Loan Details Drawer
src/components/loans/LoanDetailsDrawer.jsx

Loan details are now treated as a separate workspace rather than a large modal inside Loan.jsx.

Flow:

LoanTable
    |
    v
LoanTableRow
    |
    v
Three-dot menu
    |
    v
View Loan
    |
    v
selectedLoan
    |
    v
LoanDetailsDrawer

The drawer is responsible for displaying detailed information for one loan.

Recommended sections:

Loan Header
Loan Overview
Customer
Vehicle
Repayment Progress
Repayment Schedule
Payment History
Documents
Activity Timeline

The page remains responsible only for opening and closing the drawer.

Repayment Schedule Separation

Repayment schedule UI remains separate from loan onboarding.

The onboarding loan step:

LoanDetailsStep.jsx

handles:

Loan inputs
Interest
Tenure
Repayment configuration
Calculations

The separate schedule components handle:

EMI rows
Due dates
Principal
Interest
Payment status
Schedule totals

This keeps loan creation separate from loan servicing.

Current Loan Page Responsibility

src/pages/loan/Loan.jsx should now primarily act as an orchestrator.

Expected responsibility:

Loan.jsx
    |
    +-- useLoans()
    |
    +-- useLoanFilters()
    |
    +-- selectedLoan state
    |
    +-- LoanKpiCards
    +-- LoanToolbar
    +-- LoanTable
    +-- LoanDetailsDrawer

Avoid putting the following directly into Loan.jsx:

Large table JSX
Individual table-row markup
Three-dot menu markup
Filter implementation
Repeated loan calculations
Repayment schedule rendering
Loan Management Data Flow

Current preferred architecture:

customerStorage.js
        |
        v
     getLoans()
        |
        v
    useLoans.js
        |
        v
     Loan.jsx
        |
        +-------------------+
        |                   |
        v                   v
useLoanFilters         LoanKpiCards
        |
        v
filteredLoans
        |
        v
   LoanTable
        |
        v
  LoanTableRow
        |
        v
 LoanActionMenu
        |
        +---- View Loan
                |
                v
       LoanDetailsDrawer

This keeps data access, filtering, display and detailed interaction separated.

Current Loan Table Interaction Rules
Checkbox

Row checkbox:

Unchecked
    ->
Selected

Select-all checkbox:

No rows selected
    -> Select all

Some rows selected
    -> Select all

All rows selected
    -> Deselect all

The table should visually indicate the selected state.

Three-dot Menu

Only one menu may be open.

Row 1 ⋮
   -> open Row 1 menu

Row 2 ⋮
   -> close Row 1
   -> open Row 2

Click same row ⋮ again
   -> close menu

Clicking an action button should not trigger the row's other click interactions.

Loan Status and Due Status

Loan status and repayment due status are separate concepts.

Loan status examples:

Pending
Active
Closed
Seized
Written Off

Due status examples:

Current
Due
Overdue
Completed

Example:

Loan Status: Active
Due Status: Overdue

A loan can therefore be active while simultaneously having overdue installments.

Current Loan Management UI Direction

The Loan Management page is intended to be:

Enterprise SaaS
Auto Finance specific
Data dense
Lightweight
Operational
Responsive
Scalable to large loan portfolios

The page should prioritize:

Loan records
Outstanding amount
Overdue information
Next due date
Fast actions
Filtering
Bulk actions
Loan details

Avoid turning the page into a generic dashboard.

Architecture Rule for Future Features

Before adding a new loan feature, decide where it belongs:

UI section
    -> components/loans/

State / filtering
    -> hooks/loans/

Shared loan derivation
    -> utils/loan/

Financial calculation
    -> services/

Persistence
    -> customerStorage.js

Page orchestration
    -> pages/loan/Loan.jsx

Examples:

Add payment modal
    -> components/loans/

Payment history formatting
    -> utils/loan/

Payment calculation
    -> services/

Payment persistence
    -> customerStorage.js

Opening the payment modal
    -> Loan.jsx / drawer
Important Current Refactoring Rules

When modifying the Loan Management module:

1. Do not recreate customer/loan data in components.
2. Do not hardcode loan records.
3. Do not duplicate financial calculations.
4. Do not create duplicate selection state.
5. Do not create independent menu states when one menu should be active.
6. Do not put large reusable UI blocks back into Loan.jsx.
7. Keep loan helpers centralized.
8. Keep filtering inside useLoanFilters.js.
9. Keep data loading inside useLoans.js.
10. Keep persistence inside customerStorage.js.
11. Keep repayment schedule UI separate from onboarding.
12. Keep customer and loan business data linked through the existing stored customer record.
New Developer Quick Reference — Loan Module
Loan.jsx
    = Page orchestration

useLoans.js
    = Loan loading + refresh

useLoanFilters.js
    = Search + filters + sorting

LoanKpiCards.jsx
    = Loan summary KPIs

LoanToolbar.jsx
    = Search/filter/action toolbar

LoanTable.jsx
    = Table + selection + bulk actions

LoanTableRow.jsx
    = One loan row

LoanActionMenu.jsx
    = Three-dot actions

LoanDetailsDrawer.jsx
    = Detailed loan workspace

RepaymentScheduleModal.jsx
    = Repayment schedule

loanHelpers.js
    = Shared loan formatting/derived values

customerStorage.js
    = Persistent source of truth
Current Known Architectural Improvements

The following improvements have already been made or are in progress:

✓ Loan page split into reusable components
✓ Loan loading moved toward useLoans()
✓ Loan filtering moved toward useLoanFilters()
✓ Loan helper functions centralized
✓ Loan table separated from page
✓ Table row separated from table
✓ Action menu separated from row
✓ Loan detail UI separated into drawer
✓ Bulk selection introduced
✓ Select-all behavior introduced
✓ Single-open-menu behavior introduced
✓ Action menu viewport positioning introduced
✓ Next Due Date displayed in loan table
✓ Overdue count displayed in loan table
✓ Down Payment displayed
✓ Tenure displayed
Current Technical Debt / Future Work

The following features still need real business implementation rather than placeholder UI:

Record Payment
Edit Loan
Download Statement
Send Reminder
Close Loan
More Actions
Payment History
Document Management
Activity Timeline
Customer Profile Navigation
Bulk Reminder
Bulk Export
Pagination
Server-side filtering
Backend persistence

Currently these may exist as UI actions but should not be treated as fully implemented business workflows until the underlying services/storage are connected.

Backend Migration Strategy

The current frontend architecture is intentionally compatible with a future backend.

Current:

UI
 |
 v
customerStorage.js
 |
 v
localStorage

Future:

UI
 |
 v
hooks
 |
 v
API/service layer
 |
 v
Backend
 |
 v
Database

When migrating to a backend, replace the persistence/service implementation instead of rewriting every page and component.
Maintenance note: This guide reflects the folder structure visible in the supplied project screenshot and the implementation decisions made in this conversation. Update it when file responsibilities, storage ownership, routing, or the canonical schema changes.