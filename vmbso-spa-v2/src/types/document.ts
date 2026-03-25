/**
 * Raw row returned by the fetch documents flow.
 * One row per document-brand pair — a document with 2 brands appears twice.
 */
export interface ProductDocument {
  '@odata.etag'?: string;
  actum_productdocumentationid: string;
  actum_name: string;
  actum_filename: string;
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
}

/**
 * Deduplicated document with all associated brands aggregated into an array.
 * Used for display — one entry per unique document.
 */
export interface DocumentWithBrands extends Omit<ProductDocument, 'brand.actum_name' | 'brand.actum_brandid'> {
  brands: { id: string; name: string }[];
}
