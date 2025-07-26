"use client";

import MoviesGrid from "@/components/MoviesGrid";
import { useInfiniteMovies } from "@/hooks/useMovies";
import { Play, TrendingUp } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "use-debounce";

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {Icon && <Icon className="w-6 h-6 text-blue-400" />}
        <h2 className="text-3xl font-bold text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-gray-400 text-lg">{subtitle}</p>}
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [debouncedQuery] = useDebounce(searchQuery, 500);

  // Determine current mode - homepage only shows search or all categories
  const isSearchMode = debouncedQuery.trim().length >= 3;

  // Use infinite hook for search results only
  const {
    data: movieData,
    isLoading,
    isError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteMovies({
    ...(isSearchMode && { search: debouncedQuery }),
    ...(!isSearchMode && { type: "both" }),
    details: true,
    infinite: true,
  });

  const { ref: loadMoreRef, inView } = useInView({ triggerOnce: false });

  // Infinite scroll: fetch next page when sentinel is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Helper: flatten paginated movies for search results
  const displayMovies = movieData?.pages?.flatMap((page) => page.movies) || [];

  if (isSearchMode) {
    return (
      <div className="px-4 lg:px-8 py-8">
        <SectionHeader
          title="Search Results"
          subtitle={`Showing results for "${debouncedQuery}"`}
          icon={TrendingUp}
        />

        <MoviesGrid
          movies={displayMovies}
          isLoading={isLoading}
          isError={isError}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          loadMoreRef={loadMoreRef}
        />
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-8 py-8">
      {/* Movies Section */}
      <SectionHeader
        title="Latest Movies"
        subtitle="Discover the newest releases and trending films"
        icon={Play}
      />

      <MoviesGrid
        movies={displayMovies}
        isLoading={isLoading}
        isError={isError}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadMoreRef={loadMoreRef}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="px-4 lg:px-8 py-8">
          <div className="text-white text-center">
            Loading amazing movies...
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
