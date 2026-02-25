# VMBSO Customer Portal - Project Overview

## Project Context

VMBSO is building a customer-facing document portal using Microsoft Power Pages (SPA) where authenticated users can browse and download documents relevant to their profile. This is a Phase 1 MVP focusing on core functionality with a clean, modern interface supporting multiple European languages.

## Business Problem

VMBSO needs to provide secure, role-based access to customer documents (user manuals, technical specs, installation guides) stored in blob storage. Different customers (architects, distributors, installers across multiple countries) need access to different documents based on their profile attributes.

## Solution Architecture

```
Power Pages SPA (React + TypeScript + MUI)
    ↓
Microsoft Entra External ID (OAuth 2.0 / OpenID Connect)
    ↓  (Server-side redirect authentication)
Power Pages Session Management (Cookie-based)
    ↓
Dataverse Web API (document metadata via /_api/*)
    ↓
Azure Blob Storage (document files)
```

**Key Technologies:**
- React 18 + TypeScript
- Material-UI (MUI) for components
- Microsoft Entra External ID for authentication
- Power Pages for hosting and session management
- Dataverse for data storage
- react-i18next for multi-language support (EN, DA, DE, FR, NL)
- PAC CLI for deployment

## User Journey (Happy Path)

### 1. Registration
```
New user visits portal
    ↓
Clicks "Register" button in React app
    ↓
React redirects to Power Pages /register
    ↓
Power Pages redirects to Entra External ID User Flow
    ↓
User fills registration form in Entra External ID:
    - First Name: "Jan"
    - Last Name: "Petersen"
    - Email: "jan.petersen@company.dk"
    - Password: "SecurePass123"
    - Country: "Denmark" (custom attribute)
    - Role: "Architect" (custom attribute)
    ↓
User submits form
    ↓
Entra External ID creates user account
    ↓
Power Pages AUTOMATICALLY:
    - Creates Contact record in Dataverse
    - Creates External Identity (adx_externalidentity) record
    - Links them together
    - Maps custom attributes to Contact fields
    - Creates session cookie
    ↓
User redirected back to React app (/documents)
    ↓
User is immediately authenticated and sees documents page
```

### 2. Login
```
User visits portal while unauthenticated
    ↓
React app redirects to /login
    ↓
Power Pages redirects to Entra External ID login
    (automatic if Entra set as default identity provider)
    ↓
User enters email and password at Entra External ID
    ↓
Entra External ID validates credentials
    ↓
Redirects back to Power Pages
    ↓
Power Pages creates session cookie
    ↓
User redirected to /documents page in React app
    ↓
Session persists - user can refresh page without re-login
```

### 3. Browse Documents
```
User lands on Documents page
    ↓
System fetches documents from actum_clientdocument table
    ↓
Documents displayed in MUI DataGrid:
    - Column: Name | Account | Status | Date | Actions
    - Row: "Installation Guide v2.1" | "ABC Corp" | Active | Jan 15, 2024 | [Download]
    - Row: "Technical Specifications" | "ABC Corp" | Active | Jan 10, 2024 | [Download]
    ↓
User sees 25 documents per page
```

### 4. Filter & Search
```
User enters "installation" in search box
    ↓
Grid filters to show only matching documents
    ↓
User selects "Active" from status dropdown
    ↓
Grid further filters to active documents only
    ↓
User sees 5 filtered results
```

### 5. Download Document
```
User clicks Download button for "Installation Guide"
    ↓
System retrieves blob storage URL from actum_referencedocument field
    ↓
Browser opens download in new tab or triggers file download
    ↓
Toast notification: "Download started"
    ↓
User receives PDF file
```

### 6. Change Language
```
User clicks language switcher in header
    ↓
Selects "Français"
    ↓
All UI text updates immediately:
    - "Documents" → "Documents"
    - "Name" → "Nom"
    - "Status" → "Statut"
    - "Download" → "Télécharger"
    ↓
Dates reformat to French locale
    ↓
Language preference saved to localStorage
```

### 7. View Profile
```
User clicks avatar icon in header
    ↓
Selects "Profile" from dropdown
    ↓
Profile page shows:
    - Name: Jan Petersen
    - Email: jan.petersen@company.dk
    - Country: Denmark
    - Role: Architect
    - Member Since: January 15, 2024
```

