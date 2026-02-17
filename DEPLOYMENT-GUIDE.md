# Deployment Guide: React SPA to Power Pages

## Current Status
✅ Build created in `./build` folder
✅ PAC CLI authenticated

## Deployment Options

### Option 1: Manual Upload via Power Pages Studio (Recommended for now)

1. **Go to Power Pages Management Portal:**
   - Navigate to: https://make.powerpages.microsoft.com
   - Select your site (site-alfw4)
   - Go to "Set up" → "Portal Management"

2. **Create Web Files:**
   You need to upload each file from the `build` folder as a Web File:
   - `index.html` → Create as Web Page or Web Template
   - `/static/js/*.js` → Upload as Web Files
   - `/static/css/*.css` → Upload as Web Files
   - `/images/logo-vmbso.svg` → Upload as Web File

3. **Configure Routing:**
   - Set up a Web Page that serves `index.html`
   - Configure URL pattern: `/app/*` to route to your SPA

### Option 2: Using PAC CLI with Power Pages Site Structure

The `pac powerpages upload` command works with Power Pages source files (YAML), not React builds.
This requires a different project structure.

### Option 3: Azure Blob Storage + Power Pages (Alternative)

Host the React app on Azure Blob Storage (as static website) and embed/link from Power Pages.

## Recommended Approach for Your Project

For a React SPA on Power Pages, the typical approach is:

1. **Use Power Pages as API Gateway** (current setup)
2. **Host React app separately** initially for testing:
   - Azure Static Web Apps
   - Azure App Service
   - Azure Blob Storage Static Website
   
3. **Once tested**, integrate into Power Pages web files

## Quick Test Deployment to Azure Static Web Apps

Would you like me to set up deployment to Azure Static Web Apps instead?
This will let you test with real Power Pages authentication while hosting the React app properly.

## Next Steps

1. **For now:** Continue with local dev mode (`REACT_APP_DEV_MODE=true`)
2. **Complete Modules 3-7** to build full functionality
3. **Deploy to Azure Static Web Apps** for testing with real auth
4. **Final deployment:** Integrate into Power Pages web files structure

---

## Alternative: Test Authentication Locally

You can also test real authentication by:
1. Opening Power Pages in browser: https://site-alfw4.powerappsportals.com
2. Login there to create session
3. Then use local app - it will use the same session cookies (if on same domain)

But this requires Power Pages to be on localhost, which isn't possible.

**Recommendation:** Continue with dev mode for now, complete modules 3-6, then deploy properly.
