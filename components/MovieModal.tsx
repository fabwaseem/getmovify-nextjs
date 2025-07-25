"use client";

import { Movie } from "@/types/movie";
import { X, Download, Calendar, Users, Star, Play, ExternalLink } from "lucide-react";
import { useEffect } from "react";

interface MovieModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
}

const MovieModal = ({ movie, isOpen, onClose }: MovieModalProps) => {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[#1a1d23] rounded-2xl border border-gray-800 overflow-hidden animate-slide-in shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Header Section */}
          <div className="relative">
            {/* Background Image */}
            {movie.thumbnail && (
              <div className="relative h-64 overflow-hidden">
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1d23] via-transparent to-transparent" />
              </div>
            )}

            {/* Movie Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-3xl font-bold text-white mb-2">{movie.title}</h1>

              {/* Movie Meta */}
              <div className="flex flex-wrap gap-3 text-sm">
                {movie.quality && (
                  <span className="px-3 py-1 bg-cyan-500 text-white rounded-full font-medium">
                    {movie.quality}
                  </span>
                )}
                {movie.size && (
                  <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full">
                    {movie.size}
                  </span>
                )}
                {movie.language && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-gray-800 text-gray-300 rounded-full">
                    <Users className="w-4 h-4" />
                    {movie.language}
                  </div>
                )}
                {movie.releaseDate && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-gray-800 text-gray-300 rounded-full">
                    <Calendar className="w-4 h-4" />
                    {movie.releaseDate}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 space-y-6">
            {/* Genres */}
            {movie.genre && movie.genre.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genre.map((genre, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Story/Description */}
            {movie.story && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-400" />
                  Story
                </h3>
                <p className="text-gray-300 leading-relaxed">{movie.story}</p>
              </div>
            )}

            {/* Cast */}
            {movie.stars && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Cast
                </h3>
                <p className="text-gray-300">{movie.stars}</p>
              </div>
            )}

            {/* Additional Images */}
            {movie.images && movie.images.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Screenshots</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {movie.images.slice(0, 6).map((image, index) => (
                    <div key={index} className="relative aspect-video overflow-hidden rounded-lg">
                      <img
                        src={image}
                        alt={`${movie.title} screenshot ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download Links */}
            {movie.downloadLinks && movie.downloadLinks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-400" />
                  Download Links ({movie.downloadLinks.length})
                </h3>
                <div className="grid gap-3">
                  {movie.downloadLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                          <Download className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                            {link.label}
                          </p>
                          <p className="text-gray-400 text-sm">Click to download</p>
                        </div>
                      </div>
                      <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* No Download Links Message */}
            {(!movie.downloadLinks || movie.downloadLinks.length === 0) && (
              <div className="text-center py-8">
                <Download className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No download links available for this movie.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieModal;