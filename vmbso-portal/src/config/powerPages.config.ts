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
console.log('[CONFIG DEBUG] REACT_APP_DEV_MODE:', process.env.REACT_APP_DEV_MODE);
console.log('[CONFIG DEBUG] devMode will be:', process.env.REACT_APP_DEV_MODE === 'true');
console.log('[CONFIG DEBUG] REACT_APP_ENTRA_PROVIDER:', process.env.REACT_APP_ENTRA_PROVIDER);

export const config = {
  /** Whether the app is running in local development mode. */
  devMode: process.env.REACT_APP_DEV_MODE === 'true',

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
    returnUrl: '/',
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
