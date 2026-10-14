# Trooflix — Living Project Notes (2026-10-14)

## Stack
Next.js 16 · React 19 · Tailwind 3 · Supabase · Cloudflare R2 · Vercel KV · Vercel

## Working style
- Change via bash command only
- npm run build MUST pass before commit
- git add . && git commit -m "..." && git push → Vercel deploys ~2 min
- One step at a time, wait for output

## Infrastructure
- Domain: trooflixtv.com (308 → www.trooflixtv.com)
- R2 bucket: trooflix-videos
- R2 public URL: https://pub-ce2ee455d2b04abc9964046e3ff970f0.r2.dev
- R2 CORS: trooflixtv.com, www.trooflixtv.com, trooflix-tv.vercel.app, localhost:3000
- Supabase: trooflix (confirm email OFF)
- Vercel: trooflix/trooflix

## Supabase tables
- profiles (user_id, username, display_name, avatar_url, bio)
- follows (follower_id, creator_id)
- user_follows (follower_id, following_id)
- creator_applications (user_id, creator_name, bio, photo_url, status, admin_notes)
- comments, comment_likes, likes, my_list, views, direct_messages, podcaster_messages

## KV keys
- trooflix:creators — array of creators (id, name, slug, photoUrl, heroBackdropUrl, description, ownerUserId, hidden)
- trooflix:videos — array of videos (id, title, description, category, type, creatorId, bitchuteUrl, posterUrl, backdropUrl)

## Admin
- /admin (password-gated via cookie, ADMIN_PASSWORD env)
- /admin/login
- /admin/applications (creator approvals)

## Creator system
- Signup: Viewer or Creator choice
- Creator → /apply
- Admin approves → adds to KV creators + status approved
- /creator dashboard (own videos only)
- /creator/upload (forces creatorId server-side)
- /creator/settings (name, slug, bio, photo, hero, delete)
- Soft delete: hidden=true → removed from /podcasts

## Auth
- Email + @handle signup (no verification)
- Login: email OR @handle via /api/resolve-login
- Password reset only via recovery email

## Feed /feed
- X-style cards: author row, flush video, action rail, IG caption
- Tap video → fullscreen (resumes time)
- Double-tap → heart + like (externalLike event bus)
- Fullscreen: CSS snap scroll, swipe up/down with loop
- Fullscreen: right rail stacked counts, center play/mute, 2s auto-hide
- Fullscreen: swipe right → close, returns time
- Comments: drawer from bottom (Instagram style)

## Messages /messages
- Inbox + thread, WhatsApp-style, 3s poll
- Pure black background, pinned header via 100dvh

## Home /
- Rows: Explore Our Collection · New Releases · Trending Now · Podcasts · Documentaries
- Podcaster videos only in Podcasts row
- Podcasts row cards show creator avatar

## Search /search
- Bottom nav tab → Videos · Podcasters · Users

## Known gaps / TODO
- /u/[handle] public user profile (search + follow links 404)
- Giphy integration for comments (paused)
- Native iOS app (Capacitor removed, revisit later)
- Push notifications
- Video preload speedup: cache headers on R2, conditional preload, preload on tap
- /creator/edit/[id] page (Edit button 404s)
- Password reset flow

## Deploy notes
- Never commit .env.local or .env.vercel
- Vercel secrets can't be viewed after creation — delete + re-add
- R2 Access Key ID rotated 2026-10-14

## Workflow
- Build: cd ~/Desktop/my-platform && npm run build
- Deploy: git add . && git commit -m "..." && git push
- Dev: npm run dev
