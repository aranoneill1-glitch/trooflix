"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";

type IncomingCall = {
  callId: string;
  fromUserId: string;
  fromName: string;
  fromAvatar: string | null;
};

type Props = {
  incoming: IncomingCall | null;
  onAccept: () => void;
  onReject: () => void;
};

export default function IncomingCallBanner({ incoming, onAccept, onReject }: Props) {
  return (
    <AnimatePresence>
      {incoming && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 right-4 z-[10005] max-w-md mx-auto bg-gradient-to-br from-[#1c1c1e] to-[#0a0303] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-[#1c1c1e] shrink-0 border border-white/20">
              {incoming.fromAvatar ? (
                <img src={incoming.fromAvatar} alt={incoming.fromName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-black text-white">
                  {incoming.fromName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#E53945] font-bold uppercase tracking-wider">Incoming call</p>
              <p className="text-sm font-bold text-white truncate">{incoming.fromName}</p>
            </div>
          </div>
          <div className="flex border-t border-white/10">
            <button
              onClick={onReject}
              className="flex-1 py-3.5 flex items-center justify-center gap-2 text-red-400 font-bold hover:bg-red-500/10 transition"
            >
              <PhoneOff size={18} /> Decline
            </button>
            <button
              onClick={onAccept}
              className="flex-1 py-3.5 flex items-center justify-center gap-2 bg-green-600 text-white font-bold hover:bg-green-500 transition"
            >
              <Phone size={18} /> Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
