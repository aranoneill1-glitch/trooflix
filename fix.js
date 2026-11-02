const fs = require("fs");
const p = "src/app/profile/[username]/page.tsx";
let s = fs.readFileSync(p, "utf8");

// 1. Update the Videos Tab filter to exclude Tweets and Shorts
const oldFilter = `  const filteredVideos = videos.filter(v => {
    if (activeContentTab === "Videos") return !v.type?.toLowerCase().includes("podcast");
    return true;
  });`;

const newFilter = `  const filteredVideos = videos.filter(v => {
    if (activeContentTab === "Videos") {
      const t = v.type?.toLowerCase();
      // Exclude podcasts, tweets, and shorts from the Videos tab
      return !t?.includes("podcast") && t !== "tweet" && t !== "short";
    }
    return true;
  });

  // Only show videos marked as premium in the Premium tab
  const premiumVideos = videos.filter(v => v.visibility === "premium" || v.is_premium === true);`;

if (!s.includes(oldFilter)) { console.error("FILTER BLOCK NOT FOUND"); process.exit(1); }
s = s.replace(oldFilter, newFilter);

// 2. Update the Premium Tab rendering to use premiumVideos
const oldPremiumStart = `              {activeContentTab === "Premium" && (
                <div className="w-full">
                  {videos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No premium content yet.</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {videos.map((video) => (`;

const newPremiumStart = `              {activeContentTab === "Premium" && (
                <div className="w-full">
                  {premiumVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No premium content yet.</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {premiumVideos.map((video) => (`;

if (!s.includes(oldPremiumStart)) { console.error("PREMIUM BLOCK NOT FOUND"); process.exit(1); }
s = s.replace(oldPremiumStart, newPremiumStart);

fs.writeFileSync(p, s, "utf8");
console.log("OK: Profile page rules enforced (Videos tab filters out Tweets/Shorts, Premium tab only shows Premium).");
