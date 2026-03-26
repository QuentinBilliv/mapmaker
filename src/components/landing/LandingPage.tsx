"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FaArrowRight, FaPenRuler, FaLayerGroup, FaShareNodes, FaGlobe, FaPalette, FaShapes, FaChevronLeft, FaChevronRight } from "react-icons/fa6";

const SHOWCASE_MAPS = [
  { id: "jx77494rrqvc0012k7c0sznrbd83nj0c", image: "/showcase_1.png", title: "Iceland — Nature & National Parks", description: "Volcanoes, glaciers, waterfalls, and the Ring Road" },
  { id: "jx78nmwn7a4w8rfhr4dgtznb8h83h3pn", image: "/showcase_2.png", title: "Sake Regions of Japan", description: "Major sake-producing prefectures and their brewing styles" },
  { id: "jx7e1kxsvx5fdcde4refmhejxd8393bp", image: "/showcase_3.png", title: "The Silk Road", description: "Overland and maritime trade routes from China to the Mediterranean" },
  { id: "jx723w16yzc4w2fyd73xwz37s583h0kn", image: "/showcase_4.png", title: "Ancient Egypt", description: "Archaeological sites, oases, and trade routes along the Nile" },
];

export default function LandingPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <Hero />
      <Features />
      <EmbedDemo />
      <HowItWorks />
      <CallToAction />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0f0f0f] text-white">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23fff' stroke-width='.5' fill='none'/%3E%3C/svg%3E")`,
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-amber-900/20 via-transparent to-transparent pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(180,120,60,0.12) 0%, transparent 70%)",
      }} />
      <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-36 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-white/10 bg-white/5 text-xs tracking-wide text-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Browser-based &middot; No install
        </div>
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          Draw maps that
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300">
            tell stories
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/50 leading-relaxed mb-10">
          Create thematic maps with a powerful browser-based editor.
          Style every detail, organize with groups and legend, then export or share.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/try"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-[#0f0f0f] font-semibold text-sm hover:bg-amber-50 transition-colors"
          >
            Start creating
            <FaArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/maps"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/15 text-white/70 font-medium text-sm hover:bg-white/5 hover:text-white transition-colors"
          >
            Browse public maps
          </Link>
        </div>
        <div className="mt-16 md:mt-24 relative">
          <div className="absolute -inset-4 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent z-10 pointer-events-none" />
          <MapCarousel />
        </div>
      </div>
    </section>
  );
}

function MapCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((i) => (i + 1) % SHOWCASE_MAPS.length), []);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + SHOWCASE_MAPS.length) % SHOWCASE_MAPS.length), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="ml-3 text-[10px] text-white/20 tracking-wider">mapmaker.dev</span>
        </div>
        <div className="aspect-[16/9] bg-[#1a1a1a] relative overflow-hidden">
          {SHOWCASE_MAPS.map((m, i) => (
            <div
              key={m.id}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === current ? 1 : 0 }}
            >
              <Link href={`/maps/${m.id}`} className="block w-full h-full relative">
                <img
                  src={m.image}
                  alt={m.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-16 md:px-6 md:pb-10 md:pt-28" style={{ background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0) 100%)" }}>
                  <h3 className="text-white font-bold text-sm md:text-2xl">{m.title}</h3>
                  <p className="text-white text-xs md:text-sm mt-1 md:mt-1.5 opacity-80 hidden sm:block">{m.description}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white flex items-center justify-center transition-colors"
      >
        <FaChevronLeft className="w-3 h-3" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white flex items-center justify-center transition-colors"
      >
        <FaChevronRight className="w-3 h-3" />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {SHOWCASE_MAPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: FaPenRuler,
    title: "Precision drawing tools",
    desc: "Polygons, polylines, points, text, arrows, circles, rectangles. Every geometry you need for detailed cartography.",
  },
  {
    icon: FaPalette,
    title: "Rich styling options",
    desc: "Colors, opacity, fill patterns, line styles, decorations, custom SVG markers, and icon library.",
  },
  {
    icon: FaLayerGroup,
    title: "Layers and groups",
    desc: "Organize features into layers and groups. Reorder with drag & drop. Collapse for a clean workspace.",
  },
  {
    icon: FaShapes,
    title: "Legend system",
    desc: "Create legend entries with shared styles. Assign features to legend entries for consistent, professional maps.",
  },
  {
    icon: FaShareNodes,
    title: "Share your maps",
    desc: "Publish your maps with a public link or embed them on any website with a simple iframe snippet.",
  },
  {
    icon: FaGlobe,
    title: "Multiple base maps",
    desc: "OpenStreetMap, Voyager, Topographic, Satellite, and more. Switch between flat and globe projection.",
  },
];

function Features() {
  return (
    <section className="bg-[#faf9f6] py-20 md:py-28 border-t border-black/5">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-xs tracking-[0.2em] uppercase text-amber-700/60 font-medium mb-3">Features</p>
        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#1a1a1a] mb-4">
          Everything you need to make maps
        </h2>
        <p className="text-base text-[#1a1a1a]/50 max-w-xl mb-14">
          A complete cartography toolkit that runs entirely in your browser. No plugins, no desktop app.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {FEATURES.map((f) => (
            <div key={f.title} className="group">
              <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] text-white flex items-center justify-center mb-3 group-hover:bg-amber-700 transition-colors">
                <f.icon className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-[#1a1a1a] mb-1.5">{f.title}</h3>
              <p className="text-sm text-[#1a1a1a]/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmbedDemo() {
  return (
    <section className="bg-white py-20 md:py-28 border-t border-black/5">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-xs tracking-[0.2em] uppercase text-amber-700/60 font-medium mb-3">Try it</p>
        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#1a1a1a] mb-4">
          Explore a map
        </h2>
        <p className="text-base text-[#1a1a1a]/50 max-w-xl mb-8">
          This is a real map made with MapMaker. Zoom, pan, and hover to explore.
        </p>
        <div className="rounded-xl overflow-hidden border shadow-lg">
          <iframe
            src="/embed/jx77494rrqvc0012k7c0sznrbd83nj0c"
            width="100%"
            height="500"
            style={{ border: "none" }}
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { step: "01", title: "Draw on the map", desc: "Use the toolbar to draw polygons, lines, points, or text directly on any base map." },
  { step: "02", title: "Style and organize", desc: "Customize colors, patterns, and borders. Group features and build a legend." },
  { step: "03", title: "Share and explore", desc: "Publish your map with a public link and browse what others have created." },
];

function HowItWorks() {
  return (
    <section className="bg-white py-20 md:py-28 border-t border-black/5">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-xs tracking-[0.2em] uppercase text-amber-700/60 font-medium mb-3">How it works</p>
        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#1a1a1a] mb-14">
          Three steps to a finished map
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.step} className="relative">
              <span className="font-serif text-5xl font-bold text-amber-200/60">{s.step}</span>
              <h3 className="font-semibold text-[#1a1a1a] mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-[#1a1a1a]/50 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="relative bg-[#0f0f0f] py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23fff' stroke-width='.5' fill='none'/%3E%3C/svg%3E")`,
      }} />
      <div className="relative max-w-2xl mx-auto px-6 text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
          Ready to draw your first map?
        </h2>
        <p className="text-base text-white/40 mb-8">
          No account required. Open the editor and start drawing in seconds.
        </p>
        <Link
          href="/try"
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-[#0f0f0f] font-semibold text-sm hover:bg-amber-50 transition-colors"
        >
          Open the editor
          <FaArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5 py-8">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-white/20">&copy; {new Date().getFullYear()} MapMaker</span>
        <div className="flex items-center gap-4">
          <Link href="/maps" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            Public maps
          </Link>
          <Link href="/signup" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
