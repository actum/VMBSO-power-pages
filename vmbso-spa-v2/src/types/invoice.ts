export interface Invoice {
  // Primary fields
  actum_invoiceid: string;
  actum_invoicenumber: string;
  actum_name: string;
  statuscode: number;
  
  // Financial fields
  actum_totalamount: number;
  actum_totalnetamount: number;
  actum_totalvat: number;
  
  // Dates
  actum_invoicedate: string;
  actum_duedate?: string;
  createdon: string;
  
  // Additional info
  actum_distributorname?: string;
  actum_customer?: string;
  actum_rejectionreason?: string | null;
  actum_sharepointfileurl?: string;
  
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
  
  // Uploader info (from linked entity in flow)
  'uploader.contactid'?: string;
  'uploader.fullname'?: string;
  'uploader.emailaddress1'?: string;
}

/**
 * Status code mapping for invoices
 */
export const InvoiceStatusCode = {
  SUBMITTED: 182980000,
  APPROVED: 182980001,
  EXTRACTED: 182980002,  // This appears to be "Credited" status
  REJECTED: 182980004,
} as const;

/**
 * Map Dataverse status code to friendly string
 */
export function getInvoiceStatus(statuscode: number): "submitted" | "approved" | "credited" | "rejected" | "unknown" {
  switch (statuscode) {
    case InvoiceStatusCode.SUBMITTED:
      return 'submitted';
    case InvoiceStatusCode.APPROVED:
      return 'approved';
    case InvoiceStatusCode.EXTRACTED:
      return 'credited';
    case InvoiceStatusCode.REJECTED:
      return 'rejected';
    default:
      return 'unknown';
  }
}