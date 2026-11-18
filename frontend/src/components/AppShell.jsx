import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

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
  supplier: Truck
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
  const items = navigation[user?.role] || [];
  const active = items.find((item) => location.pathname === item.to) || items[0];
  const title = active?.label || "Workspace";

  const signOut = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      notify(error?.response?.data?.message || "Could not sign out. Please try again.", "error");
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-900 text-white">
      <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-navy-900">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide">STOCKROOM</p>
          <p className="text-[11px] text-slate-300">Inventory operations</p>
        </div>
        <button className="ml-auto rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6">
        <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = routeIcon[item.to.split("/").filter(Boolean).at(-1)] || LayoutDashboard;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-white text-navy-900 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-500 text-xs font-bold uppercase">
            {(user?.username || "U").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.username}</p>
            <p className="truncate text-[11px] text-slate-400">{roleName[user?.role]}</p>
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
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
              <p className="text-xs font-medium text-slate-400">Inventory management</p>
              <h1 className="text-base font-bold text-slate-900">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{user?.username}</p>
              <p className="text-xs text-slate-500">{roleName[user?.role]}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-bold uppercase text-navy-800">
              {(user?.username || "U").slice(0, 2)}
            </div>
            <button onClick={signOut} className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:flex">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
