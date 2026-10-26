"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCachedUser, getCachedCreators } from "@/lib/cache";
import { Loader2 } from "lucide-react";

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    getCachedUser().then(async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const creators = await getCachedCreators();
      const creator = creators.find((c: any) => String(c.ownerUserId) === String(user.id));

      if (creator) {
        router.replace(`/podcaster/${creator.slug}`);
      } else {
        try {
          const res = await fetch(`/api/profile?user_id=${user.id}`).then(r => r.json());
          if (res.profile?.username) {
            router.replace(`/u/${res.profile.username}`);
          } else {
            router.replace("/feed");
          }
        } catch {
          router.replace("/feed");
        }
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-red-600 mb-4" size={32} />
      <p className="text-white/50 text-sm font-medium">Taking you to your profile...</p>
    </div>
  );
}
