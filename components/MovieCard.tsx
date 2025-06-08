import { Movie } from "@/types/movie";
import { Calendar, Play, Star, Users } from "lucide-react";
import Slider from "react-slick";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";

interface MovieCardProps {
  movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
  // Prepare images: always show thumbnail first, then the rest (no duplicates, no undefined)
  const images: string[] =
    movie.images && movie.images.length > 0
      ? [
          movie.thumbnail,
          ...movie.images.filter((img) => img && img !== movie.thumbnail),
        ].filter((img): img is string => Boolean(img))
      : movie.thumbnail
      ? [movie.thumbnail].filter((img): img is string => Boolean(img))
      : [];

  // Carousel settings
  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: images.length > 1,
    adaptiveHeight: true,
  };

  return (
    <div className="group relative bg-gradient-to-br from-[#1a1f35] via-[#181c2b] to-[#0f1419] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 flex flex-col h-full border border-[#23263a]/50 hover:border-blue-500/40 hover:shadow-blue-500/20 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none z-10"></div>

      {/* Glow effect on hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-pink-500/20 rounded-3xl blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>

      <div className="relative w-full aspect-[2/3] bg-gradient-to-br from-[#23263a] to-[#1a1f35] flex items-center justify-center overflow-hidden rounded-t-3xl">
        {images.length > 0 ? (
          <Slider
            {...sliderSettings}
            className="w-full h-full flex items-center justify-center"
          >
            {images.map((img, idx) => (
              <div key={idx} className="relative w-full h-full">
                <img
                  src={img}
                  alt={movie.title}
                  className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                  style={{ aspectRatio: "2/3" }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-movie.svg";
                  }}
                />
                {/* Image overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>
            ))}
          </Slider>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-600 space-y-4">
            <Play className="w-20 h-20 text-gray-600 animate-pulse" />
            <span className="text-sm font-medium">No Preview</span>
          </div>
        )}

        {/* Quality and Size badges with glassmorphism */}
        {movie.quality && (
          <span className="absolute top-4 left-4 backdrop-blur-lg bg-blue-600/80 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-xl border border-blue-400/30 z-20">
            {movie.quality}
          </span>
        )}
        {movie.size && (
          <span className="absolute top-4 right-4 backdrop-blur-lg bg-emerald-600/80 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-xl border border-emerald-400/30 z-20">
            {movie.size}
          </span>
        )}
      </div>

      <div className="relative flex-1 flex flex-col gap-4 p-6 z-20">
        <h3 className="text-white text-xl font-bold tracking-wide leading-tight mb-2 line-clamp-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
          {movie.title}
        </h3>

        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
          {movie.genre && (
            <span className="flex items-center gap-1.5 bg-gray-800/50 px-3 py-1 rounded-full backdrop-blur-sm">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="truncate max-w-[120px]">
                {movie.genre.join(", ")}
              </span>
            </span>
          )}
          {movie.language && (
            <span className="flex items-center gap-1.5 bg-gray-800/50 px-3 py-1 rounded-full backdrop-blur-sm">
              <Users className="w-4 h-4 text-cyan-400" /> {movie.language}
            </span>
          )}
          {movie.releaseDate && (
            <span className="flex items-center gap-1.5 bg-gray-800/50 px-3 py-1 rounded-full backdrop-blur-sm">
              <Calendar className="w-4 h-4 text-green-400" />{" "}
              {movie.releaseDate}
            </span>
          )}
        </div>

        {movie.downloadLinks && movie.downloadLinks.length > 0 && (
          <div className="flex flex-col gap-3 mt-auto">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-bold">
                Download Links
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {movie.downloadLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all duration-300 hover:shadow-blue-500/25 hover:scale-105 overflow-hidden"
                >
                  <span className="relative z-10">
                    {link.label.length > 18
                      ? link.label.slice(0, 18) + "..."
                      : link.label}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 translate-x-[-100%] group-hover/link:translate-x-[100%] transition-transform duration-500"></div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
