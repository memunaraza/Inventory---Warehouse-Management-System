import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Truck,
  Users,
  UserRound,
  Warehouse,
  X
} from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import BrandLogo from "./BrandLogo.jsx";

const routeIcon = {
  overview: LayoutDashboard,
  users: Users,
  products: Package,
  warehouses: Building2,
  suppliers: Truck,
  orders: ShoppingCart,
  transactions: ClipboardList,
  alerts: AlertTriangle,
  "supply-requests": Boxes,
  inventory: Warehouse,
  catalog: Package,
  supplier: Truck,
  profile: UserRound
};

const navigation = {
  admin: [
    { label: "Overview", to: "/overview" },
    { label: "Users", to: "/users" },
    { label: "Products", to: "/products" },
    { label: "Warehouses", to: "/warehouses" },
    { label: "Suppliers", to: "/suppliers" },
    { label: "Orders", to: "/orders" },
    { label: "Transactions", to: "/transactions" },
    { label: "Low stock", to: "/alerts" },
    { label: "Supply requests", to: "/supply-requests" }
  ],
  warehouse_manager: [
    { label: "Overview", to: "/overview" },
    { label: "My warehouses", to: "/warehouses" },
    { label: "Inventory", to: "/inventory" },
    { label: "Transactions", to: "/transactions" },
    { label: "Low stock", to: "/alerts" },
    { label: "Orders", to: "/orders" }
  ],
  supplier: [
    { label: "Overview", to: "/overview" },
    { label: "My supplier account", to: "/supplier" },
    { label: "Supply requests", to: "/supplier/requests" }
  ],
  sales_representative: [
    { label: "Overview", to: "/overview" },
    { label: "Product catalog", to: "/catalog" },
    { label: "My orders", to: "/orders" }
  ]
};

const roleName = {
  admin: "Administrator",
  warehouse_manager: "Warehouse manager",
  supplier: "Supplier",
  sales_representative: "Sales representative"
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const items = navigation[user?.role] || [];
  const active = items.find((item) => location.pathname === item.to) || items[0];
  const title = location.pathname === "/profile" ? "My Profile" : active?.label || "Workspace";

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [location.pathname]);

  const signOut = async () => {
    setAccountMenuOpen(false);
    const confirmation = await Swal.fire({
      title: "Sign out?",
      text: "Are you sure you want to sign out of Stockroom?",
      icon: "warning",
      showCancelButton: true,
      reverseButtons: true,
      focusCancel: true,
      confirmButtonText: "Sign out",
      cancelButtonText: "Stay signed in",
      background: "#141d26",
      color: "#e7edf3",
      buttonsStyling: false,
      customClass: {
        popup: "stockroom-swal-popup",
        confirmButton: "btn-primary",
        cancelButton: "btn-secondary"
      }
    });
    if (!confirmation.isConfirmed) return;
    try {
      await logout();
      notify("You have signed out successfully.");
      navigate("/login", { replace: true });
    } catch (error) {
      notify(error?.response?.data?.message || "Could not sign out. Please try again.", "error");
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col border-r border-white/5 bg-[#0c1218] text-white">
      <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
      <BrandLogo descriptor />
        <button className="ml-auto rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-6">
        <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Operations</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = routeIcon[item.to.split("/").filter(Boolean).at(-1)] || LayoutDashboard;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? "bg-[#f47e25] text-[#17130f] shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-3">
        <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] p-3 transition hover:border-[#f47e25]/30 hover:bg-white/[0.07]" aria-label="Open my profile">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f47e25] text-xs font-bold uppercase text-[#17130f]">
            {(user?.username || "U").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.username}</p>
            <p className="truncate text-[11px] text-slate-400">{roleName[user?.role]}</p>
          </div>
          <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="relative h-full w-[min(84vw,300px)] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Operations workspace</p>
              <h1 className="text-base font-bold text-slate-900">{title}</h1>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-100"
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-semibold text-slate-800">{user?.username}</span>
                <span className="block text-xs text-slate-500">{roleName[user?.role]}</span>
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f47e25]/30 bg-[#f47e25]/10 text-sm font-bold uppercase text-[#ff994e]">
                {(user?.username || "U").slice(0, 2)}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition ${accountMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {accountMenuOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{user?.username}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <Link to="/profile" role="menuitem" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  <UserRound className="h-4 w-4" /> My Profile
                </Link>
                <button type="button" role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1680px] px-4 py-5 sm:px-7 sm:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
