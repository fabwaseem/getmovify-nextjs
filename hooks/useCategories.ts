import { useQuery } from "@tanstack/react-query";
import { Category } from "@/types/movie";

const fetchCategories = async (): Promise<Category[]> => {
  const res = await fetch("/api/categories");
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  return res.json();
};

export function useCategories() {
  return useQuery<Category[], Error>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
