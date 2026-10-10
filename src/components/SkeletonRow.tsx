export default function SkeletonRow() {
  return (
    <div className="relative">
      <div className="h-5 w-40 bg-white/5 rounded mb-3 mx-4 md:mx-12" />
      <div className="flex gap-2 md:gap-3 overflow-hidden px-4 md:px-12 pb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[140px] md:w-[180px] aspect-[2/3] rounded bg-white/5 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
