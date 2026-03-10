# User Registration with Entra External ID in Power Pages

## Overview

User registration in Power Pages with Entra External ID is **self-service** and managed through **Entra External ID User Flows**. This means users can register themselves without any manual intervention from your team.

## How Registration Works

### The Complete Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              USER REGISTRATION FLOW DIAGRAM                      │
└─────────────────────────────────────────────────────────────────┘

User visits React SPA
    │
    │ Clicks "Create Account" or "Register"
    │ window.location.href = '/register?returnUrl=/documents'
    ↓
Power Pages /register (Built-in Page)
    │
    │ Redirects to Entra External ID registration
    ↓
Entra External ID User Flow (Microsoft)
    │
    │ Step 1: Email + Password (or One-Time Passcode)
    │ ┌─────────────────────────────────────┐
    │ │ Enter your email                     │
    │ │ ________________________________     │
    │ │                                      │
    │ │ Create password                      │
    │ │ ________________________________     │
    │ │                                      │
    │ │ Confirm password                     │
    │ │ ________________________________     │
    │ │                                      │
    │ │ [ Continue ]                         │
    │ └─────────────────────────────────────┘
    ↓
    │ Step 2: Collect User Attributes (Configured in User Flow)
    │ ┌─────────────────────────────────────┐
    │ │ First Name *                         │
    │ │ ________________________________     │
    │ │                                      │
    │ │ Last Name *                          │
    │ │ ________________________________     │
    │ │                                      │
    │ │ Country                              │
    │ │ [Dropdown: FR, BE, NL, DE, DK]       │
    │ │                                      │
    │ │ Role                                 │
    │ │ [Dropdown: Architect, Distributor,   │
    │ │            Installer]                │
    │ │                                      │
    │ │ [ Create Account ]                   │
    │ └─────────────────────────────────────┘
    ↓
Entra External ID
    │
    │ Creates user account in Entra tenant
    │ Generates authorization code
    ↓
Redirect to Power Pages
    │
    │ URL: https://site-alfw4.powerappsportals.com/signin-oidc?code=...
    ↓
Power Pages Server
    │
    │ Exchanges code for tokens (using Client Secret)
    │ Extracts user claims (email, name, custom attributes)
    │ Creates Contact record in Dataverse
    │ Creates External Identity record (links Entra ID to Contact)
    │ Creates session cookie
    ↓
Power Pages
    │
    │ May show additional registration form (optional)
    │ User confirms email and completes Power Pages profile
    ↓
Redirect to React SPA
    │
    │ User lands at /documents (or returnUrl)
    │ Authenticated and ready to use the app
```

### Key Components

#### 1. Entra External ID User Flow (Configured in Azure)

**What it is:**
A pre-configured sign-up journey that defines:
- Authentication method (Email + Password or One-Time Passcode)
- User attributes to collect
- Order of collection
- Branding and look & feel

**Where it's configured:**
Azure Portal → Entra External ID → User flows

**Two options for authentication:**

**Option A: Email with Password** (Recommended)
- User enters email address
- Creates a password (8+ characters)
- Confirms password
- Optional MFA (Email OTP or SMS)

**Option B: Email One-Time Passcode**
- User enters email address
- Receives passcode via email
- Enters passcode to verify
- No password needed

#### 2. User Attributes Collection

**Built-in attributes you can collect:**
- First Name
- Last Name
- Display Name
- Email Address (automatic)
- Country/Region
- Postal Code
- City
- State/Province
- Street Address
- Job Title

**Custom attributes you can define:**
- Role (Architect, Distributor, Installer)
- Company Name
- Business Registration Code
- Phone Number
- Preferred Language
- Product Interests
- Any custom field you need

**Important:** These attributes are configured in the Entra User Flow, NOT in React!

#### 3. Contact Record Creation

When a user completes registration:

**Power Pages automatically creates:**
1. **Contact Record** in Dataverse
   - `firstname` = User's first name
   - `lastname` = User's last name
   - `emailaddress1` = User's email
   - Custom fields mapped from Entra attributes

2. **External Identity Record** (`adx_externalidentity`)
   - Links the Entra External ID user to the Contact
   - Stores the external user ID
   - Enables SSO across apps

---

## Configuration Steps

### Part 1: Azure Configuration (Infrastructure Team)

#### Step 1: Create/Configure User Flow

```markdown
Location: Azure Portal → Entra External ID → User flows

1. Click "New user flow"
2. Name: "vmbso-signup-signin" (or similar)
3. Choose authentication method:
   - ✅ Email with password (Recommended)
   - ⚠️ Email one-time passcode (Simpler but less secure)
4. Click "Create"
```

#### Step 2: Configure User Attributes

```markdown
In your User Flow settings:

1. Click on "User attributes"
2. Select built-in attributes:
   - ✅ Email Address (automatic)
   - ✅ Given Name (First Name)
   - ✅ Surname (Last Name)
   - ✅ Country/Region
   - Optional: Display Name, Postal Code, City

