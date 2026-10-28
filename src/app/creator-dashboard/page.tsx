"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Users,
  Settings,
  Video,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  Eye,
  UserPlus,
  Star,
  Music,
  Pencil,
  ChevronRight,
  Play,
  Plus,
  Bell,
  MoreHorizontal,
  Clock3,
  Sparkles,
  ShoppingBag,
  LayoutDashboard,
  Upload,
  CircleHelp,
} from "lucide-react";

import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

const ACCENT = "#E53945";

const MOCK_REVENUE = 1250;
const MOCK_SUBSCRIBERS = 142;
const MOCK_TOTAL_VIEWS = 45200;

const DEMO_ACTIVITY = [
  {
    id: 1,
    icon: "member",
    title: "New premium subscriber",
    description: "A new member joined your channel.",
    time: "2 hours ago",
  },
  {
    id: 2,
    icon: "views",
    title: "Content milestone reached",
    description: "Your latest video reached 10,000 views.",
    time: "5 hours ago",
  },
];

const DEMO_UPLOADS = [
  {
    id: 1,
    title: "The Last Days Of The Big Lie",
    image:
      "https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80",
    status: "Published",
    views: "1.2K",
    date: "2 days ago",
  },
  {
    id: 2,
    title: "The Truth About Big Tech",
    image:
      "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500&q=80",
    status: "Published",
    views: "840",
    date: "4 days ago",
  },
];

