# User Stories — Invoice Enhancements, Language Preference & Loyalty Transactions

**Feature area**: Customer Portal — Invoices / Language / Rewards  
**Status**: Awaiting business approval  
**Requested by**: Cédric  
**Date**: May 2026

---

## Story 1 — View Stored Invoice Document

**As an** installer logged into the customer portal,  
**I want to** open the stored copy of my invoice directly from the invoice list,  
**so that** I can quickly access and verify the document without having to search for it elsewhere.

### What is shown / What changes

- Every invoice card in the "My Invoices" list will display a **"View Invoice"** button or link.
- Clicking it retrieves and opens the stored invoice document in a new browser tab or downloads it. The document is always retrieved securely through the backend (flow) — it is never exposed directly.
- The button is only visible when a stored document is available. If no document has been stored yet (e.g. a freshly uploaded invoice still being processing), nothing is shown — the card looks exactly as it does today.
- This applies to invoices in **all statuses** (submitted, extracted, under review, credited, rejected).

### Acceptance Criteria

- [ ] Clicking "View Document" opens the correct stored document in a new tab.
- [ ] The document is retrieved securely through the backend — no direct link is exposed to the user.
- [ ] The button does not appear when no document is available for that invoice.
- [ ] The document opens without navigating away from the portal.
- [ ] No other information on the invoice card changes.

---

## Story 2 — View Point-Earning Lines on a Credited Invoice

**As an** installer logged into the customer portal,  
**I want to** see a breakdown of which product lines on a credited invoice earned me loyalty points,  
**so that** I can understand exactly where my points came from and verify the amounts.

### What is shown / What changes

**Backend**
- A new backend integration (flow) is created to securely retrieve the product lines for a user's invoices. This is required because invoice line data is not directly accessible from the user's account and must be fetched through a controlled, secure process.
- Only lines that actually generated points are returned — lines with no points are excluded at the source.

**Frontend**
- On invoices with status **"Credited"**, a new collapsible section appears below the existing invoice summary.
- The section is labelled something like **"Point details"** or **"Earning breakdown"** and is **collapsed by default**. The invoice card height adjusts naturally when the section is expanded or collapsed.
- When expanded, it shows a list of the product lines that generated points. For each line, the following is displayed:
  - **Product name**
  - **Loyalty points earned** on that line
- No monetary amounts or prices are shown — points only.
- Lines that did **not** generate points are not shown.
- If, exceptionally, a credited invoice has no lines with points, a message is shown instead (e.g. "No point-earning lines available").
- This section is **not shown** on invoices in any other status (submitted, extracted, under review, rejected).
- This feature is visible in the **portal only** — no change to the CRM back-office view.

### Acceptance Criteria

- [ ] A new secure backend integration is created to retrieve point-earning invoice lines.
- [ ] The breakdown section is visible only on credited invoices.
- [ ] The section is collapsed by default; expanding it adjusts the card height smoothly.
- [ ] Expanding the section shows each point-earning product line with its name and point amount.
- [ ] No prices or monetary amounts are displayed — loyalty points only.
- [ ] Lines with no points are not listed.
- [ ] The sum of points across all displayed lines matches the total points shown on the invoice header.
- [ ] If no point-earning lines exist on a credited invoice, a clear message is shown instead of an empty section.
- [ ] No change is visible on non-credited invoices.

---

## Story 3 — Personal Language Preference via Language Switcher

**As an** installer logged into the customer portal,  
**I want to** set my preferred language using the language switcher in the portal,  
**so that** the portal remembers my choice and shows me content in my language every time I log in — on any device — without having to set it in my profile.
The **languange options is not longer limited** by the country of the account.

### What is shown / What changes

- The language switcher (already present in the portal header) becomes the **only** place where users set their language preference.
- The **language field is removed from the profile / account settings form** — it no longer appears there.
- When a user selects a language via the switcher, the portal immediately switches to that language though it might need to refetch the data to display in the correct language. The preference is **saved to the user's personal record in the database**, so it is remembered on any device and after any login.
- The selected language is used to filter and personalise the following content:
  - **News articles** — only articles in the user's language are shown.
  - **Home page content** — the greeting, introduction text, and hero image shown are those prepared for the user's language.
  - **Documents** — only documents available in the user's language are listed.
- Invoices, rewards, and vouchers are not affected by language — they display the same regardless of the language setting and just updates the UI as it is currently doing.

### Acceptance Criteria

- [ ] The language field no longer appears in the profile / account settings form.
- [ ] Selecting a language from the switcher immediately changes the portal language.
- [ ] The preference is saved to the user's personal record in the database and applied automatically on the next login, on any device.
- [ ] News articles are filtered to the user's selected language.
- [ ] Home page content (greeting, intro, hero image) corresponds to the user's selected language.
- [ ] Documents are filtered to the user's selected language.
- [ ] If a user has never set a language, the portal defaults to their browser language or English.

---

## Story 4 — View Loyalty Points Transaction History

**As an** installer logged into the customer portal,  
**I want to** see a full history of my loyalty points transactions,  
**so that** I can track how points were earned, how they were spent, and understand my current balance.

### What is shown / What changes

- On the **Rewards page**, below the current points balance, a **"View transaction history"** link or button is added.
- Clicking it opens a **pop-up window** with a scrollable table listing all loyalty transactions on the account.
- Each row in the table shows:
  - **Type** — whether the transaction is an addition (points earned) or a deduction (points spent)
  - **Status** — the current status of the transaction
  - **Points** — the number of points added or deducted
  - **Date** — when the transaction took place
  - **Description** — a short explanation of what the transaction relates to if any
- The table covers all transaction types:
  - Points earned from credited invoices
  - Points deducted when rewards are claimed
  - Any points added or adjusted manually by the back-office team
- The user can scroll through the full history within the pop-up.

### Acceptance Criteria

- [ ] A "View transaction history" link or button appears on the Rewards page below the points balance.
- [ ] Clicking it opens a pop-up with the full list of transactions for the user's account.
- [ ] Each transaction row shows: type (addition / deduction), status, points, date, and description.
- [ ] All transaction types are included: invoice earnings, reward claims, and manual adjustments.
- [ ] The list is scrollable within the pop-up — no separate page navigation required.
- [ ] The pop-up can be closed to return to the Rewards page.
- [ ] If there are no transactions yet, a clear message is shown (e.g. "No transactions found").
