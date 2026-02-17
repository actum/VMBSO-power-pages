# Module 2: Authentication System

## Goal
Build custom React login/registration forms that call Power Pages auth APIs

## Estimated Time
1-2 days

## Dependencies
- Module 1 (Foundation) must be complete

## Authentication Flow
```
User fills custom React form
    ↓
POST to /_services/auth/signup (registration)
    ↓
Power Pages creates contact with credentials
    ↓
User redirected to login
    ↓
User logs in (redirect to Power Pages /signin or custom endpoint)
    ↓
Session cookie created
    ↓
User redirected to /documents
```

## Tasks

### 2.1 Create Auth Service

File: `src/services/authService.ts`

```typescript
interface RegisterData {
  firstname: string;
  lastname: string;
  emailaddress1: string;
  password: string;
  // Add custom fields when names are confirmed
}

interface LoginData {
  username: string;
  password: string;
}

export const authService = {
  register: async (data: RegisterData) => {
    // POST to /_services/auth/signup
  },
  
  login: async (data: LoginData) => {
    // Redirect to /signin or call signin endpoint
  },
  
  logout: async () => {
    // Call logout endpoint and clear session
  },
  
  checkSession: async () => {
    // Check if user is authenticated
    // Try to fetch current user from /_api/contacts
  }
};
```

### 2.2 Create Auth Context

File: `src/contexts/AuthContext.tsx`

Provides global auth state:
- `currentUser: Contact | null`
- `isAuthenticated: boolean`
- `loading: boolean`
- `login(credentials)`
- `logout()`
- `register(data)`

### 2.3 Create Protected Route Component

File: `src/components/ProtectedRoute.tsx`

Checks if user is authenticated, redirects to `/login` if not.

### 2.4 Create Login Page

File: `src/pages/Login.tsx`

Form with:
- Email field
- Password field
- Submit button
- Link to register page
- Error message display

### 2.5 Create Registration Page

File: `src/pages/Register.tsx`

Form with:
- First Name
- Last Name
- Email
- Password
- Confirm Password
- Country (dropdown - mock data: FR, BE, NL, DE, DK)
- Role (dropdown - mock data: Architect, Distributor, Installer)
- Submit button
- Link to login page
- Validation and error display

## Claude Code Instructions

