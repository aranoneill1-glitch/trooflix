"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  userId: string;
};

export default function FollowStats({ userId }: Props) {
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-follows?user_id=${userId}&counts=1`)
      .then((r) => r.json())
      .then((d) => {
        setFollowers(d.followers ?? 0);
        setFollowing(d.following ?? 0);
      })
      .catch(() => {
        setFollowers(0);
        setFollowing(0);
      });
  }, [userId]);

  const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString());

  return (
    <div className="flex items-center gap-5 mt-3 text-sm">
      <Link
        href={`/profile/${userId}/followers`}
        className="hover:underline"
      >
        <span className="font-bold text-white">{fmt(followers)}</span>{" "}
        <span className="text-white/60">Followers</span>
      </Link>
      <Link
        href={`/profile/${userId}/following`}
        className="hover:underline"
      >
        <span className="font-bold text-white">{fmt(following)}</span>{" "}
        <span className="text-white/60">Following</span>
      </Link>
    </div>
  );
}
