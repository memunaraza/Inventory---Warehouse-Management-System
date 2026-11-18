import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Package, Search, Warehouse } from "lucide-react";
import api, { getApiData, getApiError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { EmptyState, ErrorState, Field, Modal, PageLoading, SearchInput } from "../components/ui.jsx";

export default function StockPage() {
  const notify = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [warehouseResponse, productResponse] = await Promise.all([
        api.get("/warehouses"), api.get("/products")
      ]);
      const availableWarehouses = getApiData(warehouseResponse).warehouses || [];
      setWarehouses(availableWarehouses);
      const activeId = availableWarehouses.some((item) => item._id === warehouseId)
        ? warehouseId : availableWarehouses[0]?._id || "";
      setWarehouseId(activeId);
      setProducts(getApiData(productResponse).products || []);
      if (activeId) {
        const stockResponse = await api.get(`/stock?warehouse=${activeId}`);
        setStock(getApiData(stockResponse).stock || []);
      } else {
        setStock([]);
      }
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => { load(); }, [load]);

  const refreshStock = async (id = warehouseId) => {
    if (!id) return;
    const response = await api.get(`/stock?warehouse=${id}`);
    setStock(getApiData(response).stock || []);
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    if (!dialog || !warehouseId) return;
    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get("quantity"));
    const product = String(form.get("product"));
    const reason = String(form.get("reason") || "");
    setSaving(true);
    try {
      await api.post(dialog.type === "in" ? "/stock/in" : "/stock/out", {
        product,
        warehouse: warehouseId,
        quantity,
        reason
      });
      notify(dialog.type === "in" ? "Stock received and transaction recorded." : "Stock removed and transaction recorded.");
      setDialog(null);
      await refreshStock();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    } finally {
      setSaving(false);
    }
  };

  const quantityByProduct = useMemo(() => new Map(stock.map((item) => [item.product?._id, item.quantity])), [stock]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const availableProducts = query
      ? products.filter((item) => `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query))
      : products;
    return availableProducts.map((product) => ({
      ...product,
      quantity: quantityByProduct.get(product._id) || 0
    }));
  }, [products, quantityByProduct, search]);

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-navy-600"><Boxes className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[0.14em]">Warehouse operations</span></div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Warehouse inventory</h2>
          <p className="mt-1.5 text-sm text-slate-500">Receive and dispatch stock for your assigned locations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setDialog({ type: "out" })} disabled={!warehouseId}><ArrowUpFromLine className="h-4 w-4" /> Stock out</button>
          <button className="btn-primary" onClick={() => setDialog({ type: "in" })} disabled={!warehouseId}><ArrowDownToLine className="h-4 w-4" /> Stock in</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel flex items-center gap-4 p-5"><div className="rounded-xl bg-navy-50 p-3 text-navy-700"><Warehouse className="h-5 w-5" /></div><div><p className="text-xs font-medium text-slate-500">Assigned locations</p><p className="mt-1 text-2xl font-bold text-slate-900">{warehouses.length}</p></div></div>
        <div className="panel flex items-center gap-4 p-5"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Package className="h-5 w-5" /></div><div><p className="text-xs font-medium text-slate-500">Tracked products</p><p className="mt-1 text-2xl font-bold text-slate-900">{stock.length}</p></div></div>
        <div className="panel flex items-center gap-4 p-5"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Boxes className="h-5 w-5" /></div><div><p className="text-xs font-medium text-slate-500">Units on hand</p><p className="mt-1 text-2xl font-bold text-slate-900">{stock.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}</p></div></div>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="warehouse-select">Warehouse</label>
            <select id="warehouse-select" className="field min-w-52" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} disabled={!warehouses.length}>
              {warehouses.map((warehouse) => <option value={warehouse._id} key={warehouse._id}>{warehouse.name} · {warehouse.code}</option>)}
              {!warehouses.length && <option value="">No assigned warehouses</option>}
            </select>
            <span className="hidden text-xs text-slate-400 sm:inline">{filtered.length} products</span>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search inventory…" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead><tr><th className="table-head px-5 py-3.5">Product</th><th className="table-head px-4 py-3.5">SKU</th><th className="table-head px-4 py-3.5">Category</th><th className="table-head px-4 py-3.5">On hand</th><th className="table-head px-4 py-3.5">Reorder point</th><th className="table-head px-5 py-3.5 text-right">Adjust</th></tr></thead>
            <tbody>{filtered.map((product) => {
              const isLow = product.quantity <= product.lowStockLimit;
              return (
                <tr key={product._id} className="hover:bg-slate-50/70">
                  <td className="table-cell px-5"><div className="flex items-center gap-3"><ProductThumbnail product={product} /><span className="font-semibold text-slate-900">{product.name}</span></div></td>
                  <td className="table-cell font-mono text-xs">{product.sku}</td>
                  <td className="table-cell">{product.category}</td>
                  <td className="table-cell"><span className={`font-bold ${isLow ? "text-amber-700" : "text-slate-900"}`}>{product.quantity}</span>{isLow && <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">LOW</span>}</td>
                  <td className="table-cell">{product.lowStockLimit}</td>
                  <td className="table-cell px-5"><div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => setDialog({ type: "in", productId: product._id })} title="Receive stock"><ArrowDownToLine className="h-4 w-4" /></button><button className="rounded-lg p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-40" onClick={() => setDialog({ type: "out", productId: product._id })} title="Dispatch stock" disabled={product.quantity <= 0}><ArrowUpFromLine className="h-4 w-4" /></button></div></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!filtered.length && <EmptyState title={warehouses.length ? "No products match" : "No warehouse assigned"} description={warehouses.length ? "Try another search or add products in the catalog." : "Ask an administrator to assign a warehouse before adjusting inventory."} />}
        </div>
      </section>

      <Modal open={Boolean(dialog)} onClose={() => !saving && setDialog(null)} title={dialog?.type === "in" ? "Receive stock" : "Dispatch stock"} description={warehouses.find((item) => item._id === warehouseId)?.name}>
        <form className="space-y-4" onSubmit={submitAdjustment}>
          <Field label="Product">
            <select className="field" name="product" required defaultValue={dialog?.productId || ""}>
              <option value="" disabled>Select a product</option>
              {products.map((product) => <option key={product._id} value={product._id}>{product.name} · {product.sku}{dialog?.type === "out" ? ` · ${quantityByProduct.get(product._id) || 0} available` : ""}</option>)}
            </select>
          </Field>
          <Field label="Quantity">
            <input className="field" name="quantity" type="number" min="1" step="1" required />
          </Field>
          <Field label="Reason (optional)">
            <textarea className="field min-h-20 resize-y" name="reason" maxLength={500} placeholder={dialog?.type === "in" ? "e.g. Supplier delivery" : "e.g. Damaged goods or manual issue"} />
          </Field>
          {dialog?.type === "out" && <p className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-800">Stock cannot go below zero. The server will reject a dispatch that exceeds available stock.</p>}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" className="btn-secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Confirm adjustment"}</button></div>
        </form>
      </Modal>
    </div>
  );
}

function ProductThumbnail({ product }) {
  return product.image?.url
    ? <img src={product.image.url} alt="" className="h-9 w-9 rounded-lg object-cover" />
    : <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package className="h-4 w-4" /></div>;
}
