/**
 * Invoice line item — represents a product line that generated loyalty points
 */
export interface InvoiceItem {
  actum_invoiceitemid: string;
  actum_name: string;
  actum_loaltypointsgranted: number;
  'actum_loaltypointsgranted@OData.Community.Display.V1.FormattedValue'?: string;
}

export interface Invoice {
  // Primary fields
  actum_invoiceid: string;
  actum_invoicenumber?: string;
  actum_name?: string;
  statuscode: number;
  
  // Financial fields
  actum_totalamount?: number;
  actum_totalnetamount?: number;
  actum_totalvat?: number;
  
  // Dates
  actum_invoicedate?: string;
  actum_duedate?: string;
  createdon: string;
  
  // Additional info
  actum_distributorname?: string;
  actum_customer?: string;
  actum_rejectionreason?: string | null;
  actum_sharepointfileurl?: string;
  actum_loaltypointsgranted?: number;
  
  // Transaction currency lookup
  _transactioncurrencyid_value?: string;
  
  // OData formatted values (optional - from flow response)
  'actum_totalamount@OData.Community.Display.V1.FormattedValue'?: string;
  'actum_totalnetamount@OData.Community.Display.V1.FormattedValue'?: string;
  'actum_totalvat@OData.Community.Display.V1.FormattedValue'?: string;
  'statuscode@OData.Community.Display.V1.FormattedValue'?: string;
  'actum_invoicedate@OData.Community.Display.V1.FormattedValue'?: string;
  'actum_duedate@OData.Community.Display.V1.FormattedValue'?: string;
  'createdon@OData.Community.Display.V1.FormattedValue'?: string;
  'actum_loaltypointsgranted@OData.Community.Display.V1.FormattedValue'?: string;
  
  // Uploader info (from linked entity in flow)
  'uploader.contactid'?: string;
  'uploader.fullname'?: string;
  'uploader.emailaddress1'?: string;
  
  // Account info (from linked entity in flow)
  'account.accountid'?: string;
  'account.name'?: string;
}

/**
 * Status code mapping for invoices
 */
export const InvoiceStatusCode = {
  DRAFT: 1,
  CANCELED: 2,
  SUBMITTED: 182980001,
  EXTRACTED: 182980002,
  REVIEW: 182980003,
  REJECTED: 182980004,
  CREDITED: 182980005,
} as const;

/**
 * Map Dataverse status code to friendly string
 */
export function getInvoiceStatus(statuscode: number): "draft" | "submitted" | "extracted" | "review" | "rejected" | "credited" | "canceled" | "unknown" {
  switch (statuscode) {
    case InvoiceStatusCode.DRAFT:
      return 'draft';
    case InvoiceStatusCode.CANCELED:
      return 'canceled';
    case InvoiceStatusCode.SUBMITTED:
      return 'submitted';
    case InvoiceStatusCode.EXTRACTED:
      return 'extracted';
    case InvoiceStatusCode.CREDITED:
      return 'credited';
    case InvoiceStatusCode.REVIEW:
      return 'review';
    case InvoiceStatusCode.REJECTED:
      return 'rejected';
    default:
      return 'unknown';
  }
}