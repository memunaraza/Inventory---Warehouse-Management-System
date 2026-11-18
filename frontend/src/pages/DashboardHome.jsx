import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  Building2,
  ClipboardList,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Warehouse
} from "lucide-react";
import { Link } from "react-router-dom";
import api, { getApiData, getApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { EmptyState, ErrorState, PageLoading, StatusBadge } from "../components/ui.jsx";
import WarehouseHero from "../components/WarehouseHero.jsx";

const iconMap = {
  users: Users,
  products: Package,
  warehouses: Building2,
  suppliers: Truck,
  orders: ShoppingCart,
  stock: Boxes,
  requests: ClipboardList,
  alerts: AlertTriangle
};

function MetricCard({ label, value, icon, caption, tone = "orange" }) {
  const Icon = iconMap[icon] || Boxes;
  const iconTone = {
    orange: "border-[#f47e25]/20 bg-[#f47e25]/10 text-[#ff974d]",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300"
  }[tone];
  return (
    <div className="panel relative overflow-hidden p-4 sm:p-5">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-white/[0.02]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{formatNumber(value)}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconTone}`}><Icon className="h-[18px] w-[18px]" /></div>
      </div>
      {caption && <p className="mt-2 text-[11px] text-slate-500">{caption}</p>}
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const role = user.role;
      if (role === "admin") {
        const [users, products, warehouses, orders, requests, alerts, stock, transactions] = await Promise.all([
          api.get("/users"), api.get("/products"), api.get("/warehouses"),
          api.get("/orders"), api.get("/supply-requests"), api.get("/stock/low-stock"),
          api.get("/stock"), api.get("/transactions?limit=6")
        ]);
        const userRows = getApiData(users).users || [];
        setData({
          users: userRows.length,
          products: getApiData(products).products || [],
          warehouses: getApiData(warehouses).warehouses || [],
          suppliers: userRows.filter((item) => item.role === "supplier").length,
          orders: getApiData(orders).orders || [],
          requests: getApiData(requests).supplyRequests || [],
          alerts: getApiData(alerts).alerts || [],
          stock: getApiData(stock).stock || [],
          transactions: getApiData(transactions).transactions || []
        });
      } else if (role === "warehouse_manager") {
        const [warehouses, stock, alerts, transactions, orders] = await Promise.all([
          api.get("/warehouses"), api.get("/stock"), api.get("/stock/low-stock"),
          api.get("/transactions?limit=6"), api.get("/orders")
        ]);
        setData({
          warehouses: getApiData(warehouses).warehouses || [],
          stock: getApiData(stock).stock || [],
          alerts: getApiData(alerts).alerts || [],
          transactions: getApiData(transactions).transactions || [],
          orders: getApiData(orders).orders || []
        });
      } else if (role === "supplier") {
        const [products, requests] = await Promise.all([
          api.get(`/products?supplier=${user.id}`), api.get("/supply-requests")
        ]);
        setData({
          products: getApiData(products).products || [],
          requests: getApiData(requests).supplyRequests || []
        });
      } else {
        const [products, orders, stock] = await Promise.all([
          api.get("/products"), api.get("/orders"), api.get("/stock")
        ]);
        setData({
          products: getApiData(products).products || [],
          orders: getApiData(orders).orders || [],
          stock: getApiData(stock).stock || []
        });
      }
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const cards = useMemo(() => {
    if (!data) return [];
    if (user.role === "admin") return [
      { label: "Total users", value: data.users, icon: "users", caption: "Accounts across the operation" },
      { label: "Products", value: data.products.length, icon: "products", caption: "Active catalog items", tone: "blue" },
      { label: "Stock on hand", value: sumStock(data.stock), icon: "stock", caption: "Units across all warehouses", tone: "green" },
      { label: "Warehouses", value: data.warehouses.length, icon: "warehouses", caption: "Registered locations" },
      { label: "Suppliers", value: data.suppliers, icon: "suppliers", caption: "Supplier accounts", tone: "blue" },
      { label: "Sales orders", value: data.orders.length, icon: "orders", caption: "Orders recorded", tone: "amber" }
    ];
    if (user.role === "warehouse_manager") return [
      { label: "Assigned locations", value: data.warehouses.length, icon: "warehouses", caption: "Warehouses in your scope" },
      { label: "Units available", value: sumStock(data.stock), icon: "stock", caption: "On-hand units", tone: "green" },
      { label: "Tracked products", value: data.stock.length, icon: "products", caption: "Stocked product lines", tone: "blue" },
      { label: "Low-stock alerts", value: data.alerts.length, icon: "alerts", caption: "At or below reorder point", tone: "amber" }
    ];
    if (user.role === "supplier") return [
      { label: "My products", value: data.products.length, icon: "products", caption: "Catalog items linked to you", tone: "blue" },
      { label: "Supply requests", value: data.requests.length, icon: "requests", caption: "Requests submitted" },
      { label: "Pending review", value: countStatus(data.requests, "Pending"), icon: "alerts", caption: "Awaiting an admin decision", tone: "amber" },
      { label: "Approved", value: countStatus(data.requests, "Approved"), icon: "stock", caption: "Accepted supply requests", tone: "green" }
    ];
    return [
      { label: "Available products", value: data.products.length, icon: "products", caption: "Products in the catalog", tone: "blue" },
      { label: "Units available", value: sumStock(data.stock), icon: "stock", caption: "Across accessible warehouses", tone: "green" },
      { label: "My orders", value: data.orders.length, icon: "orders", caption: "Orders created" },
      { label: "In progress", value: countStatus(data.orders, "Processing"), icon: "alerts", caption: "Currently being fulfilled", tone: "amber" }
    ];
  }, [data, user.role]);

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const greeting = user.username?.split(" ")[0] || "there";
  const hero = {
    admin: {
      eyebrow: "Inventory control center",
      title: `Good to see you, ${greeting}.`,
      description: "A live view of stock, warehouse activity, orders, and the teams keeping your operation moving.",
      to: "/warehouses",
      action: "View warehouses"
    },
    warehouse_manager: {
      eyebrow: "Warehouse operations",
      title: `Your floor overview, ${greeting}.`,
      description: "Monitor assigned locations, review stock movement, and keep replenishment work on track.",
      to: "/inventory",
      action: "Manage inventory"
    },
    supplier: {
      eyebrow: "Supplier operations",
      title: `Welcome back, ${greeting}.`,
      description: "Keep your supplier details current and follow every stock request from submission through review.",
      to: "/supplier",
      action: "Open supplier workspace"
    },
    sales_representative: {
      eyebrow: "Order fulfillment",
      title: `Ready for the next order, ${greeting}?`,
      description: "Check current product availability and follow your customer orders through fulfillment.",
      to: "/catalog",
      action: "Browse product catalog"
    }
  }[user.role];

  return (
    <div className="space-y-5 sm:space-y-6">
      <WarehouseHero eyebrow={hero.eyebrow} title={hero.title} description={hero.description} to={hero.to} actionLabel={hero.action} />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-6">
        {cards.map((card) => <MetricCard key={card.label} {...card} />)}
      </section>

      {user.role === "admin" && <AdminOverview data={data} />}
      {user.role === "warehouse_manager" && <ManagerOverview data={data} />}
      {user.role === "supplier" && <SupplierOverview data={data} user={user} />}
      {user.role === "sales_representative" && <SalesOverview data={data} />}
    </div>
  );
}

function AdminOverview({ data }) {
  const pendingRequests = data.requests.filter((item) => item.status === "Pending");
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
        <WarehouseActivityPanel warehouses={data.warehouses} stock={data.stock} />
        <InventoryAttention alerts={data.alerts} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <TransactionsPanel transactions={data.transactions} />
        <section className="panel overflow-hidden">
          <PanelTitle title="Supplier requests" subtitle={`${pendingRequests.length} awaiting review`} icon={Truck} actionTo="/supply-requests" actionLabel="Review" />
          <RequestList requests={data.requests.slice(0, 5)} />
        </section>
      </div>
      <section className="panel overflow-hidden">
        <PanelTitle title="Recent sales orders" subtitle="Latest customer orders across the operation" icon={ShoppingCart} actionTo="/orders" actionLabel="View all" />
        <OrdersTable orders={data.orders.slice(0, 6)} admin />
      </section>
    </>
  );
}

function ManagerOverview({ data }) {
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
        <WarehouseActivityPanel warehouses={data.warehouses} stock={data.stock} />
        <InventoryAttention alerts={data.alerts} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <TransactionsPanel transactions={data.transactions} />
        <section className="panel overflow-hidden">
          <PanelTitle title="Orders to fulfill" subtitle={`${countStatus(data.orders, "Pending")} pending orders`} icon={ShoppingCart} actionTo="/orders" actionLabel="Open orders" />
          <OrdersTable orders={data.orders.slice(0, 5)} />
        </section>
      </div>
    </>
  );
}

function SupplierOverview({ data, user }) {
  const pending = countStatus(data.requests, "Pending");
  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="panel p-5 sm:p-6">
        <PanelTitle title="Supplier profile" subtitle="Business account details" icon={Building2} actionTo="/supplier" actionLabel="Manage profile" />
        <dl className="mt-4 space-y-4">
          <ProfileRow label="Contact" value={user.username} />
          <ProfileRow label="Company" value={user.companyName || "Company name not set"} />
          <ProfileRow label="Email" value={user.email} />
          <ProfileRow label="Request queue" value={pending ? `${pending} request${pending === 1 ? "" : "s"} awaiting review` : "No requests awaiting review"} />
        </dl>
        <Link to="/supplier/requests" className="btn-secondary mt-5 w-full">Open supply request history <ArrowUpRight className="h-4 w-4" /></Link>
      </section>
      <section className="panel overflow-hidden">
        <PanelTitle title="Recent supply requests" subtitle="Track submitted stock requests" icon={Truck} actionTo="/supplier/requests" actionLabel="View history" />
        <RequestList requests={data.requests.slice(0, 6)} />
      </section>
      <section className="panel overflow-hidden xl:col-span-2">
        <PanelTitle title="Products linked to your account" subtitle="Your administrator manages catalog listings" icon={Package} actionTo="/supplier" actionLabel="My products" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead><tr><th className="table-head px-5 py-3">Product</th><th className="table-head px-4 py-3">SKU</th><th className="table-head px-4 py-3">Category</th><th className="table-head px-5 py-3">Price</th></tr></thead>
            <tbody>{data.products.slice(0, 5).map((product) => <tr key={product._id}><td className="table-cell px-5 font-semibold text-slate-900">{product.name}</td><td className="table-cell font-mono text-xs">{product.sku}</td><td className="table-cell">{product.category}</td><td className="table-cell px-5">{money(product.price)}</td></tr>)}</tbody>
          </table>
          {!data.products.length && <EmptyState title="No linked products yet" description="Products assigned to your supplier account will appear here." />}
        </div>
      </section>
    </div>
  );
}

function SalesOverview({ data }) {
  const availability = data.products.map((product) => ({
    ...product,
    quantity: data.stock.filter((item) => item.product?._id === product._id).reduce((sum, item) => sum + item.quantity, 0)
  })).sort((a, b) => b.quantity - a.quantity).slice(0, 6);
  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="panel overflow-hidden">
        <PanelTitle title="Product availability" subtitle="Live available stock by product" icon={Package} actionTo="/catalog" actionLabel="Browse catalog" />
        <div className="divide-y divide-slate-100">
          {availability.map((product) => <div key={product._id} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{product.name}</p><p className="mt-1 text-xs text-slate-500">{product.sku} · {product.category}</p></div>
            <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${product.quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{formatNumber(product.quantity)} available</span>
          </div>)}
          {!availability.length && <EmptyState title="No products available" description="Products will appear here when they are added to the catalog." />}
        </div>
      </section>
      <section className="panel overflow-hidden">
        <PanelTitle title="My recent orders" subtitle="Order fulfillment status" icon={ShoppingCart} actionTo="/orders" actionLabel="View orders" />
        <OrdersTable orders={data.orders.slice(0, 6)} />
      </section>
    </div>
  );
}

function WarehouseActivityPanel({ warehouses, stock }) {
  const locations = warehouses.map((warehouse) => {
    const records = stock.filter((item) => item.warehouse?._id === warehouse._id);
    return {
      warehouse,
      units: records.reduce((sum, item) => sum + item.quantity, 0),
      products: new Set(records.map((item) => item.product?._id).filter(Boolean)).size
    };
  });
  const maxUnits = Math.max(...locations.map((item) => item.units), 1);
  return (
    <section className="panel p-5 sm:p-6">
      <PanelTitle title="Inventory overview" subtitle="Live on-hand volume by warehouse" icon={Boxes} actionTo="/warehouses" actionLabel="Locations" />
      {!locations.length ? <EmptyState title="No warehouse activity" description="Warehouse stock distribution will appear here when locations are configured." /> : (
        <div className="mt-5 space-y-5">
          {locations.slice(0, 6).map(({ warehouse, units, products }) => (
            <div key={warehouse._id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{warehouse.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{warehouse.code} · {products} product lines</p></div>
                <span className="shrink-0 text-sm font-bold text-slate-800">{formatNumber(units)} <span className="text-xs font-medium text-slate-500">units</span></span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f47e25]" style={{ width: `${units ? Math.max(4, (units / maxUnits) * 100) : 0}%` }} /></div>
            </div>
          ))}
          <p className="border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-500">
            Bars compare stock volume between locations. Storage capacity limits are not configured in the current warehouse records.
          </p>
        </div>
      )}
    </section>
  );
}

function InventoryAttention({ alerts }) {
  return (
    <section className="panel overflow-hidden">
      <PanelTitle title="Low-stock alerts" subtitle="Products at or below reorder point" icon={AlertTriangle} actionTo="/alerts" actionLabel="View all" />
      <div className="divide-y divide-slate-100">
        {alerts.slice(0, 5).map((alert) => <div key={`${alert.product?._id}-${alert.warehouse?._id}`} className="flex items-center justify-between gap-3 px-5 py-3.5">
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{alert.product?.name || "Product"}</p><p className="mt-1 truncate text-xs text-slate-500">{alert.warehouse?.name || "Warehouse"} · {alert.product?.sku || "—"}</p></div>
          <span className="shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300">{formatNumber(alert.quantity)} left</span>
        </div>)}
        {!alerts.length && <EmptyState title="No active low-stock alerts" description="No products are currently at or below their configured reorder limits." />}
      </div>
    </section>
  );
}

function TransactionsPanel({ transactions }) {
  return (
    <section className="panel overflow-hidden">
      <PanelTitle title="Recent transactions" subtitle="Latest recorded stock movements" icon={ClipboardList} actionTo="/transactions" actionLabel="Audit trail" />
      <div className="divide-y divide-slate-100">
        {transactions.slice(0, 5).map((transaction) => {
          const inbound = transaction.type === "in";
          const MovementIcon = inbound ? ArrowDownToLine : ArrowUpRight;
          return <div key={transaction._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${inbound ? "bg-emerald-500/10 text-emerald-300" : "bg-blue-500/10 text-blue-300"}`}><MovementIcon className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{transaction.product?.name || "Product"}</p><p className="mt-1 truncate text-xs text-slate-500">{transaction.warehouse?.name || "Warehouse"} · {new Date(transaction.createdAt).toLocaleDateString()}</p></div>
            </div>
            <span className={`shrink-0 text-sm font-bold ${inbound ? "text-emerald-300" : "text-blue-300"}`}>{inbound ? "+" : "−"}{formatNumber(transaction.quantity)}</span>
          </div>;
        })}
        {!transactions.length && <EmptyState title="No movements recorded" description="Stock receipts, dispatches, and fulfillment activity will appear here." />}
      </div>
    </section>
  );
}