3. Add custom attributes (if needed):
   Click "Add custom attribute"
   - Name: "Role"
   - Data Type: String
   - Options: Architect, Distributor, Installer
   
   - Name: "CompanyName"
   - Data Type: String
   
4. Set which attributes are required vs optional
5. Configure display order (drag and drop)
6. Save
```

#### Step 3: Link Application to User Flow

```markdown
In your User Flow settings:

1. Click "Applications"
2. Click "Add application"
3. Select your app: "power-pages-app"
4. Click "Select"
5. Verify app appears in the list
```

#### Step 4: Customize Branding (Optional)

```markdown
In your User Flow settings:

1. Click "Page layouts"
2. Customize:
   - Company logo
   - Background image
   - Colors
   - Text labels
   - Button text
3. Preview changes
4. Save
```

### Part 2: Power Pages Configuration

#### Power Pages Identity Provider Settings

When configuring Entra External ID in Power Pages, the user flow is automatically used because it's linked to your application.

**No additional configuration needed** - as long as:
- User flow exists
- User flow is linked to your app registration
- Entra External ID is configured in Power Pages

---

## React SPA Implementation

### Registration Button in React

Your React app doesn't need complex forms - just redirect to Power Pages registration:

```typescript
// src/pages/Register.tsx
import { Container, Paper, Typography, Button } from '@mui/material';
import { PersonAdd as RegisterIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const Register = () => {
  const navigate = useNavigate();

  const handleRegister = () => {
    // Redirect to Power Pages registration
    // Power Pages will show Entra External ID registration flow
    const returnUrl = encodeURIComponent(window.location.origin + '/documents');
    window.location.href = `/register?returnUrl=${returnUrl}`;
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Create Your Account
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Join the VMBSO Customer Portal to access your documents
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<RegisterIcon />}
          onClick={handleRegister}
          fullWidth
          sx={{ mb: 2 }}
        >
          Create Account with Microsoft
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Already have an account?{' '}
          <Button onClick={() => navigate('/login')} color="primary">
            Sign in here
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
};
```

**That's it!** React just redirects. Entra External ID handles everything else.

---

## What the User Experiences

### Step-by-Step User Journey

#### 1. User Clicks "Create Account"

React button redirects to: `/register?returnUrl=/documents`

#### 2. Power Pages Redirects to Entra External ID

User sees branded Microsoft registration page with your company logo and colors.

#### 3. User Enters Credentials

**If using Email + Password:**
```
Email: architect@company.com
Password: ••••••••••••
Confirm Password: ••••••••••••
```

**If using Email One-Time Passcode:**
```
Email: architect@company.com
[System sends passcode]
Enter Code: 123456
```

#### 4. User Enters Attributes

```
First Name: Jean
Last Name: Dupont
Country: France
Role: Architect
```

#### 5. User Submits

Click "Create Account" button.

#### 6. Account Created

- Entra External ID creates user
- Power Pages creates Contact in Dataverse
- User is automatically logged in
- Redirected to `/documents`

**Total time:** 30-60 seconds for the user!

---

## Advanced: Mapping Custom Attributes to Contact Fields

### Problem

Entra External ID collects "Role" and "Country", but Power Pages needs to store them in Contact custom fields.

### Solution: Claims Mapping

**Configure in Power Pages Identity Provider settings:**

```markdown
Location: Power Pages → Security → Identity providers → Entra External ID → Edit

Under "Registration claims mapping":
- Map "extension_Role" → "actum_role"
- Map "extension_Country" → "actum_country"

Under "Login claims mapping":
- Same mappings

This tells Power Pages:
"When a user registers, take the 'Role' from Entra and put it in the Contact's 'actum_role' field"
```

**Important:** Custom attribute names in Entra are prefixed with `extension_`

---

## Testing Registration

### Manual Test

#### Step 1: Access Registration Page

```
Navigate to: https://site-alfw4.powerappsportals.com/register
```

#### Step 2: Verify Entra External ID Button

You should see:
- "Microsoft Entra External ID" button (or your custom name)
- Click it

#### Step 3: Complete Registration

- Enter email (use a test email you can access)
- Create password
- Enter first name, last name
- Select country and role
- Click "Create Account"

#### Step 4: Verify Email (if required)

- Check email inbox
- Click verification link (if email verification enabled)

#### Step 5: Verify Redirect

- Should redirect back to Power Pages
- Then to `/documents` (or your returnUrl)

#### Step 6: Verify Contact Created

```
In Dataverse:

1. Open Contacts table
2. Find contact with your test email
3. Verify:
   - First name populated
   - Last name populated
   - Email populated
   - Custom fields populated (if mapped)
```

#### Step 7: Verify External Identity Created

```
In Dataverse:

1. Open External Identity table (adx_externalidentity)
2. Find record linked to your contact
3. Verify:
   - Username matches Entra ID
   - Identity Provider name = your Entra config name
```

---

## Common Scenarios

### Scenario 1: User Already Has Entra Account

If user already exists in Entra External ID tenant:

```
User clicks "Create Account"
    ↓
Entra External ID recognizes existing email
    ↓
Shows: "Account already exists. Please sign in."
    ↓
Redirects to sign-in page
```

### Scenario 2: User Registers, Then Closes Browser

```
User completes Entra registration
    ↓
Contact created in Dataverse
    ↓
User closes browser before final redirect
    ↓
NEXT TIME: User can just sign in (account exists)
```

### Scenario 3: Duplicate Email in Dataverse

```
Contact with email already exists in Dataverse
    ↓
Power Pages detects duplicate
    ↓
Options:
  A) Link to existing Contact
  B) Show error (depending on configuration)
