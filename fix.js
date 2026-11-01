const fs = require("fs");
const p = "src/components/HomeFeedCard.tsx";
let s = fs.readFileSync(p, "utf8");

// Find the entire actions block and replace it with a clean, always-visible count version
const oldActionsBlock = `          <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-5">
              <button onClick={toggleLike} className="flex items-center gap-2 text-white/90 hover:text-white transition">
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
              </div>
            </div>
            <button className="text-white/90 hover:text-white transition">
              <Bookmark size={20} />
            </button>
          </div>`;

const newActionsBlock = `          <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-6">
              <button onClick={toggleLike} className="flex items-center gap-2 text-white/90 hover:text-white transition group">
                <ThumbsUp size={20} fill={liked ? "#E53945" : "none"} className={liked ? "text-[#E53945]" : "text-white group-hover:scale-110"} />
                <span className="text-[13px] font-bold">{likeCount}</span>
              </button>
              <button onClick={onOpenComments} className="flex items-center gap-2 text-white/90 hover:text-white transition group">
                <MessageCircle size={20} className="group-hover:scale-110" />
                <span className="text-[13px] font-bold">{commentCount}</span>
              </button>
              <div className="flex items-center gap-2 text-white/60">
                <Eye size={20} />
                <span className="text-[13px] font-bold">{viewCount}</span>
              </div>
            </div>
            <button className="text-white/90 hover:text-white transition">
              <Bookmark size={20} />
            </button>
          </div>`;

if (!s.includes(oldActionsBlock)) {
  console.error("ACTIONS BLOCK NOT FOUND - Checking for alternate string");
  // Fallback if the string has whitespace differences
  const fallbackRegex = /<div className="flex items-center justify-between mt-2 pt-3 border-t border-white\/10">[\s\S]*?<Bookmark size=\{20\} \/>\n          <\/div>/;
  if (fallbackRegex.test(s)) {
    s = s.replace(fallbackRegex, newActionsBlock.trim());
    console.log("Fallback regex matched.");
  } else {
    console.error("Could not find actions block.");
    process.exit(1);
  }
} else {
  s = s.replace(oldActionsBlock, newActionsBlock);
}

fs.writeFileSync(p, s, "utf8");
console.log("OK: Action buttons now permanently show numeric counts.");
