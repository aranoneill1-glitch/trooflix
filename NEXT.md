# Next session — start here

## Immediate task
Avatar upload is broken. Missing R2 env vars in `.env.local`.

### Step 1 — get these 5 values from Cloudflare R2 dashboard:
- R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
- R2_ACCESS_KEY_ID=...
- R2_SECRET_ACCESS_KEY=...
- R2_BUCKET_NAME=...
- R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

### Step 2 — add to .env.local AND Vercel env vars
### Step 3 — npm run dev, test upload at /account
### Step 4 — npm run build, push, test on trooflixtv.com

## What's done
- Signup (email + @handle + password, no verification)
- Login (email OR @handle)
- DMs (inbox + thread, WhatsApp-style, 3s poll)
- @handle system with live availability check
