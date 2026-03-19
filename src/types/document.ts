/**
 * Product Documentation document from fetch documents flow
 */
export interface ProductDocument {
  '@odata.etag'?: string;
  actum_productdocumentationid: string;
  actum_name: string;
  actum_filename: string;
  actum_visible: boolean;
  'actum_visible@OData.Community.Display.V1.FormattedValue'?: string;
  actum_unapprovedaccess: boolean;
  'actum_unapprovedaccess@OData.Community.Display.V1.FormattedValue'?: string;
}
