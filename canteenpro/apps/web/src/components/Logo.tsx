export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
        <rect
          width="34"
          height="34"
          rx="10"
          fill={light ? "#fff" : "#13203F"}
        />
        <circle
          cx="17"
          cy="17"
          r="10"
          fill="none"
          stroke={light ? "#13203F" : "#fff"}
          strokeWidth="2.4"
        />
        <circle cx="17" cy="17" r="5.2" fill="#F2B200" />
      </svg>
      <span
        className={`font-display text-[22px] font-extrabold tracking-tight ${light ? "text-white" : "text-navy-800"}`}
      >
        CanteenPro
      </span>
    </span>
  );
}
