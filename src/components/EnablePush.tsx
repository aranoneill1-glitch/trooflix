"use client";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function EnablePush() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsSubscribed(true);
        });
      });
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  const subscribeUser = async () => {
    try {
      const user = await getCachedUser();
      if (!user) return alert("Please log in first");

      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, userId: user.id }),
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error("Push subscription error:", error);
      alert("Could not enable push notifications.");
    }
  };

  if (!isSupported) return null; // Hide on unsupported browsers (like normal iOS Safari)

  return (
    <button
      onClick={subscribeUser}
      disabled={isSubscribed}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
        isSubscribed 
          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
          : "bg-white text-black hover:bg-white/90 shadow-lg"
      }`}
    >
      <Bell size={16} /> {isSubscribed ? "Alerts Enabled" : "Enable Push Alerts"}
    </button>
  );
}
