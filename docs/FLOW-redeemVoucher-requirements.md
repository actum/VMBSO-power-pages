# redeemVoucher Flow Requirements

## Flow URL
Configured in `powerPages.config.ts`:
```
redeemVoucher: '/_api/cloudflow/v1.0/trigger/2d0ace0c-ca26-f111-8341-000d3a66f792'
```

## Input Parameters
The flow receives the following parameters from the frontend:

```json
{
  "voucherId": "12345678-90ab-cdef-1234-567890abcdef",
  "accountId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "contactId": "f1e2d3c4-b5a6-7890-1234-567890abcdef"
}
```

- **voucherId**: The voucher GUID (from validateVoucher response)
- **accountId**: The distributor's account GUID
- **contactId**: The distributor's contact GUID

## Flow Logic
The flow should:

1. **Retrieve voucher** by `actum_voucherid` = voucherId
2. **Validate state**:
   - Verify voucher exists
   - Verify status is still `182980001` (Issued)
   - Verify not expired
   - Double-check authorization
3. **Update voucher record**:
   - Set `statuscode` = `182980002` (Redeemed)
   - Set `actum_redeemedby` = contactId (distributor contact)
   - Set `actum_distributorid` = accountId (distributor account)
   - Set redemption timestamp (if you have a field for this)
4. **Return success/failure**

## Required Response Format

### Success Response
```json
{
  "status": "Success",
  "message": "Voucher redeemed successfully"
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Voucher has already been redeemed"
}
```

OR

```json
{
  "status": "error",
  "message": "Voucher not found or invalid"
}
```

## Frontend Mapping

The frontend expects this response structure:

```typescript
{
  success: boolean;      // true if status === "Success"
  message?: string;      // from response.message
}
```

## Fields to Update

When redeeming a voucher, update these Dataverse fields:

| Field | Value | Description |
|-------|-------|-------------|
| `statuscode` | `182980002` | Status Reason = Redeemed |
| `actum_redeemedby` | {contactId} | Lookup to Contact (distributor) |
| `actum_distributorid` | {accountId} | Lookup to Account (distributor) |
| `modifiedon` | {now} | Auto-updated by Dataverse |

## Common Error Scenarios

| Scenario | Response Message |
|----------|------------------|
| Voucher not found | `"Voucher not found or invalid"` |
| Already redeemed | `"Voucher has already been redeemed"` |
| Expired | `"This voucher has expired"` |
| Dataverse update failed | `"Failed to redeem voucher"` |

## Testing

### Dev Mode
When `config.devMode = true`, the frontend simulates redemption:
- Waits 800ms
- Returns success response
- No actual Dataverse update

### Production Testing
1. Validate a voucher first (to get voucherId)
2. Confirm redemption
3. Check Dataverse record:
   - `statuscode` should be `182980002`
   - `actum_redeemedby` should be set to distributor contact
   - `actum_distributorid` should be set to distributor account
4. Try to validate the same voucher again - should return "already redeemed" error
5. Verify it appears in the distributor's voucher list

## Security Considerations

- Always verify the distributor has permission to redeem vouchers
- Validate that the voucher hasn't already been redeemed (race condition check)
- Log redemption attempts for auditing
- Consider adding a redemption timestamp field for tracking

## Integration with getVouchers Flow

After redemption, the voucher should appear in the distributor's list because the `getVouchers` flow uses an OR filter:

```xml
<filter type="or">
  <condition attribute="actum_account" operator="eq" value="@{accountId}" />
  <condition attribute="actum_distributorid" operator="eq" value="@{accountId}" />
</filter>
```

This means:
- **Installers** see vouchers where `actum_account` = their account ID
- **Distributors** see vouchers where `actum_distributorid` = their account ID (redeemed vouchers)

## Troubleshooting

### Loading spinner doesn't appear
**Fixed**: LoadingModal now displays during redemption when `redeeming` state is true.

### "Validation failed" error
**Cause**: voucherId is empty - check validateVoucher flow returns `voucherId` field.

### Voucher doesn't appear in list after redemption
**Check**:
1. `actum_distributorid` was set to distributor's account ID
2. `getVouchers` flow FetchXML has the OR filter correctly configured
3. Aliases are unique (claimedByEmail, redeemedByEmail, accountName)
