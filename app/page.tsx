"use client";

import LoadingSkeleton from "@/components/LoadingSkeleton";
import ModernSkeleton from "@/components/ModernSkeleton";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";
import { Calendar, ChevronUp, Film, Search, Star } from "lucide-react";
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Fetch popular and latest movies on component mount
  useEffect(() => {
    fetchHomepageMovies();
  }, []);

  // Handle scroll for floating button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0c16] via-[#1a1d2e] to-[#0f1419] text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-500/10 to-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Hero/Search */}
      <section className="w-full py-20 px-0 relative">
        <div className="w-full flex flex-col items-center gap-6">
          <div className="text-center space-y-4 mb-8">
            <h1
              className="text-7xl md:text-8xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl mb-4 animate-fade-in"
              style={{ letterSpacing: "-0.06em" }}
            >
              MovieHub
            </h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-20 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full"></div>
              <Film className="w-8 h-8 text-blue-400" />
              <div className="w-20 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full"></div>
            </div>
            <p
              className="text-xl md:text-2xl text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in-delayed"
              style={{ letterSpacing: "0.02em", animationDelay: "0.3s" }}
            >
              Discover, search, and download the latest movies in stunning
              quality
            </p>
          </div>

          <div
            className="w-full flex justify-center animate-fade-in-delayed-2"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="relative w-full max-w-4xl">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
              <div className="relative backdrop-blur-sm bg-white/5 rounded-3xl p-2 border border-white/10">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for your favorite movies..."
                  className="w-full py-6 pl-16 pr-16 rounded-2xl bg-black/20 border-0 focus:bg-black/30 text-xl text-white placeholder-gray-400 shadow-2xl outline-none transition-all duration-300 backdrop-blur-sm"
                  style={{ letterSpacing: "0.01em" }}
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400 w-8 h-8" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-2xl transition-colors duration-200 hover:scale-110"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {showSearchResults && (
        <section className="w-full py-16 px-0 bg-gradient-to-b from-[#10121a]/80 to-[#0f1419]/90 border-t border-[#23263a]/50 backdrop-blur-sm">
          <div className="w-full px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-4">
              <h2
                className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
                style={{ letterSpacing: "-0.02em" }}
              >
                Search Results for{" "}
                <span className="text-purple-400">
                  &quot;{debouncedQuery}&quot;
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></div>
                <span className="text-lg text-gray-400 font-medium">
                  {searchResults.length} movie
                  {searchResults.length !== 1 ? "s" : ""} found
                </span>
              </div>
            </div>
            {isSearching ? (
              <ModernSkeleton />
            ) : searchResults.length > 0 ? (
              <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6">
                {searchResults.map((movie, i) => (
                  <div
                    key={`search-${i}`}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-32">
                <div className="relative">
                  <Film className="w-32 h-32 text-gray-700 mb-8 animate-float" />
                  <div className="absolute inset-0 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                </div>
                <p className="text-3xl text-gray-400 font-medium">
                  No movies found for your search.
                </p>
                <p className="text-lg text-gray-500 mt-2">
                  Try different keywords or browse our popular movies below.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Popular Movies */}
      {!showSearchResults && (
        <section
          className={`w-full py-16 px-0 bg-gradient-to-b from-[#10121a] to-transparent border-t border-[#23263a]/50 transition-all duration-1000 `}
        >
          <div className="w-full px-8">
            <div className="flex items-center gap-4 mb-12">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl shadow-lg">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h2
                  className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Popular Movies
                </h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent"></div>
            </div>
            {isLoading ? (
              <ModernSkeleton />
            ) : popularMovies.length > 0 ? (
              <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6">
                {popularMovies.map((movie, i) => (
                  <div
                    key={`popular-${i}`}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-24">
                <div className="relative">
                  <Film className="w-24 h-24 text-gray-700 mb-6 animate-float" />
                  <div className="absolute inset-0 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
                </div>
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
        <section
          className={`w-full py-16 px-0 bg-gradient-to-b from-transparent to-[#181c2b] border-t border-[#23263a]/50 transition-all duration-1000 `}
        >
          <div className="w-full px-8">
            <div className="flex items-center gap-4 mb-12">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-lg">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h2
                  className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Latest Movies
                </h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-green-500/50 to-transparent"></div>
            </div>
            {isLoading ? (
              <LoadingSkeleton />
            ) : latestMovies.length > 0 ? (
              <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6">
                {latestMovies.map((movie, i) => (
                  <div
                    key={`latest-${i}`}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-24">
                <div className="relative">
                  <Film className="w-24 h-24 text-gray-700 mb-6 animate-float" />
                  <div className="absolute inset-0 w-24 h-24 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                </div>
                <p className="text-2xl text-gray-400">
                  No latest movies available.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="w-full py-12 bg-gradient-to-r from-[#0a0c16] via-[#10121a] to-[#0a0c16] border-t border-[#23263a]/50 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-gradient-to-r from-pink-500 to-yellow-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative w-full flex flex-col items-center gap-4 text-gray-400 text-lg">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-6 h-6 text-blue-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              MovieHub
            </span>
          </div>
          <span className="text-center">
            © {new Date().getFullYear()} MovieHub. Crafted with{" "}
            <span className="text-red-400 animate-pulse">❤️</span> by{" "}
            <a
              href="http://waseemanjum.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors duration-300 underline underline-offset-4 decoration-blue-400/30 hover:decoration-blue-300/50"
            >
              Waseem Anjum
            </a>
          </span>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Discover • Download • Enjoy</span>
          </div>
        </div>
      </footer>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded-full shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-110 animate-fade-in"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
