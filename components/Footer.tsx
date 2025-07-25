"use client";

import { Film, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#1a1d23] border-t border-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">MoviesHub</h3>
          </div>



          {/* Copyright */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>© {new Date().getFullYear()} MoviesHub. Made with</span>
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
            <span>by</span>
            <a
              href="http://waseemanjum.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200"
            >
              Waseem Anjum
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;