function RequestList({ requests }) {
  return (
    <div className="divide-y divide-slate-100">
      {requests.map((request) => <div key={request._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">Request #{request._id.slice(-7).toUpperCase()}</p><p className="mt-1 truncate text-xs text-slate-500">{request.supplier?.companyName || request.supplier?.username || "Supplier"} · {request.items?.length || 0} product lines</p></div>
        <StatusBadge status={request.status} />
      </div>)}
      {!requests.length && <EmptyState title="No supply requests" description="Supplier requests will appear here when submitted." />}
    </div>
  );
}

function OrdersTable({ orders, admin = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px]">
        <thead><tr><th className="table-head px-5 py-3">Order</th>{admin && <th className="table-head px-4 py-3">Representative</th>}<th className="table-head px-4 py-3">Items</th><th className="table-head px-4 py-3">Total</th><th className="table-head px-5 py-3">Status</th></tr></thead>
        <tbody>{orders.map((order) => <tr key={order._id}>
          <td className="table-cell px-5 font-semibold text-navy-700">#{order._id.slice(-7).toUpperCase()}</td>
          {admin && <td className="table-cell">{order.salesRepresentative?.username || "—"}</td>}
          <td className="table-cell">{order.items?.length || 0} items</td>
          <td className="table-cell font-semibold">{money(order.totalAmount)}</td>
          <td className="table-cell px-5"><StatusBadge status={order.status} /></td>
        </tr>)}</tbody>
      </table>
      {!orders.length && <EmptyState title="No orders yet" description="Orders will appear here when created." />}
    </div>
  );
}

function PanelTitle({ title, subtitle, icon: Icon, actionTo, actionLabel }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f47e25]/10 text-[#ff9345]"><Icon className="h-4 w-4" /></span>}
        <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p></div>
      </div>
      {actionTo && <Link to={actionTo} className="shrink-0 text-xs font-bold text-navy-700 hover:text-navy-900">{actionLabel}<ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></Link>}
    </div>
  );
}

function ProfileRow({ label, value }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="max-w-[65%] truncate text-right text-sm font-semibold text-slate-800">{value || "—"}</dd></div>;
}

function sumStock(stock = []) {
  return stock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

function countStatus(rows = [], status) {
  return rows.filter((item) => item.status === status).length;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function money(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}
