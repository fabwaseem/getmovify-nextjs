"use client";

import { useParams, useSearchParams } from "next/navigation";
import MoviesGrid from "@/components/MoviesGrid";
import { useInfiniteMovies } from "@/hooks/useMovies";
import { useCategories } from "@/hooks/useCategories";
import { useEffect, Suspense } from "react";
import { useDebounce } from "use-debounce";
import { useInView } from "react-intersection-observer";

function CategoryPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const categorySlug = params.slug as string;
  const searchQuery = searchParams.get("search") || "";

  const [debouncedQuery] = useDebounce(searchQuery, 400);

  // Use hook for categories
  const {
    data: categories,
  } = useCategories();

  // Determine if we're in search mode within this category
  const isSearchMode = debouncedQuery.trim() !== "";

  // Use infinite hook for category movies with optional search
  const {
    data: movieData,
    isLoading,
    isError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteMovies({
    category: categorySlug,
    ...(isSearchMode && { search: debouncedQuery }),
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

  // Helper: flatten paginated movies
  const displayMovies = movieData?.pages?.flatMap((page) => page.movies) || [];

  // Find current category name
  const currentCategory = categories?.find(cat => cat.slug === categorySlug);
  const categoryName = currentCategory?.name || categorySlug;

  return (
    <div className=" px-4 py-8">
      {/* Category Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">
          {isSearchMode ? `Search results in ${categoryName}` : categoryName}
        </h1>
        {isSearchMode && (
          <p className="text-gray-400 mt-2">
            Showing results for &quot;{debouncedQuery}&quot;
          </p>
        )}
      </div>

      {/* Movies Grid */}
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

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8"><div className="text-white">Loading...</div></div>}>
      <CategoryPageContent />
    </Suspense>
  );
}