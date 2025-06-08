const LoadingSkeleton = () => (
  <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4">
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="relative bg-gradient-to-br from-[#1a1f35] to-[#181c2b] rounded-3xl h-[600px] overflow-hidden border border-[#23263a]/50"
        style={{ animationDelay: `${i * 0.1}s` }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>

        {/* Image placeholder */}
        <div className="w-full aspect-[2/3] bg-gradient-to-br from-[#23263a] to-[#1a1f35] animate-pulse">
          <div className="absolute top-4 left-4 w-16 h-6 bg-gray-600/50 rounded-full animate-pulse"></div>
          <div className="absolute top-4 right-4 w-12 h-6 bg-gray-600/50 rounded-full animate-pulse"></div>
        </div>

        {/* Content placeholder */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <div className="h-6 bg-gray-700/50 rounded-lg animate-pulse"></div>
            <div className="h-6 bg-gray-700/30 rounded-lg w-3/4 animate-pulse"></div>
          </div>

          {/* Tags */}
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-700/40 rounded-full animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-700/40 rounded-full animate-pulse"></div>
            <div className="h-8 w-18 bg-gray-700/40 rounded-full animate-pulse"></div>
          </div>

          {/* Download links */}
          <div className="space-y-3 mt-6">
            <div className="h-4 bg-gray-700/40 rounded w-24 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-blue-600/30 rounded-xl animate-pulse"></div>
              <div className="h-8 w-24 bg-blue-600/30 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