### 8. Logout
```
User clicks avatar icon in header
    ↓
Selects "Logout"
    ↓
React calls logout service
    ↓
POST to /Account/Login/LogOff
    ↓
Power Pages clears session cookie
    ↓
Optionally: Federated logout from Entra External ID
    ↓
User redirected to /login page
```

## Core Requirements

### Functional Requirements

**Authentication:**
- ✅ User registration via Entra External ID User Flow
- ✅ Custom attributes: First Name, Last Name, Email, Country, Role
- ✅ User login via Entra External ID (redirect-based)
- ✅ Session management via Power Pages cookies (persist across refresh)
- ✅ Automatic Contact creation in Dataverse (handled by Power Pages)
- ✅ Entra External ID set as default provider (seamless redirect)
- ✅ Logout with optional federated sign-out

**Document Management:**
- ✅ Display documents in data grid (sortable, paginated)
- ✅ Show: Document Name, Account, Status, Created Date
- ✅ Filter by: Status (Active/Inactive)
- ✅ Search by: Document name (text search)
- ✅ Download button per document
- ✅ Download from blob storage via actum_referencedocument

**Multi-Language:**
- ✅ Support 5 languages: English (EN), Danish (DA), German (DE), French (FR), Dutch (NL)
- ✅ Language switcher in header
- ✅ All UI text translated
- ✅ Dates formatted per locale
- ✅ Persist language preference

**User Profile:**
- ✅ Display user information
- ✅ Show: Name, Email, Country, Role, Member Since
- ✅ Accessible from header menu

### Technical Requirements

**Frontend:**
- ✅ React 18 + TypeScript
- ✅ Material-UI (MUI) components
- ✅ React Router for routing
- ✅ react-i18next for translations
- ✅ MUI DataGrid for document table
- ✅ Desktop-focused (no mobile responsive required)

