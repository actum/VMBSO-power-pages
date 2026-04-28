/**
 * Loyalty Transaction type definition
 * Represents a loyalty transaction from the actum_loyaltytransaction Dataverse table
 * 
 * IMPORTANT: Points are Account-scoped (via _actum_account_value), not Contact-scoped
 */

export interface LoyaltyTransaction {
  actum_loyaltytransactionid: string;      // Primary key (GUID)
  actum_name: string;                      // Auto-generated name (e.g., "Loyalty Transaction 2026-03-26T13:52:58.1179246Z")
  actum_loyaltypoints: number;             // Points amount (positive number)
  actum_transactiontype: number;           // 1 = Addition (credit), 2 = Deletion (debit)
  actum_description?: string | null;       // Optional description
  actum_expirationdate?: string | null;    // Expiration date (if used)
  _actum_account_value: string;            // Lookup to ACCOUNT (not Contact!)
  _actum_invoice_value?: string | null;    // Lookup to Invoice (nullable)
  statecode: number;                       // 0 = Active, 1 = Inactive
  statuscode: number;                      // Status reason
  createdon: string;                       // ISO timestamp
  modifiedon: string;                      // ISO timestamp
}

/**
 * Transaction types
 */
export enum TransactionType {
  Addition = 1,  // Credit points
  Deletion = 2,  // Debit points
}

/**
 * Loyalty Transaction with formatted values from OData annotations
 */
export interface LoyaltyTransactionOData extends LoyaltyTransaction {
  'actum_loyaltypoints@OData.Community.Display.V1.FormattedValue'?: string;
  'actum_expirationdate@OData.Community.Display.V1.FormattedValue'?: string;
}
