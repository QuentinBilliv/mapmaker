import { FaArrowRight } from "react-icons/fa6";

export default function MadeWithBadge({
  source,
  className = "",
}: {
  source: "shared" | "embed";
  className?: string;
}) {
  return (
    <a
      href={`/try?ref=${source}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-sm border border-black/10 px-2.5 py-1 text-[11px] text-black/60 hover:text-black hover:bg-white transition-colors no-underline shadow-sm ${className}`}
    >
      <span>
        Made with <span className="font-semibold text-black/80">idomaps</span>
      </span>
      <span className="text-black/30">·</span>
      <span className="font-medium text-black/70 group-hover:text-black">
        Create your own
      </span>
      <FaArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}
