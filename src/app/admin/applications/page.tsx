"use client";

import { Inbox } from "lucide-react";

export default function ApplicationsPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Applications</h1>
        <p className="text-white/50 text-sm">
          Podcaster applications waiting for your review
        </p>
      </div>

      {/* Empty state — will be filled with real applications once we build the apply flow */}
      <div className="bg-[#141418] border border-white/5 rounded-lg p-12 text-center">
        <div className="flex justify-center mb-5">
          <div className="bg-white/5 rounded-full p-5">
            <Inbox size={40} className="text-white/40" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-2">No pending applications</h2>
        <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
          When someone applies to become a podcaster, their application will
          appear here. You'll be able to review their profile, hear their pitch,
          and approve or reject them with one click.
        </p>
      </div>

      {/* Preview of what's coming */}
      <div className="mt-10">
        <p className="text-xs tracking-[0.3em] text-white/40 font-semibold mb-4">
          COMING SOON
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FeatureCard
            title="Applications Inbox"
            description="Every application in one place with the applicant's photo, bio, and pitch."
          />
          <FeatureCard
            title="One-Click Approve"
            description="Approve an application and the podcaster gets instant access to their dashboard."
          />
          <FeatureCard
            title="Request Info"
            description="Ask the applicant for more details before deciding."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#141418] border border-white/5 rounded-lg p-4">
      <p className="font-bold mb-1">{title}</p>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}
