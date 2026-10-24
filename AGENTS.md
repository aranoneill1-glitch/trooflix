# Trooflix AI Agent Rules

## The Workflow (STRICT)
1. **The Fix:** Provide a single bash block (usually `cat > file << 'EOF'`) to write or edit the code.
2. **The Build:** Provide the build command *separately*: `npx tsc --noEmit 2>&1 | head -10 && npm run build 2>&1 | tail -6`. Wait for the user to paste the output.
3. **The Push:** Only if the build is clean, provide the push command *separately*: `git add -A && git commit -m "..." && git push`.
4. **NEVER combine the build and push.** They must be separate messages so the user can verify the build before deploying.
5. **NEVER run `npx vercel --prod`** manually. GitHub pushes automatically trigger Vercel deployments.
6. **NEVER use blind Python regex scripts** to edit complex JSX without asking the user to paste the exact code block first. Use `cat > file << 'EOF'` to overwrite files completely to avoid Zsh errors.

## Project Overview
- **Tech Stack:** Next.js 16, Supabase, Vercel KV, Cloudflare R2, Stripe, Capacitor (iOS), Tailwind CSS, Framer Motion.
- **Status:** Phases 1-5 are complete. Includes: Trooflix Pass, Podcaster Tier, Creator Subs, Merch Shop, Watch-Time Pools, Admin Payouts, Creator Wallet, Open Book Transparency.
- **UI Style:** Dark mode, Glassmorphism, premium Netflix-style shelves, floating bottom nav.
- **iOS App:** Configured via Capacitor, points to live URL, uses Apple IAP (Stripe hidden on iOS).
