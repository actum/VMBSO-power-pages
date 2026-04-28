# VMBSO Portal — Voucher Redemption & History

> **Claude Code implementation instructions**
> Source tickets: VMPP-121, VMPP-122

---

## Project Context

This is the **VMBSO Customer Portal** — a React SPA hosted on **Power Pages** using **Entra External ID** for authentication. The codebase uses TypeScript, i18next for multilingual support, and Application Insights for tracing. All Dataverse operations go through the Power Pages Web API (`/_api/`).

The rewards claim flow is already implemented — installers can already spend points and receive vouchers. This task adds the **My Vouchers** page where installers can view their issued vouchers, validate/redeem them, and see their redemption history.

---

## Page: My Vouchers (VMPP-121, VMPP-122)

**Route:** `/vouchers` or `/my-vouchers` (follow existing routing convention)

### Access Control

- Authenticated installers only (same gating as existing portal pages).
- Voucher visibility is strictly scoped to the installer's Account — cross-account access must be prevented (enforce via FetchXML/OData filter on Account).
- Unauthenticated requests are blocked entirely.

### Voucher List View

Render a filterable table/grid of vouchers belonging to the installer's Account. Columns:

| Column | Source | Notes |
|---|---|---|
| Voucher Code | Voucher entity | Primary identifier |
| Reward / Purpose | Lookup to reward | Which reward was claimed |
| Status | Option set | Map to user-friendly labels: "Issued", "Redeemed", "Expired", etc. |
| Claimed By | Lookup to Contact | Which contact made the claim |
| Generated Date | Date field | When the voucher was created |
| Redeemed Date | Date field | Show only when available |
| Expiry Date | Date field | Show only when configured |

**Filtering:** Each column should support filtering. If the per-account dataset is small, client-side filtering is fine. For larger datasets, use server-side OData `$filter`. Follow the same grid/table pattern used by the existing "My Invoices" list (VMPP-65) for consistency.

### Voucher Validation & Redemption

- The installer selects a voucher in "Issued" status and triggers a **redeem** action.
- The redemption request goes to a backend endpoint (Power Automate / Custom API) that validates the voucher is still valid (not expired, not already redeemed, belongs to the installer's Account) and updates the voucher status to "Redeemed" with the current date as the redeemed date.
- Do NOT trust frontend-only validation — the backend is the source of truth. The FE should disable the redeem action on already-redeemed or expired vouchers for UX purposes, but the server must re-validate.
- On success, show a confirmation with the voucher code and updated status.
- On failure (expired, already redeemed, insufficient permissions), show a clear error message.

### Voucher Detail

The installer can click into a voucher row to see full details. Implement as a detail panel, modal, or sub-route — whichever pattern the portal already uses for list-to-detail navigation.

### UI Requirements

- User-friendly status labels (not raw option-set integers).
- Friendly validation and error messages for redemption failures.
- Loading states while fetching the voucher list and during redemption.
- Follow existing portal patterns for component structure and error boundaries.

### Done Criteria

- [ ] Installer sees only vouchers belonging to their Account.
- [ ] All required columns are displayed with correct data.
- [ ] Status values are mapped to human-readable labels.
- [ ] Each column supports filtering.
- [ ] Installer can redeem a valid voucher and sees confirmation.
- [ ] Invalid redemption attempts show clear error messages.
- [ ] Unauthorized / cross-account access is blocked.

---

## Implementation Guidelines

### Dataverse Web API

- Use `/_api/` for all queries.
- Entity/table permissions must be configured in Portal Management for the voucher entity.
- Use FetchXML for filtered queries scoped to the installer's Account.

### i18next

- All user-facing strings (column headers, status labels, validation messages, buttons) go through i18next.

### Application Insights Tracing

- `USAGE`: page view event for the vouchers page.
- `CALL`: voucher list fetch, redemption requests.
- `ERROR`: failed API calls, redemption rejections.

### Suggested Component Structure

```
src/
  pages/
    Vouchers/
      VouchersPage.tsx         # Main page component
      VoucherList.tsx          # Filterable table/grid
      VoucherDetail.tsx        # Detail panel/modal
      RedeemAction.tsx         # Redeem button + confirmation/error handling
  services/
    voucherService.ts          # API calls: getVouchers, redeemVoucher
```

### Testing Scenarios

- Voucher list displays correctly with all columns populated.
- Filtering by status, date, reward type works.
- Redeeming a valid "Issued" voucher succeeds and updates the list.
- Redeeming an expired or already-redeemed voucher shows an error.
- Cross-account access returns no data (not an error page — just empty results).
