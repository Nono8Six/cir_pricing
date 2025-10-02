# 🔐 Secrets Rotation Procedure

## Overview

This document describes how to rotate Supabase API keys and other sensitive credentials for the CIR Pricing application.

---

## When to Rotate Secrets

Rotate secrets immediately if:
- ✅ Keys were accidentally committed to version control
- ✅ Keys were exposed in logs, error messages, or public channels
- ✅ A team member with access leaves the organization
- ✅ You suspect unauthorized access to the project
- ✅ As part of regular security maintenance (recommended: every 90 days)

---

## 1. Rotating Supabase API Keys

### Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (e.g., `cir-pricing`)
3. Navigate to **Settings** → **API**

### Step 2: Generate New Keys

**For Anon/Public Key (`VITE_SUPABASE_ANON_KEY`):**
1. In the API settings, locate the **anon/public** key section
2. Click **"Regenerate anon key"**
3. **IMPORTANT**: Copy the new key immediately (it won't be shown again)
4. Keep the old key active temporarily (see Step 3)

**For Service Role Key (used in Edge Functions):**
1. In the same API settings page, locate **service_role** key
2. Click **"Regenerate service_role key"**
3. Copy the new key immediately

### Step 3: Update Local Environment

1. Open your local `.env` file:
   ```bash
   # In project root
   code .env
   ```

2. Replace the old keys with new ones:
   ```env
   VITE_SUPABASE_URL=https://zribcjrdrblajrhigwxd.supabase.co
   VITE_SUPABASE_ANON_KEY=<NEW_ANON_KEY_HERE>
   ```

3. **DO NOT commit this file** (already in `.gitignore`)

### Step 4: Update Production/Staging Environments

**For Vercel/Netlify deployments:**
1. Go to your hosting provider's dashboard
2. Navigate to project → **Settings** → **Environment Variables**
3. Update `VITE_SUPABASE_ANON_KEY` with the new value
4. Trigger a new deployment to apply changes

**For Edge Functions (Supabase):**
1. Edge Functions automatically use the latest service role key from Supabase
2. No manual update needed unless using custom secrets

### Step 5: Revoke Old Keys (After Verification)

1. Verify the application works with new keys (test login, data fetching)
2. In Supabase Dashboard → **Settings** → **API**
3. Click **"Revoke previous key"** for the old anon key
4. Old keys are now invalidated

---

## 2. Rotating Database Passwords

### Step 1: Access Database Settings

1. Supabase Dashboard → **Settings** → **Database**
2. Locate **Database Password** section

### Step 2: Reset Password

1. Click **"Generate new password"** or **"Reset database password"**
2. Copy the new password immediately
3. Update connection strings in:
   - Edge Functions (if using direct Postgres connections)
   - External analytics tools (if any)
   - CI/CD pipelines (if any)

---

## 3. Updating Edge Functions

If Edge Functions use `SUPABASE_SERVICE_ROLE_KEY`:

1. Navigate to **Edge Functions** in Supabase Dashboard
2. For each function, go to **Settings** → **Secrets**
3. Update `SUPABASE_SERVICE_ROLE_KEY` with the new service role key
4. Redeploy functions:
   ```bash
   supabase functions deploy process-import
   supabase functions deploy create-profile
   ```

---

## 4. Team Communication

When rotating secrets:

1. **Notify the team** via Slack/Email:
   ```
   🔒 Security Notice: Supabase API keys rotated

   Action required:
   - Pull latest .env.example
   - Get new keys from [secure location]
   - Update your local .env file
   - Restart dev server

   Timeline: Old keys revoked in 24h
   ```

2. **Share new keys securely**:
   - Use password manager (1Password, Bitwarden)
   - Use encrypted communication (Signal, Wire)
   - **NEVER** share via email, Slack, or SMS

---

## 5. Verification Checklist

After rotation, verify:

- [ ] Frontend dev server starts without errors
- [ ] Users can login successfully
- [ ] Data fetching works (clients, groups, mappings)
- [ ] Edge Functions execute without auth errors
- [ ] Production/Staging deployments are healthy
- [ ] Old keys are revoked in Supabase Dashboard

---

## 6. Emergency Procedures

### If Keys Were Committed to Git

1. **Immediately** rotate keys (follow steps above)
2. Clean git history:
   ```bash
   # Option 1: BFG Repo Cleaner (recommended)
   git clone --mirror <repo-url>
   bfg --replace-text passwords.txt <repo.git>
   cd <repo.git>
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force

   # Option 2: Git filter-branch (slower)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   git push --force --all
   ```

3. Force all team members to re-clone:
   ```bash
   rm -rf cir_pricing
   git clone <repo-url>
   ```

### If Keys Were Exposed Publicly

1. Rotate keys immediately (within 1 hour)
2. Check Supabase **Logs** → **API** for unauthorized access
3. Review recent database changes in **Database** → **Query History**
4. Enable **RLS** on all tables if not already enabled
5. Consider enabling **2FA** on Supabase account

---

## 7. Automated Rotation (Future Enhancement)

To implement automated key rotation:

1. Use Supabase Management API to programmatically rotate keys
2. Schedule rotation via cron job (every 90 days)
3. Automatically update secrets in:
   - Vercel/Netlify via their APIs
   - Password manager via CLI tools
4. Send notifications to team

**Example script** (reference only):
```typescript
// supabase/scripts/rotate-keys.ts
import { createClient } from '@supabase/supabase-js';

async function rotateAnonKey() {
  const managementClient = createClient(
    process.env.SUPABASE_MANAGEMENT_URL!,
    process.env.SUPABASE_MANAGEMENT_KEY!
  );

  // Call management API to rotate key
  const { data, error } = await managementClient
    .from('projects')
    .rpc('rotate_anon_key', { project_id: 'xxx' });

  if (error) throw error;
  console.log('New anon key:', data.anon_key);

  // Update Vercel environment variables
  await updateVercelEnv('VITE_SUPABASE_ANON_KEY', data.anon_key);
}
```

---

## 8. Reference

- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

**Last Updated**: 2025-02-10
**Owner**: DevOps Team
**Review Frequency**: Quarterly
