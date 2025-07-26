"use client";

import { Movie } from "@/types/movie";
import MovieCard from "./MovieCard";
import MovieModal from "./MovieModal";
import { useState } from "react";

interface MoviesGridProps {
  movies: Movie[] | undefined;
  isLoading: boolean;
  isError: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  loadMoreRef?: (node?: Element | null) => void;
}

const MoviesGrid = ({
  movies,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
}: MoviesGridProps) => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovie(null);
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#1a1d23] rounded-xl overflow-hidden border border-gray-800 animate-pulse"
            >
              <div className="aspect-[3/4] bg-gray-800"></div>
              <div className="p-4 space-y-3">
                <div className="h-6 bg-gray-800 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-800 rounded"></div>
                  <div className="h-4 bg-gray-800 rounded"></div>
                  <div className="h-4 bg-gray-800 rounded"></div>
                </div>
                <div className="flex gap-1">
                  <div className="h-6 w-16 bg-gray-800 rounded"></div>
                  <div className="h-6 w-16 bg-gray-800 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <div className="text-red-400 mb-2">Failed to load movies</div>
          <p className="text-gray-500">Please try again later</p>
        </div>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No movies found
          </h3>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {movies.map((movie, i) => (
            <div key={`movie-${movie.title}-${i}`}>
              <MovieCard movie={movie} onClick={handleMovieClick} />
            </div>
          ))}
        </div>

        {/* Infinite scroll senti movies */}
        {hasNextPage && loadMoreRef && (
          <div ref={loadMoreRef} className="flex justify-center mt-8">
            {isFetchingNextPage && (
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading more movies...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Movie Modal */}
      <MovieModal
        movie={selectedMovie}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default MoviesGrid;
