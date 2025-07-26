"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function HeaderContent() {
  const searchParams = useSearchParams();

  const searchQuery = searchParams.get("search") || "";
  const [, setLocalSearchQuery] = useState(searchQuery);

  // Sync local search with URL params
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (query: string) => {
    setLocalSearchQuery(query);

    // Update URL with search params
    const url = new URL(window.location.href);
    if (query.trim()) {
      url.searchParams.set("search", query);
    } else {
      url.searchParams.delete("search");
    }
    window.history.replaceState({}, "", url.toString());
  };

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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search"
              className="w-64 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-cyan-500  w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<div className="h-16 bg-gray-900"></div>}>
      <HeaderContent />
    </Suspense>
  );
}