```

Configure via Power Pages setting:
`Authentication/OpenIdConnect/{Provider}/ContactMappingWithEmail`

---

## Comparison: Registration Methods

### Entra External ID User Flow ✅ (What you're using)

**Pros:**
- ✅ Self-service (no admin intervention)
- ✅ Professionally branded
- ✅ Secure (Microsoft-managed)
- ✅ MFA support built-in
- ✅ Password reset handled
- ✅ Custom attribute collection
- ✅ Scalable to millions of users

**Cons:**
- Configuration upfront (one-time)
- Requires Azure setup

**Best for:** Customer-facing portals (your use case!)

### Local Authentication ❌ (Deprecated, not recommended)

**Pros:**
- Quick setup

**Cons:**
- ❌ Not recommended by Microsoft
- ❌ Password management burden
- ❌ Security concerns
- ❌ Manual user management

**Best for:** Nothing (deprecated)

---

## Security Features

### Built-in Security

**Entra External ID User Flow provides:**

1. **Password Requirements**
   - Minimum length (configurable)
   - Complexity requirements
   - Breach detection

2. **Email Verification**
   - Optional/Required
   - Prevents fake accounts

3. **Multi-Factor Authentication (MFA)**
   - Email one-time passcode
   - SMS authentication
   - Can be required or optional

4. **Account Protection**
   - Suspicious sign-in detection
   - Risk-based policies
   - Account lockout after failed attempts

5. **Compliance**
   - GDPR compliant
   - SOC 2 certified
   - Microsoft security standards

---

## Summary

### ✅ How Users Register

1. **User clicks "Create Account" in React** → Redirect to `/register`
2. **Power Pages redirects** → Entra External ID user flow
3. **User fills form** → Email, password, name, attributes
4. **Entra creates account** → User stored in Entra tenant
5. **Power Pages creates Contact** → Mapped to Dataverse
6. **User logged in** → Redirected to app

### ✅ What You Configure

**Azure (One-time setup):**
- Create Entra External ID User Flow
- Define authentication method (Email + Password)
- Configure user attributes to collect
- Customize branding
- Link to app registration

**Power Pages (One-time setup):**
- Configure Entra External ID identity provider
- Map claims to Contact fields (optional)

**React (Simple code):**
- Registration button that redirects to `/register`
- That's it!

### ✅ Benefits

- **Self-service** - No manual user creation
- **Secure** - Microsoft-managed authentication
- **Scalable** - Handles unlimited users
- **Professional** - Branded experience
- **MFA-ready** - Built-in multi-factor auth
- **Simple for dev** - Just redirect, no complex forms

---

## Configuration Checklist

```markdown
## User Registration Setup Checklist

### Azure Portal - Entra External ID Tenant
- [ ] User flow created: _______________
- [ ] Authentication method selected:
  - [ ] Email with password
  - [ ] Email one-time passcode
- [ ] User attributes configured:
  - [ ] Given Name (First Name)
  - [ ] Surname (Last Name)
  - [ ] Country/Region
  - [ ] Custom: Role (if needed)
  - [ ] Custom: Company Name (if needed)
- [ ] Required vs optional attributes set
- [ ] Display order configured
- [ ] Branding customized (logo, colors)
- [ ] Application linked to user flow

### Power Pages - Identity Provider
- [ ] Entra External ID configured
- [ ] Claims mapping configured (if using custom fields):
  - [ ] extension_Role → actum_role
  - [ ] extension_Country → actum_country
- [ ] Contact mapping with email enabled

### React SPA
- [ ] Register page created
- [ ] Register button redirects to /register
- [ ] Link to login page added

### Testing
- [ ] Can access /register page
- [ ] See Entra External ID registration option
- [ ] Can complete registration
- [ ] Contact created in Dataverse
- [ ] External Identity created
- [ ] Can log in with new account
- [ ] Custom fields populated correctly
```

---

## Next Steps

1. **Coordinate with infrastructure team** to create User Flow
2. **Define which attributes** to collect from users
3. **Test registration flow** end-to-end
4. **Implement React registration page** (simple redirect)
5. **Verify Contact mapping** in Dataverse

**Your users will be able to self-register securely!** 🎉
