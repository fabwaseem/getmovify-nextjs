import { Movie } from "@/types/movie";
import { useState } from "react";

interface MovieCardProps {
  movie: Movie;
  onClick?: (movie: Movie) => void;
}

const MovieCard = ({ movie, onClick }: MovieCardProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleClick = () => {
    if (onClick) {
      onClick(movie);
    }
  };

  return (
    <div
      className="bg-[#1a1d23] rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-200 group cursor-pointer  hover:shadow-xl"
      onClick={handleClick}
    >
      {/* Movie Poster */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {!imageError && movie.thumbnail ? (
          <img
            src={movie.thumbnail}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-gray-600 text-4xl">🎬</div>
          </div>
        )}


      </div>

      {/* Movie Info */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-white font-semibold text-lg mb-3 line-clamp-1">
          {movie.title}
        </h3>

        {/* Details Grid */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Release Date:</span>
            <span className="text-white">{movie.releaseDate}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Language:</span>
            <span className="text-white">{movie.language}</span>
          </div>
        </div>

        {/* Genre Tags */}
        <div className="flex flex-wrap gap-1 mt-4">
          {movie?.genre?.map((genre, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-md"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;