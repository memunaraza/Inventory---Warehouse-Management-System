import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const warehouseImage = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=85";

export default function WarehouseHero({ eyebrow, title, description, to, actionLabel, actions, compact = false }) {
  return (
    <section className={`warehouse-hero relative flex items-center overflow-hidden ${compact ? "min-h-40" : ""}`}>
      <img src={warehouseImage} alt="Warehouse storage racks and logistics operations" loading={compact ? "lazy" : "eager"} />
      <div className={`relative max-w-3xl ${compact ? "px-5 py-5 sm:px-7" : "px-6 py-7 sm:px-9 sm:py-9"}`}>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#ff984e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f47e25]" />
          {eyebrow}
        </p>
        <h2 className={`max-w-2xl font-extrabold tracking-tight text-white ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>{title}</h2>
        <p className={`mt-2 max-w-xl leading-6 text-slate-200 ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>{description}</p>
        {actions || (to && actionLabel && (
          <Link to={to} className="btn-primary mt-5">
            {actionLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </section>
  );
}
