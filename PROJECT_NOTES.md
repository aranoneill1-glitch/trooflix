# Trooflix — Project Notes

## Stack
Next.js 16 · React 19 · Tailwind 3 · Supabase · Cloudflare R2 · Vercel KV · Vercel

## Workflow
1. bash command
2. npm run build — must be clean
3. git add . && git commit -m "..." && git push
4. Wait ~2 min → Vercel deploys

## Perf pass (2026-10-16)
- src/lib/cache.ts — global caches: auth user, videos, creators, per-user profile
- Every page uses getCachedUser() instead of supabase.auth.getUser()
- 11 pages use getCachedVideos() / getCachedCreators() (60s TTL)
- CacheWarmer component in root layout — preloads videos/creators on boot
- next.config.ts: experimental.staleTimes { dynamic: 30, static: 180 }
- MobileBottomNav: prefetchTab() on hover/touch
- /api/upload: CacheControl public max-age=31536000 immutable
- All 141 R2 objects already had cache headers (no backfill needed)

## DM overhaul (2026-10-16)
- Thread (/messages/[userId]): Instagram dark, red bubbles for you, grey for them
- Composer: [📷] [Message… GIF] [Send] — safe-area bottom padding
- Inbox (/messages): Instagram flat list, dark, 64px avatars, blue unread dot
- All names display without @ prefix (search modal keeps @handle subline)

## Feed (2026-10-16)
- Fullscreen removed — tap toggles play/pause silently
- Single source of truth: FeedPage's activeIndex drives isActive per card
- No per-card IntersectionObservers (only 1 at FeedPage level)
- Caption with "... more" expand on long descriptions
- Neighbor preload was removed (was causing audio bleed + lag)
- Mute button bottom-left

## Public profiles
- /u/[handle] — avatar, bio, stats, posts grid, follow, DM
- UserFollowButton + FollowStats wired

## Admin
- Password in Vercel env: ADMIN_PASSWORD
- Admin PWA: manifest-admin.json, admin-icon-*.png, apple-touch-icon
- /admin/login (cookie: trooflix_admin)
- Overview: grouped stats + action tiles

## Known items
- Search inline component (SearchResults) doesn't show verified badges — /search page does
- Podcaster page: still works
- Push notifications not wired
- R2 backfill: not needed (all cached)
- Native iOS: parked (Capacitor was orphaned, FeedFullscreenPlayer.tsx still on disk)

## Backups on Desktop (do not delete until safe)
- full-user-backup-*.json
- auth-users-backup-*.json
- creators-backup-*.json
- videos-backup-*.json
- videos-before-delete-*.json
