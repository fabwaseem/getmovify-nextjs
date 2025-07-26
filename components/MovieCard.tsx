import { Movie } from "@/types/movie";
import { useState } from "react";
import { Play, Calendar, Globe, Star, Film } from "lucide-react";

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
      className="bg-gradient-to-b from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
      onClick={handleClick}
    >
      {/* Movie Poster */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {!imageError && movie.thumbnail ? (
          <>
            <img
              src={movie.thumbnail}
              alt={movie.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={handleImageError}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Play className="w-8 h-8 text-white" fill="white" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <Film className="w-16 h-16 text-gray-500" />
          </div>
        )}

        {/* Quality Badge */}
        {movie.quality && (
          <div className="absolute top-3 right-3 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
            {movie.quality}
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="p-5">
        {/* Title */}
        <h3 className="text-white font-bold text-lg mb-3 line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
          {movie.title}
        </h3>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {movie.releaseDate && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{movie.releaseDate}</span>
            </div>
          )}

          {movie.language && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Globe className="w-4 h-4" />
              <span>{movie.language}</span>
            </div>
          )}

          {movie.size && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Star className="w-4 h-4" />
              <span>{movie.size}</span>
            </div>
          )}
        </div>

        {/* Genre Tags */}
        {movie.genre && movie.genre.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.genre.slice(0, 3).map((genre, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30"
              >
                {genre}
              </span>
            ))}
            {movie.genre.length > 3 && (
              <span className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-full">
                +{movie.genre.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2">
            <Play className="w-4 h-4" />
            Watch Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
