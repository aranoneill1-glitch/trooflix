"use client";

import { useEffect, useRef } from "react";

export default function WatchTimeTracker({ userId, videoId, creatorId }: { userId: string, videoId: string, creatorId: string }) {
  const accumulatedTime = useRef(0);

  useEffect(() => {
    if (!userId || !videoId || !creatorId) return;

    // Check every 5 seconds if the video is actively playing
    const interval = setInterval(() => {
      // Find the video element on the page
      const video = document.querySelector('video');
      
      // If video exists, is not paused, not ended, and has enough data buffered
      if (video && !video.paused && !video.ended && video.readyState > 2) {
        accumulatedTime.current += 5; 

        // Every 30 seconds of actual watch time, send a ping
        if (accumulatedTime.current >= 30) {
          const secs = accumulatedTime.current;
          accumulatedTime.current = 0;
          
          fetch("/api/watch-time", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, videoId, creatorId, seconds: secs }),
          }).catch(() => {});
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      // Send any remaining seconds when they leave the page (keepalive ensures it sends even on navigation)
      if (accumulatedTime.current > 0) {
        fetch("/api/watch-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, videoId, creatorId, seconds: accumulatedTime.current }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [userId, videoId, creatorId]);

  return null; // This component renders nothing, it just runs in the background
}
