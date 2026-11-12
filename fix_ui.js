const fs = require("fs");
const p = "src/app/creator-dashboard/page.tsx";
let c = fs.readFileSync(p, "utf8");

if (!c.includes("const [themeColor, setThemeColor]")) {
  c = c.replace(
    "const [uploadingProfileFeature, setUploadingProfileFeature] = useState(false);",
    `const [uploadingProfileFeature, setUploadingProfileFeature] = useState(false);
  const [themeColor, setThemeColor] = useState("#E53945");

  useEffect(() => {
    if (profile?.backdrop_url && profile.backdrop_url.startsWith("#")) {
      setThemeColor(profile.backdrop_url);
    }
  }, [profile]);

  const saveTheme = async () => {
    if (!user) return;
    try {
      const supabase = createClient();
      await supabase.from("profiles").update({ backdrop_url: themeColor }).eq("user_id", user.id);
      setProfile({ ...profile, backdrop_url: themeColor });
      alert("Theme color updated!");
    } catch (e) {
      alert("Failed to save theme");
    }
  };`
  );
}

const startStr = `<h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Profile</h2>`;
const startIndex = c.indexOf(startStr);

if (startIndex === -1) {
  console.log("ERROR: Could not find Profile header.");
  process.exit(1);
}

const endIndex = c.indexOf("</section>", startIndex);
if (endIndex === -1) {
  console.log("ERROR: Could not find end of section.");
  process.exit(1);
}

const newUI = startStr + `
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 wfull max-w-2xl">
              <Link href="/creator-dashboard/settings" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-6 rounded-2xl flex flex-col justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <Pencil className="text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Edit Profile</h3>
                  <p className="text-xs text-white/50">Update your bio, links, and avatar.</p>
                </div>
              </Link>

              <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] ubackdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between group overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 relative z-10">
                  <Palette className="text-purple-400" size={20} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-1">Profile Theme</h3>
                  <p className="text-xs text-white/50 mb-4">Pick an accent color for your page.</p>

                  <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/10">
                    <input 
                      type="color" 
                      value={themeColor} 
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      style={{ WebkitAppearance: "none" }}
                    />
                    <span className="text-xs text-white/70 font-mono flex-1">{themeColor}</span>
                    <button 
                      onClick={saveTheme}
                      className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>`;

c = c.substring(0, startIndex) + newUI + c.substring(endIndex + 10);
fs.writeFileSync(p, c);
console.log("SUCCESS: Replaced Profile section.");
