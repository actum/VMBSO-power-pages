# Rewards Feature - Technical Specification

**Feature**: Installer Loyalty Portal — Rewards Claim & Vouchers  
**Status**: Planning / Ready for Implementation  
**Access Control**: Same as Invoices page (`actum_uploadinvoicesallowed`)  
**Date**: April 2026

---

## Overview

Build a new `/rewards` page for authenticated installers to view their loyalty points balance, browse available rewards, and claim rewards that generate vouchers. Points are **account-scoped** and validated server-side via Power Automate.

---

## Access Control

### Permission Model
- **Field**: `actum_uploadinvoicesallowed` (existing field on Role and Country tables)
- **Logic**: EXACT same as Invoices page - no new fields needed
- **Implementation**:
  ```typescript
  export const canAccessRewards = (user: Contact | null): boolean => {
    // Reuse existing function
    return canAccessInvoices(user);
  };
  ```

### Requirements
- User must be **approved** (`actum_approvalstatus === 182980001`)
- User must have an **Account linked** (`_parentcustomerid_value`)
- Account's **Role** must have `actum_uploadinvoicesallowed === true`
- Account's **Country** must have `actum_uploadinvoicesallowed === true`

---

## Dataverse Schema

### 1. actum_reward (Reward Catalog)

**Table Name**: `actum_reward`  
**Purpose**: Store available rewards that users can claim

```typescript
interface Reward {
  actum_rewardid: string;              // Primary key (GUID)
  actum_name: string;                  // Reward name (e.g., "Nice Reward")
  actum_description: string | null;    // Description text (nullable)
  actum_pointamount: number;           // Point cost (e.g., 100, 500, 1000)
  statecode: number;                   // 0 = Active, 1 = Inactive
  statuscode: number;                  // 1 = Active
  createdon: string;                   // ISO timestamp
  modifiedon: string;                  // ISO timestamp
}
```

**Query Pattern** (fetch active rewards):
```
GET /_api/actum_rewards?$filter=statecode eq 0&$select=actum_rewardid,actum_name,actum_description,actum_pointamount&$orderby=actum_pointamount asc
```

**Notes**:
- ⚠️ Field name is `actum_pointamount` (NOT `actum_pointcost`)
- No image fields — rewards display without images
- Global scope — all users see same catalog

---

### 2. actum_loyaltytransaction (Points Ledger)

**Table Name**: `actum_loyaltytransaction`  
**Purpose**: Track points credits and debits for each account

```typescript
interface LoyaltyTransaction {
  actum_loyaltytransactionid: string;      // Primary key (GUID)
  actum_name: string;                      // Auto-generated "Loyalty Transaction 2026-03-26T13:52:58.1179246Z"
  actum_loyaltypoints: number;             // Points amount (positive number)
  actum_transactiontype: number;           // 1 = Addition (credit), 2 = Deletion (debit)
  actum_description: string | null;        // Optional description
  actum_expirationdate: string | null;     // Expiration date (if used)
  _actum_account_value: string;            // ⚠️ Lookup to ACCOUNT (not Contact!)
  _actum_invoice_value: string | null;     // Lookup to Invoice (nullable)
  statecode: number;                       // 0 = Active, 1 = Inactive
  statuscode: number;                      // Status reason (e.g., 182980003)
  createdon: string;                       // ISO timestamp
  modifiedon: string;                      // ISO timestamp
}
```

**⚠️ CRITICAL**: Points are **Account-scoped** via `_actum_account_value`  
All contacts in the same account share the same points balance.

**Balance Calculation**:
```typescript
const credits = SUM(
  actum_loyaltypoints 
  WHERE _actum_account_value = accountId 
    AND actum_transactiontype = 1 
    AND statecode = 0
);

const debits = SUM(
  actum_loyaltypoints 
  WHERE _actum_account_value = accountId 
    AND actum_transactiontype = 2 
    AND statecode = 0
);

const balance = credits - debits;
```

