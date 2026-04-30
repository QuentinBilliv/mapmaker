import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import { WebAppJsonLd } from "@/components/seo/JsonLd";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const SITE_URL = "https://idomaps.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "idomaps — Create thematic maps",
    template: "%s | idomaps",
  },
  description:
    "Draw, style, and share thematic maps online. Free browser-based cartography tool with GeoJSON export.",
  keywords: [
    "map maker",
    "thematic maps",
    "thematic cartography",
    "draw map online",
    "GeoJSON editor",
    "map creator",
    "cartography tool",
  ],
  authors: [{ name: "idomaps" }],
  creator: "idomaps",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "idomaps",
    title: "idomaps — Create thematic maps",
    description:
      "Draw, style, and share thematic maps online. Free browser-based cartography tool with GeoJSON export.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "idomaps — Thematic cartography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "idomaps — Create thematic maps",
    description:
      "Draw, style, and share thematic maps online. Free browser-based cartography tool.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" translate="no" className={cn("font-sans", geistSans.variable)} suppressHydrationWarning>
        <head>
          <meta name="google" content="notranslate" />
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`,
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <WebAppJsonLd />
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
