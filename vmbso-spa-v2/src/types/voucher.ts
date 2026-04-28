/**
 * Voucher type definition
 * Represents a voucher from the actum_voucher Dataverse table
 */

export interface Voucher {
  actum_voucherid: string;                      // Primary key (GUID)
  actum_name: string;                           // Name (e.g., "Reward Voucher 202603261301")
  actum_vouchercode: string;                    // Voucher code (e.g., "DEEF25161B")
  actum_expirationdate: string;                 // Expiration date (ISO timestamp)
  _actum_account_value: string;                 // Lookup to Account
  _actum_contactid_value?: string | null;       // Lookup to Contact (nullable)
  _actum_loyaltytransaction_value: string;      // Lookup to Loyalty Transaction (deduction)
  _actum_rewardclaimlineid_value: string;       // Lookup to Reward Claim Line
  _actum_redeemedby_value?: string | null;      // Lookup to Contact who redeemed (nullable)
  _actum_distributorid_value?: string | null;   // Lookup to Distributor (nullable)
  statecode: number;                            // 0 = Active, 1 = Inactive
  statuscode: number;                           // Status reason (e.g., 182980001 = Issued)
  createdon: string;                            // ISO timestamp
  modifiedon: string;                           // ISO timestamp
  
  // Expanded contact info
  'claimedBy.fullname'?: string;                // Contact who claimed
  'claimedBy.email'?: string;                   // Email of contact who claimed
  'redeemedBy.fullname'?: string;               // Contact who redeemed
  'redeemedBy.email'?: string;                  // Email of contact who redeemed
  'redeemedBy.account'?: string;                // Distributor account of contact who redeemed
}

/**
 * Voucher with formatted values from OData annotations
 */
export interface VoucherOData extends Voucher {
  'actum_expirationdate@OData.Community.Display.V1.FormattedValue'?: string;
  'createdon@OData.Community.Display.V1.FormattedValue'?: string;
  'modifiedon@OData.Community.Display.V1.FormattedValue'?: string;
}

/**
 * Status code mapping for vouchers
 */
export const VoucherStatusCode = {
  CANCELED: 2,                // Inactive - Voucher was canceled
  ISSUED: 182980001,          // Active - Voucher generated, ready to use
  REDEEMED: 182980002,        // Active - Voucher has been used
  EXPIRED: 182980003,         // Inactive - Voucher expired
} as const;

/**
 * Map Dataverse status code to friendly string
 */
export function getVoucherStatus(statuscode: number): "issued" | "redeemed" | "expired" | "canceled" | "unknown" {
  switch (statuscode) {
    case VoucherStatusCode.ISSUED:
      return 'issued';
    case VoucherStatusCode.REDEEMED:
      return 'redeemed';
    case VoucherStatusCode.EXPIRED:
      return 'expired';
    case VoucherStatusCode.CANCELED:
      return 'canceled';
    default:
      return 'unknown';
  }
}
