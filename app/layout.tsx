import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MovieHub - Discover, Search, and Download the Latest Movies",
  description:
    "MovieHub lets you discover, search, and download the latest movies. Fast, reliable, and always up-to-date. Find your next favorite film now!",
  metadataBase: new URL("https://movieshub-app.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MovieHub - Discover, Search, and Download the Latest Movies",
    description:
      "MovieHub lets you discover, search, and download the latest movies. Fast, reliable, and always up-to-date. Find your next favorite film now!",
    url: "https://movieshub-app.vercel.app",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MovieHub - Discover, Search, and Download the Latest Movies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MovieHub - Discover, Search, and Download the Latest Movies",
    description:
      "MovieHub lets you discover, search, and download the latest movies. Fast, reliable, and always up-to-date. Find your next favorite film now!",
    images: ["/og-image.png"],
    site: "@yourtwitter",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} font-sans  antialiased`}>
        {children}
      </body>
    </html>
  );
}