**Query Pattern** (fetch account balance):
```
GET /_api/actum_loyaltytransactions
  ?$filter=_actum_account_value eq '{accountId}' and statecode eq 0
  &$select=actum_loyaltypoints,actum_transactiontype
```

---

### 3. actum_rewardclaim (Claim History)

**Table Name**: `actum_rewardclaim`  
**Purpose**: Track reward claim records for audit trail

```typescript
interface RewardClaim {
  actum_rewardclaimid: string;           // Primary key (GUID)
  actum_name: string;                    // Name (e.g., "Reward Claim")
  _actum_account_value: string;          // Lookup to Account
  _actum_contact_value: string;          // Lookup to Contact (who claimed)
  _actum_reward_value: string | null;    // Lookup to Reward (nullable)
  statecode: number;                     // 0 = Active, 1 = Inactive
  statuscode: number;                    // Status reason
  createdon: string;                     // ISO timestamp
  modifiedon: string;                    // ISO timestamp
}
```

**Notes**:
- Created by Power Automate flow during claim process
- Used for audit trail and claim history
- Frontend does NOT need to create this directly

---

### 4. actum_voucher (Voucher Codes)

**Table Name**: `actum_voucher`  
**Purpose**: Store issued voucher codes

```typescript
interface Voucher {
  actum_voucherid: string;                      // Primary key (GUID)
  actum_name: string;                           // Name (e.g., "Reward Voucher 202603261301")
  actum_vouchercode: string;                    // Voucher code (e.g., "DEEF25161B")
  actum_expirationdate: string;                 // Expiration date (ISO timestamp)
  _actum_account_value: string;                 // Lookup to Account
  _actum_contactid_value: string | null;        // Lookup to Contact (nullable)
  _actum_loyaltytransaction_value: string;      // Lookup to Loyalty Transaction (deduction)
  _actum_rewardclaimlineid_value: string;       // Lookup to Reward Claim Line
  _actum_redeemedby_value: string | null;       // Lookup to Contact who redeemed (nullable)
  _actum_distributorid_value: string | null;    // Lookup to Distributor (nullable)
  statecode: number;                            // 0 = Active, 1 = Inactive
  statuscode: number;                           // 182980001 = Issued
  createdon: string;                            // ISO timestamp
  modifiedon: string;                           // ISO timestamp
}
```

**Notes**:
- Created by Power Automate flow during claim process
- `actum_vouchercode` is the code displayed to the user
- `actum_expirationdate` is 6 months from issue date (based on example)
- Frontend reads vouchers for display (optional feature)

---

## Power Automate Flow

### Flow Endpoint
```
POST /_api/cloudflow/v1.0/trigger/245c5b01-f216-f111-8341-000d3a688605
Content-Type: application/json
```

### Input Schema
```json
{
  "accountId": "fd71345e-dc09-f111-8406-000d3a66f792",
  "contactId": "00834f65-dc09-f111-8406-000d3a66f974",
  "pointAmount": 500,
  "rewards": [
    { "rewardId": "8906a9cd-d321-f111-8341-000d3a66f974", "quantity": 2 },
    { "rewardId": "964dbfe8-d321-f111-8341-000d3a66f974", "quantity": 5 }
  ]
}
```

**Field Descriptions**:
- `accountId` — User's Account GUID (from `user._parentcustomerid_value`)
- `contactId` — User's Contact GUID (from `user.contactid`)
- `pointAmount` — Total points to deduct (calculated in frontend)
- `rewards` — Array of reward claims with quantity

### Expected Output Schema
```json
{
  "status": "200",
  "message": "Success",
  "vouchers": [
    {
      "voucherCode": "DEEF25161B",
      "rewardName": "Nice Reward",
      "quantity": 2,
      "expirationDate": "2026-09-26T00:00:00Z"
    }
  ],
  "pointsDeducted": 500,
  "newBalance": 1500
}
```

