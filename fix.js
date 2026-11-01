const fs = require("fs");
const p = "src/components/HomeFeedCard.tsx";
let s = fs.readFileSync(p, "utf8");

// 1) Add Eye icon + getCachedUser import
if (!s.includes("import { Play, VolumeX, Volume2, MoreVertical, Maximize, ThumbsUp, MessageCircle, Share2, Bookmark, Eye }")) {
  s = s.replace(
    /import \{ Play,[^}]+\} from "lucide-react";/,
    `import { Play, VolumeX, Volume2, MoreVertical, Maximize, ThumbsUp, MessageCircle, Share2, Bookmark, Eye } from "lucide-react";\nimport { getCachedUser } from "@/lib/cache";`
  );
}

// 2) Replace the existing state block with stats + user tracking
const oldState = `  const [liked, setLiked] = useState(false);\n  const [likeCount, setLikeCount] = useState(0);`;
const newState = `  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [anonId, setAnonId] = useState<string | null>(null);
  const hasRecordedView = useRef(false);

  // Resolve identity (logged in or anon)
  useEffect(() => {
    getCachedUser().then((u: any) => {
      if (u?.id) {
        setUserId(u.id);
      } else {
        let a = localStorage.getItem("trooflix:anon_id");
        if (!a) {
          a = "anon_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem("trooflix:anon_id", a);
        }
        setAnonId(a);
      }
    });
  }, []);

  // Fetch initial counts
  useEffect(() => {
    fetch("/api/like-counts")
      .then((r) => r.json())
      .then((d) => setLikeCount(d.counts?.[video.id] || 0))
      .catch(() => {});
    fetch("/api/views")
      .then((r) => r.json())
      .then((d) => setViewCount(d.counts?.[video.id] || 0))
      .catch(() => {});
  }, [video.id]);

  // Check if already liked by this user
  useEffect(() => {
    const id = userId || anonId;
    if (!id) return;
    const url = userId ? \`/api/likes?user_id=\${userId}\` : \`/api/likes?anon_id=\${anonId}\`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setLiked(Array.isArray(d.ids) && d.ids.includes(video.id)))
      .catch(() => {});
  }, [userId, anonId, video.id]);

  // Record a view when active (once per mount)
  useEffect(() => {
    if (isActive && !hasRecordedView.current && (userId || anonId)) {
      hasRecordedView.current = true;
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id }),
      })
        .then(() => setViewCount((c) => c + 1))
        .catch(() => {});
    }
  }, [isActive, userId, anonId, video.id]);

  const toggleLike = async () => {
    if (!userId && !anonId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, anonId, videoId: video.id }),
      });
      const data = await res.json();
      // Reconcile with server truth
      if (typeof data.liked === "boolean") {
        setLiked(data.liked);
        setLikeCount((c) => {
          if (data.liked && !wasLiked) return c; // already counted optimistically
          if (!data.liked && wasLiked) return c;
          return data.liked ? c : Math.max(0, c - 1);
        });
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
    }
  };`;

if (!s.includes(oldState)) { console.error("STATE BLOCK NOT FOUND"); process.exit(1); }
s = s.replace(oldState, newState);

// 3) Update the actions block to show counts + Eye icon
const oldActions = `<div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-5">
              <button onClick={onToggleLike} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <ThumbsUp size={18} fill={isLiked ? "#E53945" : "none"} className={isLiked ? "text-[#E53945]" : "text-white"} />
                <span className="text-[13px] font-medium">Like</span>
              </button>
              <button onClick={onOpenComments} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <MessageCircle size={18} />
                <span className="text-[13px] font-medium">Comment</span>
              </button>
              <button className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <Share2 size={18} />
                <span className="text-[13px] font-medium">Share</span>
              </button>
            </div>
            <button className="text-white/90 hover:text-white transition">
              <Bookmark size={20} />
            </button>
          </div>`;

const newActions = `<div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-5">
              <button onClick={toggleLike} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <ThumbsUp size={18} fill={liked ? "#E53945" : "none"} className={liked ? "text-[#E53945]" : "text-white"} />
                <span className="text-[13px] font-medium">{likeCount > 0 ? likeCount : "Like"}</span>
              </button>
              <button onClick={onOpenComments} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <MessageCircle size={18} />
                <span className="text-[13px] font-medium">Comment</span>
              </button>
              <div className="flex items-center gap-1.5 text-white/60">
                <Eye size={18} />
                <span className="text-[13px] font-medium">{viewCount > 0 ? viewCount : "0"}</span>
              </div>
            </div>
            <button className="text-white/90 hover:text-white transition">
              <Bookmark size={20} />
            </button>
          </div>`;

if (!s.includes(oldActions)) { console.error("ACTIONS BLOCK NOT FOUND"); process.exit(1); }
s = s.replace(oldActions, newActions);

fs.writeFileSync(p, s, "utf8");
console.log("OK: HomeFeedCard wired to existing likes/views APIs.");
