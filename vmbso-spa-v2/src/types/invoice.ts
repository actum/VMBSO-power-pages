export interface Invoice {
  actum_invoicenumber: string;
  actum_creditpoints: number;
  actum_status: "submitted" | "rejected" | "credited";
  actum_account: string;
  actum_contact: string;
  actum_invoicedocument: Blob;
}