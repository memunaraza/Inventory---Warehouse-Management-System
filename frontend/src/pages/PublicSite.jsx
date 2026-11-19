import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Building2,
  Check,
  ClipboardList,
  LockKeyhole,
  Menu,
  Package,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  X
} from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const imageUrl = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=85";

const navItems = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Features", to: "/features" },
  { label: "Contact", to: "/contact" }
];

const featureItems = [
  { icon: Boxes, title: "Inventory control", description: "Track stock by product and warehouse, record every movement, and spot reorder needs sooner." },
  { icon: Warehouse, title: "Warehouse operations", description: "Keep locations and manager assignments organized with inventory views scoped to each team." },
  { icon: ShoppingCart, title: "Order fulfillment", description: "Build orders from available stock and follow them through processing and completion." },
  { icon: Truck, title: "Supplier coordination", description: "Connect supplier accounts with products and review incoming supply requests in one workflow." }
];

export function PublicSiteLayout() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="public-site">
      <header className="public-nav sticky top-0 z-40 border-b border-white/10 bg-[#0b1117]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-7">
          <Link to="/" className="flex shrink-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f47e25] text-[#17130f]"><Boxes className="h-5 w-5" strokeWidth={2.5} /></span>
            <span>
              <span className="block text-xs font-extrabold tracking-[0.16em] text-white">STOCKROOM</span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Warehouse operations</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? "text-[#ff9345]" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>{item.label}</NavLink>)}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Link to="/overview" className="btn-primary">Open dashboard <ArrowUpRight className="h-4 w-4" /></Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Sign in</Link>
                <Link to="/register" className="btn-primary">Get started <ArrowRight className="h-4 w-4" /></Link>
              </>
            )}
          </div>

          <button type="button" className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && <div className="border-t border-white/10 bg-[#0d141b] px-4 py-4 md:hidden">
          <nav className="mx-auto flex max-w-[1360px] flex-col gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={() => setMenuOpen(false)} className={({ isActive }) => `rounded-lg px-3 py-3 text-sm font-semibold ${isActive ? "bg-[#f47e25]/10 text-[#ff9345]" : "text-slate-300 hover:bg-white/5"}`}>{item.label}</NavLink>)}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
              {user ? <Link to="/overview" className="btn-primary col-span-2" onClick={() => setMenuOpen(false)}>Open dashboard <ArrowUpRight className="h-4 w-4" /></Link> : <>
                <Link to="/login" className="btn-secondary" onClick={() => setMenuOpen(false)}>Sign in</Link>
                <Link to="/register" className="btn-primary" onClick={() => setMenuOpen(false)}>Get started</Link>
              </>}
            </div>
          </nav>
        </div>}
      </header>

      <main><Outlet /></main>

      <footer className="border-t border-white/10 bg-[#0a1016]">
        <div className="mx-auto grid max-w-[1360px] gap-8 px-4 py-10 sm:px-7 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f47e25] text-[#17130f]"><Boxes className="h-4 w-4" /></span>
              <span className="text-xs font-extrabold tracking-[0.16em] text-white">STOCKROOM</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">A practical workspace for warehouse inventory, order fulfillment, and supplier coordination.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Explore</p>
            <div className="mt-3 flex flex-col items-start gap-2 text-sm text-slate-400">
              {navItems.slice(1).map((item) => <Link key={item.to} to={item.to} className="hover:text-[#ff9345]">{item.label}</Link>)}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Workspace</p>
            <div className="mt-3 flex flex-col items-start gap-2 text-sm text-slate-400">
              <Link to={user ? "/overview" : "/login"} className="hover:text-[#ff9345]">{user ? "Open dashboard" : "Sign in"}</Link>
              {!user && <Link to="/register" className="hover:text-[#ff9345]">Create an account</Link>}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500">Stockroom · Inventory &amp; Warehouse Management</div>
      </footer>
    </div>
  );
}

