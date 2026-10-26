# Trooflix — Project State & Blueprint

## 🚀 Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS, Framer Motion
- **Backend:** Supabase (Auth & DB), Vercel KV (Video Data & Creators)
- **Payments:** Stripe (Subscriptions & Merch)
- **Storage:** Cloudflare R2 (Videos, Images, Avatars)
- **Mobile:** Capacitor (iOS & Android APK for TV)

## ✅ What We Have Built So Far

### 1. The Video Player (Elite Edition)
- Custom `AppleVideoPlayer` used everywhere (no more default browser players).
- **Thumb-friendly UI:** Play, pause, rewind, and fast-forward are moved to the bottom of the screen.
- **Instant Play:** Removed the 3-second `VideoIntro` loading screen. Clicking play from a modal goes straight to the video.
- **Podcast Features:** Playback speed (1x, 1.5x, 2x), Sleep Timer (15/30/45 mins), and Chapters support.
- **Background Audio:** Uses the Media Session API so audio keeps playing when the phone is locked.

### 2. Creator Hub (Viewer Perspective)
- **Cinematic Hero:** The page opens with a full-width hero banner of the creator's latest video, with text saying "[Creator Name] PRESENTS".
- **Overlapping Header:** Avatar, Name, Bio, and Stats slide up to overlap the hero.
- **4 Clean Tabs:** Home, Library, Store, Premium.
- **Unified Store:** Merch and Books are combined into one beautiful store grid.
- **Admin Hidden:** The `Edit Profile` and `Dashboard` buttons are hidden behind a small gear/3-dots menu for the owner only.

### 3. Creator Studio (Creator Perspective)
- **New Sidebar:** 4 clean sections (Dashboard, Content, Monetization, Settings).
- **Dashboard:** Shows Total Views, Subscribers, Gross Revenue, and a "Creator Wallet" with a progress bar for the $15 Setup Fee recoupment.
- **Content Management:** Upload flow supports Publish Now, Save as Draft, or Schedule for later.
- **Delete Feature:** Restored the delete API and added a quick-delete Trash icon directly to the Studio Dashboard.
- **RSS Feed:** Creators can copy their RSS link to submit to Apple Podcasts (auto-injects Trooflix branding into show notes).

### 4. Notifications & Growth
- **Push Notifications:** Working on Web (requires PWA install on iOS). Triggers for DMs, Likes, Comments, Follows, and Orders.
- **Stripe:** Fully wired for subscriptions, merch, and creator payouts.
- **Feed:** Currently open to everyone, but we decided to restrict it to Creators only.

---

## 🏗️ The Business Model (Agreed Upon)
1. **Free Viewers:** Can watch content and like videos, but **cannot comment** (must buy Trooflix Pass to comment).
2. **Trooflix Pass ($9.99/mo):** Unlocks commenting, community features, and platform-exclusive content.
3. **Creator Premium (Set by Creator):** VIP content for superfans. Creator keeps 90%, Trooflix takes 10%.
4. **The $15 Setup Fee:** No upfront cost for creators. Trooflix takes the first $15 a creator makes to cover hosting, then it's 90/10.

---

## 🚧 IMMEDIATE NEXT STEPS (The Blueprint)
If the chat ends, start here:

1. **Feed Restriction:** Only allow approved creators to post to the Feed. It becomes a "Trailer Funnel" for creators.
2. **Card Badges:** Add visual badges to thumbnails (Green = Free, Red = TF Pass, Yellow = Premium) so viewers know what they are clicking.
3. **Comment Lock:** Update `InlineComments.tsx` and `CommentDrawer.tsx` to lock the input box for users without a Trooflix Pass.

---

## 🛠️ STRICT WORKFLOW RULES FOR THE AI
**You MUST follow this exact format for every single task. Do not deviate.**

### 1. The Fix
- Provide a single bash block (usually `cat > file << 'EOF'`) to write or edit the code.
- If the file path has nested folders that might not exist, use `mkdir -p` first.

### 2. The Build
- Provide the build command *separately* on its own line:
`npx tsc --noEmit 2>&1 | head -10 && npm run build 2>&1 | tail -6`
- Wait for the user to paste the output. **Do not proceed to push until they confirm it is clean.**

### 3. The Push
- Only if the build is clean, provide the push command *separately*:
`git add -A && git commit -m "..." && git push`
- **NEVER combine the build and push.** They must be separate messages.
- **NEVER run `npx vercel --prod`** manually. GitHub pushes automatically trigger Vercel deployments.

### 4. The Testing List
- Always provide a checklist (markdown checkboxes) of what the user needs to test on their device after the Vercel deployment succeeds.
