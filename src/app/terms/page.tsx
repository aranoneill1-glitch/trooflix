"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back
      </Link>
      <h1 className="text-3xl font-black mb-6">Terms of Service & EULA</h1>
      
      <div className="space-y-6 text-sm text-white/70 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Zero Tolerance Policy</h2>
          <p>
            Trooflix has a <strong>zero-tolerance policy</strong> for objectionable content or abusive users. 
            We do not censor opinions or free speech, but we strictly prohibit and will remove content that is illegal, 
            promotes violence, constitutes harassment, contains child sexual abuse material (CSAM), or violates intellectual property rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Moderation & Reporting</h2>
          <p>
            Users have the ability to report content and block other users. We review all reports and will 
            eject users who violate these terms within 24 hours. If you encounter abusive behavior, please 
            use the in-app reporting tools.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. User Responsibilities</h2>
          <p>
            You are solely responsible for the content you upload. By using Trooflix, you agree not to upload 
            anything that infringes on copyrights, violates privacy, or breaks local laws.
          </p>
        </section>
      </div>
    </div>
  );
}