**Backend Integration:**
- ✅ Microsoft Entra External ID for authentication (OAuth 2.0 / OpenID Connect)
- ✅ Power Pages server-side authentication (redirect flow with Client Secret)
- ✅ Dataverse Web API for data access
- ✅ Proxy API calls through portal (/_api/*)
- ✅ Session-based authentication (HTTP-only cookie)
- ✅ Automatic Contact and External Identity creation

**Data Model:**
- ✅ `contact` table - Standard D365 contact with custom fields
  - Custom fields: actum_role, actum_country
- ✅ `adx_externalidentity` table - Links contacts to Entra External ID
  - adx_identityprovidername (e.g., "Microsoft Entra External ID")
  - adx_username (e.g., "sub|a1b2c3d4-...")
  - adx_contact (lookup to contact)
- ✅ `actum_clientdocument` table - Custom table for documents
  - actum_name (text)
  - actum_account (lookup to account)
  - actum_referencedocument (lookup to blob document)
  - statecode (Active/Inactive)
  - System fields (createdon, modifiedon, owner)

**Deployment:**
- ✅ Deploy via PAC CLI (`pac powerpages upload`)
- ✅ SPA lives under `/app/*` routes
- ✅ Production build optimized

### Non-Functional Requirements

**Performance:**
- ✅ Page load < 3 seconds
- ✅ Smooth navigation (no page refreshes)
- ✅ Lazy loading where appropriate

**Security:**
- ✅ Authentication required for all routes (except login/register)
- ✅ Session timeout redirects to login
- ✅ No sensitive data in client-side code
- ✅ HTTPS only in production

**Usability:**
- ✅ Clean, modern design per style guidelines
- ✅ Consistent MUI theme throughout
- ✅ Loading states for all async operations
- ✅ Error messages user-friendly and translated
- ✅ Toast notifications for actions (download, logout, errors)

**Maintainability:**
- ✅ TypeScript for type safety
- ✅ Component-based architecture
- ✅ Service layer for API calls
- ✅ Organized folder structure
- ✅ Clear separation of concerns

## Out of Scope (Phase 1)

❌ Mobile responsive design  
❌ Invitation code system  
❌ Manual approval workflow  
❌ Role-based document visibility (show all docs for now)  
❌ Multi-download (ZIP)  
❌ Document preview  
❌ Document upload (admin only, separate backoffice)  
❌ Advanced filtering (by product, brand, etc.)  
❌ User profile editing  
❌ Password reset (handled by Entra External ID)  
❌ Email notifications  
❌ Multi-factor authentication (optional in Entra External ID)
❌ Custom Entra External ID branding (use default Microsoft UI)

**Note:** Entra External ID tenant setup, User Flow configuration, and App Registration are prerequisites handled by infrastructure team before development starts.  

## Success Criteria

**Phase 1 is successful when:**

1. ✅ A new user can register and login
2. ✅ User can see a list of documents from Dataverse
3. ✅ User can search and filter documents
4. ✅ User can download a document from blob storage
5. ✅ User can switch between 5 languages seamlessly
6. ✅ User can view their profile
7. ✅ User can logout
8. ✅ All UI text is properly translated
9. ✅ Application is deployed to Power Pages
10. ✅ No console errors in production
11. ✅ Authentication persists across page refresh
12. ✅ Loading states and error handling work properly

## Entra External ID Prerequisites

**Infrastructure team must complete BEFORE development starts:**

### 1. Create Entra External ID Tenant
- Set up external tenant in Microsoft Entra Admin Center
- Configure tenant settings
- Note tenant name and domain

### 2. Create App Registration
- Register application: "vmbso-customer-portal"
- Platform: Web
- Redirect URI: `https://site-spa.powerappsportals.com/signin-oidc`
- Enable: Access tokens and ID tokens
- Grant admin consent for permissions
- Note: Application (Client) ID and Client Secret

### 3. Create User Flow
- Name: "vmbso-customer-signup"
- Type: Email with password or Email one-time passcode
- Collect attributes:
  - First Name (built-in)
  - Last Name (built-in)
  - Email Address (built-in)
  - Country (custom attribute)
  - Role (custom attribute - Architect/Distributor/Installer)
  - Company Name (optional custom attribute)
- Link to app registration

### 4. Configure in Power Pages
- Add Entra External ID as identity provider
- Enter configuration values:
  - Client ID
  - Client Secret (stored in Site Settings)
  - Authority URL
  - Metadata URL
- Set as default identity provider
- Configure claims mapping for custom attributes
- Restart Power Pages site

### 5. Test Configuration
- Navigate to /signin → should redirect to Entra External ID
- Complete registration → should create Contact in Dataverse
- Login → should authenticate and create session
- Verify Contact fields populated correctly

**Development can begin once these 5 steps are complete.**

---

## Key Stakeholders

- **End Users:** External customers (architects, distributors, installers) across 5 European countries
- **VMBSO Team:** Internal team managing document uploads and user accounts via backoffice
- **Infrastructure Team:** Sets up Entra External ID tenant and configuration
- **ACTUM (You):** Development team building the SPA

- **End Users:** External customers (architects, distributors, installers) across 5 European countries
- **VMBSO Team:** Internal team managing document uploads and user accounts via backoffice
- **ACTUM (You):** Development team building the SPA

## Environment Details

**Dataverse Environment:**
- URL: https://org06e85c00.crm4.dynamics.com
- Tables: contact, actum_clientdocument, account, adx_externalidentity
- Access: Admin access for development

**Power Pages Portal:**
- URL: https://site-spa.powerappsportals.com
- Type: SPA (React)
- Route: `/app/*` for SPA
- Authentication: Microsoft Entra External ID (OpenID Connect)
- Session: Cookie-based (managed by Power Pages)

**Entra External ID Tenant:**
- Tenant configured with User Flow for sign-up/sign-in
- Custom attributes: Role, Country, Company Name
- App Registration with Power Pages redirect URI
- Client Secret stored in Power Pages Site Settings (server-side)
- Authority URL: https://{tenant}.ciamlogin.com/

**Development:**
- Local dev server: http://localhost:3000
- Proxy: Routes API calls to portal
- Deployment: PAC CLI

## What Makes This Project Unique

1. **Hybrid Architecture:** React SPA hosted on Power Pages (not typical React hosting)
2. **Entra External ID Integration:** External customer authentication with automatic Contact creation
3. **Server-Side OAuth:** Power Pages handles OAuth flow server-side (React never sees tokens/secrets)
4. **Power Platform Integration:** Deep integration with Dataverse and Power Pages session management
5. **Multi-Language from Day 1:** 5 languages supported in MVP (EN, DA, DE, FR, NL)
6. **Clean Separation:** Frontend (React) separate from backend (Dataverse), but deployed together
7. **PAC CLI Deployment:** Modern deployment method for Power Pages
8. **Desktop-First:** No mobile complexity in Phase 1

## Developer Experience Goals

**For Claude Code, this means:**

1. **Clear Module Structure:** Each module is independent and testable
2. **TypeScript First:** All code strongly typed
3. **Service Layer Pattern:** API calls isolated in services
4. **Component Reusability:** Build once, use everywhere
5. **Error Handling:** Every API call has try/catch and user feedback
6. **Loading States:** Every async operation shows loading indicator
7. **Internationalization:** Every user-facing string uses t('key')

## Common Pitfalls to Avoid

❌ **Don't** try to implement custom login forms (use Entra External ID redirect)  
❌ **Don't** manually create Contact records (Power Pages does this automatically)  
❌ **Don't** handle OAuth tokens in React (Power Pages manages this server-side)  
❌ **Don't** make direct Dataverse calls without proxy (CORS issues)  
❌ **Don't** hardcode strings (must use i18n)  
❌ **Don't** forget loading/error states  
❌ **Don't** store sensitive data in localStorage  
❌ **Don't** ignore TypeScript errors  
❌ **Don't** skip error boundaries  
❌ **Don't** forget to handle session expiration  

✅ **Do** redirect to /signin and /register (Power Pages handles the rest)  
✅ **Do** trust Power Pages to create Contacts and External Identities  
✅ **Do** use session cookies (automatic via credentials: 'include')  
✅ **Do** use proxy configuration for local dev  
✅ **Do** translate every user-facing string  
✅ **Do** show loading indicators  
✅ **Do** fix TypeScript errors immediately  
✅ **Do** implement error boundaries  
✅ **Do** redirect to /login on 401  
✅ **Do** set Entra External ID as default provider for seamless UX  

## Expected User Flow in Production

```
Day 1: User registers → Auto-approved → Logs in → Sees empty state (no documents yet)
Day 2: Admin uploads documents to Dataverse → User logs in → Sees 10 documents → Downloads 2
Day 3: User logs in → Documents page loads instantly → Changes language to French → All text updates
Day 7: User has downloaded 15 documents → Profile shows accurate member since date
Day 30: User comfortable with portal → Provides positive feedback → Requests mobile version (Phase 2)
```

## Development Workflow

```
Prerequisites: Entra External ID setup (by infrastructure team)
    ↓
Module 1: Foundation Setup (1 day)
    - Project structure
    - TypeScript configuration
    - MUI theme setup
    - Routing skeleton
    ↓
Module 2: Entra External ID Authentication (1 day)
    - Login page (redirect to /signin)
    - Register page (redirect to /register)
    - AuthContext for session management
    - Protected routes
    - Logout functionality
    ↓
Module 3: Dataverse Integration (2 days)
    - API service layer
    - Session check endpoint
    - Contact fetching
    - Error handling
    ↓
Module 4: Document List with MUI DataGrid (2-3 days)
    - Documents page
    - MUI DataGrid implementation
    - Sorting, filtering, pagination
    - Search functionality
    ↓
Module 5: Multi-Language Support (1 day)
    - i18next setup
    - Translation files (EN, DA, DE, FR, NL)
    - Language switcher
    - Locale-aware formatting
    ↓
Module 6: Download & User Profile (1 day)
    - Download service
    - Profile page
    - User menu
    - Toast notifications
    ↓
Module 7: Deployment & Polish (1-2 days)
    - Production build
    - PAC CLI deployment
    - Error boundaries
    - Loading states
    - Final testing
    ↓
Total: 9-11 days to production (vs 13 days with local auth)
```

**Note:** Using Entra External ID with redirect approach is actually FASTER than custom authentication because Contact creation is automatic!

---

## Authentication Flow Diagram

### How Entra External ID + Power Pages Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                             │
└─────────────────────────────────────────────────────────────────┘

React SPA (/login or /documents while unauthenticated)
    │
    │ User clicks "Create Account"
    ↓
window.location.href = '/register'
    │
    ↓
Power Pages /register endpoint
    │
    │ Configured with Entra External ID
    ↓
Redirect to Entra External ID User Flow
    │
    │ User fills registration form:
    │ - Email, Password, Name, Country, Role
    ↓
User submits → Entra External ID creates user
    │
    ↓
Redirect to Power Pages /signin-oidc (with auth code)
    │
    │ Power Pages exchanges code for tokens (server-side)
    │ Uses Client Secret (never exposed to browser)
    ↓
Power Pages AUTOMATICALLY:
    │
    ├─ Creates Contact record in Dataverse
    ├─ Creates External Identity (adx_externalidentity)
    ├─ Links External Identity to Contact
    ├─ Maps claims to Contact fields (firstname, email, etc.)
    └─ Creates HTTP-only session cookie
    │
    ↓
Power Pages redirects to /documents
    │
    ↓
React SPA (/documents)
    │
    │ Session cookie automatically included
    │ User is authenticated!
    ↓
fetch('/_api/contacts', { credentials: 'include' })
    │
    ↓
Returns user's Contact data → Display in app

═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

React SPA
    │
    │ User not authenticated
    ↓
window.location.href = '/login'
    │
    ↓
Power Pages /login endpoint
    │
    │ Entra External ID set as DEFAULT provider
    │ (Skip sign-in page, go straight to Entra)
    ↓
Automatic redirect to Entra External ID
    │
    │ User enters email & password
    ↓
Entra External ID validates credentials
    │
    ↓
Redirect to Power Pages /signin-oidc
    │
    │ Power Pages:
    │ - Validates token
    │ - Finds Contact via External Identity
    │ - Creates session cookie
    ↓
Power Pages redirects to /documents
    │
    ↓
React SPA authenticated!

═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                   API CALL FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

React SPA
    │
fetch('/_api/contacts', { credentials: 'include' })
    │
    │ Browser includes session cookie automatically
    ↓
Power Pages Web API
    │
    │ Validates session cookie
    │ Identifies Contact from session
    ↓
Dataverse
    │
    │ Executes query with Contact security context
    ↓
Returns data
    │
    ↓
Power Pages → React SPA
    │
    │ Response: { value: [ {...contact data} ] }
    ↓
React renders user data
```

**Key Points:**
- ✅ React NEVER handles OAuth tokens or secrets
- ✅ Power Pages manages OAuth server-side with Client Secret
- ✅ Contact creation is AUTOMATIC (zero code needed)
- ✅ Session managed via HTTP-only cookie (secure)
- ✅ User barely notices redirect (5 seconds) when Entra set as default

---

## Quick Reference for Claude Code

**When starting each module, remember:**
- Entra External ID config is a PREREQUISITE (must be done by infrastructure team first)
- Read Module 2 (Authentication) FIRST - it explains the redirect approach
- Authentication is just redirects - NO custom forms, NO MSAL.js, NO token handling
- Contact creation is AUTOMATIC - never try to create Contacts manually
- Every component needs TypeScript types
- Every user-facing string needs t('key')
- Every API call needs try/catch and credentials: 'include'
- Every async operation needs loading state
- Test in browser after each component
- Check console for errors constantly
- Commit working code frequently

**Critical Authentication Rules:**
- Login: `window.location.href = '/signin'` (that's it!)
- Register: `window.location.href = '/register'` (that's it!)
- Logout: `POST /Account/Login/LogOff` then redirect to /login
- Session check: `fetch('/_api/contacts', { credentials: 'include' })`
- Protected routes: Check session, redirect to /login if 401
- NEVER implement custom login forms
- NEVER try to handle OAuth manually
- NEVER create Contact records manually

**The happy path should always work:**
Register → Redirects to Entra → Auto-creates Contact → Redirects back → 
Login → Redirects to Entra → Redirects back → 
Browse → Filter → Download → Change Language → Profile → Logout

If any step breaks, fix it before moving to the next module.
