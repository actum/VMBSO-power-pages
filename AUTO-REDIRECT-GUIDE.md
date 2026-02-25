# Automatic Redirect to Entra External ID Login

## Yes! You Can Set Automatic Redirect ✅

**Answer:** YES, you can automatically redirect unauthenticated users directly to Entra External ID login, skipping the Power Pages sign-in page completely.

## How It Works

### Default Behavior (Without Setting as Default)

```
Unauthenticated user visits /documents
    ↓
React redirects to /login
    ↓
/login redirects to /signin
    ↓
Power Pages /signin page shows:
    ┌──────────────────────────────┐
    │  Local Sign In (if enabled)  │
    ├──────────────────────────────┤
    │  OR                          │
    ├──────────────────────────────┤
    │  [Microsoft Entra External ID]│ ← User must click this button
    └──────────────────────────────┘
    ↓
User clicks button
    ↓
Redirected to Entra External ID login
```

**User experience:** Two steps (see sign-in page, click button)

### With Entra External ID Set as Default ✅

```
Unauthenticated user visits /documents
    ↓
React redirects to /login
    ↓
/login redirects to /signin
    ↓
Power Pages AUTOMATICALLY redirects to Entra External ID
    ↓
User sees Entra External ID login page directly!
```

**User experience:** Seamless redirect (one step, no intermediate page!)

## Configuration Steps

### Step 1: Navigate to Power Pages Identity Providers

```
1. Open Power Pages Design Studio
2. Go to: Security → Identity providers
3. You'll see a list of all configured identity providers
```

### Step 2: Set Entra External ID as Default

```
1. Find "Microsoft Entra External ID" in the list
2. Click the "..." (More Commands) button to the right
3. Select "Set as default"
4. Confirm
```

**Visual Guide:**
```
Identity Providers List:
┌──────────────────────────────────────────────┐
│ Local Sign In                    [...]        │
├──────────────────────────────────────────────┤
│ Microsoft Entra External ID      [...] ←Click │ 
│                                   │           │
│                                   ├─ Edit     │
│                                   ├─ Set as default ✓
│                                   └─ Delete   │
└──────────────────────────────────────────────┘
```

### Step 3: Disable Local Login (Recommended)

**To prevent users from bypassing Entra External ID:**

```
Power Pages Design Studio:
1. Security → Identity providers
2. Find "Local Sign In"
3. Click "..." → Disable

OR via Site Settings:
1. Portal Management App
2. Site Settings
3. Find: Authentication/Registration/LocalLoginEnabled
4. Set Value: false
```

### Step 4: Restart Site (Important!)

```
1. Power Pages Design Studio → Set up workspace
2. Click "Open the admin center"
3. Power Platform admin center opens
4. Select your site
5. Click "Site Actions" → "Restart site"
6. Wait 2-3 minutes for restart to complete
```

**Why restart?** Authentication settings are cached server-side. Restart clears the cache.

## What Happens After Configuration

### For Login

**Before (without default):**
```
User → /login → /signin page → Click button → Entra login
```

**After (with default):**
```
User → /login → Automatically redirected → Entra login
```

### For Registration

**Same behavior applies:**
```
User → /register → Automatically redirected → Entra registration
```

### For Protected Routes in React

Your React `ProtectedRoute` component works exactly the same:

```typescript
// This code doesn't change!
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <CircularProgress />;
  }

  if (!isAuthenticated) {
    // This redirect now goes straight to Entra External ID!
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

**The magic:** Setting Entra External ID as default makes `/signin` and `/login` automatically redirect to Entra without showing the sign-in page.

## Single Sign-On (SSO) Bonus

**Extra benefit:** If the user is already signed into Entra External ID in another app, they'll be automatically signed into your Power Pages app too!

```
User signed into App A (using same Entra External ID tenant)
    ↓
User visits your Power Pages site
    ↓
Automatically authenticated (no login needed!)
```

This is called **Single Sign-On (SSO)** and works automatically when using Entra External ID.

## Configuration Via Site Settings (Alternative Method)

If you need to configure via Portal Management App:

### Method: Using Site Settings

```
Portal Management App → Site Settings

Create or modify:
Name: Authentication/Registration/LoginButtonAuthenticationType
Value: https://login.microsoftonline.com/{tenant-id}/
       OR
       https://{tenant-name}.ciamlogin.com/

