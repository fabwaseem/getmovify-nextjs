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
    <div className="group bg-gradient-to-br from-[#181c2b] to-[#10121a] rounded-2xl overflow-hidden shadow-xl  transition-all duration-300 flex flex-col h-full border border-[#23263a] hover:border-blue-600/60">
      <div className="relative w-full aspect-[2/3] bg-[#23263a] flex items-center justify-center">
        {images.length > 0 ? (
          <Slider
            {...sliderSettings}
            className="w-full h-full flex items-center justify-center"
          >
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={movie.title}
                className="object-contain w-full h-full  bg-black"
                style={{ aspectRatio: "2/3", objectFit: "contain" }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-movie.svg";
                }}
              />
            ))}
          </Slider>
        ) : (
          <Play className="w-20 h-20 text-gray-700" />
        )}
        {movie.quality && (
          <span className="absolute top-3 left-3 bg-blue-700/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            {movie.quality}
          </span>
        )}
        {movie.size && (
          <span className="absolute top-3 right-3 bg-green-700/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            {movie.size}
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-3 p-5">
        <h3 className="text-white text-lg font-bold tracking-wide leading-tight mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
          {movie.title}
        </h3>
        {/* <a
          href={movie.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
        >
          <Play className="w-4 h-4" /> Watch Now
        </a> */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
          {movie.genre && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4" /> {movie.genre.join(", ")}
            </span>
          )}
          {movie.language && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" /> {movie.language}
            </span>
          )}
          {movie.releaseDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" /> {movie.releaseDate}
            </span>
          )}
        </div>

        {movie.downloadLinks && movie.downloadLinks.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* header */}
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-bold">Download</span>
            </div>
            {/* links */}
            <div className="flex flex-wrap gap-2">
              {movie.downloadLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md transition-colors"
                >
                  {link.label.length > 18
                    ? link.label.slice(0, 18) + "..."
                    : link.label}
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
