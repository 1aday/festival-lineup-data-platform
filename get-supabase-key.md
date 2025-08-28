# How to Get Your Correct Supabase Anon Key

## The Problem
Your current key `sb_publishable_QFwxwWvwK_FjBqaLzvUUpg_C7yqK8CU` is NOT a valid Supabase anon key.

## What You Need
You need the **anon/public key** which:
- Starts with `eyJ`
- Is a JWT token (200+ characters long)
- Looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...`

## Steps to Get the Correct Key:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `dserkmnafeptkfaggdey`

2. **Navigate to API Settings**
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **API** in the settings menu

3. **Find the Correct Key**
   - Look for a section called **"Project API keys"**
   - You'll see two keys:
     - `anon` `public` - **THIS IS WHAT YOU NEED!** ✅
     - `service_role` `secret` - Don't use this one ❌

4. **Copy the anon key**
   - It should start with `eyJ...`
   - It will be very long (200+ characters)
   - Click the copy button next to it

5. **Update your .env.local file**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://dserkmnafeptkfaggdey.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=... (paste the long key here)
   ```

## Visual Guide
In the Supabase dashboard, it looks like this:
```
Project API keys
anon public    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  [Copy]
               ↑ THIS ONE - It's a JWT token starting with eyJ
```

## Important Notes
- The key you currently have (`sb_publishable_...`) might be from a different service
- Make sure you're copying the "anon public" key, not the "service_role" key
- The key should be a JWT token (you can decode it at jwt.io to verify)

After updating with the correct key, restart your Next.js server for the changes to take effect!
