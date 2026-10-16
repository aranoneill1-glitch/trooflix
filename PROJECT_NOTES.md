# Trooflix — Living Project Notes

## Stack
Next.js 16 · React 19 · Tailwind 3 · Supabase (auth+DB) · Cloudflare R2 (files) · Vercel KV · Vercel

## Workflow
1. Change via bash command
2. npm run build — must be clean
3. git add . && git commit -m "..." && git push
4. Wait ~2 min → Vercel deploys
5. Test on phone, hard refresh

## Infrastructure
- Domain: trooflixtv.com (308 → www.trooflixtv.com)
- R2 bucket: trooflix-videos
- R2 public URL: https://pub-ce2ee455d2b04abc9964046e3ff970f0.r2.dev
- Supabase: trooflix (confirm email OFF)
- Admin password stored in Vercel env (ADMIN_PASSWORD)
- Admin URL: /admin/login (cookie: trooflix_admin)

## PWA
- Main app: manifest.json, icon-192/512, apple-touch-icon, sw.js
- Admin app: manifest-admin.json, admin-icon-192/512, admin-apple-touch-icon
- Install main from trooflixtv.com, install admin from trooflixtv.com/admin/login

## Recent fixes (2026-10-16)
- Public user profile /u/[handle] — follow, DM, stats, posts grid
- Followers/following registering correctly
- DetailModal Plus/Like buttons functional
- Feed: neighbor video preload (no poster flash)
- Comments: real user avatar in input rows
- Comments: reply placeholder fixed
- Fullscreen: collapsible left rail with mute, tap + to open
- Fullscreen: rail moved left, includes mute
- Feed: mute button bottom-left
- Home: modal action buttons uniform
- Admin dashboard: grouped stats + action tiles
- Admin podcasters: hide form until Add clicked
- Profile: hamburger removed, contents in Dashboard sheet
- PWA: TF logo icon + admin icon

## Accounts state
- All users cleared, all KV creators cleared (2026-10-15)
- Loose Change is the only video (TROOFLIX original)
- TROOFLIX creator recreated with logo

## Backups on Desktop
- full-user-backup-*.json
- auth-users-backup-*.json
- creators-backup-*.json
- videos-backup-*.json
- videos-before-delete-*.json

## Open items / TODO
- Video preload speedup (R2 cache headers, conditional preload, preload on tap)
- Search results: add verified badges (only /search page has them, not TopBar inline)
- DM thread: reply input styling has old look
- Admin password rotation (visible in chat logs — recommend rotating soon)
- Push notifications for PWA
- Native iOS via Capacitor (parked — needs native features to pass Apple review)
- Continue Watching row (was removed)
- Password reset flow for users who gave recovery email

## Known bugs to watch
- Middleware/Proxy: middleware.ts must stay as proxy.ts for Next.js 16
