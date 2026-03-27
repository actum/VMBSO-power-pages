/**
 * Raw row returned by the fetch documents flow.
 * One row per document-brand pair — a document with 2 brands appears twice.
 */
export interface ProductDocument {
  '@odata.etag'?: string;
  actum_productdocumentationid: string;
  actum_name: string;
  actum_filename?: string;
  actum_description?: string;
  actum_fileextension?: string;
  actum_language?: string;
  actum_visible: boolean;
  actum_unapprovedaccess: boolean;
  createdon: string;
  'createdon@OData.Community.Display.V1.FormattedValue'?: string;
  'actum_visible@OData.Community.Display.V1.FormattedValue'?: string;
  'actum_unapprovedaccess@OData.Community.Display.V1.FormattedValue'?: string;
  'brand.actum_name'?: string;
  'brand.actum_brandid'?: string;
  'doctype.actum_documenttypeid'?: string;
  'doctype.actum_name'?: string;
  'doctype.actum_code'?: string;
}

/**
 * Deduplicated document with all associated brands and document types aggregated into arrays.
 * Used for display — one entry per unique document.
 */
export interface DocumentWithBrands extends Omit<ProductDocument, 'brand.actum_name' | 'brand.actum_brandid' | 'doctype.actum_documenttypeid' | 'doctype.actum_name' | 'doctype.actum_code'> {
  brands: { id: string; name: string }[];
  documentTypes: { id: string; name: string; code: string }[];
}
