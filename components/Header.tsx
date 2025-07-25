"use client";

import { Search } from "lucide-react";

interface Category {
  slug: string;
  name: string;
}

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: Category[] | undefined;
  selectedCategory: string | null;
  onCategorySelect: (category: string) => void;
  isLoadingCategories: boolean;
}

const Header = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategorySelect,
  isLoadingCategories
}: HeaderProps) => {
  return (
    <div className="bg-[#1a1d23] border-b border-gray-800 p-6">
      <div className="flex items-center justify-between gap-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">MH</span>
          </div>
          <h1 className="text-white text-2xl font-bold">MoviesHub</h1>
        </div>

        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              className="w-64 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-cyan-500  w-full"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="border-t border-gray-800 pt-4 -mx-6 px-6">
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto scrollbar-hide">
          {isLoadingCategories ? (
            <div className="flex gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-20 bg-gray-800 rounded animate-pulse"></div>
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <>
              <button
                onClick={() => onCategorySelect("")}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${!selectedCategory
                  ? "text-cyan-400 border-cyan-400"
                  : "text-gray-400 hover:text-white border-transparent hover:border-gray-600"
                  }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => onCategorySelect(category.slug)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${selectedCategory === category.slug
                    ? "text-cyan-400 border-cyan-400"
                    : "text-gray-400 hover:text-white border-transparent hover:border-gray-600"
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </>
          ) : (
            <div className="text-gray-500 text-sm py-2">No categories available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;