export function PublicHomePage() {
  return (
    <>
      <section className="public-hero relative flex min-h-[560px] items-center overflow-hidden sm:min-h-[640px]">
        <img src={imageUrl} alt="Warehouse storage racks and active logistics floor" />
        <div className="public-hero-shade absolute inset-0" />
        <div className="relative mx-auto w-full max-w-[1360px] px-4 py-16 sm:px-7 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="max-w-3xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f47e25]/35 bg-[#0b1117]/60 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff9a51] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f47e25] shadow-[0_0_12px_rgba(244,126,37,0.9)]" />
                Inventory · Warehousing · Fulfillment
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4.7rem]">
                Warehouse operations,<br className="hidden sm:block" /> <span className="text-[#ff9345]">under control.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">Keep stock visible by location, coordinate your team, and move orders from request to fulfillment in one connected workspace.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary px-5 py-3">Get started <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/features" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-black/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:border-white/40 hover:bg-black/35">Explore the platform <ArrowUpRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-200 sm:text-sm">
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ff9345]" /> Role-based workspaces</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ff9345]" /> Warehouse-level stock</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#ff9345]" /> Movement history</span>
              </div>
            </div>

            <div className="hero-dashboard relative hidden lg:block" aria-label="Operations overview preview">
              <div className="hero-dashboard-glow" />
              <div className="relative rounded-2xl border border-white/15 bg-[#101820]/92 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Operations overview</p>
                    <p className="mt-1 text-sm font-bold text-white">Today’s warehouse</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><Package className="h-4 w-4 text-[#ff9345]" /><p className="mt-3 text-xl font-extrabold text-white">1,284</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">In stock</p></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><Truck className="h-4 w-4 text-[#75b9ff]" /><p className="mt-3 text-xl font-extrabold text-white">38</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">To dispatch</p></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><Boxes className="h-4 w-4 text-emerald-400" /><p className="mt-3 text-xl font-extrabold text-white">96%</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">Capacity</p></div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0b1117]/70 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Recent activity</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#ff9345]">View all</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10"><Truck className="h-4 w-4 text-emerald-400" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-200">Dispatch completed</p><p className="mt-0.5 text-[10px] text-slate-500">Order #1048 · 12 items</p></div><span className="text-[10px] text-slate-500">2m</span></div>
                    <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f47e25]/10"><Package className="h-4 w-4 text-[#ff9345]" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-200">Stock received</p><p className="mt-0.5 text-[10px] text-slate-500">Central Warehouse · 84 units</p></div><span className="text-[10px] text-slate-500">8m</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-4 py-16 sm:px-7 sm:py-20">
        <SectionHeading eyebrow="One connected operation" title="From receiving to dispatch, keep every team in sync." description="Stockroom brings the everyday workflows of inventory, warehouse, supplier, and sales teams into one organized place." />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureItems.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#101820]">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-16 sm:px-7 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff9345]">Built for real workflows</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">Clear responsibilities.<br />Reliable stock records.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">Each role gets a workspace designed around its tasks, while access rules keep sensitive operations with the right people.</p>
            <div className="mt-7 space-y-4">
              <WorkflowRow icon={ShieldCheck} title="Access that follows the role" description="Admins, warehouse managers, suppliers, and sales representatives see the workflows intended for them." />
              <WorkflowRow icon={ClipboardList} title="Stock movements you can follow" description="Receipts and dispatches are recorded so teams can review what changed and where." />
              <WorkflowRow icon={BarChart3} title="Operational signals at a glance" description="Review current stock, reorder alerts, order status, and supplier requests from the dashboard." />
            </div>
            <Link to="/about" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#ff9345] hover:text-[#ffb06f]">Learn about Stockroom <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#151f29] sm:min-h-[390px]">
            <img src={imageUrl} alt="Industrial warehouse storage and inventory aisles" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1117]/90 via-[#0b1117]/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/10 bg-[#101820]/90 p-4 backdrop-blur sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff9345]">Operations workspace</p>
              <p className="mt-2 text-lg font-bold text-white sm:text-xl">Know what is on hand, where it is, and what needs to move next.</p>
            </div>
          </div>
        </div>
      </section>

      <CallToAction />
    </>
  );
}

export function AboutPage() {
  return (
    <PublicPageFrame eyebrow="About Stockroom" title="A shared view of warehouse work." description="Stockroom is an inventory and warehouse management workspace for teams that need clear stock records, accountable movements, and coordinated fulfillment.">
      <div className="grid gap-5 md:grid-cols-2">
        <InfoPanel icon={Package} title="Inventory with location context" text="Products and stock are connected to warehouses, helping teams understand availability at the location level instead of relying on disconnected lists." />
        <InfoPanel icon={Users} title="Workspaces by role" text="Administrator, warehouse manager, supplier, and sales workflows are presented separately, with permissions still enforced by the backend." />
        <InfoPanel icon={Truck} title="Supplier coordination" text="Suppliers can maintain their account details, view linked products, and submit requests for review." />
        <InfoPanel icon={ShoppingCart} title="Order progression" text="Sales teams can create orders from available products and track fulfillment status through the existing order workflow." />
      </div>
      <div className="mt-10 rounded-2xl border border-[#f47e25]/20 bg-[#f47e25]/[0.06] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff9345]">Designed for the whole operation</p>
        <p className="mt-3 max-w-3xl text-xl font-bold leading-relaxed text-white sm:text-2xl">Keep the floor team, sales desk, suppliers, and administrators working from the same operational picture.</p>
        <Link to="/features" className="btn-primary mt-5">Explore features <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </PublicPageFrame>
  );
}

