export default function BrandLogo({ size = 40, descriptor = false, darkText = false, className = "" }) {
  const textColor = darkText ? "text-navy-900" : "text-white";

  return (
    <span className={`inline-flex shrink-0 items-center gap-3 ${className}`}>
      <img
        src="/stockroom-mark.svg"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="shrink-0 rounded-xl"
      />
      <span>
        <span className={`block text-xs font-extrabold leading-none tracking-[0.15em] ${textColor}`}>STOCKROOM</span>
        {descriptor && (
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">
            Warehouse operations
          </span>
        )}
      </span>
    </span>
  );
}
