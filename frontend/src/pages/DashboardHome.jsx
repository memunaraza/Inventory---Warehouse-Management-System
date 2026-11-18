import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, AlertTriangle, Boxes, Building2, ClipboardList, Package, ShoppingCart, Truck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import api, { getApiData, getApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { EmptyState, ErrorState, PageLoading, StatusBadge } from "../components/ui.jsx";

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

function MetricCard({ label, value, icon, caption, tone = "navy" }) {
  const Icon = iconMap[icon] || Boxes;
  const iconTone = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-navy-50 text-navy-700";
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value ?? "—"}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTone}`}><Icon className="h-5 w-5" /></div>
      </div>
      {caption && <p className="mt-3 text-xs text-slate-400">{caption}</p>}
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
        const [users, products, warehouses, orders, requests, alerts] = await Promise.all([
          api.get("/users"), api.get("/products"), api.get("/warehouses"),
          api.get("/orders"), api.get("/supply-requests"), api.get("/stock/low-stock")
        ]);
        const userRows = getApiData(users).users || [];
        setData({
          users: userRows.length,
          products: getApiData(products).products?.length || 0,
          warehouses: getApiData(warehouses).warehouses?.length || 0,
          suppliers: userRows.filter((item) => item.role === "supplier").length,
          orders: getApiData(orders).orders || [],
          requestCount: (getApiData(requests).supplyRequests || []).filter((item) => item.status === "Pending").length,
          alerts: getApiData(alerts).alerts || []
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
        const [products, orders] = await Promise.all([api.get("/products"), api.get("/orders")]);
        setData({
          products: getApiData(products).products || [],
          orders: getApiData(orders).orders || []
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
      { label: "Total users", value: data.users, icon: "users" },
      { label: "Products", value: data.products, icon: "products" },
      { label: "Warehouses", value: data.warehouses, icon: "warehouses" },
      { label: "Suppliers", value: data.suppliers, icon: "suppliers" }
    ];
    if (user.role === "warehouse_manager") return [
      { label: "Assigned warehouses", value: data.warehouses.length, icon: "warehouses" },
      { label: "Stock records", value: data.stock.length, icon: "stock" },
      { label: "Low-stock alerts", value: data.alerts.length, icon: "alerts", tone: "amber" },
      { label: "Orders to fulfill", value: data.orders.filter((item) => item.status === "Pending").length, icon: "orders" }
    ];
    if (user.role === "supplier") return [
      { label: "My products", value: data.products.length, icon: "products" },
      { label: "Supply requests", value: data.requests.length, icon: "requests" },
      { label: "Pending review", value: data.requests.filter((item) => item.status === "Pending").length, icon: "alerts", tone: "amber" },
      { label: "Approved requests", value: data.requests.filter((item) => item.status === "Approved").length, icon: "stock", tone: "green" }
    ];
    return [
      { label: "Available products", value: data.products.length, icon: "products" },
      { label: "My orders", value: data.orders.length, icon: "orders" },
      { label: "Pending orders", value: data.orders.filter((item) => item.status === "Pending").length, icon: "alerts", tone: "amber" },
      { label: "Completed orders", value: data.orders.filter((item) => item.status === "Completed").length, icon: "stock", tone: "green" }
    ];
  }, [data, user.role]);

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const greeting = user.username?.split(" ")[0] || "there";
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-navy-600">Good to see you, {greeting}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Here’s your operations overview</h2>
          <p className="mt-2 text-sm text-slate-500">Live data from your inventory workspace.</p>
        </div>
        {user.role === "sales_representative" && <Link className="btn-primary" to="/catalog"><Package className="h-4 w-4" /> Browse products</Link>}
        {user.role === "supplier" && <Link className="btn-primary" to="/supplier"><Truck className="h-4 w-4" /> Manage supplier profile</Link>}
        {user.role === "warehouse_manager" && <Link className="btn-primary" to="/inventory"><Boxes className="h-4 w-4" /> Manage inventory</Link>}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <MetricCard key={card.label} {...card} />)}
      </section>

      {user.role === "admin" && (
        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h3 className="font-bold text-slate-900">Recent orders</h3><p className="mt-1 text-xs text-slate-500">Latest activity across sales</p></div>
              <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:text-navy-900">View all <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead><tr><th className="table-head px-5 py-3">Order</th><th className="table-head px-4 py-3">Representative</th><th className="table-head px-4 py-3">Total</th><th className="table-head px-5 py-3">Status</th></tr></thead>
                <tbody>
                  {data.orders.slice(0, 5).map((order) => (
                    <tr key={order._id}>
                      <td className="table-cell px-5 font-semibold text-slate-800">#{order._id.slice(-7).toUpperCase()}</td>
                      <td className="table-cell">{order.salesRepresentative?.username || "—"}</td>
                      <td className="table-cell">{money(order.totalAmount)}</td>
                      <td className="table-cell px-5"><StatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.orders.length && <EmptyState title="No orders yet" description="Orders created by your sales team will appear here." />}
            </div>
          </div>

          <div className="panel">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h3 className="font-bold text-slate-900">Inventory attention</h3><p className="mt-1 text-xs text-slate-500">Products at or below their reorder limit</p></div>
              <Link to="/alerts" className="rounded-lg bg-amber-50 p-2 text-amber-700"><AlertTriangle className="h-4 w-4" /></Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.alerts.slice(0, 5).map((alert) => (
                <div key={`${alert.product._id}-${alert.warehouse._id}`} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{alert.product.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{alert.warehouse.name} · {alert.product.sku}</p></div>
                  <span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{alert.quantity} left</span>
                </div>
              ))}
              {!data.alerts.length && <EmptyState title="Stock levels look good" description="No products are currently below their configured limit." />}
            </div>
          </div>
        </div>
      )}

      {user.role === "warehouse_manager" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="panel">
            <PanelTitle title="Assigned warehouses" description="Warehouses you are responsible for" />
            <div className="divide-y divide-slate-100">
              {data.warehouses.map((warehouse) => <div key={warehouse._id} className="flex items-center justify-between px-5 py-4"><div><p className="font-semibold text-slate-800">{warehouse.name}</p><p className="mt-1 text-xs text-slate-500">{warehouse.code} · {warehouse.address}</p></div><Building2 className="h-5 w-5 text-navy-500" /></div>)}
              {!data.warehouses.length && <EmptyState title="No warehouse assigned" description="Ask an administrator to assign a warehouse to your account." />}
            </div>
          </section>
          <section className="panel">
            <PanelTitle title="Recent stock activity" description="Latest inventory movements" />
            <div className="divide-y divide-slate-100">
              {data.transactions.slice(0, 5).map((transaction) => <div key={transaction._id} className="flex items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-slate-800">{transaction.product?.name || "Product"}</p><p className="mt-1 text-xs text-slate-500">{transaction.warehouse?.name} · {new Date(transaction.createdAt).toLocaleDateString()}</p></div><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${transaction.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{transaction.type === "in" ? "+" : "−"}{transaction.quantity}</span></div>)}
              {!data.transactions.length && <EmptyState title="No movements yet" description="Stock adjustments and order fulfillment activity will appear here." />}
            </div>
          </section>
        </div>
      )}

      {(user.role === "supplier" || user.role === "sales_representative") && (
        <div className="panel">
          <PanelTitle title={user.role === "supplier" ? "Recent supply requests" : "Recent orders"} description="Your latest activity" />
          {user.role === "supplier"
            ? <div className="divide-y divide-slate-100">{data.requests.slice(0, 5).map((request) => <div key={request._id} className="flex items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-slate-800">Request #{request._id.slice(-7).toUpperCase()}</p><p className="mt-1 text-xs text-slate-500">{request.items.length} product{request.items.length === 1 ? "" : "s"} · {new Date(request.createdAt).toLocaleDateString()}</p></div><StatusBadge status={request.status} /></div>)}{!data.requests.length && <EmptyState title="No requests submitted" description="Create a supply request when you are ready to replenish stock." />}</div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[560px]"><thead><tr><th className="table-head px-5 py-3">Order</th><th className="table-head px-4 py-3">Items</th><th className="table-head px-4 py-3">Total</th><th className="table-head px-5 py-3">Status</th></tr></thead><tbody>{data.orders.slice(0, 6).map((order) => <tr key={order._id}><td className="table-cell px-5 font-semibold">#{order._id.slice(-7).toUpperCase()}</td><td className="table-cell">{order.items.length} items</td><td className="table-cell">{money(order.totalAmount)}</td><td className="table-cell px-5"><StatusBadge status={order.status} /></td></tr>)}</tbody></table>{!data.orders.length && <EmptyState title="No orders yet" description="Create a sales order from the product catalog." />}</div>}
        </div>
      )}
    </div>
  );
}

function PanelTitle({ title, description }) {
  return <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></div>;
}

function money(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}
