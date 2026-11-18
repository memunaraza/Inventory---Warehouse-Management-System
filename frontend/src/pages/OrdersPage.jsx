import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Package, Plus, ShoppingCart, X } from "lucide-react";
import api, { getApiData, getApiError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { EmptyState, ErrorState, Field, Modal, PageLoading, SearchInput, StatusBadge } from "../components/ui.jsx";

export default function OrdersPage({ mode = "catalog" }) {
  const notify = useToast();
  const [tab, setTab] = useState(mode === "orders" ? "orders" : "catalog");
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState([{ product: "", warehouse: "", quantity: 1 }]);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, warehouseResponse, stockResponse, orderResponse] = await Promise.all([
        api.get("/products"), api.get("/warehouses"), api.get("/stock"), api.get("/orders")
      ]);
      setProducts(getApiData(productResponse).products || []);
      setWarehouses(getApiData(warehouseResponse).warehouses || []);
      setStock(getApiData(stockResponse).stock || []);
      setOrders(getApiData(orderResponse).orders || []);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesText = `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesText && (!category || product.category === category);
  }), [products, search, category]);

  const stockFor = (productId, warehouseId) => stock.find((item) =>
    item.product?._id === productId && item.warehouse?._id === warehouseId
  )?.quantity || 0;

  const changeCartRow = (index, key, value) => {
    setCart((items) => items.map((item, current) => current === index
      ? { ...item, [key]: value, ...(key === "product" ? { warehouse: "" } : {}) }
      : item));
  };

  const addProductToCart = (productId) => {
    const availableWarehouse = warehouses.find((warehouse) => stockFor(productId, warehouse._id) > 0);
    setCart((items) => [...items, {
      product: productId,
      warehouse: availableWarehouse?._id || "",
      quantity: 1
    }]);
    setTab("new-order");
  };

  const removeCartRow = (index) => setCart((items) => items.length === 1 ? items : items.filter((_, current) => current !== index));
  const total = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry._id === item.product);
    return sum + (Number(product?.price) || 0) * (Number(item.quantity) || 0);
  }, 0);

  const createOrder = async (event) => {
    event.preventDefault();
    const items = cart.map((item) => ({
      product: item.product,
      warehouse: item.warehouse,
      quantity: Number(item.quantity)
    }));
    if (items.some((item) => !item.product || !item.warehouse || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      notify("Select a product, warehouse, and valid quantity for each order line.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/orders", { items, customer });
      notify("Order created. Stock will be deducted when it is processed.");
      setCart([{ product: "", warehouse: warehouses[0]?._id || "", quantity: 1 }]);
      setTab("orders");
      await load();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelOrder = async (order) => {
    try {
      await api.put(`/orders/${order._id}/status`, { status: "Cancelled" });
      notify("Order cancelled.");
      setCancelTarget(null);
      await load();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    }
  };

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-navy-600"><ShoppingCart className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[0.14em]">Sales workspace</span></div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Product catalog &amp; orders</h2>
          <p className="mt-1.5 text-sm text-slate-500">Build orders from current product and warehouse availability.</p>
        </div>
        <button className="btn-primary" onClick={() => setTab("new-order")}><Plus className="h-4 w-4" /> Create order</button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <TabButton active={tab === "catalog"} onClick={() => setTab("catalog")}>Product catalog</TabButton>
        <TabButton active={tab === "new-order"} onClick={() => setTab("new-order")}>New order{cart.some((item) => item.product) && <span className="ml-2 rounded-full bg-navy-100 px-2 py-0.5 text-[10px]">{cart.filter((item) => item.product).length}</span>}</TabButton>
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>My orders <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{orders.length}</span></TabButton>
      </div>

      {tab === "catalog" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
            <select className="field sm:max-w-xs" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const available = stock.filter((item) => item.product?._id === product._id).reduce((sum, item) => sum + item.quantity, 0);
              return <article className="panel overflow-hidden" key={product._id}>
                <div className="flex h-44 items-center justify-center bg-slate-100">
                  {product.image?.url ? <img src={product.image.url} alt={product.name} className="h-full w-full object-cover" /> : <Package className="h-10 w-10 text-slate-300" />}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><span className="text-[11px] font-bold uppercase tracking-wide text-navy-600">{product.category}</span><h3 className="mt-1 truncate text-base font-bold text-slate-900">{product.name}</h3><p className="mt-1 text-xs text-slate-500">SKU {product.sku}</p></div>
                    <span className="whitespace-nowrap text-lg font-bold text-slate-900">{money(product.price)}</span>
                  </div>
                  {product.description && <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">{product.description}</p>}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className={`text-xs font-semibold ${available ? "text-emerald-700" : "text-amber-700"}`}>{available} available across warehouses</span>
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedProduct(product)}>Details</button>
                      <button className="btn-primary px-3 py-2 text-xs" onClick={() => addProductToCart(product._id)} disabled={!available}><Plus className="h-3.5 w-3.5" /> Add</button>
                    </div>
                  </div>
                </div>
              </article>;
            })}
          </div>
          {!filteredProducts.length && <div className="panel"><EmptyState title="No products found" description="Change your search or category filter." /></div>}
        </section>
      )}

      {tab === "new-order" && (
        <section className="panel p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div><h3 className="text-lg font-bold text-slate-900">Order items</h3><p className="mt-1 text-sm text-slate-500">Choose the fulfillment warehouse for each product.</p></div>
            <button type="button" className="btn-secondary px-3" onClick={() => setCart((items) => [...items, { product: "", warehouse: "", quantity: 1 }])}><Plus className="h-4 w-4" /> Add line</button>
          </div>
          <form onSubmit={createOrder} className="space-y-5">
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
              <Field label="Customer name"><input className="field" minLength={2} value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} required /></Field>
              <Field label="Customer email"><input className="field" type="email" value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} required /></Field>
              <Field label="Customer phone"><input className="field" type="tel" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} /></Field>
            </div>
            <div className="space-y-3">
              {cart.map((item, index) => {
                const product = products.find((entry) => entry._id === item.product);
                const quantityAvailable = item.product && item.warehouse ? stockFor(item.product, item.warehouse) : null;
                return <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_110px_40px] sm:items-end">
                  <Field label="Product"><select className="field bg-white" value={item.product} onChange={(event) => changeCartRow(index, "product", event.target.value)} required><option value="">Select product</option>{products.map((entry) => <option value={entry._id} key={entry._id}>{entry.name} · {entry.sku} · {money(entry.price)}</option>)}</select></Field>
                  <Field label="Warehouse"><select className="field bg-white" value={item.warehouse} onChange={(event) => changeCartRow(index, "warehouse", event.target.value)} required disabled={!item.product}><option value="">Select warehouse</option>{warehouses.map((warehouse) => <option value={warehouse._id} key={warehouse._id}>{warehouse.name} · {stockFor(item.product, warehouse._id)} available</option>)}</select></Field>
                  <Field label="Quantity"><input className="field" type="number" min="1" step="1" value={item.quantity} onChange={(event) => changeCartRow(index, "quantity", event.target.value)} required /></Field>
                  <div className="pb-2 text-sm"><p className="text-xs text-slate-500">Line total</p><p className="mt-1 font-bold text-slate-900">{money((Number(product?.price) || 0) * (Number(item.quantity) || 0))}</p>{quantityAvailable !== null && <p className={`mt-1 text-[11px] ${Number(item.quantity) > quantityAvailable ? "text-red-600" : "text-slate-400"}`}>{quantityAvailable} available</p>}</div>
                  <button type="button" className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => removeCartRow(index)} aria-label="Remove item" title="Remove item"><X className="h-4 w-4" /></button>
                </div>;
              })}
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm text-slate-500">Order total</p><p className="text-2xl font-bold text-slate-900">{money(total)}</p><p className="mt-1 text-xs text-slate-400">Prices are captured when the order is submitted.</p></div>
              <button className="btn-primary" disabled={saving || !cart.some((item) => item.product)}>{saving ? "Creating order…" : "Submit order"}<ArrowRight className="h-4 w-4" /></button>
            </div>
          </form>
        </section>
      )}

      {tab === "orders" && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-slate-900">My order history</h3><p className="mt-1 text-xs text-slate-500">Your orders and their fulfillment status</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr><th className="table-head px-5 py-3.5">Order</th><th className="table-head px-4 py-3.5">Items</th><th className="table-head px-4 py-3.5">Total</th><th className="table-head px-4 py-3.5">Submitted</th><th className="table-head px-4 py-3.5">Status</th><th className="table-head px-5 py-3.5 text-right">Actions</th></tr></thead>
              <tbody>{orders.map((order) => <tr key={order._id}><td className="table-cell px-5 font-semibold text-navy-700">#{order._id.slice(-7).toUpperCase()}</td><td className="table-cell">{order.items.length} products</td><td className="table-cell font-semibold">{money(order.totalAmount)}</td><td className="table-cell">{new Date(order.createdAt).toLocaleDateString()}</td><td className="table-cell"><StatusBadge status={order.status} /></td><td className="table-cell px-5 text-right"><div className="flex justify-end gap-2"><button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedOrder(order)}>Details</button>{order.status === "Pending" && <button className="btn-danger px-3 py-2 text-xs" onClick={() => setCancelTarget(order)}>Cancel</button>}</div></td></tr>)}</tbody>
            </table>
            {!orders.length && <EmptyState title="No orders yet" description="Build an order from the catalog to get started." />}
          </div>
        </section>
      )}

      <Modal open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title={`Order #${selectedOrder?._id?.slice(-7).toUpperCase()}`} size="max-w-2xl">
        {selectedOrder && <OrderSummary order={selectedOrder} />}
      </Modal>
      <Modal open={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} title={selectedProduct?.name || "Product details"}>
        {selectedProduct && <div className="space-y-5">
          {selectedProduct.image?.url && <img src={selectedProduct.image.url} alt={selectedProduct.name} className="max-h-64 w-full rounded-xl bg-slate-100 object-contain" />}
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-navy-600">{selectedProduct.category}</p><p className="mt-1 text-sm text-slate-500">SKU {selectedProduct.sku}</p></div><p className="text-xl font-bold text-slate-900">{money(selectedProduct.price)}</p></div>
          <p className="text-sm leading-6 text-slate-600">{selectedProduct.description || "No description provided."}</p>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">Stock by warehouse</p><div className="mt-3 space-y-2">{warehouses.map((warehouse) => <div key={warehouse._id} className="flex justify-between gap-3 text-sm"><span className="text-slate-600">{warehouse.name}</span><span className="font-semibold text-slate-900">{stockFor(selectedProduct._id, warehouse._id)} units</span></div>)}</div></div>
          <div className="flex justify-end"><button className="btn-primary" onClick={() => { addProductToCart(selectedProduct._id); setSelectedProduct(null); }} disabled={!stock.some((item) => item.product?._id === selectedProduct._id && item.quantity > 0)}><Plus className="h-4 w-4" /> Add to order</button></div>
        </div>}
      </Modal>
      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancel pending order?">
        <p className="text-sm leading-6 text-slate-600">This order will be cancelled and cannot be reopened. Stock has not been deducted while the order is pending.</p>
        <div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" onClick={() => setCancelTarget(null)}>Keep order</button><button className="btn-danger" onClick={() => cancelOrder(cancelTarget)}>Confirm cancellation</button></div>
      </Modal>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return <button className={`-mb-px border-b-2 px-3 py-3 text-sm font-semibold ${active ? "border-navy-700 text-navy-800" : "border-transparent text-slate-500 hover:text-slate-800"}`} onClick={onClick}>{children}</button>;
}

function OrderSummary({ order }) {
  return <div className="space-y-5">
    <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Customer</p><p className="mt-1 text-sm font-semibold">{order.customer?.name || "—"}</p><p className="mt-1 text-xs text-slate-500">{order.customer?.email || "No email"}{order.customer?.phone ? ` · ${order.customer.phone}` : ""}</p></div><div className="sm:text-right"><p className="text-xs text-slate-500">Submitted</p><p className="mt-1 text-sm font-semibold">{new Date(order.createdAt).toLocaleString()}</p><div className="mt-2"><StatusBadge status={order.status} /></div></div></div>
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
      {order.items.map((item, index) => <div key={`${item.product?._id || index}-${index}`} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{item.product?.name || "Product"}</p><p className="mt-1 text-xs text-slate-500">{item.warehouse?.name || "Warehouse"} · Qty {item.quantity}</p></div><p className="shrink-0 text-sm font-semibold">{money(item.unitPrice * item.quantity)}</p></div>)}
    </div>
    <div className="flex justify-between border-t border-slate-100 pt-4"><span className="font-semibold text-slate-600">Total</span><span className="text-xl font-bold">{money(order.totalAmount)}</span></div>
  </div>;
}

function money(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}
