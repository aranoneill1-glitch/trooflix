"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Status = "checking" | "unsupported" | "default" | "granted" | "denied" | "subscribed";

export default function EnablePush() {
  const [status, setStatus] = useState<Status>("checking");
  const [subscribing, setSubscribing] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    const currentPermission = Notification.permission;
    if (currentPermission === "denied") {
      setStatus("denied");
      return;
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub && currentPermission === "granted") {
          setStatus("subscribed");
        } else if (currentPermission === "granted") {
          setStatus("granted");
        } else {
          setStatus("default");
        }
      });
    });
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
    setSubscribing(true);
    try {
      const user = await getCachedUser();
      if (!user) { alert("Please log in first"); setSubscribing(false); return; }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        setSubscribing(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, userId: user.id }),
      });

      setStatus("subscribed");
    } catch (error) {
      console.error("Push subscription error:", error);
      alert("Could not enable push notifications.");
    } finally {
      setSubscribing(false);
    }
  };

  const sendTest = async () => {
    setTestLoading(true);
    try {
      const user = await getCachedUser();
      if (!user) return;
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: "🔔 Trooflix Test",
          body: "Push notifications are working!",
          url: "/",
        }),
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch (e) {
      alert("Failed to send test");
    } finally {
      setTestLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-4">
        <AlertCircle size={48} className="mx-auto text-yellow-500/60 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Push not supported</h3>
        <p className="text-sm text-white/50 leading-relaxed">
          Your browser doesn't support push notifications. On iPhone, add Trooflix to your home screen first (Safari → Share → Add to Home Screen), then open it from there.
        </p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-4">
        <BellOff size={48} className="mx-auto text-red-500/60 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Notifications blocked</h3>
        <p className="text-sm text-white/50 leading-relaxed mb-4">
          You previously blocked notifications for Trooflix. To re-enable them:
        </p>
        <div className="text-left text-xs text-white/60 bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
          <p><strong className="text-white">iPhone:</strong> Settings → Safari → Advanced → Website Data → find trooflixtv.com → Delete, then reload the site.</p>
          <p><strong className="text-white">Android/Chrome:</strong> Tap the lock icon in the URL bar → Notifications → Allow.</p>
          <p><strong className="text-white">Desktop:</strong> Click the lock icon next to the URL → Notifications → Allow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${status === "subscribed" ? "bg-green-500/20" : "bg-[#E53945]/20"}`}>
          <Bell size={28} className={status === "subscribed" ? "text-green-500" : "text-[#E53945]"} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          {status === "subscribed" ? "Notifications enabled" : "Stay in the loop"}
        </h3>
        <p className="text-sm text-white/60 leading-relaxed">
          {status === "subscribed"
            ? "You'll get notified when someone comments, follows you, or when a live stream starts."
            : "Get notified when someone comments on your content, follows you, or when a live stream starts."}
        </p>
      </div>

      {status === "subscribed" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="text-sm text-green-400 font-semibold">Push notifications are active</span>
          </div>
          <button
            onClick={sendTest}
            disabled={testLoading || testSent}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
          >
            <Send size={16} /> {testSent ? "Test sent! Check your notifications" : testLoading ? "Sending..." : "Send test notification"}
          </button>
        </div>
      ) : (
        <button
          onClick={subscribeUser}
          disabled={subscribing}
          className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20"
        >
          {subscribing ? "Enabling..." : "Enable Push Notifications"}
        </button>
      )}

      <p className="text-center text-[11px] text-white/30 mt-6">
        You can turn these off anytime from your browser settings.
      </p>
    </div>
  );
}
