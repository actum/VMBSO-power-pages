/**
 * Represents a language record from the actum_languages table.
 *
 * Sample record:
 * {
 *   "@odata.etag": "W/\"3714371\"",
 *   "actum_languageid": "0e2cd85f-f709-f111-8406-000d3a68813d",
 *   "actum_name": "Dutch",
 *   "actum_code": "nl-NL",
 *   "actum_iso6391": "nl",
 *   "actum_lcid": 1043,
 *   "actum_isdefault": false,
 *   "statecode": 0,
 *   "statuscode": 1,
 *   "createdon": "2026-02-14T22:49:10Z",
 *   "modifiedon": "2026-02-14T22:49:10Z"
 * }
 */
export interface Language {
  actum_languageid: string;
  actum_name: string;
  actum_code: string;
  actum_iso6391?: string;
  actum_lcid?: number;
  actum_isdefault?: boolean;
}