**Error Response**:
```json
{
  "status": "400",
  "message": "Insufficient points. You need 500 points but only have 200 available.",
  "requiredPoints": 500,
  "availablePoints": 200
}
```

### Flow Logic (Server-Side)

1. **Validate Input**
   - Check accountId, contactId, rewards array not empty
   - Validate all reward IDs exist in actum_reward table

2. **Calculate Required Points**
   - For each reward: Fetch `actum_pointamount` from actum_reward
   - Total = SUM(reward.actum_pointamount × quantity)
   - Verify `pointAmount` parameter matches calculated total

3. **Query Account Balance**
   ```
   Credits = SUM(actum_loyaltypoints WHERE _actum_account_value = accountId 
                 AND actum_transactiontype = 1 AND statecode = 0)
   Debits = SUM(actum_loyaltypoints WHERE _actum_account_value = accountId 
                AND actum_transactiontype = 2 AND statecode = 0)
   Balance = Credits - Debits
   ```

4. **Validate Sufficient Balance**
   - If Balance < pointAmount → Return 400 error with insufficient points message
   - If Balance >= pointAmount → Continue

5. **Create Deduction Transaction**
   - Create `actum_loyaltytransaction` record:
     - `actum_transactiontype = 2` (deletion/debit)
     - `actum_loyaltypoints = pointAmount`
     - `_actum_account_value = accountId`
     - `actum_name` = Auto-generated timestamp name
     - `statecode = 0` (active)

6. **Create Claim Records**
   - Create `actum_rewardclaim` record
   - Create `actum_rewardclaimline` records (one per reward in array)

7. **Generate Vouchers**
   - For each reward × quantity: Create `actum_voucher` record
   - Generate unique `actum_vouchercode` (e.g., "DEEF25161B")
   - Set `actum_expirationdate` = 6 months from now
   - Link to deduction transaction via `_actum_loyaltytransaction_value`

8. **Return Response**
   - Return success with voucher codes array
   - Include new balance for UI update

---

## Portal Table Permissions

Configure in **Portal Management App**:

### actum_reward
- **Permission**: Read
- **Scope**: Global
- **Filter**: `statecode eq 0` (active only)
- **Web Role**: All roles with `actum_uploadinvoicesallowed = true`

### actum_loyaltytransaction
- **Permission**: Read
- **Scope**: Account
- **Filter**: `_actum_account_value eq @Contact._parentcustomerid_value`
- **Web Role**: All roles with `actum_uploadinvoicesallowed = true`

### actum_rewardclaim
- **Permission**: Read
- **Scope**: Account
- **Filter**: `_actum_account_value eq @Contact._parentcustomerid_value`
- **Web Role**: All roles with `actum_uploadinvoicesallowed = true`

### actum_voucher
- **Permission**: Read
- **Scope**: Account
- **Filter**: `_actum_account_value eq @Contact._parentcustomerid_value`
- **Web Role**: All roles with `actum_uploadinvoicesallowed = true`

---

## Frontend Implementation

### File Structure

**New Files**:
```
vmbso-spa-v2/src/
├── pages/
│   └── Rewards.tsx                    # Main rewards page component
├── hooks/
│   └── useRewards.ts                  # Data fetching hook
├── types/
│   ├── reward.ts                      # Reward interface
│   ├── loyaltyTransaction.ts          # LoyaltyTransaction interface
│   ├── rewardClaim.ts                 # RewardClaim interface
│   └── voucher.ts                     # Voucher interface
└── i18n/
    ├── engb.json                      # Add "rewardsPage" section
    ├── frfr.json                      # Add "rewardsPage" section
    └── benl.json                      # Add "rewardsPage" section
```

**Modified Files**:
```
vmbso-spa-v2/src/
├── App.tsx                            # Add /rewards route
├── components/Layout.tsx              # Add navigation menu item
├── utils/accessControl.ts             # Add canAccessRewards (or reuse canAccessInvoices)
├── services/dataverseService.ts       # Add rewards service methods
└── config/powerPages.config.ts        # Add flow endpoint URL
```

