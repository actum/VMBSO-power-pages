# validateVoucher Flow Requirements

## Flow URL
Configured in `powerPages.config.ts`:
```
validateVoucher: '/_api/cloudflow/v1.0/trigger/cfac8c6d-e226-f111-8341-000d3a688605'
```

## Input Parameters
The flow receives the following parameters from the frontend:

```json
{
  "voucherCode": "ABC123DEF456",
  "accountId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "contactId": "f1e2d3c4-b5a6-7890-1234-567890abcdef"
}
```

- **voucherCode**: The voucher code entered by the distributor
- **accountId**: The distributor's account GUID
- **contactId**: The distributor's contact GUID

## Flow Logic
The flow should:

1. **Search for voucher** by `actum_vouchercode` = voucherCode
2. **Validate ownership/access**: 
   - Check if voucher exists
   - Verify it's associated with an installer account (has `actum_account`)
   - Verify distributor is authorized to redeem it
3. **Check voucher status**:
   - Status must be `182980001` (Issued) - not already redeemed
   - Not expired (`actum_expirationdate` > now)
   - State must be Active (`statecode` = 0)

## Required Response Format

### Success Response (Valid Voucher)
```json
{
  "status": "Success",
  "voucherId": "12345678-90ab-cdef-1234-567890abcdef",
  "voucher": {
    "actum_voucherid": "12345678-90ab-cdef-1234-567890abcdef",
    "actum_vouchercode": "ABC123DEF456",
    "actum_name": "Reward Voucher 202604271430",
    "statuscode": 182980001,
    "actum_expirationdate": "2026-05-27T12:00:00Z"
  }
}
```

**CRITICAL**: The response MUST include `voucherId` (or `voucherid`) field. The frontend handles both camelCase and lowercase variants. This is used to identify which voucher to redeem in the subsequent `redeemVoucher` call.

**Note**: Power Automate often returns field names in lowercase (e.g., `voucherid` instead of `voucherId`). The frontend code handles both cases automatically.

### Error Response (Invalid Voucher)
```json
{
  "status": "error",
  "message": "Voucher code not found"
}
```

OR

```json
{
  "status": "error",
  "message": "This voucher has already been redeemed"
}
```

OR

```json
{
  "status": "error",
  "message": "This voucher has expired"
}
```

## Common Error Messages

Map specific validation failures to user-friendly messages:

| Condition | Message |
|-----------|---------|
| Voucher not found | `"Voucher code not found"` |
| Already redeemed (statuscode = 182980002) | `"This voucher has already been redeemed"` |
| Expired (statuscode = 182980003 or expirationdate < now) | `"This voucher has expired"` |
| Canceled (statuscode = 2) | `"This voucher has been canceled"` |
| Wrong account/unauthorized | `"You are not authorized to redeem this voucher"` |

## Frontend Mapping

The frontend expects this response structure:

```typescript
{
  valid: boolean;         // true if status === "Success"
  voucherId?: string;     // from response.voucherId
  message?: string;       // from response.message (for errors)
  voucher?: any;          // optional voucher details
}
```

## Testing

### Dev Mode
When `config.devMode = true`, the frontend uses mock validation:
- Checks against mock vouchers from `getByAccount()`
- Validates status codes
- Returns mock voucherId

### Production Testing
1. Create a test voucher in Dataverse (status = Issued)
2. Try to validate with the voucher code
3. Verify the response includes `voucherId`
4. Try to validate an already-redeemed voucher
5. Verify appropriate error message is returned

## Troubleshooting

### "Validation failed" error on confirm redemption
**Symptom**: When clicking "Confirm Redemption", you see an error toast but no network activity.

**Cause**: The `voucherId` (or `voucherid`) field is missing or empty in the validateVoucher response.

**Solution**: 
1. Check browser console for debug output: `Validation successful: { voucherId: undefined, ... }`
2. Verify the Power Automate flow returns `voucherId` (or `voucherid`) in the response
3. The voucherId should be the `actum_voucherid` GUID from the voucher record
4. **Note**: Field name casing doesn't matter - the frontend handles both `voucherId` and `voucherid`

### Flow returns 500 error
Check that:
- FetchXML query syntax is correct
- All required fields exist in Dataverse
- Voucher code field is indexed for efficient searching
