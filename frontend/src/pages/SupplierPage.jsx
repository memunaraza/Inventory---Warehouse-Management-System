import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Camera, CheckCircle2, Package, Plus, Send, Trash2, Truck, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { getApiData, getApiError } from "../api/client.js";
import { uploadImage } from "../api/imagekit.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { EmptyState, ErrorState, Field, PageLoading, StatusBadge } from "../components/ui.jsx";

const tabRoutes = {
  profile: "/supplier",
  products: "/supplier/products",
  "new-request": "/supplier/new-request",
  requests: "/supplier/requests"
};

function tabFromPath(pathname) {
  return Object.entries(tabRoutes).find(([, path]) => path === pathname)?.[0] || "profile";
}

export default function SupplierPage() {
  const { user, refreshUser } = useAuth();
  const notify = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => tabFromPath(location.pathname));
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [profile, setProfile] = useState({
    username: user.username || "",
    phone: user.phone || "",
    companyName: user.companyName || ""
  });
  const [profileImage, setProfileImage] = useState(null);
  const [logoImage, setLogoImage] = useState(null);
  const [items, setItems] = useState([{ product: "", warehouse: "", quantity: 1 }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTab(tabFromPath(location.pathname));
  }, [location.pathname]);

  const selectTab = (nextTab) => {
    navigate(tabRoutes[nextTab]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, warehouseResponse, requestResponse] = await Promise.all([
        api.get(`/products?supplier=${user.id}`),
        api.get("/warehouses"),
        api.get("/supply-requests")
      ]);
      setProducts(getApiData(productResponse).products || []);
      setWarehouses(getApiData(warehouseResponse).warehouses || []);
      setRequests(getApiData(requestResponse).supplyRequests || []);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setProfile({
      username: user.username || "",
      phone: user.phone || "",
      companyName: user.companyName || ""
    });
  }, [user]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const [uploadedProfile, uploadedLogo] = await Promise.all([
        profileImage ? uploadImage(profileImage, "/profiles") : Promise.resolve(null),
        logoImage ? uploadImage(logoImage, "/supplier-logos") : Promise.resolve(null)
      ]);
      await api.put("/users/me", {
        ...profile,
        ...(uploadedProfile ? { profileImage: uploadedProfile } : {}),
        ...(uploadedLogo ? { supplierLogo: uploadedLogo } : {})
      });
      await refreshUser();
      setProfileImage(null);
      setLogoImage(null);
      notify("Supplier profile updated.");
    } catch (requestError) {
      notify(requestError?.response ? getApiError(requestError) : requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const setItem = (index, key, value) => {
    setItems((current) => current.map((item, row) => row === index
      ? { ...item, [key]: value, ...(key === "product" ? { warehouse: "" } : {}) }
      : item));
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    const requestItems = items.map((item) => ({
      product: item.product,
      warehouse: item.warehouse,
      quantity: Number(item.quantity)
    }));
    if (requestItems.some((item) => !item.product || !item.warehouse || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      notify("Select a product, destination warehouse, and valid quantity for each line.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/supply-requests", { items: requestItems });
      notify("Supply request submitted for review.");
      setItems([{ product: "", warehouse: warehouses[0]?._id || "", quantity: 1 }]);
      navigate(tabRoutes.requests);
      await load();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2 text-navy-600"><Truck className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[0.14em]">Supplier portal</span></div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Supplier workspace</h2>
        <p className="mt-1.5 text-sm text-slate-500">Manage your profile, assigned products, and stock deliveries.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <Tab active={tab === "profile"} onClick={() => selectTab("profile")}>Supplier profile</Tab>
        <Tab active={tab === "products"} onClick={() => selectTab("products")}>My products <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{products.length}</span></Tab>
        <Tab active={tab === "new-request"} onClick={() => selectTab("new-request")}>New supply request</Tab>
        <Tab active={tab === "requests"} onClick={() => selectTab("requests")}>Request history <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{requests.length}</span></Tab>
      </div>

      {tab === "profile" && (
        <form className="panel max-w-3xl p-5 sm:p-7" onSubmit={saveProfile}>
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Building2 className="h-5 w-5" /></div>
            <div><h3 className="font-bold text-slate-900">Business profile</h3><p className="mt-1 text-xs text-slate-500">Your account identity and supplier branding</p></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Contact name"><input className="field" minLength={2} required value={profile.username} onChange={(event) => setProfile((current) => ({ ...current, username: event.target.value }))} /></Field>
            <Field label="Email address"><input className="field bg-slate-50" value={user.email} disabled /></Field>
            <Field label="Company name"><input className="field" value={profile.companyName} onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))} /></Field>
            <Field label="Phone number"><input className="field" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} /></Field>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <ImageUpload label="Profile image" currentUrl={user.profileImage?.url} file={profileImage} onChange={setProfileImage} />
            <ImageUpload label="Supplier logo" currentUrl={user.supplierLogo?.url} file={logoImage} onChange={setLogoImage} />
          </div>
          <div className="mt-7 flex justify-end border-t border-slate-100 pt-5"><button className="btn-primary" disabled={saving}>{saving ? "Saving profile…" : "Save profile"}<CheckCircle2 className="h-4 w-4" /></button></div>
        </form>
      )}

      {tab === "products" && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-slate-900">Products assigned to your supplier account</h3><p className="mt-1 text-xs text-slate-500">Your administrator manages catalog listings.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]"><thead><tr><th className="table-head px-5 py-3.5">Product</th><th className="table-head px-4 py-3.5">SKU</th><th className="table-head px-4 py-3.5">Category</th><th className="table-head px-5 py-3.5">Price</th></tr></thead>
              <tbody>{products.map((product) => <tr key={product._id}><td className="table-cell px-5"><div className="flex items-center gap-3">{product.image?.url ? <img src={product.image.url} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package className="h-4 w-4" /></div>}<span className="font-semibold text-slate-900">{product.name}</span></div></td><td className="table-cell font-mono text-xs">{product.sku}</td><td className="table-cell">{product.category}</td><td className="table-cell px-5">{money(product.price)}</td></tr>)}</tbody>
            </table>
            {!products.length && <EmptyState title="No products linked yet" description="Ask your administrator to assign your supplier account to products before submitting a request." />}
          </div>
        </section>
      )}

      {tab === "new-request" && (
        <section className="panel p-5 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Send className="h-5 w-5" /></div>
            <div><h3 className="font-bold text-slate-900">Request a stock delivery</h3><p className="mt-1 text-sm text-slate-500">Requests are reviewed by an administrator before inventory is updated.</p></div>
          </div>
          {!products.length || !warehouses.length ? (
            <EmptyState title={!products.length ? "No linked products" : "No warehouses available"} description={!products.length ? "Your account needs at least one assigned product before you can request a delivery." : "Contact an administrator to set up a warehouse."} />
          ) : <form onSubmit={submitRequest} className="space-y-5">
            <div className="space-y-3">
              {items.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_40px] sm:items-end">
                <Field label="Product"><select className="field bg-white" value={item.product} onChange={(event) => setItem(index, "product", event.target.value)} required><option value="">Select product</option>{products.map((product) => <option value={product._id} key={product._id}>{product.name} · {product.sku}</option>)}</select></Field>
                <Field label="Destination warehouse"><select className="field bg-white" value={item.warehouse} onChange={(event) => setItem(index, "warehouse", event.target.value)} required><option value="">Select warehouse</option>{warehouses.map((warehouse) => <option value={warehouse._id} key={warehouse._id}>{warehouse.name} · {warehouse.code}</option>)}</select></Field>
                <Field label="Quantity"><input className="field" type="number" min="1" step="1" value={item.quantity} onChange={(event) => setItem(index, "quantity", event.target.value)} required /></Field>
                <button type="button" className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setItems((current) => current.length === 1 ? current : current.filter((_, row) => row !== index))} aria-label="Remove item"><Trash2 className="h-4 w-4" /></button>
              </div>)}
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
              <button type="button" className="btn-secondary self-start" onClick={() => setItems((current) => [...current, { product: "", warehouse: warehouses[0]?._id || "", quantity: 1 }])}><Plus className="h-4 w-4" /> Add another product</button>
              <button className="btn-primary" disabled={saving}>{saving ? "Submitting…" : "Submit for approval"}<Send className="h-4 w-4" /></button>
            </div>
          </form>}
        </section>
      )}

      {tab === "requests" && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-slate-900">Supply request history</h3><p className="mt-1 text-xs text-slate-500">Track the review status of your stock requests.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]"><thead><tr><th className="table-head px-5 py-3.5">Request</th><th className="table-head px-4 py-3.5">Products</th><th className="table-head px-4 py-3.5">Submitted</th><th className="table-head px-4 py-3.5">Status</th><th className="table-head px-5 py-3.5">Review note</th></tr></thead>
              <tbody>{requests.map((request) => <tr key={request._id}><td className="table-cell px-5 font-semibold text-navy-700">#{request._id.slice(-7).toUpperCase()}</td><td className="table-cell">{request.items.map((item) => `${item.product?.name || "Product"} ×${item.quantity}`).join(", ")}</td><td className="table-cell">{new Date(request.createdAt).toLocaleDateString()}</td><td className="table-cell"><StatusBadge status={request.status} /></td><td className="table-cell px-5">{request.reviewNote || "—"}</td></tr>)}</tbody>
            </table>
            {!requests.length && <EmptyState title="No requests submitted" description="Your submitted stock requests will appear here." />}
          </div>
        </section>
      )}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return <button className={`-mb-px border-b-2 px-3 py-3 text-sm font-semibold ${active ? "border-navy-700 text-navy-800" : "border-transparent text-slate-500 hover:text-slate-800"}`} onClick={onClick}>{children}</button>;
}

function ImageUpload({ label, currentUrl, file, onChange }) {
  const preview = useMemo(() => file ? URL.createObjectURL(file) : currentUrl, [file, currentUrl]);
  useEffect(() => () => {
    if (file && preview) URL.revokeObjectURL(preview);
  }, [file, preview]);
  return <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
    <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 hover:border-navy-400">
      {preview ? <img src={preview} alt={`${label} preview`} className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Camera className="h-5 w-5" /></span>}
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-700">{file?.name || "Choose image"}</span><span className="mt-1 block text-xs text-slate-500">Secure ImageKit upload</span></span>
      <input type="file" accept="image/*" className="sr-only" onChange={(event) => onChange(event.target.files?.[0] || null)} />
    </span>
  </label>;
}

function money(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}