### TypeScript Interfaces

**src/types/reward.ts**:
```typescript
export interface Reward {
  actum_rewardid: string;
  actum_name: string;
  actum_description?: string | null;
  actum_pointamount: number;
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
}
```

**src/types/loyaltyTransaction.ts**:
```typescript
export interface LoyaltyTransaction {
  actum_loyaltytransactionid: string;
  actum_name: string;
  actum_loyaltypoints: number;
  actum_transactiontype: number; // 1 = credit, 2 = debit
  actum_description?: string | null;
  actum_expirationdate?: string | null;
  _actum_account_value: string;
  _actum_invoice_value?: string | null;
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
}
```

**src/types/voucher.ts**:
```typescript
export interface Voucher {
  actum_voucherid: string;
  actum_name: string;
  actum_vouchercode: string;
  actum_expirationdate: string;
  _actum_account_value: string;
  _actum_loyaltytransaction_value: string;
  statecode: number;
  statuscode: number;
  createdon: string;
}
```

### Service Methods (dataverseService.ts)

```typescript
export const dataverseService = {
  // ... existing services
  
  rewards: {
    /**
     * Fetch active rewards catalog
     */
    async getCatalog(): Promise<Reward[]> {
      const query = buildODataQuery({
        select: ['actum_rewardid', 'actum_name', 'actum_description', 'actum_pointamount'],
        filter: 'statecode eq 0',
        orderby: 'actum_pointamount asc'
      });
      
      const response = await apiClient.odata<{ value: Reward[] }>(
        `/actum_rewards${query}`
      );
      return response.value ?? [];
    },

    /**
     * Fetch loyalty points balance for account
     */
    async getBalance(accountId: string): Promise<number> {
      const query = buildODataQuery({
        select: ['actum_loyaltypoints', 'actum_transactiontype'],
        filter: `_actum_account_value eq ${accountId} and statecode eq 0`
      });
      
      const response = await apiClient.odata<{ value: LoyaltyTransaction[] }>(
        `/actum_loyaltytransactions${query}`
      );
      
      const transactions = response.value ?? [];
      const credits = transactions
        .filter(t => t.actum_transactiontype === 1)
        .reduce((sum, t) => sum + t.actum_loyaltypoints, 0);
      
      const debits = transactions
        .filter(t => t.actum_transactiontype === 2)
        .reduce((sum, t) => sum + t.actum_loyaltypoints, 0);
      
      return credits - debits;
    },

    /**
     * Submit reward claim via Power Automate flow
     */
    async claimRewards(data: {
      accountId: string;
      contactId: string;
      pointAmount: number;
      rewards: Array<{ rewardId: string; quantity: number }>;
    }): Promise<{
      status: string;
      message: string;
      vouchers?: Array<{
        voucherCode: string;
        rewardName: string;
        quantity: number;
        expirationDate: string;
      }>;
      pointsDeducted?: number;
      newBalance?: number;
      requiredPoints?: number;
      availablePoints?: number;
    }> {
      return apiClient.flow(config.flows.claimRewards, data);
    }
  }
};
```

### Hook Pattern (useRewards.ts)

```typescript
export const useRewards = () => {
  const { currentUser } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser?._parentcustomerid_value) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [catalogData, balanceData] = await Promise.all([
        dataverseService.rewards.getCatalog(),
        dataverseService.rewards.getBalance(currentUser._parentcustomerid_value)
      ]);
      
      setRewards(catalogData);
      setBalance(balanceData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rewards';
      setError(message);
      console.error('Error fetching rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?._parentcustomerid_value]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { rewards, balance, loading, error, refetch: fetchData };
};
```

### Page Structure (Rewards.tsx)

