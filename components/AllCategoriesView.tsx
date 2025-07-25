"use client";

import { Movie } from "@/types/movie";
import { useInfiniteMovies } from "@/hooks/useMovies";
import CategorySection from "./CategorySection";
import MovieModal from "./MovieModal";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  slug: string;
  name: string;
}

interface AllCategoriesViewProps {
  categories: Category[];
}

// Individual Category Component to avoid hook order issues
const CategoryMoviesSection = ({
  category,
  onViewMore,
  onMovieClick
}: {
  category: Category;
  onViewMore: (slug: string) => void;
  onMovieClick: (movie: Movie) => void;
}) => {
  const { data, isLoading, isError } = useInfiniteMovies({
    category: category.slug,
    details: true,
    infinite: true,
  });

  const movies = data?.pages?.[0]?.movies || [];

  return (
    <CategorySection
      title={category.name}
      movies={movies}
      isLoading={isLoading}
      isError={isError}
      onViewMore={() => onViewMore(category.slug)}
      onMovieClick={onMovieClick}
    />
  );
};



// Latest Movies Section Component
const LatestMoviesSection = ({ onMovieClick }: { onMovieClick: (movie: Movie) => void }) => {
  const { data, isLoading, isError } = useInfiniteMovies({
    details: true,
    infinite: true,
  });

  const movies = data?.pages?.[0]?.movies || [];

  return (
    <CategorySection
      title="Latest Movies"
      movies={movies}
      isLoading={isLoading}
      isError={isError}
      onMovieClick={onMovieClick}
    />
  );
};

const AllCategoriesView = ({ categories }: AllCategoriesViewProps) => {
  const router = useRouter();
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

  const handleViewMore = (categorySlug: string) => {
    router.push(`/category/${categorySlug}`);
  };


  return (
    <>
      <div className="space-y-4 py-8">

        {/* Latest Movies Section */}
        <LatestMoviesSection onMovieClick={handleMovieClick} />

        {/* Category Sections */}
        {categories.map((category) => (
          <CategoryMoviesSection
            key={category.slug}
            category={category}
            onViewMore={handleViewMore}
            onMovieClick={handleMovieClick}
          />
        ))}
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

export default AllCategoriesView;