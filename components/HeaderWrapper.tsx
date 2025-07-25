"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCategories } from "@/hooks/useCategories";
import { useEffect, useState, Suspense } from "react";
import Header from "./Header";

function HeaderWrapperContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const searchQuery = searchParams.get("search") || "";
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Usehook for categories
  const {
    data: categories,
    isLoading: isLoadingCategories,
  } = useCategories();

  // Determine selected category from URL
  const selectedCategory = pathname.startsWith("/category/")
    ? pathname.split("/category/")[1]
    : null;

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

  const handleCategorySelect = (category: string) => {
    // Navigate to category page or home
    if (category) {
      router.push(`/category/${category}`);
    } else {
      router.push("/");
    }
  };

  return (
    <Header
      searchQuery={localSearchQuery}
      onSearchChange={handleSearchChange}
      categories={categories}
      selectedCategory={selectedCategory}
      onCategorySelect={handleCategorySelect}
      isLoadingCategories={isLoadingCategories}
    />
  );
}

export default function HeaderWrapper() {
  return (
    <Suspense fallback={<div className="h-16 bg-gray-900"></div>}>
      <HeaderWrapperContent />
    </Suspense>
  );
}