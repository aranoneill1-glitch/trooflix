export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Top padding for navbar */}
      <div className="h-16"></div>
      
      <div className="p-4 animate-pulse">
        {/* Avatar and Stats */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-white/10 rounded-full flex-shrink-0"></div>
          <div className="flex-1 flex justify-around">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-5 bg-white/10 rounded"></div>
              <div className="w-12 h-3 bg-white/10 rounded"></div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-5 bg-white/10 rounded"></div>
              <div className="w-12 h-3 bg-white/10 rounded"></div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-5 bg-white/10 rounded"></div>
              <div className="w-12 h-3 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>

        {/* Name and Bio */}
        <div className="space-y-3 mb-6">
          <div className="w-32 h-5 bg-white/10 rounded"></div>
          <div className="w-48 h-3 bg-white/10 rounded"></div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 h-10 bg-white/10 rounded-lg"></div>
          <div className="flex-1 h-10 bg-white/10 rounded-lg"></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/10 pb-3 mb-4">
          <div className="w-16 h-4 bg-white/10 rounded"></div>
          <div className="w-16 h-4 bg-white/10 rounded"></div>
          <div className="w-16 h-4 bg-white/10 rounded"></div>
        </div>
        
        {/* Grid Skeleton */}
        <div className="grid grid-cols-3 gap-1">
           <div className="aspect-square bg-white/5 rounded-sm"></div>
           <div className="aspect-square bg-white/5 rounded-sm"></div>
           <div className="aspect-square bg-white/5 rounded-sm"></div>
           <div className="aspect-square bg-white/5 rounded-sm"></div>
           <div className="aspect-square bg-white/5 rounded-sm"></div>
           <div className="aspect-square bg-white/5 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}
