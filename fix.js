const fs = require("fs");
const p = "src/components/MobileBottomNav.tsx";
let s = fs.readFileSync(p, "utf8");

// 1. Update the tabs array to put Trooflix in the middle
const oldTabs = `  const tabs = [
    { name: "Home", icon: Home, href: "/" },
    { name: "Shorts", icon: Play, href: "/feed" },
    { name: "Search", icon: Search, href: "/search" },
    { name: "Shop", icon: ShoppingBag, href: "/merchandise" },
    { name: "Trooflix", href: "/plus" },
  ];`;

const newTabs = `  const tabs = [
    { name: "Home", icon: Home, href: "/" },
    { name: "Shorts", icon: Play, href: "/feed" },
    { name: "Trooflix", href: "/plus" },
    { name: "Shop", icon: ShoppingBag, href: "/merchandise" },
    { name: "Search", icon: Search, href: "/search" },
  ];`;

if (!s.includes(oldTabs)) { console.error("TABS NOT FOUND"); process.exit(1); }
s = s.replace(oldTabs, newTabs);

// 2. Update the custom "Trooflix" rendering to have "MY" above "TROOFLIX"
const oldRender = `                {tab.name === "Trooflix" ? (
                  <>
                    <div className={\`h-[22px] flex flex-col items-center justify-center pointer-events-none transition-opacity \${active ? "opacity-100" : "opacity-60 group-hover:opacity-100"}\`}>
                      <span className="text-[15px] font-black tracking-tighter leading-none">
                        <span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span>
                      </span>
                    </div>
                  </>
                ) : (`;

const newRender = `                {tab.name === "Trooflix" ? (
                  <>
                    <div className={\`h-[22px] flex flex-col items-center justify-center pointer-events-none transition-opacity \${active ? "opacity-100" : "opacity-60 group-hover:opacity-100"}\`}>
                      <span className="text-[7px] font-black tracking-[0.15em] text-white leading-none mb-0.5">MY</span>
                      <span className="text-[13px] font-black tracking-tighter leading-none">
                        <span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span>
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-transparent">.</span>
                  </>
                ) : (`;

if (!s.includes(oldRender)) { console.error("RENDER NOT FOUND"); process.exit(1); }
s = s.replace(oldRender, newRender);

fs.writeFileSync(p, s, "utf8");
console.log("OK: Tabs reordered, Trooflix is now centered with MY above wordmark.");
