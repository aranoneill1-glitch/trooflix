"use client";

import { ExternalLink, KeyRound, Database, Cloud, Code } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-white/50 text-sm">Admin tools and quick links</p>
      </div>

      {/* Quick Links */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">Quick Links</h2>
        <div className="space-y-2">
          <LinkRow
            href="https://vercel.com/dashboard"
            icon={Cloud}
            label="Vercel Dashboard"
            description="Deployments, environment variables, logs"
          />
          <LinkRow
            href="https://supabase.com/dashboard"
            icon={Database}
            label="Supabase Dashboard"
            description="Database, auth users, my_list table"
          />
          <LinkRow
            href="https://dash.cloudflare.com"
            icon={Cloud}
            label="Cloudflare R2"
            description="Video storage, uploads, public URLs"
          />
          <LinkRow
            href="https://github.com/aranoneill1-glitch/trooflix"
            icon={Code}
            label="GitHub Repository"
            description="Source code and commit history"
          />
        </div>
      </section>

      {/* Admin password */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">Admin Password</h2>
        <div className="bg-[#141418] border border-white/5 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="bg-red-600/10 rounded-lg p-3">
              <KeyRound size={22} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold mb-1">Change the admin password</p>
              <p className="text-sm text-white/50 mb-3 leading-relaxed">
                The admin password is stored in Vercel as <code className="bg-black/60 px-1.5 py-0.5 rounded text-red-400 text-xs">ADMIN_PASSWORD</code>.
                To change it, update the value in Vercel's environment variables
                and redeploy. You'll be logged out of all admin sessions.
              </p>
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition"
              >
                Open Vercel environment variables <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Info */}
      <section>
        <h2 className="text-lg font-bold mb-4">About</h2>
        <div className="bg-[#141418] border border-white/5 rounded-lg p-5 text-sm text-white/70 space-y-3">
          <p>
            <span className="text-white/40">Platform:</span> Trooflix
          </p>
          <p>
            <span className="text-white/40">Version:</span> 1.0.0
          </p>
          <p>
            <span className="text-white/40">Stack:</span> Next.js 16, TypeScript,
            Tailwind, Supabase, Cloudflare R2, Vercel KV
          </p>
          <p>
            <span className="text-white/40">Storage:</span> Cloudflare R2 (zero
            egress)
          </p>
        </div>
      </section>
    </div>
  );
}

function LinkRow({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: any;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 bg-[#141418] border border-white/5 rounded-lg p-4 hover:border-white/20 transition group"
    >
      <div className="bg-red-600/10 rounded-lg p-3">
        <Icon size={20} className="text-red-500" />
      </div>
      <div className="flex-1">
        <p className="font-semibold group-hover:text-red-500 transition">
          {label}
        </p>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      <ExternalLink size={16} className="text-white/30 group-hover:text-white/60 transition" />
    </a>
  );
}
