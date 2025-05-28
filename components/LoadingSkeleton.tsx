const LoadingSkeleton = () => (
  <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-3">
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="bg-[#181c2b] rounded-2xl h-[340px] animate-pulse border border-[#23263a]"
      />
    ))}
  </div>
);

export default LoadingSkeleton;
