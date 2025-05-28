"use client";

import LoadingSkeleton from "@/components/LoadingSkeleton";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";
import {
  Calendar,
  Film,
  Search,
  Star
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

interface MoviesResponse {
  popular: Movie[];
  latest: Movie[];
  total: number;
  popularCount: number;
  latestCount: number;
}


export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 400);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Fetch popular and latest movies on component mount
  useEffect(() => {
    fetchHomepageMovies();
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim() === "") {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    // Abort previous search if any
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    const fetchSearch = async () => {
      if (debouncedQuery.trim().length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      setShowSearchResults(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&details=true`,
          { signal: abortController.signal }
        );
        if (!response.ok) throw new Error("Network error");
        const data = await response.json();
        setSearchResults(data.movies);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was aborted, do nothing
          return;
        }
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    fetchSearch();

    // Cleanup: abort on unmount or next effect run
    return () => {
      abortController.abort();
    };
  }, [debouncedQuery]);

  const fetchHomepageMovies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/movies?details=true");
      const data: MoviesResponse = await response.json();
      setPopularMovies(data.popular);
      setLatestMovies(data.latest);
    } catch (error) {
      console.error("Error fetching homepage movies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0c16] via-[#181c2b] to-[#0a0c16] text-white">
      {/* Hero/Search */}
      <section className="w-full py-16 px-0 bg-gradient-to-b from-[#181c2b] to-transparent relative">
        <div className="w-full flex flex-col items-center gap-3">
          <h1
            className="text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg mb-2"
            style={{ letterSpacing: "-0.04em" }}
          >
            MovieHub
          </h1>
          <p
            className="text-2xl md:text-3xl text-gray-300 font-medium mb-6 tracking-wide"
            style={{ letterSpacing: "0.01em" }}
          >
            Discover, search, and download the latest movies
          </p>
          <div className="w-full flex justify-center">
            <div className="relative w-full max-w-3xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for movies..."
                className="w-full py-5 pl-16 pr-12 rounded-2xl bg-[#10121a] border-2 border-[#23263a] focus:border-blue-600 text-lg text-white placeholder-gray-500 shadow-xl outline-none transition-all"
                style={{ letterSpacing: "0.01em" }}
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-400 w-7 h-7" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-2xl"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {showSearchResults && (
        <section className="w-full py-10 px-0 bg-[#10121a] border-t border-[#23263a]">
          <div className="w-full px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
              <h2
                className="text-4xl font-extrabold tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                Search Results for{" "}
                <span className="text-blue-400">
                  &quot;{debouncedQuery}&quot;
                </span>
              </h2>
              <span className="text-lg text-gray-400">
                {searchResults.length} movie
                {searchResults.length !== 1 ? "s" : ""} found
              </span>
            </div>
            {isSearching ? (
              <LoadingSkeleton />
            ) : searchResults.length > 0 ? (
              <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))]  gap-3">
                {searchResults.map((movie, i) => (
                  <MovieCard key={`search-${i}`} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-24">
                <Film className="w-24 h-24 text-gray-700 mb-6" />
                <p className="text-2xl text-gray-400">
                  No movies found for your search.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Popular Movies */}
      {!showSearchResults && (
        <section className="w-full py-12 px-0 bg-gradient-to-b from-[#10121a] to-transparent border-t border-[#23263a]">
          <h2
            className="text-4xl font-extrabold tracking-tight px-8 mb-10"
            style={{ letterSpacing: "-0.02em" }}
          >
            <span className="text-yellow-400">
              <Star className="inline w-8 h-8 mr-2" />
            </span>{" "}
            Popular Movies
          </h2>
          <div className="w-full px-8">
            {isLoading ? (
              <LoadingSkeleton />
            ) : popularMovies.length > 0 ? (
              <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-3">
                {popularMovies.map((movie, i) => (
                  <MovieCard key={`popular-${i}`} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-24">
                <Film className="w-24 h-24 text-gray-700 mb-6" />
                <p className="text-2xl text-gray-400">
                  No popular movies available.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Latest Movies */}
      {!showSearchResults && (
        <section className="w-full py-12 px-0 bg-gradient-to-b from-transparent to-[#181c2b] border-t border-[#23263a]">
          <h2
            className="text-4xl font-extrabold tracking-tight px-8 mb-10"
            style={{ letterSpacing: "-0.02em" }}
          >
            <span className="text-green-400">
              <Calendar className="inline w-8 h-8 mr-2" />
            </span>{" "}
            Latest Movies
          </h2>
          <div className="w-full px-8">
            {isLoading ? (
              <LoadingSkeleton />
            ) : latestMovies.length > 0 ? (
              <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-3">
                {latestMovies.map((movie, i) => (
                  <MovieCard key={`latest-${i}`} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-24">
                <Film className="w-24 h-24 text-gray-700 mb-6" />
                <p className="text-2xl text-gray-400">
                  No latest movies available.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="w-full py-10 bg-[#10121a] border-t border-[#23263a] ">
        <div className="w-full flex flex-col items-center gap-2 text-gray-500 text-lg">
          <span>
            © {new Date().getFullYear()} MovieHub. Built with ❤️ by{" "}
            <a
              href="http://waseemanjum.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Waseem Anjum
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