**Layout**:
1. **Points Balance Card** — Large display showing current balance
2. **Reward Catalog Grid** — Cards with reward name, description, point cost, claim button
3. **Claim Modal** — Quantity selector, cost preview, balance preview, submit
4. **Success Modal** — Display voucher code(s) after successful claim
5. **Error Handling** — Validation messages, insufficient points errors

**States**:
- `rewards` — Catalog from API
- `balance` — Current points balance
- `selectedReward` — Reward user wants to claim
- `claimQuantity` — Number to claim
- `isClaimModalOpen` — Modal visibility
- `isSubmitting` — Loading state during claim
- `claimError` — Error message
- `claimSuccess` — Success data with vouchers

### Routing & Navigation

**App.tsx**:
```typescript
<Route
  path="/rewards"
  element={
    <ProtectedRoute>
      <Rewards />
    </ProtectedRoute>
  }
/>
```

**Layout.tsx**:
```typescript
const navigationItems = [
  { label: t('header:navigation.home'), path: '/' },
  { label: t('header:navigation.documents'), path: '/documents' },
  { label: t('header:navigation.news'), path: '/news' },
  ...(canAccessInvoices(currentUser) 
    ? [{ label: t('header:navigation.invoices'), path: '/invoices' }] 
    : []),
  ...(canAccessInvoices(currentUser) // Same permission as invoices
    ? [{ label: t('header:navigation.rewards'), path: '/rewards' }] 
    : []),
];
```

**powerPages.config.ts**:
```typescript
flows: {
  updateProfile: '...',
  fetchDocuments: '...',
  claimRewards: '/_api/cloudflow/v1.0/trigger/245c5b01-f216-f111-8341-000d3a688605', // NEW
}
```

### Translation Keys

Add to `engb.json`, `frfr.json`, `benl.json`:

```json
{
  "rewardsPage": {
    "pageTitle": "Loyalty Rewards",
    "title": "Claim Your Rewards",
    "subtitle": "Use your loyalty points to unlock exclusive benefits",
    
    "balance": {
      "title": "Available Points",
      "subtitle": "Your current balance",
      "points": "{{points}} points",
      "loading": "Loading balance..."
    },
    
    "catalog": {
      "title": "Reward Catalog",
      "subtitle": "Browse available rewards",
      "noRewards": "No rewards available at this time",
      "loading": "Loading rewards...",
      "pointsCost": "{{points}} points",
      "claimButton": "Claim Reward"
    },
    
    "claimModal": {
      "title": "Claim Reward",
      "rewardName": "Reward: {{name}}",
      "quantity": "Quantity",
      "costPreview": "Total Cost: {{points}} points",
      "balancePreview": "Remaining Balance: {{points}} points",
      "submitButton": "Confirm Claim",
      "cancelButton": "Cancel"
    },
    
    "success": {
      "title": "Reward Claimed Successfully!",
      "message": "Your voucher has been issued",
      "voucherCode": "Voucher Code: {{code}}",
      "expirationDate": "Expires: {{date}}",
      "multipleVouchers": "{{count}} vouchers issued",
      "newBalance": "New Balance: {{points}} points",
      "closeButton": "Close"
    },
    
    "errors": {
      "insufficientPoints": "Insufficient points. You need {{required}} points but only have {{available}} available.",
      "claimFailed": "Failed to claim reward. Please try again.",
      "loadFailed": "Failed to load rewards. Please refresh the page.",
      "invalidQuantity": "Please enter a valid quantity (1 or more)",
      "notAvailable": "This reward is currently unavailable",
      "serverError": "Server error. Please contact support if this persists."
    },
    
    "validation": {
      "minQuantity": "Minimum quantity is 1",
      "maxQuantity": "Maximum quantity is {{max}}"
    }
  },
  
  "header": {
    "navigation": {
      "rewards": "Rewards"
    }
  }
}
```

---

## UI/UX Requirements

### Points Balance Display
- **Large, prominent number** (e.g., "1,500 points")
- Subtitle: "Your current balance"
- Loading state: Skeleton or spinner
- Error state: "Failed to load balance" with retry button

