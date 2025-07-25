import { useInfiniteQuery } from "@tanstack/react-query";
import { Movie } from "@/types/movie";

interface MoviesResult {
  movies: Movie[];
  total: number;
  hasMore: boolean;
  nextPage?: number;
}

interface UseMoviesOptions {
  category?: string;
  search?: string;
  details?: boolean;
  infinite?: boolean;
}

const fetchMovies = async (
  options: UseMoviesOptions & { page?: number } = {}
): Promise<MoviesResult> => {
  const params = new URLSearchParams();

  // Add pagination
  if (options.page) params.set("page", options.page.toString());

  // Add search query
  if (options.search) {
    params.set("search", options.search);
  }

  // Add category
  if (options.category) {
    params.set("category", options.category);
  }

  // Add details flag
  if (options.details === false) params.set("details", "false");

  const res = await fetch(`/api/movies?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch movies");
  }
  return res.json();
};


// Infinite query for pagination
export function useInfiniteMovies(options: UseMoviesOptions = {}) {
  return useInfiniteQuery<MoviesResult, Error>({
    queryKey: ["movies", "infinite", options],
    queryFn: ({ pageParam = 1 }) =>
      fetchMovies({ ...options, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}