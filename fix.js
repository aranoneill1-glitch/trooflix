const fs = require("fs");
const p = "src/components/UserMenu.tsx";
let s = fs.readFileSync(p, "utf8");

// 1. Remove the NotificationBell from the list of links
s = s.replace(`              <NotificationBell asMenuItem={true} />\n\n`, "");

// 2. Add NotificationBell to the header (right of the username)
const oldHeader = `            <div className="p-4 border-b border-white/5">
              <p className="text-sm font-bold text-white truncate">{profile?.display_name || profile?.username}</p>
              <p className="text-xs text-white/50 truncate">@{profile?.username}</p>
              {isCreator && (
                <span className="inline-block mt-2 text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                  Creator
                </span>
              )}
            </div>`;

const newHeader = `            <div className="p-4 border-b border-white/5 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{profile?.display_name || profile?.username}</p>
                <p className="text-xs text-white/50 truncate">@{profile?.username}</p>
                {isCreator && (
                  <span className="inline-block mt-2 text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                    Creator
                  </span>
                )}
              </div>
              <div className="shrink-0 pt-0.5">
                <NotificationBell />
              </div>
            </div>`;

if (!s.includes(oldHeader)) {
  console.error("HEADER NOT FOUND");
  process.exit(1);
}
s = s.replace(oldHeader, newHeader);

fs.writeFileSync(p, s, "utf8");
console.log("OK: NotificationBell moved to header next to username.");
