const fs = require("fs");
const p = "src/components/HomeFeedCard.tsx";
let s = fs.readFileSync(p, "utf8");

// 1) Add commentCount state so we can track the number
const statePoint = `  const [viewCount, setViewCount] = useState(0);`;
const newState = `  const [viewCount, setViewCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);`;
if (!s.includes("commentCount")) {
  s = s.replace(statePoint, newState);
}

// 2) Fetch comment count along with the other counts
const fetchPoint = `    fetch("/api/views")
      .then((r) => r.json())
      .then((d) => setViewCount(d.counts?.[video.id] || 0))
      .catch(() => {});`;
const newFetch = `    fetch("/api/views")
      .then((r) => r.json())
      .then((d) => setViewCount(d.counts?.[video.id] || 0))
      .catch(() => {});
    fetch(\`/api/comments?video_id=\${video.id}\`)
      .then((r) => r.json())
      .then((d) => setCommentCount(Array.isArray(d.comments) ? d.comments.filter((c: any) => !c.parent_id).length : 0))
      .catch(() => {});`;
if (!s.includes("/api/comments?video_id=")) {
  s = s.replace(fetchPoint, newFetch);
}

// 3) Update the UI to remove the words "Like" and "Comment" and replace with numbers
const oldActions = `              <button onClick={toggleLike} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
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
              </div>`;

const newActions = `              <button onClick={toggleLike} className="flex items-center gap-2 text-white/90 hover:text-white transition">
                <ThumbsUp size={20} fill={liked ? "#E53945" : "none"} className={liked ? "text-[#E53945]" : "text-white"} />
                {likeCount > 0 && <span className="text-[13px] font-medium">{likeCount}</span>}
              </button>
              <button onClick={onOpenComments} className="flex items-center gap-2 text-white/90 hover:text-white transition">
                <MessageCircle size={20} />
                {commentCount > 0 && <span className="text-[13px] font-medium">{commentCount}</span>}
              </button>
              <div className="flex items-center gap-2 text-white/60">
                <Eye size={20} />
                {viewCount > 0 && <span className="text-[13px] font-medium">{viewCount}</span>}
              </div>`;

if (!s.includes(oldActions)) { console.error("ACTIONS NOT FOUND"); process.exit(1); }
s = s.replace(oldActions, newActions);

fs.writeFileSync(p, s, "utf8");
console.log("OK: Replaced labels with counts, added comment count fetch.");
