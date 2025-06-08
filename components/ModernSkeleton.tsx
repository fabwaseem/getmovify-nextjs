import React from "react";

interface ModernSkeletonProps {
  count?: number;
  className?: string;
}

const ModernSkeleton: React.FC<ModernSkeletonProps> = ({
  count = 10,
  className = "",
}) => {
  return (
    <div
      className={`w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative bg-gradient-to-br from-[#1a1f35] to-[#181c2b] rounded-3xl h-[600px] overflow-hidden border border-[#23263a]/50 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>

          {/* Image skeleton */}
          <div className="w-full aspect-[2/3] bg-gradient-to-br from-[#23263a] to-[#1a1f35] relative">
            {/* Quality badge */}
            <div className="absolute top-4 left-4 w-16 h-6 bg-blue-600/30 rounded-full animate-pulse"></div>
            {/* Size badge */}
            <div className="absolute top-4 right-4 w-12 h-6 bg-emerald-600/30 rounded-full animate-pulse"></div>

            {/* Placeholder icon area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-gray-600/30 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="p-6 space-y-4">
            {/* Title lines */}
            <div className="space-y-2">
              <div className="h-6 bg-gray-700/40 rounded-lg animate-pulse"></div>
              <div className="h-6 bg-gray-700/30 rounded-lg w-3/4 animate-pulse"></div>
            </div>

            {/* Info tags */}
            <div className="flex gap-2 flex-wrap">
              <div className="h-8 w-20 bg-gray-800/40 rounded-full animate-pulse"></div>
              <div className="h-8 w-16 bg-gray-800/40 rounded-full animate-pulse"></div>
              <div className="h-8 w-18 bg-gray-800/40 rounded-full animate-pulse"></div>
            </div>

            {/* Download section */}
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-700/40 rounded w-24 animate-pulse"></div>
                <div className="flex-1 h-px bg-gray-700/30"></div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="h-8 w-20 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-xl animate-pulse"></div>
                <div className="h-8 w-24 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-xl animate-pulse"></div>
                <div className="h-8 w-16 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
        </div>
      ))}
    </div>
  );
};

export default ModernSkeleton;
