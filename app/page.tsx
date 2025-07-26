"use client";

import MoviesGrid from "@/components/MoviesGrid";
import { useInfiniteMovies } from "@/hooks/useMovies";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "use-debounce";

function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [debouncedQuery] = useDebounce(searchQuery, 400);

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

  // Infinite scroll: fetch next page when sentinel is in view (for search only)
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && isSearchMode) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, isSearchMode]);

  // Helper: flatten paginated movies for search results
  const displayMovies = movieData?.pages?.flatMap((page) => page.movies) || [];

  return (
    <div className=" px-4 py-8">
      {isSearchMode ? (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Search Results</h1>
          <p className="text-gray-400 mt-2">
            Showing results for &quot;{debouncedQuery}&quot;
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Latest Movies</h1>
        </div>
      )}

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
        <div className="px-4 py-8">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