function formatMoney(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SectionHeading({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-bold tracking-tight text-white sm:text-base">
        {title}
      </h2>

      {action && href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-white/55 transition hover:text-white"
        >
          {action}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function MiniChart() {
  return (
    <svg
      viewBox="0 0 320 72"
      preserveAspectRatio="none"
      className="h-[66px] w-full"
      role="img"
      aria-label="Illustrative upward revenue trend"
    >
      <defs>
        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d="M0,56 C18,51 24,57 40,44 S65,49 82,35 S110,43 126,28 S151,39 171,24 S198,31 216,18 S244,27 263,12 S296,17 320,4 L320,72 L0,72 Z"
        fill="url(#revenueFill)"
      />

      <path
        d="M0,56 C18,51 24,57 40,44 S65,49 82,35 S110,43 126,28 S151,39 171,24 S198,31 216,18 S244,27 263,12 S296,17 320,4"
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CreatorDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsUser, setViewAsUser] = useState(false);
  const [userViewTab, setUserViewTab] = useState<
    "all" | "podcasts" | "videos"
  >("all");
  const [analyticsTab, setAnalyticsTab] = useState<
    "views" | "revenue" | "subscribers"
  >("views");
  const [period, setPeriod] = useState<"7 days" | "30 days" | "90 days">(
    "30 days"
  );

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const currentUser = await getCachedUser();

        if (!active) return;

        if (!currentUser) {
          setLoading(false);
          return;
        }

        setUser(currentUser);

        const response = await fetch(
          `/api/profile?user_id=${encodeURIComponent(currentUser.id)}`
        );

        if (!response.ok) {
          throw new Error("Unable to load creator profile");
        }

        const data = await response.json();

        if (active) {
          setProfile(data.profile ?? null);
        }
      } catch (error) {
        console.error("Creator dashboard loading error:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090B]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#E53945]" />
          </div>
          <p className="text-xs font-medium tracking-wide text-white/40">
            OPENING CREATOR STUDIO
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#09090B] px-6 text-center text-white">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <LayoutDashboard size={28} className="text-[#E53945]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">
          Your Creator Studio
        </h1>

        <p className="mt-3 max-w-xs text-sm leading-6 text-white/45">
          Log in to manage your content, grow your audience and access your
          creator tools.
        </p>

        <Link
          href="/login"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#E53945] px-8 text-sm font-bold text-white transition hover:bg-[#cf303b]"
        >
          Log In
        </Link>
      </main>
    );
  }

  const displayName = profile?.display_name || "Creator Name";
  const username = profile?.username || "creator";

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[#09090B] pb-[calc(104px+env(safe-area-inset-bottom))] font-sans text-white selection:bg-[#E53945]/30"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <TopBar />

      <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        {/* MOBILE-FIRST CREATOR HEADER */}
        <section className="relative mb-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111114] sm:rounded-3xl">
          {profile?.backdrop_url && (
            <div className="absolute inset-0">
              <img
                src={profile.backdrop_url}
                alt=""
                className="h-full w-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#111114] via-[#111114]/90 to-[#111114]/65" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111114] via-transparent to-transparent" />
            </div>
          )}

          <div className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#202024] sm:h-[68px] sm:w-[68px]">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h1 className="max-w-[190px] truncate text-lg font-extrabold tracking-tight sm:max-w-none sm:text-xl">
                      {displayName}
                    </h1>
                    {profile?.is_verified && (
                      <VerifiedBadge size={18} variant="gold" />
                    )}
                  </div>

                  <p className="mt-1 truncate text-xs text-white/45 sm:text-sm">
                    @{username}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
                      Creator Studio
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href="/creator-dashboard/settings"
                aria-label="Creator settings"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/65 transition hover:bg-white/10 hover:text-white"
              >
                <Settings size={18} />
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Link
                href="/creator-dashboard/settings"
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-xs font-bold transition hover:bg-white/[0.08] sm:flex-none sm:px-5"
              >
                <Pencil size={14} />
                Edit Profile
              </Link>

              <button
                onClick={() => setViewAsUser(!viewAsUser)}
                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition sm:flex-none sm:px-5 ${
                  viewAsUser
                    ? "bg-[#E53945] text-white"
                    : "border border-white/[0.09] bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                }`}
              >
                <Eye size={14} />
                {viewAsUser ? "Exit Preview" : "Preview Profile"}
              </button>
            </div>
          </div>
        </section>

        {/* PUBLIC PROFILE PREVIEW */}
        {viewAsUser ? (
          <section className="animate-in fade-in duration-300">
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E53945]">
                Public preview
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                Discover this creator
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/45">
                This is a preview of how your creator profile could appear to
                viewers.
              </p>
            </div>

            <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-black transition hover:bg-white/90">
                <UserPlus size={16} />
                Follow
              </button>

              <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E53945] text-sm font-bold text-white transition hover:bg-[#cf303b]">
                <Star size={16} fill="currentColor" />
                Subscribe
              </button>

              <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold transition hover:bg-white/[0.08]">
                <ShoppingBag size={16} />
                Shop
              </button>

              <Link
                href="/creator-dashboard/inbox"
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold transition hover:bg-white/[0.08]"
              >
                <MessageSquare size={16} />
                Message
              </Link>
            </div>

            <div className="mb-5 flex gap-6 border-b border-white/[0.08]">
              {(["all", "podcasts", "videos"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setUserViewTab(tab)}
                  className={`relative pb-3 text-sm font-semibold capitalize transition ${
                    userViewTab === tab
                      ? "text-white"
                      : "text-white/40 hover:text-white/75"
                  }`}
                >
                  {tab === "all" ? "All Content" : tab}
                  {userViewTab === tab && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#E53945]" />
                  )}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(userViewTab === "all" || userViewTab === "podcasts") && (
                <div className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141418]">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500&q=80"
                      alt="Podcast studio"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[9px] font-bold uppercase tracking-wider">
                      Podcast
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-bold leading-5">
                      The Truth About Big Tech
                    </h3>
                    <p className="mt-1.5 text-[11px] text-white/40">
                      Episode 42 · 45 min
                    </p>
                  </div>
                </div>
              )}

              {(userViewTab === "all" || userViewTab === "videos") && (
                <div className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141418]">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80"
                      alt="Video production"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded-md bg-[#E53945] px-2 py-1 text-[9px] font-bold uppercase tracking-wider">
                      Video
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                        <Play size={16} fill="currentColor" />
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-bold leading-5">
                      The Last Days Of The Big Lie
                    </h3>
                    <p className="mt-1.5 text-[11px] text-white/40">
                      1h 35m · 12K views
                    </p>
                  </div>
                </div>
              )}

              {userViewTab === "all" && (
                <div className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141418]">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80"
                      alt="Creator merchandise"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded-md bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-black">
                      Merch
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-bold leading-5">
                      Classic Logo Tee
                    </h3>
                    <p className="mt-1.5 text-xs font-bold text-[#E53945]">
                      $25.00
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* DASHBOARD INTRODUCTION */}
            <section className="mb-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E53945]">
                    <Sparkles size={12} />
                    Your workspace
                  </p>

                  <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.04em] sm:text-3xl">
                    Welcome back.
                  </h2>

                  <p className="mt-1.5 text-xs text-white/45 sm:text-sm">
                    Here's your channel at a glance.
                  </p>
                </div>

                <Link
                  href="/creator-dashboard/upload"
                  className="mb-0.5 flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E53945] px-3.5 text-xs font-bold text-white shadow-lg shadow-[#E53945]/10 transition hover:bg-[#cf303b] sm:px-5 sm:text-sm"
                >
                  <Plus size={17} strokeWidth={2.5} />
                  <span>Upload</span>
                </Link>
              </div>
            </section>

            {/* QUICK ACTIONS */}
            <section className="mb-8">
              <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Link
                  href="/creator-dashboard/upload"
                  className="flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border border-[#E53945]/25 bg-[#E53945]/[0.09] px-3.5 text-xs font-semibold text-white transition hover:bg-[#E53945]/15"
                >
                  <Upload size={15} className="text-[#E53945]" />
                  Upload Content
                </Link>

                <Link
                  href="/creator-dashboard/analytics"
                  className="flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.07]"
                >
                  <BarChart3 size={15} className="text-white/55" />
                  Analytics
                </Link>

                <Link
                  href="/creator-dashboard/content"
                  className="flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.07]"
                >
                  <Video size={15} className="text-white/55" />
                  My Content
                </Link>

                <Link
                  href="/creator-shop"
                  className="flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.07]"
                >
                  <ShoppingBag size={15} className="text-white/55" />
                  My Shop
                </Link>
              </div>
            </section>

            {/* FEATURED REVENUE CARD */}
            <section className="mb-4">
              <div className="relative overflow-hidden rounded-2xl border border-[#E53945]/20 bg-[#141114] p-5 sm:rounded-3xl sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-[#E53945]/[0.09] blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E53945]/10">
                        <Wallet size={16} className="text-[#E53945]" />
                      </div>
                      <p className="text-xs font-semibold text-white/60">
                        Total creator revenue
                      </p>
                    </div>

                    <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-white/45">
                      Sample data
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-[34px] font-extrabold leading-none tracking-[-0.055em] sm:text-4xl">
                        {formatMoney(MOCK_REVENUE)}
                      </h3>

                      <div className="mt-3 flex items-center gap-1.5">
                        <TrendingUp
                          size={13}
                          className="text-emerald-400"
                        />
                        <span className="text-xs font-bold text-emerald-400">
                          +12%
                        </span>
                        <span className="text-[11px] text-white/40">
                          this month
                        </span>
                      </div>
                    </div>

                    <Link
                      href="/creator-dashboard/analytics"
                      aria-label="View earnings analytics"
                      className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.09]"
                    >
                      <ArrowRight size={17} />
                    </Link>
                  </div>

                  <div className="mt-5">
                    <MiniChart />
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-white/[0.07] pt-3">
                    <span className="text-[10px] text-white/35">
                      Illustrative performance trend
                    </span>

                    <Link
                      href="/creator-dashboard/analytics"
                      className="text-[11px] font-bold text-white/70 transition hover:text-white"
                    >
                      View earnings →
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* SECONDARY METRICS */}
            <section className="mb-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.07] bg-[#121215] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05]">
                    <Users size={16} className="text-white/65" />
                  </div>

                  <span className="text-[9px] font-semibold uppercase tracking-wider text-white/35">
                    Audience
                  </span>
                </div>

                <p className="mt-4 text-[26px] font-extrabold tracking-[-0.04em] sm:text-3xl">
                  {MOCK_SUBSCRIBERS.toLocaleString()}
                </p>

                <p className="mt-1 text-[11px] text-white/45">
                  Subscribers
                </p>

                <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <TrendingUp size={12} />
                  <span>Premium members</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#121215] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05]">
                    <Eye size={16} className="text-white/65" />
                  </div>

                  <span className="text-[9px] font-semibold uppercase tracking-wider text-white/35">
                    Reach
                  </span>
                </div>

                <p className="mt-4 text-[26px] font-extrabold tracking-[-0.04em] sm:text-3xl">
                  {(MOCK_TOTAL_VIEWS / 1000).toFixed(1)}K
                </p>

                <p className="mt-1 text-[11px] text-white/45">
                  Total views
                </p>

                <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-white/40">
                  <BarChart3 size={12} />
                  <span>All time</span>
                </div>
              </div>
            </section>

            {/* PERFORMANCE PANEL */}
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-bold tracking-tight">
                    Performance
                  </h2>
                  <p className="mt-1 text-[11px] text-white/40">
                    Understand your channel's growth
                  </p>
                </div>

                <Link
                  href="/creator-dashboard/analytics"
                  aria-label="Open full analytics"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/65 transition hover:bg-white/[0.08]"
                >
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121215] p-4 sm:p-6">
                <div className="flex gap-1.5 rounded-xl bg-black/20 p-1">
                  {(
                    ["views", "revenue", "subscribers"] as const
                  ).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAnalyticsTab(tab)}
                      className={`min-h-9 flex-1 rounded-lg px-1.5 text-[10px] font-semibold capitalize transition sm:text-xs ${
                        analyticsTab === tab
                          ? "bg-white/[0.09] text-white shadow-sm"
                          : "text-white/40 hover:text-white/75"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      {analyticsTab === "views"
                        ? "Total views"
                        : analyticsTab === "revenue"
                          ? "Gross revenue"
                          : "Subscribers"}
                    </p>

                    <p className="mt-1 text-2xl font-extrabold tracking-tight">
                      {analyticsTab === "views"
                        ? "45,200"
                        : analyticsTab === "revenue"
                          ? formatMoney(MOCK_REVENUE)
                          : "142"}
                    </p>
                  </div>

                  <select
                    aria-label="Select performance period"
                    value={period}
                    onChange={(event) =>
                      setPeriod(
                        event.target.value as
                          | "7 days"
                          | "30 days"
                          | "90 days"
                      )
                    }
                    className="max-w-[112px] rounded-lg border border-white/[0.08] bg-[#19191D] px-2 py-2 text-[10px] font-medium text-white/65 outline-none focus:border-[#E53945]/50"
                  >
                    <option>7 days</option>
                    <option>30 days</option>
                    <option>90 days</option>
                  </select>
                </div>

                <div className="mt-5">
                  <MiniChart />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E53945]" />
                    <span className="text-[10px] text-white/45">
                      Illustrative trend
                    </span>
                  </div>

                  <span className="text-[10px] text-white/35">
                    {period}
                  </span>
                </div>
              </div>
            </section>

            {/* LATEST CONTENT */}
            <section className="mb-8">
              <SectionHeading
                title="Latest uploads"
                action="View all"
                href="/creator-dashboard/content"
              />

              <div className="space-y-3">
                {DEMO_UPLOADS.map((upload) => (
                  <Link
                    href="/creator-dashboard/content"
                    key={upload.id}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#121215] p-3 transition hover:border-white/[0.14] hover:bg-[#161619] sm:gap-4 sm:p-4"
                  >
                    <div className="relative h-[76px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-[#202024] sm:h-[86px] sm:w-[132px]">
                      <img
                        src={upload.image}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                          <Play size={12} fill="currentColor" />
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-[12px] font-bold leading-5 text-white sm:text-sm">
                        {upload.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                          <CheckCircle2 size={11} />
                          {upload.status}
                        </span>

                        <span className="text-[10px] text-white/35">
                          {upload.views} views
                        </span>
                      </div>

                      <p className="mt-1.5 text-[10px] text-white/35">
                        {upload.date}
                      </p>
                    </div>

                    <ChevronRight
                      size={17}
                      className="shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/65"
                    />
                  </Link>
                ))}
              </div>
            </section>

            {/* RECENT ACTIVITY */}
            <section className="mb-8">
              <SectionHeading
                title="Recent activity"
                action="Inbox"
                href="/creator-dashboard/inbox"
              />

              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121215]">
                {DEMO_ACTIVITY.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-3 p-4 ${
                      index !== DEMO_ACTIVITY.length - 1
                        ? "border-b border-white/[0.06]"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        activity.icon === "member"
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-white/[0.06] text-white/65"
                      }`}
                    >
                      {activity.icon === "member" ? (
                        <DollarSign size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-5 text-white/90">
                        {activity.title}
                      </p>

                      <p className="mt-0.5 text-[11px] leading-5 text-white/45">
                        {activity.description}
                      </p>

                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/30">
                        <Clock3 size={10} />
                        {activity.time}
                      </p>
                    </div>

                    <MoreHorizontal
                      size={17}
                      className="mt-1 shrink-0 text-white/30"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* CREATOR HELP CARD */}
            <section className="mb-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-gradient-to-r from-[#171216] to-[#121215] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E53945]/10 text-[#E53945]">
                  <CircleHelp size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold">
                    Need a hand getting started?
                  </h3>

                  <p className="mt-1 text-[11px] leading-5 text-white/40">
                    Explore your creator tools and publishing workflow.
                  </p>
                </div>

                <ChevronRight
                  size={17}
                  className="shrink-0 text-white/40"
                />
              </div>
            </section>
          </>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
