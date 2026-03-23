/**
 * Centralised Power Pages configuration.
 *
 * All Power Pages / Entra External ID URLs and Dataverse API endpoints live
 * here so they are easy to find and update for each environment.
 *
 * URL notes:
 *  - /signin           → Power Pages sign-in endpoint → auto-redirects to Entra External ID
 *  - /register         → Power Pages registration endpoint → auto-redirects to Entra External ID
 *  - /Account/Login/LogOff?federated=true
 *                      → Federated logout: clears both Power Pages session AND
 *                        the Entra External ID session (single sign-out)
 */

const PORTAL_URL = process.env.REACT_APP_PORTAL_URL ?? '';

console.log('[CONFIG DEBUG] PORTAL_URL:', PORTAL_URL);
console.log('[CONFIG DEBUG] NODE_ENV:', process.env.NODE_ENV);
console.log('[CONFIG DEBUG] devMode will be:', process.env.NODE_ENV === 'development');
console.log('[CONFIG DEBUG] REACT_APP_ENTRA_PROVIDER:', process.env.REACT_APP_ENTRA_PROVIDER);

export const config = {
  /**
   * Whether the app is running in local development mode.
   * Uses NODE_ENV which CRA sets automatically: 'development' for `npm start`,
   * 'production' for `npm run build`. Cannot be overridden from .env files by design,
   * so this can never accidentally be true in a production build.
   */
  devMode: process.env.NODE_ENV === 'development',

  /** Power Pages / Entra External ID redirect endpoints. */
  auth: {
    /**
     * Power Pages ExternalLogin POST endpoint.
     * Must be submitted as a form POST (not a GET) with __RequestVerificationToken
     * fetched from window.shell.getTokenDeferred().
     */
    externalLoginUrl: '/Account/Login/ExternalLogin',
    /**
     * The provider value submitted in the ExternalLogin form.
     * This must be the AUTHORITY URL of the Entra provider — NOT the scheme name.
     * It is the `value` attribute on the provider button of the Power Pages /signin page.
     *
     * How to find it:
     *   1. Open https://<your-portal>/signin
     *   2. Right-click the "Microsoft Entra External ID" button → Inspect
     *   3. Copy the `value` attribute (looks like https://vmbsodev.ciamlogin.com/<tenant>/)
     *   4. Set it in REACT_APP_ENTRA_PROVIDER in .env.production
     */
    providerScheme: process.env.REACT_APP_ENTRA_PROVIDER ?? '',
    /** Where Power Pages should redirect after successful authentication. */
    returnUrl: '/login',
    /** Federated logout URL — clears both Power Pages and Entra sessions. */
    logoutUrl: '/Account/Login/LogOff?federated=true',
    /** React-side login page (used only in dev mode after mock logout). */
    loginPageUrl: '/login',
  },

  /** Dataverse Web API endpoints. */
  api: {
    /** Base contact collection endpoint (returns the authenticated user's own Contact). */
    contacts: '/_api/contacts',
    /** Single contact record endpoint — used for PATCH updates. */
    contactById: (id: string) => `/_api/contacts(${id})`,
    /** Account collection endpoint — used for VAT lookup and creation. */
    accounts: '/_api/accounts',
    /** Single account record endpoint — used for PATCH updates. */
    accountById: (id: string) => `/_api/accounts(${id})`,
    /** Brand lookup table. */
    brands: '/_api/actum_brands',
    /** Country lookup table. */
    countries: '/_api/actum_countries',
    /** Landing page CMS rows (per language). */
    landingPageContents: '/_api/actum_landingpagecontents',
  },

  /** Power Automate cloud flow endpoints. */
  flows: {
    /** Update profile flow — creates/links Account and updates Contact. */
    updateProfile: '/_api/cloudflow/v1.0/trigger/0bc41f4c-841c-f111-8341-000d3a66f792',
    /** Fetch documents flow — returns list of product documentation for contact. */
    fetchDocuments: '/_api/cloudflow/v1.0/trigger/a276b369-b11e-f111-8341-000d3a66f974',
  },

  /** Static asset paths. */
  assets: {
    /**
     * Hero image shown on the login page right panel.
     * In production the file must exist in the Power Pages portal file system.
     * Falls back to a relative path when REACT_APP_PORTAL_URL is not set.
     */
    loginHeroImage: PORTAL_URL
      ? `${PORTAL_URL}/building-hero.jpg`
      : '/building-hero.jpg',
  },
};
