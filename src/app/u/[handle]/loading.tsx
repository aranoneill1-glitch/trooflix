export default function UserHandleLoading() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="h-16"></div>
      <div className="p-4 animate-pulse">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-white/10 rounded-full flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="w-32 h-5 bg-white/10 rounded"></div>
            <div className="w-24 h-3 bg-white/10 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-6">
           <div className="aspect-square bg-white/5 rounded-sm"></div>
           <div className="aspect-square bg-white/5 rounded-sm"></div>
           <div className="aspect-square bg-white/5 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}