export function FeaturesPage() {
  return (
    <PublicPageFrame eyebrow="Platform features" title="Tools for the work behind every shipment." description="Explore the operational modules available in Stockroom. Your role determines which actions and records are available in the workspace.">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: Boxes, title: "Inventory & stock movements", text: "Maintain quantities by warehouse, receive and dispatch stock, prevent negative inventory, and review transaction history." },
          { icon: Warehouse, title: "Warehouse management", text: "Manage warehouse records and manager assignments. Managers work within their assigned locations." },
          { icon: Package, title: "Product catalog", text: "Maintain product names, SKUs, categories, prices, supplier links, images, and low-stock limits." },
          { icon: ShoppingCart, title: "Sales orders", text: "Create multi-product orders, check current availability, and track orders through pending, processing, completed, or cancelled states." },
          { icon: Truck, title: "Supplier requests", text: "Supplier accounts can submit stock requests and follow review status; administrators can review requests." },
          { icon: LockKeyhole, title: "Role-based access", text: "Authentication and backend permission checks protect private workflows and records." }
        ].map((feature) => <FeatureCard key={feature.title} {...feature} />)}
      </div>
      <div className="mt-10 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#141d26] p-6 sm:flex-row sm:items-center sm:p-8">
        <div><h2 className="text-xl font-bold text-white">Ready to enter your workspace?</h2><p className="mt-2 text-sm text-slate-400">Sign in to continue or create an account with the available public role.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/login" className="btn-secondary">Sign in</Link><Link to="/register" className="btn-primary">Get started <ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    </PublicPageFrame>
  );
}

export function ContactPage() {
  return (
    <PublicPageFrame eyebrow="Contact & access" title="Need help getting started?" description="Stockroom is connected to your organization’s backend. Account access and support contacts are managed by your system administrator.">
      <div className="grid gap-5 lg:grid-cols-3">
        <InfoPanel icon={Users} title="Need an account?" text="Use public registration to create an account with the default permitted role, or ask your administrator to create and assign another role." />
        <InfoPanel icon={LockKeyhole} title="Need access changed?" text="Role changes and warehouse assignments are managed by an administrator. Sign in and contact your organization’s designated system owner." />
        <InfoPanel icon={Building2} title="Need operational support?" text="For organization-specific support details, contact the team that manages your Stockroom deployment. No external support address is configured on this site." />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/login" className="btn-secondary">Sign in</Link>
        <Link to="/register" className="btn-primary">Create an account <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </PublicPageFrame>
  );
}

function PublicPageFrame({ eyebrow, title, description, children }) {
  return (
    <div className="mx-auto min-h-[55vh] max-w-[1360px] px-4 py-12 sm:px-7 sm:py-16">
      <div className="mb-9 max-w-3xl">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff9345]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff9345]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, text }) {
  return (
    <article className="public-feature-card rounded-2xl border border-white/10 bg-[#141d26] p-5 sm:p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f47e25]/20 bg-[#f47e25]/10 text-[#ff9345]"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-5 text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description || text}</p>
    </article>
  );
}

function WorkflowRow({ icon: Icon, title, description }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f47e25]/10 text-[#ff9345]"><Icon className="h-4 w-4" /></span>
      <div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">{description}</p></div>
    </div>
  );
}

function InfoPanel({ icon: Icon, title, text }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#141d26] p-5 sm:p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f47e25]/10 text-[#ff9345]"><Icon className="h-5 w-5" /></span>
      <h2 className="mt-4 text-base font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </article>
  );
}

function CallToAction() {
  return (
    <section className="border-t border-white/10 bg-[#101820]">
      <div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-6 px-4 py-12 sm:px-7 sm:py-16 md:flex-row md:items-center">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#ff9345]">Make the next move</p><h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Bring your warehouse workflows into focus.</h2><p className="mt-2 text-sm text-slate-400">Sign in to your workspace or register to get started.</p></div>
        <div className="flex flex-wrap gap-3"><Link to="/login" className="btn-secondary">Sign in</Link><Link to="/register" className="btn-primary">Get started <ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    </section>
  );
}