Description: 
When set, the Sign In button bypasses the sign-in page and 
redirects directly to the specified identity provider.
```

**Important:** Replace `{tenant-id}` or `{tenant-name}` with your actual values.

## Testing the Configuration

### Test 1: Direct Login Test

```
1. Open incognito/private browser window
2. Navigate to: https://site-alfw4.powerappsportals.com/signin
3. Expected result: Immediately redirected to Entra External ID login
4. Should NOT see Power Pages sign-in page with buttons
```

### Test 2: Protected Route Test

```
1. Open incognito/private browser window
2. Navigate directly to: https://site-alfw4.powerappsportals.com/documents
3. Expected result: Immediately redirected to Entra External ID login
4. Complete login
5. Expected result: Redirected back to /documents
```

### Test 3: React App Test

```
1. Open incognito/private browser window
2. Navigate to your React app root
3. Try to access protected route
4. Expected result: Seamless redirect to Entra External ID
5. No intermediate sign-in page visible
```

## Remove Default (If Needed)

To restore the sign-in page with multiple options:

```
Power Pages Design Studio:
1. Security → Identity providers
2. Find "Microsoft Entra External ID"
3. Click "..." → "Remove as default"
4. Restart site
```

## Best Practices

### ✅ Recommended Configuration

```
✅ Set Entra External ID as default
✅ Disable Local Sign In
✅ Restart site after changes
✅ Test in incognito browser
✅ Verify SSO works across apps
```

### ⚠️ Important Notes

**Note 1: Only ONE default allowed**
- You can only set ONE identity provider as default
- Setting a new default removes the previous one

**Note 2: Restart is required**
- Changes take 2-3 minutes to propagate
- Always restart site after authentication changes
- Test in incognito to avoid cache issues

**Note 3: Local login availability**
- Even with Entra as default, local login can still be accessed via direct URL
- To fully prevent local login, disable it explicitly

## User Experience Comparison

### Without Default (Current)

```
User journey:
1. Visit /documents
2. Redirected to /login
3. See Power Pages sign-in page
4. Click "Microsoft Entra External ID" button
5. Redirected to Entra login
6. Enter credentials
7. Redirected to /documents

Total steps: 7
User confusion: Possible (which button to click?)
```

### With Default (Recommended) ✅

```
User journey:
1. Visit /documents
2. Automatically redirected to Entra login
3. Enter credentials
4. Redirected to /documents

Total steps: 4
User confusion: None (seamless flow)
```

**Improvement:** 3 fewer steps, clearer UX!

## React Code Implications

### Good News: No React Code Changes Needed! 🎉

Your existing React authentication code works exactly the same:

```typescript
// Login - Still works!
const login = () => {
  window.location.href = '/signin?returnUrl=/documents';
  // Now automatically redirects to Entra External ID!
};

// Register - Still works!
const register = () => {
  window.location.href = '/register?returnUrl=/documents';
  // Now automatically redirects to Entra External ID!
};

// Protected routes - Still work!
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
  // Now goes straight to Entra External ID!
}
```

**The magic happens server-side** in Power Pages - your React code stays the same!

## Summary Checklist

```markdown
## Configuration Checklist

### Power Pages Setup
- [ ] Navigate to Security → Identity providers
- [ ] Click "..." next to "Microsoft Entra External ID"
- [ ] Select "Set as default"
- [ ] Confirm
- [ ] (Optional) Disable Local Sign In
- [ ] Restart site via admin center
- [ ] Wait 2-3 minutes for restart

### Testing
- [ ] Open incognito browser
- [ ] Navigate to /signin directly
- [ ] Verify: Auto-redirect to Entra (no sign-in page)
- [ ] Navigate to /documents directly
- [ ] Verify: Auto-redirect to Entra login
- [ ] Complete login
- [ ] Verify: Redirected to /documents successfully

### React App
- [ ] No code changes needed ✓
- [ ] Test protected routes work
- [ ] Test login flow works
- [ ] Test registration flow works

### Optional
- [ ] Test SSO (if user logged into other app)
- [ ] Verify mobile browser behavior
- [ ] Test logout and re-login flow
```

## Troubleshooting

### Issue: Still seeing sign-in page after setting default

**Cause:** Cache not cleared or site not restarted

**Solution:**
```
1. Restart site via Power Platform admin center
2. Wait 2-3 minutes
3. Clear browser cache
4. Test in incognito/private window
5. Check if default is actually set (Power Pages → Security → Identity providers)
```

### Issue: Getting error "Provider not found"

**Cause:** Configuration mismatch or provider not fully configured

**Solution:**
```
1. Verify Entra External ID is configured correctly
2. Check Client ID, Authority, Metadata URL are correct
3. Verify App Registration in Azure
4. Restart site
```

### Issue: Redirect loop

**Cause:** Misconfiguration in returnUrl or provider settings

**Solution:**
```
1. Check redirect URIs in Azure App Registration
2. Verify they match Power Pages reply URL exactly
3. Check for extra slashes or typos
4. Test with simple returnUrl like /
```

## Final Recommendation

### For Your VMBSO Project: ✅ Set as Default

**Recommended configuration:**

1. ✅ Set Entra External ID as default identity provider
2. ✅ Disable Local Sign In completely
3. ✅ Test thoroughly in incognito

**Benefits for your users:**
- Seamless login experience
- No confusion about which button to click
- SSO across multiple apps (if applicable)
- Professional, branded experience
- Faster authentication flow

**Result:** Users go directly from your React app to Entra External ID login - smooth and professional! 🎯
