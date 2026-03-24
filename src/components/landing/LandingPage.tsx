"use client";

import Link from "next/link";
import { FaArrowRight, FaPenRuler, FaLayerGroup, FaShareNodes, FaGlobe, FaPalette, FaShapes } from "react-icons/fa6";

export default function LandingPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <Hero />
      <Features />
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
          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden shadow-2xl shadow-black/40">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="ml-3 text-[10px] text-white/20 tracking-wider">mapmaker.dev</span>
            </div>
            <div className="aspect-[16/9] bg-gradient-to-br from-[#1a2332] via-[#1e3a2f] to-[#2a1f1a] flex items-center justify-center relative overflow-hidden">
              <EditorMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EditorMockup() {
  return (
    <div className="w-full h-full relative flex">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 100c50-30 100 20 200-10' stroke='%234a90d9' stroke-width='2' fill='none' opacity='.3'/%3E%3Cpath d='M30 0c-10 60 40 120 20 200' stroke='%234a90d9' stroke-width='1.5' fill='none' opacity='.2'/%3E%3C/svg%3E")`,
      }} />
      <div className="absolute left-4 top-4 flex flex-col gap-1.5">
        {["▸", "⬠", "▭", "◯", "╲", "●", "T"].map((icon, i) => (
          <div key={i} className={`w-7 h-7 rounded flex items-center justify-center text-[10px] ${i === 1 ? "bg-white/20 text-white" : "bg-white/5 text-white/40"}`}>
            {icon}
          </div>
        ))}
      </div>
      <div className="absolute top-[15%] left-[20%] w-[35%] h-[40%] rounded-sm border-2 border-amber-400/50 bg-amber-400/10" />
      <div className="absolute top-[25%] left-[50%]">
        <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg" />
      </div>
      <div className="absolute top-[55%] left-[30%] right-[25%] h-0.5 bg-blue-400/60" style={{
        clipPath: "polygon(0% 50%, 15% 0%, 35% 100%, 55% 20%, 75% 80%, 100% 50%)",
        height: "30px",
      }} />
      <svg className="absolute top-[50%] left-[28%]" width="200" height="40" viewBox="0 0 200 40">
        <path d="M0 20 Q30 0 60 25 T120 15 T200 20" stroke="rgba(96,165,250,0.6)" strokeWidth="2.5" fill="none" />
      </svg>
      <div className="absolute right-0 top-0 bottom-0 w-44 bg-black/30 backdrop-blur-sm border-l border-white/5">
        <div className="px-3 py-2 border-b border-white/5 text-[10px] text-white/40 font-medium tracking-wider">FEATURES</div>
        {["Roman territory", "Trade route", "Alexandria", "Border line"].map((name, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-white/50">
            <div className={`w-5 h-3 rounded-sm ${
              i === 0 ? "bg-amber-400/40" : i === 1 ? "bg-blue-400/40" : i === 2 ? "bg-red-400/60" : "bg-white/20"
            }`} />
            {name}
          </div>
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
    desc: "Publish your maps with a public link and let anyone explore your work directly in the browser.",
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