```markdown
MODULE 2: Authentication System

CONTEXT:
- Power Pages Local Authentication
- Custom React forms calling Power Pages auth endpoints
- Session managed by Power Pages (cookie-based)
- All users auto-approved (no pending status)

REQUIREMENTS:

1. Create authService (src/services/authService.ts)

Functions:
- register(data: RegisterData): Promise<void>
  * POST to /_services/auth/signup
  * Body: { firstname, lastname, emailaddress1, password, ...custom fields }
  * Handle success (redirect to login) and errors
  
- login(username: string, password: string): Promise<void>
  * Option A: Redirect to /signin (Power Pages handles it)
  * Option B: POST to signin endpoint if available
  * Return success/error
  
- logout(): Promise<void>
  * Call /_services/auth/signout or similar
  * Clear any local session state
  * Redirect to /login
  
- checkSession(): Promise<Contact | null>
  * GET /_api/contacts (returns current user if authenticated)
  * Return user object or null
  * Handle 401 (not authenticated)

2. Create AuthContext (src/contexts/AuthContext.tsx)

State:
- currentUser: Contact | null
- isAuthenticated: boolean
- loading: boolean

Methods:
- login(username, password)
- register(data)
- logout()

Implementation:
- On mount, call checkSession() to restore session
- Store user in context state
- Provide to entire app via Context.Provider

3. Create ProtectedRoute (src/components/ProtectedRoute.tsx)

Logic:
- Use AuthContext to check isAuthenticated
- If loading, show spinner
- If not authenticated, redirect to /login
- If authenticated, render children

4. Create Login Page (src/pages/Login.tsx)

UI (MUI components):
- Card/Paper container
- Email TextField (type="email", required)
- Password TextField (type="password", required)
- "Sign In" Button
- Link to /register ("Don't have an account?")
- Error Alert (if login fails)

Behavior:
- Form validation (email format, required fields)
- Call authService.login() on submit
- Show loading state during submission
- Show error messages
- Redirect to /documents on success

5. Create Register Page (src/pages/Register.tsx)

UI (MUI components):
- Card/Paper container
- First Name TextField (required)
- Last Name TextField (required)
- Email TextField (type="email", required, validate format)
- Password TextField (type="password", required, min 8 chars)
- Confirm Password TextField (must match password)
- Country Select/Autocomplete (options: France, Belgium, Netherlands, Germany, Denmark)
- Role Select (options: Architect, Distributor, Installer)
- "Create Account" Button
- Link to /login ("Already have an account?")
- Error Alert (if registration fails)

Behavior:
- Form validation (all fields, password match, email format)
- Call authService.register() on submit
- Show loading state during submission
- Show error messages
- Redirect to /login on success with success message

6. Update App.tsx
- Wrap routes in AuthProvider
- Use ProtectedRoute for /documents and /profile

7. Update Layout.tsx
- Show user name in header if authenticated
- Show logout button if authenticated
- Hide navigation if not authenticated

VALIDATION RULES:
- Email: valid email format
- Password: minimum 8 characters
- All fields required
- Passwords must match on register

ERROR HANDLING:
- Network errors: "Unable to connect. Please try again."
- Invalid credentials: "Invalid email or password."
- Email already exists: "Email already registered."
- Generic: "An error occurred. Please try again."

MOCK DATA (for dropdowns):
Countries: 
- { value: 'FR', label: 'France' }
- { value: 'BE', label: 'Belgium' }
- { value: 'NL', label: 'Netherlands' }
- { value: 'DE', label: 'Germany' }
- { value: 'DK', label: 'Denmark' }

Roles:
- { value: 'architect', label: 'Architect' }
- { value: 'distributor', label: 'Distributor' }
- { value: 'installer', label: 'Installer' }

SUCCESS CRITERIA:
✅ User can register with all fields
✅ User can login with email/password
✅ Session persists on page refresh
✅ Protected routes redirect unauthenticated users
✅ Logout works and redirects to login
✅ Forms have proper validation and error messages

OUTPUT:
Complete authentication system with custom React forms
```

## Deliverables

- ✅ Custom login form (styled per guidelines)
- ✅ Custom registration form (Name, Email, Password, Country, Role)
- ✅ Working authentication flow
- ✅ Protected routes
- ✅ Session persistence

## Success Criteria

- ✅ User can register with all fields
- ✅ User can login with email/password
- ✅ Session persists on page refresh
- ✅ Protected routes redirect unauthenticated users
- ✅ Logout works and redirects to login
- ✅ Forms have proper validation and error messages

## Testing Checklist

- [ ] Register a new user with valid data
- [ ] Try to register with existing email (should fail)
- [ ] Try to register with invalid email format (should fail)
- [ ] Try to register with short password (should fail)
- [ ] Try to register with mismatched passwords (should fail)
- [ ] Login with correct credentials
- [ ] Login with wrong credentials (should fail)
- [ ] Refresh page after login (should stay logged in)
- [ ] Navigate to /documents without login (should redirect to /login)
- [ ] Logout and verify redirect to /login

## Next Steps

Once Module 2 is complete, proceed to Module 3 (Dataverse Integration Layer).

## Troubleshooting

**Issue: Registration fails silently**
- Check browser Network tab for API errors
- Verify /_services/auth/signup endpoint exists
- Check Power Pages authentication settings

**Issue: Login doesn't redirect**
- Ensure session cookie is being set
- Check browser console for errors
- Verify /signin endpoint or redirect is working

**Issue: Session not persisting**
- Check if cookies are enabled
- Verify Power Pages session configuration
- Check if cookie domain matches

**Issue: Protected routes not working**
- Verify AuthContext is wrapping entire app
- Check ProtectedRoute logic
- Ensure checkSession() is being called on mount

## Notes

- NO invitation code needed in Phase 1
- All users are auto-approved
- Session management handled by Power Pages
- Custom forms call Power Pages APIs in the background
