# VMBSO Customer Portal - Project Overview

## Project Context

VMBSO is building a customer-facing document portal using Microsoft Power Pages (SPA) where authenticated users can browse and download documents relevant to their profile. This is a Phase 1 MVP focusing on core functionality with a clean, modern interface supporting multiple European languages.

## Business Problem

VMBSO needs to provide secure, role-based access to customer documents (user manuals, technical specs, installation guides) stored in blob storage. Different customers (architects, distributors, installers across multiple countries) need access to different documents based on their profile attributes.

## Solution Architecture

```
Power Pages SPA (React + TypeScript + MUI)
    ↓
Local Authentication (Power Pages built-in)
    ↓
Dataverse Web API (document metadata)
    ↓
Azure Blob Storage (document files)
```

**Key Technologies:**
- React 18 + TypeScript
- Material-UI (MUI) for components
- Power Pages for hosting and authentication
- Dataverse for data storage
- react-i18next for multi-language support
- PAC CLI for deployment

## User Journey (Happy Path)

### 1. Registration
```
New user visits portal
    ↓
Clicks "Register"
    ↓
Fills form:
    - First Name: "Jan"
    - Last Name: "Petersen"
    - Email: "jan.petersen@company.dk"
    - Password: "SecurePass123"
    - Country: "Denmark"
    - Role: "Architect"
    ↓
Submits form
    ↓
System creates Contact record in Dataverse
    ↓
User auto-approved (Phase 1)
    ↓
Redirected to login page with success message
```

### 2. Login
```
User enters email and password
    ↓
Power Pages validates credentials
    ↓
Session cookie created
    ↓
User redirected to /documents page
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
User clicks avatar icon
    ↓
Selects "Logout"
    ↓
Session cleared
    ↓
Redirected to login page
```

## Core Requirements

### Functional Requirements

**Authentication:**
- ✅ User registration with: First Name, Last Name, Email, Password, Country, Role
- ✅ User login with email/password
- ✅ Session management (persist across page refresh)
- ✅ Auto-approve all registrations (Phase 1)
- ✅ Logout functionality

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
- ✅ Power Pages Local Authentication
- ✅ Dataverse Web API for data access
- ✅ Proxy API calls through portal (/_api/*)
- ✅ Session-based authentication (cookie)

**Data Model:**
- ✅ `contact` table - Standard D365 contact with custom fields
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
❌ Password reset  
❌ Email notifications  

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

## Key Stakeholders

- **End Users:** External customers (architects, distributors, installers) across 5 European countries
- **VMBSO Team:** Internal team managing document uploads and user accounts via backoffice
- **ACTUM (You):** Development team building the SPA

## Environment Details

**Dataverse Environment:**
- URL: https://org06e85c00.crm4.dynamics.com
- Tables: contact, actum_clientdocument, account
- Access: Admin access for development

**Power Pages Portal:**
- URL: https://site-alfw4.powerappsportals.com
- Type: SPA (React)
- Route: `/app/*` for SPA
- Authentication: Local (built-in Power Pages)

**Development:**
- Local dev server: http://localhost:3000
- Proxy: Routes API calls to portal
- Deployment: PAC CLI

## What Makes This Project Unique

1. **Hybrid Architecture:** React SPA hosted on Power Pages (not typical React hosting)
2. **Power Platform Integration:** Deep integration with Dataverse and Power Pages auth
3. **Multi-Language from Day 1:** 5 languages supported in MVP
4. **Clean Separation:** Frontend (React) separate from backend (Dataverse), but deployed together
5. **PAC CLI Deployment:** Modern deployment method for Power Pages
6. **Desktop-First:** No mobile complexity in Phase 1

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

❌ **Don't** make direct Dataverse calls without proxy (CORS issues)  
❌ **Don't** hardcode strings (must use i18n)  
❌ **Don't** forget loading/error states  
❌ **Don't** store sensitive data in localStorage  
❌ **Don't** ignore TypeScript errors  
❌ **Don't** skip error boundaries  
❌ **Don't** forget to handle session expiration  

✅ **Do** use proxy configuration for local dev  
✅ **Do** translate every user-facing string  
✅ **Do** show loading indicators  
✅ **Do** use session cookies (automatic)  
✅ **Do** fix TypeScript errors immediately  
✅ **Do** implement error boundaries  
✅ **Do** redirect to login on 401  

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
Module 1: Setup (2 days)
    ↓
Module 2: Auth (2 days)
    ↓
Module 3: Dataverse (2 days)
    ↓
Module 4: Document List (3 days)
    ↓
Module 5: i18n (1 day)
    ↓
Module 6: Download & Profile (1 day)
    ↓
Module 7: Deploy (2 days)
    ↓
Total: 13 days to production
```

---

## Quick Reference for Claude Code

**When starting each module, remember:**
- Read style guidelines FIRST (Module 1)
- Every component needs TypeScript types
- Every user-facing string needs t('key')
- Every API call needs try/catch
- Every async operation needs loading state
- Test in browser after each component
- Check console for errors constantly
- Commit working code frequently

**The happy path should always work:**
Register → Login → Browse → Filter → Download → Change Language → Profile → Logout

If any step breaks, fix it before moving to the next module.
