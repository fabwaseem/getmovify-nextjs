"use client";

import { Movie } from "@/types/movie";
import { ChevronRight, Loader2 } from "lucide-react";
import MovieCard from "./MovieCard";

interface CategorySectionProps {
  title: string;
  movies: Movie[];
  isLoading: boolean;
  isError: boolean;
  onViewMore?: () => void;
  onMovieClick: (movie: Movie) => void;
}

const CategorySection = ({
  title,
  movies,
  isLoading,
  isError,
  onViewMore,
  onMovieClick,
}: CategorySectionProps) => {
  if (isLoading) {
    return (
      <section className="py-8">
        <div className=" px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>

          {/* Loading Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-[#1a1d23] rounded-xl overflow-hidden border border-gray-800 animate-pulse"
              >
                <div className="aspect-[2/3] bg-gray-800"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-800 rounded"></div>
                  <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <button
              onClick={onViewMore}
              className="text-red-400 text-sm hover:text-red-300 transition-colors"
            >
              Retry
            </button>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-400">Failed to load {title.toLowerCase()} movies</p>
          </div>
        </div>
      </section>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-400">No {title.toLowerCase()} movies available</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section >
      <div className="px-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {
            onViewMore ? (<button
              onClick={onViewMore}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors group"
            >
              <span className="text-sm font-medium">View More</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>) : null
          }

        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
          {movies.slice(0, 6).map((movie, i) => (
            <div
              key={`${title}-${movie.title}-${i}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <MovieCard movie={movie} onClick={onMovieClick} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;