### Reward Catalog
- **Grid layout** (responsive: 1 column mobile, 2-3 columns desktop)
- Each reward card shows:
  - Reward name
  - Description (if available)
  - Point cost (e.g., "500 points")
  - "Claim Reward" button
- Empty state: "No rewards available at this time"
- Loading state: Skeleton cards

### Claim Flow
1. User clicks "Claim Reward" → Opens modal
2. Modal shows:
   - Reward name
   - Quantity selector (default: 1)
   - Cost preview: "Total Cost: 500 points"
   - Balance preview: "Remaining Balance: 1,000 points" (live update)
   - "Confirm" and "Cancel" buttons
3. Validation:
   - Quantity must be >= 1
   - Total cost must be <= current balance
   - Show error if insufficient points BEFORE submit (disable button)
4. On submit:
   - Show loading modal with spinner
   - Call Power Automate flow
   - Handle success or error

### Success State
- Show success modal with:
  - "Reward Claimed Successfully!" message
  - Voucher code(s) displayed prominently
  - Expiration date
  - New balance
  - "Close" button
- If multiple vouchers: List all codes
- Consider copy-to-clipboard button for voucher codes

### Error Handling
- **Insufficient Points**: Clear message with required vs. available
- **Server Error**: Generic error with "try again" CTA
- **Validation Errors**: Inline validation on quantity field
- All errors dismissible with X button

### Accessibility
- Proper ARIA labels for screen readers
- Keyboard navigation support
- Focus management in modals
- Color contrast compliance

---

## Analytics / Tracking

Use Google Analytics (current implementation):

```typescript
ReactGA.event({
  category: 'Rewards',
  action: 'Page_Viewed',
});

ReactGA.event({
  category: 'Rewards',
  action: 'Reward_Selected',
  label: rewardName,
  value: pointCost
});

ReactGA.event({
  category: 'Rewards',
  action: 'Claim_Submitted',
  label: rewardName,
  value: totalPoints
});

ReactGA.event({
  category: 'Rewards',
  action: 'Claim_Success',
  label: rewardName,
  value: pointsDeducted
});

ReactGA.event({
  category: 'Rewards',
  action: 'Claim_Failed',
  label: errorType, // "insufficient_points" | "server_error"
});
```

---

## Testing Checklist

### Data Setup
- [ ] Create 3-5 test rewards in actum_reward table
- [ ] Create loyalty transactions for test account (balance ~1500 points)
- [ ] Set up test Contact with:
  - Approved status (182980001)
  - Linked to test Account
  - Role/Country with actum_uploadinvoicesallowed = true

### Portal Permissions
- [ ] actum_reward — Read (global, statecode eq 0)
- [ ] actum_loyaltytransaction — Read (account scope)
- [ ] actum_rewardclaim — Read (account scope)
- [ ] actum_voucher — Read (account scope)

### Access Control Tests
- [ ] Approved user with permission can see Rewards nav item
- [ ] Approved user with permission can access /rewards page
- [ ] User without permission does NOT see nav item
- [ ] User without permission redirected if accessing /rewards directly
- [ ] Unapproved user cannot access page

### Balance Display Tests
- [ ] Balance loads correctly for user's account
- [ ] Balance calculation matches manual calculation (credits - debits)
- [ ] Loading state shows while fetching
- [ ] Error state shows if API fails

### Catalog Tests
- [ ] Active rewards load and display
- [ ] Inactive rewards (statecode=1) do NOT appear
- [ ] Rewards sorted by point cost (ascending)
- [ ] Empty state shows if no rewards available

### Claim Flow Tests
- [ ] Modal opens when clicking "Claim Reward"
- [ ] Quantity selector works (increment/decrement)
- [ ] Cost preview updates when quantity changes
- [ ] Balance preview shows correct remaining balance
- [ ] "Confirm" button disabled if insufficient points
- [ ] Validation error shows for quantity < 1

