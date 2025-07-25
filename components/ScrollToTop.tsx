"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

const ScrollToTop = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!showScrollTop) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 group p-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-110 hover:-translate-y-1"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-6 h-6 transition-transform duration-200 group-hover:-translate-y-0.5" />
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
    </button>
  );
};

export default ScrollToTop;