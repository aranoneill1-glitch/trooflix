"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getCachedUser } from "@/lib/cache";

export default function PushNotificationManager() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const registerPush = async () => {
      const user = await getCachedUser();
      if (!user) return;

      let perm = await PushNotifications.checkPermissions();
      
      if (perm.receive === "prompt") {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive === "granted") {
        await PushNotifications.register();
      }
    };

    // Listen for the token generation
    PushNotifications.addListener("registration", async (token) => {
      const user = await getCachedUser();
      if (user) {
        await fetch("/api/push-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, token: token.value }),
        });
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.log("Push registration error:", err);
    });

    registerPush();
  }, []);

  return null; // Invisible background component
}