### Flow Integration Tests
- [ ] Successful claim returns voucher code
- [ ] Voucher code displayed in success modal
- [ ] Balance updates after successful claim
- [ ] Insufficient points error handled correctly
- [ ] Server error handled gracefully
- [ ] Multiple rewards in one claim works (if supported)

### Power Automate Flow Tests
- [ ] Flow triggered correctly with valid JSON
- [ ] Balance validation works (rejects if insufficient)
- [ ] Deduction transaction created correctly (type=2)
- [ ] Voucher records created with unique codes
- [ ] Flow returns correct success response
- [ ] Flow returns correct error response for insufficient points

---

## Known Limitations / Future Enhancements

### Phase 1 (Current Scope)
- ✅ View points balance
- ✅ Browse reward catalog
- ✅ Claim rewards and receive voucher codes
- ✅ Account-scoped points
- ✅ Same access control as Invoices

### Out of Scope (Phase 1)
- ❌ Points transaction history UI
- ❌ Voucher redemption flow (external process)
- ❌ Reward images
- ❌ Reward categories/filtering
- ❌ Stock management
- ❌ Claim limits (daily/monthly)
- ❌ Email notifications
- ❌ Admin interface for managing rewards

### Potential Future Enhancements
- View points history (earned from invoices, spent on rewards)
- View claimed vouchers and their status
- Filter rewards by category
- Search rewards
- Wishlist / favorite rewards
- Email notification when voucher is issued
- Push notification for expiring vouchers
- Tier/badge system based on points earned

---

## Deployment Steps

1. **Dataverse Configuration**
   - Verify all 4 tables exist (reward, loyaltytransaction, rewardclaim, voucher)
   - Create test data (rewards + transactions)

2. **Power Automate Flow**
   - Verify flow exists and is published
   - Test flow with Postman using sample JSON
   - Confirm flow URL: `/_api/cloudflow/v1.0/trigger/245c5b01-f216-f111-8341-000d3a688605`

3. **Portal Permissions**
   - Configure table permissions in Portal Management app
   - Assign to web role with actum_uploadinvoicesallowed = true
   - Test permissions with test Contact

4. **Frontend Development**
   - Create TypeScript interfaces
   - Add service methods to dataverseService
   - Create useRewards hook
   - Build Rewards page component
   - Add translations (all 3 languages)
   - Update App.tsx routing
   - Update Layout.tsx navigation
   - Add flow endpoint to config

5. **Testing**
   - Unit tests for balance calculation logic
   - Integration tests for API calls
   - E2E tests for claim flow
   - Manual testing with test account
   - Cross-browser testing
   - Mobile responsive testing

6. **Deploy to Dev Environment**
   - Run `npm run build`
   - Deploy to dev portal
   - Smoke test all functionality
   - Verify analytics events firing

7. **UAT (User Acceptance Testing)**
   - Stakeholder review
   - Test with real user accounts (in dev)
   - Gather feedback

8. **Production Deployment**
   - Deploy frontend to production
   - Monitor for errors
   - Verify analytics in GA

---

## Support & Troubleshooting

### Common Issues

**Issue**: Balance shows 0 but user has points  
**Fix**: Check `_actum_account_value` in transactions matches user's Account GUID

**Issue**: "Insufficient points" error but balance looks correct  
**Fix**: Check for inactive transactions (statecode=1) being excluded from calculation

**Issue**: Flow returns 500 error  
**Fix**: Check flow run history in Power Automate, verify all field names correct

**Issue**: Voucher not created  
**Fix**: Check flow logic, verify actum_voucher table permissions

**Issue**: User can't see Rewards nav item  
**Fix**: Verify user's role/country has actum_uploadinvoicesallowed = true

---

## Contact

For questions or issues with this feature:
- Technical Lead: [Name]
- Product Owner: [Name]
- Dataverse Admin: [Name]

---

**Last Updated**: April 22, 2026  
**Version**: 1.0
