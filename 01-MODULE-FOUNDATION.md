# Module 1: Foundation & Project Setup

## Goal
Bootstrap React SPA with MUI, configure for Power Pages deployment, apply style guidelines

## Estimated Time
1-2 days

## Prerequisites
- Node.js 18+ installed
- Power Platform CLI (PAC) installed
- Access to Power Pages environment
- Access to style guidelines MD file

## Tasks

### 1.1 Initialize React Project
```bash
# Create React app with TypeScript
npx create-react-app vmbso-portal --template typescript
cd vmbso-portal

# Install dependencies
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install react-router-dom
npm install react-i18next i18next i18next-browser-languagedetector
npm install react-toastify
npm install @types/node

# Dev dependencies
npm install --save-dev @types/react-router-dom
```

### 1.2 Configure PAC CLI
```bash
# Check if authenticated
pac auth list

# If not authenticated, create auth profile
pac auth create --environment https://org06e85c00.crm4.dynamics.com

# Find Power Pages site ID
# Go to: https://make.powerpages.microsoft.com
# Select your site (site-alfw4)
# Site ID is in the URL or in site settings
# Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 1.3 Project Structure
Create the following folder structure:

```
/src
  /components
    Layout.tsx              # Main layout with header/nav
    ProtectedRoute.tsx      # Route wrapper for auth
    LanguageSwitcher.tsx    # Language dropdown
  /pages
    Login.tsx              # Login page
    Register.tsx           # Registration page
    Documents.tsx          # Document list page
    Profile.tsx            # User profile page
    NotFound.tsx           # 404 page
  /services
    authService.ts         # Authentication API calls
    dataverseService.ts    # Dataverse Web API wrapper
  /contexts
    AuthContext.tsx        # Global auth state
  /hooks
    useCurrentUser.ts      # Fetch current user
    useDocuments.ts        # Fetch documents
  /types
    contact.ts             # Contact type definition
    document.ts            # Document type definition
  /i18n
    config.ts              # i18n configuration
    /locales
      en.json             # English translations
      da.json             # Danish translations
      de.json             # German translations
      fr.json             # French translations
      nl.json             # Dutch translations
  /theme
    theme.ts              # MUI theme configuration
  /utils
    formatters.ts         # Date/size formatters
  App.tsx                 # Root component
  index.tsx               # Entry point
```

### 1.4 Configure Proxy for Local Development

Add to `package.json`:
```json
{
  "proxy": "https://site-alfw4.powerappsportals.com",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "deploy": "npm run build && pac powerpages upload --path ./build"
  }
}
```

### 1.5 Read Style Guidelines

**IMPORTANT:** Before creating any components, read the style guidelines MD file provided separately.

Apply the style guidelines to:
- MUI theme configuration (colors, typography, spacing)
- Component styling
- Layout structure
- Button styles
- Form input styles
- Overall design system

## Claude Code Instructions

```markdown
MODULE 1: Foundation & Project Setup

CONTEXT:
- Building a Power Pages SPA for document management
- Using React + TypeScript + Material-UI
- Will deploy to Power Pages using PAC CLI
- Local dev uses proxy to portal for API calls

CRITICAL FIRST STEP:
Before writing any code, you will be provided a style guidelines MD file location.
READ THIS FILE FIRST and apply all styling rules throughout the project.

TASKS:

1. Project Initialization
   - Verify React + TypeScript is set up
   - Install all required dependencies (see list above)
   - Set up folder structure as specified

2. Configure package.json
   - Add proxy: "https://site-alfw4.powerappsportals.com"
   - Add deploy script for PAC CLI

3. Create MUI Theme (src/theme/theme.ts)
   - Read style guidelines MD file
   - Create MUI theme based on guidelines:
     * Primary/secondary colors
     * Typography (font family, sizes, weights)
     * Spacing system
     * Component overrides (buttons, inputs, etc.)
   - Export theme

4. Create Basic Layout Component (src/components/Layout.tsx)
   - Header with:
     * Logo/brand (placeholder for now)
     * Navigation links (Documents, Profile)
     * Language switcher (placeholder)
     * User menu with logout
   - Main content area
   - Footer (optional)
   - Apply styles from guidelines

5. Set up Routing (src/App.tsx)
   - React Router with routes:
     * / → redirect to /documents (if authenticated) or /login
     * /login → Login page
     * /register → Register page
     * /documents → Documents page (protected)
     * /profile → Profile page (protected)
     * * → NotFound page
   - Wrap app in ThemeProvider with custom theme
   - Wrap app in Router

6. Create Placeholder Pages
   - Login.tsx: Just show "Login Page" heading
   - Register.tsx: Just show "Register Page" heading
   - Documents.tsx: Just show "Documents Page" heading
   - Profile.tsx: Just show "Profile Page" heading
   - NotFound.tsx: Simple 404 message

7. Entry Point (src/index.tsx)
   - Import and render App
   - Add basic global styles if needed

SUCCESS CRITERIA:
✅ npm start runs without errors
✅ Can navigate to all routes
✅ Theme is applied throughout
✅ Layout shows header with navigation
✅ Style guidelines are visible in the theme/components

STYLE GUIDELINES FILE:
[Location will be provided - READ THIS FIRST before creating theme]

OUTPUT:
Working React app with routing, themed layout, and placeholder pages
```

## Deliverables

- ✅ Working React app locally (`npm start`)
- ✅ MUI theme configured per style guidelines
- ✅ Basic routing skeleton
- ✅ PAC CLI ready for deployment
- ✅ Folder structure established

## Success Criteria

- ✅ `npm start` runs without errors
- ✅ Can navigate to all routes
- ✅ Theme is applied throughout
- ✅ Layout shows header with navigation
- ✅ Style guidelines are visible in the theme/components

## Next Steps

Once Module 1 is complete, proceed to Module 2 (Authentication System).

## Troubleshooting

**Issue: npm install fails**
- Ensure Node.js 18+ is installed
- Try `npm cache clean --force`
- Delete node_modules and package-lock.json, then reinstall

**Issue: PAC CLI not found**
- Install from: https://aka.ms/PowerAppsCLI
- Add to PATH if needed

**Issue: Cannot authenticate PAC CLI**
- Ensure you have admin access to environment
- Try: `pac auth clear` then `pac auth create` again

**Issue: Proxy not working**
- Verify portal URL is correct in package.json
- Restart dev server after changing package.json
- Check if portal is accessible in browser

## Notes

- Style guidelines file location will be provided at start of module
- Theme should be created based on those guidelines
- All subsequent modules will use this theme
- Keep theme configuration flexible for future updates
