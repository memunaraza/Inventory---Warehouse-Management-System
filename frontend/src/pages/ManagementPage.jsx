import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Eye,
  FileClock,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
  X
} from "lucide-react";
import api, { getApiData, getApiError } from "../api/client.js";
import { uploadImage } from "../api/imagekit.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import WarehouseHero from "../components/WarehouseHero.jsx";
import {
  EmptyState,
  ErrorState,
  Field,
  Modal,
  PageLoading,
  SearchInput,
  StatusBadge
} from "../components/ui.jsx";

const config = {
  users: {
    title: "User management",
    subtitle: "Manage team access, roles, and warehouse assignments.",
    endpoint: "/users",
    collection: "users",
    createLabel: "Add user"
  },
  products: {
    title: "Product catalog",
    subtitle: "Manage product details, supplier links, and reorder levels.",
    endpoint: "/products",
    collection: "products",
    createLabel: "Add product"
  },
  warehouses: {
    title: "Warehouses",
    subtitle: "Review warehouse locations and manager assignments.",
    endpoint: "/warehouses",
    collection: "warehouses",
    createLabel: "Add warehouse"
  },
  suppliers: {
    title: "Supplier management",
    subtitle: "Manage supplier accounts and profile details.",
    endpoint: "/users",
    collection: "users",
    createLabel: "Add supplier"
  },
  orders: {
    title: "Sales orders",
    subtitle: "Review orders and manage their fulfillment status.",
    endpoint: "/orders",
    collection: "orders"
  },
  transactions: {
    title: "Stock transactions",
    subtitle: "An audit trail of inventory received and dispatched.",
    endpoint: "/transactions",
    collection: "transactions"
  },
  alerts: {
    title: "Low-stock alerts",
    subtitle: "Products at or below their configured reorder limit.",
    endpoint: "/stock/low-stock",
    collection: "alerts"
  },
  "supply-requests": {
    title: "Supply requests",
    subtitle: "Review supplier requests and receive approved stock.",
    endpoint: "/supply-requests",
    collection: "supplyRequests"
  }
};

export default function ManagementPage({ resource }) {
  const settings = config[resource];
  const { user } = useAuth();
  const notify = useToast();
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(settings.endpoint);
      let items = getApiData(response)[settings.collection] || [];
      if (resource === "suppliers") {
        items = items.filter((item) => item.role === "supplier");
        const productResponse = await api.get("/products");
        const products = getApiData(productResponse).products || [];
        const counts = new Map();
        products.forEach((product) => {
          const supplierId = product.supplier?._id;
          if (supplierId) counts.set(supplierId, (counts.get(supplierId) || 0) + 1);
        });
        items = items.map((item) => ({ ...item, productCount: counts.get(item._id) || 0 }));
      }
      setRows(items);

      if (["products", "warehouses", "suppliers"].includes(resource) && user.role === "admin") {
        const usersResponse = resource === "users" ? response : await api.get("/users");
        const users = getApiData(usersResponse).users || [];
        setSuppliers(users.filter((item) => item.role === "supplier"));
        setManagers(users.filter((item) => item.role === "warehouse_manager"));
      }
      if (resource === "users" || resource === "warehouses" || resource === "products") {
        const warehouseResponse = await api.get("/warehouses");
        setWarehouses(getApiData(warehouseResponse).warehouses || []);
      }
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [resource, settings, user.role]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [rows, search]);

  const save = async (form) => {
    setSaving(true);
    try {
      const endpoint = settings.endpoint;
      if (resource === "users" || resource === "suppliers") {
        const payload = { ...form };
        if (resource === "suppliers") payload.role = "supplier";
        const editing = Boolean(dialog?.record?._id);
        const id = dialog?.record?._id;
        if (editing && !payload.password) delete payload.password;
        if (editing) await api.put(`${endpoint}/${id}`, payload);
        else await api.post(endpoint, payload);
      } else {
        const editing = Boolean(dialog?.record?._id);
        const id = dialog?.record?._id;
        if (editing) await api.put(`${endpoint}/${id}`, form);
        else await api.post(endpoint, form);
      }
      notify(resource === "users" ? "User saved." : `${resource === "supply-requests" ? "Request" : singular(resource)} saved.`);
      setDialog(null);
      await load();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!dialog?.record) return;
    setSaving(true);
    try {
      await api.delete(`${settings.endpoint}/${dialog.record._id}`);
      notify(`${singular(resource)} deleted.`);
      setDialog(null);
      await load();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    } finally {
      setSaving(false);
    }
  };

  const review = async (status) => {
    if (!dialog?.record) return;
    setSaving(true);
    try {
      await api.put(`/supply-requests/${dialog.record._id}/review`, { status });
      notify(`Supply request ${status.toLowerCase()}.`);
      setDialog(null);
      await load();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    } finally {
      setSaving(false);
    }
  };

  const changeOrder = async (record, status) => {
    try {
      await api.put(`/orders/${record._id}/status`, { status });
      notify(`Order updated to ${status.toLowerCase()}.`);
      await load();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    }
  };

  const cancelOrder = async () => {
    try {
      await api.put(`/orders/${dialog.record._id}/status`, { status: "Cancelled" });
      notify("Pending order cancelled.");
      setDialog(null);
      await load();
    } catch (requestError) {
      notify(getApiError(requestError), "error");
    }
  };

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const canEdit = user.role === "admin" && ["users", "products", "warehouses", "suppliers"].includes(resource);
  const headerIcon = {
    alerts: AlertTriangle,
    transactions: FileClock,
    "supply-requests": Truck,
    products: Package
  }[resource] || Package;
  const HeaderIcon = headerIcon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-navy-600"><HeaderIcon className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[0.14em]">Workspace</span></div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{settings.title}</h2>
          <p className="mt-1.5 text-sm text-slate-500">{settings.subtitle}</p>
        </div>
        {canEdit && settings.createLabel && <button className="btn-primary" onClick={() => setDialog({ mode: "form" })}><Plus className="h-4 w-4" />{settings.createLabel}</button>}
      </div>

      {resource === "warehouses" && (
        <WarehouseHero
          compact
          eyebrow="Warehouse network"
          title="Locations, stock and teams in one view"
          description="Review warehouse records and manager assignments across your operation."
        />
      )}

      <div className="panel overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{filtered.length}</span>
            <span>{resource === "alerts" ? "alerts" : plural(resource)}</span>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder={`Search ${plural(resource)}…`} />
            <button type="button" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50" onClick={load} title="Refresh data"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr>{tableColumns(resource).map((column) => <th className="table-head px-4 py-3.5 first:pl-5 last:pr-5" key={column}>{column}</th>)}<th className="table-head px-5 py-3.5 text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50/70">
                  {renderCells(resource, row)}
                  <td className="table-cell px-5 text-right">
                    <div className="flex justify-end gap-1">
                      {resource === "users" || resource === "suppliers" ? (
                        <>
                          <IconButton title="Edit user" onClick={() => setDialog({ mode: "form", record: row })}><Pencil /></IconButton>
                          <IconButton title="Delete user" onClick={() => setDialog({ mode: "delete", record: row })} danger><Trash2 /></IconButton>
                        </>
                      ) : null}
                      {resource === "products" && user.role === "admin" && (
                        <>
                          <IconButton title="Edit product" onClick={() => setDialog({ mode: "form", record: row })}><Pencil /></IconButton>
                          <IconButton title="Delete product" onClick={() => setDialog({ mode: "delete", record: row })} danger><Trash2 /></IconButton>
                        </>
                      )}
                      {resource === "warehouses" && user.role === "admin" && (
                        <>
                          <IconButton title="Edit warehouse" onClick={() => setDialog({ mode: "form", record: row })}><Pencil /></IconButton>
                          <IconButton title="Delete warehouse" onClick={() => setDialog({ mode: "delete", record: row })} danger><Trash2 /></IconButton>
                        </>
                      )}
                      {resource === "orders" && <OrderActions order={row} role={user.role} onView={() => setDialog({ mode: "view", record: row })} onChange={changeOrder} onCancel={() => setDialog({ mode: "cancel-order", record: row })} />}
                      {resource === "supply-requests" && row.status === "Pending" && (
                        <>
                          <IconButton title="Approve request" onClick={() => setDialog({ mode: "review", status: "Approved", record: row })} positive><Check /></IconButton>
                          <IconButton title="Reject request" onClick={() => setDialog({ mode: "review", status: "Rejected", record: row })} danger><X /></IconButton>
                        </>
                      )}
                      {resource === "alerts" && <span className="text-xs text-slate-400">Restock from inventory</span>}
                      {resource === "transactions" && <span className="text-xs text-slate-400">Recorded</span>}
                      {resource === "warehouses" && user.role === "warehouse_manager" && <span className="text-xs text-slate-400">Assigned to you</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <EmptyState title={search ? "No matching records" : emptyTitle(resource)} description={search ? "Try a different search term." : emptyDescription(resource)} />}
        </div>
      </div>

      <Modal
        open={dialog?.mode === "form"}
        onClose={() => !saving && setDialog(null)}
        title={`${dialog?.record ? "Edit" : "Add"} ${resource === "supply-requests" ? "request" : singular(resource)}`}
      >
        <ResourceForm
          resource={resource}
          record={dialog?.record}
          warehouses={warehouses}
          suppliers={suppliers}
          managers={managers}
          saving={saving}
          onCancel={() => setDialog(null)}
          onSubmit={save}
        />
      </Modal>

      <Modal open={dialog?.mode === "delete"} onClose={() => !saving && setDialog(null)} title={`Delete ${singular(resource)}?`}>
        <p className="text-sm leading-6 text-slate-600">This action cannot be undone. You can’t delete records that are still referenced by inventory or activity history.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setDialog(null)} disabled={saving}>Keep record</button>
          <button className="btn-danger" onClick={remove} disabled={saving}><Trash2 className="h-4 w-4" />{saving ? "Deleting…" : "Delete"}</button>
        </div>
      </Modal>

      <Modal open={dialog?.mode === "review"} onClose={() => !saving && setDialog(null)} title={`${dialog?.status} supply request?`}>
        <p className="text-sm leading-6 text-slate-600">
          {dialog?.status === "Approved"
            ? "Approving this request will add the requested quantities to warehouse stock and record the stock movement."
            : "Rejecting this request will leave warehouse stock unchanged."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</button>
          <button className={`btn-primary ${dialog?.status === "Rejected" ? "bg-red-700 hover:bg-red-800" : ""}`} onClick={() => review(dialog.status)} disabled={saving}>
            {saving ? "Saving…" : `Confirm ${dialog?.status?.toLowerCase()}`}
          </button>
        </div>
      </Modal>

      <Modal open={dialog?.mode === "cancel-order"} onClose={() => !saving && setDialog(null)} title="Cancel this order?">
        <p className="text-sm leading-6 text-slate-600">Only pending orders can be cancelled. This does not change stock because stock is deducted when an order starts processing.</p>
        <div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" onClick={() => setDialog(null)} disabled={saving}>Keep order</button><button className="btn-danger" onClick={cancelOrder} disabled={saving}>{saving ? "Cancelling…" : "Cancel order"}</button></div>
      </Modal>

      <Modal open={dialog?.mode === "view"} onClose={() => setDialog(null)} title={`Order #${dialog?.record?._id?.slice(-7).toUpperCase()}`} size="max-w-2xl">
        {dialog?.record && <OrderDetails order={dialog.record} />}
      </Modal>
    </div>
  );
}

function ResourceForm({ resource, record, warehouses, suppliers, managers, saving, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => initialValues(resource, record));
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    let payload = { ...values };
    if (imageFile) {
      setUploading(true);
      try {
        payload.image = await uploadImage(imageFile, resource === "products" ? "/products" : "/suppliers");
      } catch (uploadError) {
        setError(uploadError.message || "Image upload failed.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    await onSubmit(payload);
  };

  if (resource === "users" || resource === "suppliers") {
    const isSupplier = resource === "suppliers" || values.role === "supplier";
    return (
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username"><input className="field" required minLength={2} value={values.username} onChange={(event) => set("username", event.target.value)} /></Field>
          <Field label="Email"><input className="field" type="email" required value={values.email} onChange={(event) => set("email", event.target.value)} /></Field>
        </div>
        <Field label={record ? "New password (optional)" : "Temporary password"} hint={record ? "Leave blank to keep the current password." : "At least 8 characters."}>
          <input className="field" type="password" minLength={8} required={!record} value={values.password || ""} onChange={(event) => set("password", event.target.value)} autoComplete="new-password" />
        </Field>
        {resource === "users" && (
          <Field label="Role">
            <select className="field" value={values.role} onChange={(event) => set("role", event.target.value)}>
              <option value="sales_representative">Sales representative</option>
              <option value="warehouse_manager">Warehouse manager</option>
              <option value="supplier">Supplier</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        )}
        {isSupplier && <Field label="Company name"><input className="field" value={values.companyName || ""} onChange={(event) => set("companyName", event.target.value)} /></Field>}
        <Field label="Phone"><input className="field" value={values.phone || ""} onChange={(event) => set("phone", event.target.value)} /></Field>
        {values.role === "warehouse_manager" && (
          <Field label="Assigned warehouses" hint="Use Ctrl/Cmd to select more than one warehouse.">
            <select multiple className="field min-h-28" value={values.assignedWarehouses || []} onChange={(event) => set("assignedWarehouses", [...event.target.selectedOptions].map((option) => option.value))}>
              {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name} · {warehouse.code}</option>)}
            </select>
          </Field>
        )}
        {error && <FormError message={error} />}
        <FormActions saving={saving || uploading} onCancel={onCancel} submitLabel={record ? "Save changes" : "Create user"} />
      </form>
    );
  }

  if (resource === "products") {
    return (
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name"><input className="field" required value={values.name} onChange={(event) => set("name", event.target.value)} /></Field>
          <Field label="SKU"><input className="field uppercase" required value={values.sku} onChange={(event) => set("sku", event.target.value.toUpperCase())} /></Field>
          <Field label="Category"><input className="field" required value={values.category} onChange={(event) => set("category", event.target.value)} /></Field>
          <Field label="Price"><input className="field" type="number" min="0" step="0.01" required value={values.price} onChange={(event) => set("price", event.target.value)} /></Field>
          <Field label="Low-stock limit"><input className="field" type="number" min="0" step="1" value={values.lowStockLimit} onChange={(event) => set("lowStockLimit", event.target.value)} /></Field>
          <Field label="Supplier">
            <select className="field" value={values.supplier || ""} onChange={(event) => set("supplier", event.target.value)}>
              <option value="">No supplier assigned</option>
              {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.companyName || supplier.username}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description"><textarea className="field min-h-24 resize-y" value={values.description || ""} onChange={(event) => set("description", event.target.value)} /></Field>
        <ImagePicker currentUrl={record?.image?.url} file={imageFile} onFile={setImageFile} />
        {error && <FormError message={error} />}
        <FormActions saving={saving || uploading} onCancel={onCancel} submitLabel={record ? "Save changes" : "Create product"} />
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Warehouse name"><input className="field" required value={values.name} onChange={(event) => set("name", event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Warehouse code"><input className="field uppercase" required value={values.code} onChange={(event) => set("code", event.target.value.toUpperCase())} /></Field>
        <Field label="Manager">
          <select className="field" value={values.manager || ""} onChange={(event) => set("manager", event.target.value)}>
            <option value="">Unassigned</option>
            {managers.map((manager) => <option key={manager._id} value={manager._id}>{manager.username}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Address"><textarea className="field min-h-24 resize-y" required value={values.address} onChange={(event) => set("address", event.target.value)} /></Field>
      {error && <FormError message={error} />}
      <FormActions saving={saving} onCancel={onCancel} submitLabel={record ? "Save changes" : "Create warehouse"} />
    </form>
  );
}

function ImagePicker({ currentUrl, file, onFile }) {
  const url = file ? URL.createObjectURL(file) : currentUrl;
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">Product image</span>
      <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 p-3 hover:border-navy-400">
        {url ? <img src={url} alt="Product preview" className="h-14 w-14 rounded-lg object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package className="h-6 w-6" /></div>}
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-700">{file?.name || "Choose an image"}</span><span className="mt-1 block text-xs text-slate-500">Uploaded securely through ImageKit.</span></span>
        <input type="file" accept="image/*" className="sr-only" onChange={(event) => onFile(event.target.files?.[0] || null)} />
      </label>
    </div>
  );
}

function OrderActions({ order, role, onView, onChange, onCancel }) {
  return (
    <>
      <IconButton title="View order" onClick={onView}><Eye /></IconButton>
      {order.status === "Pending" && ["admin", "warehouse_manager"].includes(role) && <IconButton title="Mark processing" positive onClick={() => onChange(order, "Processing")}><ArrowUpRight /></IconButton>}
      {order.status === "Processing" && ["admin", "warehouse_manager"].includes(role) && <IconButton title="Complete order" positive onClick={() => onChange(order, "Completed")}><Check /></IconButton>}
      {order.status === "Pending" && role === "admin" && <IconButton title="Cancel order" danger onClick={onCancel}><X /></IconButton>}
    </>
  );
}

function OrderDetails({ order }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
        <div><p className="text-xs text-slate-500">Customer</p><p className="mt-1 font-semibold text-slate-800">{order.customer?.name || "—"}</p><p className="mt-1 text-xs text-slate-500">{order.customer?.email || "No email"}{order.customer?.phone ? ` · ${order.customer.phone}` : ""}</p></div>
        <div><p className="text-xs text-slate-500">Sales representative</p><p className="mt-1 font-semibold text-slate-800">{order.salesRepresentative?.username || "—"}</p></div>
        <div><p className="text-xs text-slate-500">Created</p><p className="mt-1 font-semibold text-slate-800">{new Date(order.createdAt).toLocaleString()}</p></div>
        <StatusBadge status={order.status} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[480px]">
          <thead><tr><th className="table-head px-4 py-3">Product</th><th className="table-head px-4 py-3">Warehouse</th><th className="table-head px-4 py-3">Qty</th><th className="table-head px-4 py-3">Price</th><th className="table-head px-4 py-3">Subtotal</th></tr></thead>
          <tbody>{order.items.map((item, index) => <tr key={`${item.product?._id || index}-${index}`}><td className="table-cell font-semibold">{item.product?.name || "Product"}</td><td className="table-cell">{item.warehouse?.name || "—"}</td><td className="table-cell">{item.quantity}</td><td className="table-cell">{money(item.unitPrice)}</td><td className="table-cell">{money(item.unitPrice * item.quantity)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="flex justify-end border-t border-slate-100 pt-4"><div className="text-right"><p className="text-sm text-slate-500">Order total</p><p className="mt-1 text-2xl font-bold text-slate-900">{money(order.totalAmount)}</p></div></div>
    </div>
  );
}

function tableColumns(resource) {
  return {
    users: ["User", "Email", "Role", "Warehouse access"],
    suppliers: ["Supplier", "Email", "Company", "Products"],
    products: ["Product", "SKU", "Category", "Price", "Low-stock limit", "Supplier"],
    warehouses: ["Warehouse", "Code", "Address", "Manager"],
    orders: ["Order", "Representative", "Items", "Total", "Status"],
    transactions: ["Product", "Warehouse", "Movement", "Quantity", "Performed by", "Date"],
    alerts: ["Product", "SKU", "Warehouse", "Available", "Reorder at"],
    "supply-requests": ["Request", "Supplier", "Products", "Submitted", "Status"]
  }[resource] || [];
}

function renderCells(resource, row) {
  const cell = (content, className = "") => <td className={`table-cell ${className}`} key={className + String(content)}>{content}</td>;
  if (resource === "users") return <>
    {cell(<span className="font-semibold text-slate-900">{row.username}</span>, "user")}
    {cell(row.email, "email")}
    {cell(<span className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-semibold capitalize text-navy-700">{row.role?.replaceAll("_", " ")}</span>, "role")}
    {cell((row.assignedWarehouses || []).map((item) => item.name).join(", ") || "—", "warehouses")}
  </>;
  if (resource === "suppliers") return <>
    {cell(<div className="flex items-center gap-3"><Avatar name={row.username} image={row.supplierLogo?.url || row.profileImage?.url} /><span className="font-semibold text-slate-900">{row.username}</span></div>, "supplier")}
    {cell(row.email, "email")}
    {cell(row.companyName || "—", "company")}
    {cell(row.productCount ?? "—", "products")}
  </>;
  if (resource === "products") return <>
    {cell(<div className="flex items-center gap-3"><Avatar name={row.name} image={row.image?.url} /><span className="font-semibold text-slate-900">{row.name}</span></div>, "product")}
    {cell(row.sku, "sku")}
    {cell(row.category, "category")}
    {cell(money(row.price), "price")}
    {cell(row.lowStockLimit, "limit")}
    {cell(row.supplier?.companyName || row.supplier?.username || "—", "supplier")}
  </>;
  if (resource === "warehouses") return <>
    {cell(<span className="font-semibold text-slate-900">{row.name}</span>, "warehouse")}
    {cell(<span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{row.code}</span>, "code")}
    {cell(row.address, "address")}
    {cell(row.manager?.username || "Unassigned", "manager")}
  </>;
  if (resource === "orders") return <>
    {cell(<span className="font-semibold text-navy-700">#{row._id.slice(-7).toUpperCase()}</span>, "order")}
    {cell(row.salesRepresentative?.username || "—", "representative")}
    {cell(`${row.items.length} item${row.items.length === 1 ? "" : "s"}`, "items")}
    {cell(money(row.totalAmount), "total")}
    {cell(<StatusBadge status={row.status} />, "status")}
  </>;
  if (resource === "transactions") return <>
    {cell(<span className="font-semibold text-slate-900">{row.product?.name || "—"}</span>, "product")}
    {cell(row.warehouse?.name || "—", "warehouse")}
    {cell(<span className={`inline-flex items-center gap-1 font-semibold ${row.type === "in" ? "text-emerald-700" : "text-blue-700"}`}>{row.type === "in" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}{row.type === "in" ? "Stock in" : "Stock out"}</span>, "movement")}
    {cell(row.quantity, "quantity")}
    {cell(row.performedBy?.username || "System", "performed")}
    {cell(new Date(row.createdAt).toLocaleString(), "date")}
  </>;
  if (resource === "alerts") return <>
    {cell(<span className="font-semibold text-slate-900">{row.product?.name}</span>, "product")}
    {cell(row.product?.sku, "sku")}
    {cell(row.warehouse?.name, "warehouse")}
    {cell(<span className="font-bold text-amber-700">{row.quantity}</span>, "available")}
    {cell(row.lowStockLimit, "limit")}
  </>;
  return <>
    {cell(<span className="font-semibold text-navy-700">#{row._id.slice(-7).toUpperCase()}</span>, "request")}
    {cell(row.supplier?.companyName || row.supplier?.username || "—", "supplier")}
    {cell(row.items.map((item) => `${item.product?.name || "Product"} ×${item.quantity}`).join(", "), "products")}
    {cell(new Date(row.createdAt).toLocaleDateString(), "date")}
    {cell(<StatusBadge status={row.status} />, "status")}
  </>;
}

function initialValues(resource, record) {
  if (resource === "users" || resource === "suppliers") return {
    username: record?.username || "",
    email: record?.email || "",
    password: "",
    role: resource === "suppliers" ? "supplier" : record?.role || "sales_representative",
    phone: record?.phone || "",
    companyName: record?.companyName || "",
    assignedWarehouses: (record?.assignedWarehouses || []).map((item) => item._id || item)
  };
  if (resource === "products") return {
    name: record?.name || "",
    sku: record?.sku || "",
    category: record?.category || "",
    price: record?.price ?? "",
    lowStockLimit: record?.lowStockLimit ?? 0,
    supplier: record?.supplier?._id || "",
    description: record?.description || ""
  };
  return {
    name: record?.name || "",
    code: record?.code || "",
    address: record?.address || "",
    manager: record?.manager?._id || ""
  };
}

function FormActions({ saving, onCancel, submitLabel }) {
  return <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : submitLabel}</button></div>;
}

function IconButton({ children, title, onClick, danger, positive }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className={`rounded-lg p-2 transition ${danger ? "text-red-600 hover:bg-red-50" : positive ? "text-emerald-700 hover:bg-emerald-50" : "text-slate-500 hover:bg-slate-100 hover:text-navy-700"}`}><span className="[&>svg]:h-4 [&>svg]:w-4">{children}</span></button>;
}

function FormError({ message }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{message}</div>;
}

function Avatar({ name, image }) {
  return image ? <img className="h-9 w-9 rounded-lg object-cover" src={image} alt="" /> : <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-xs font-bold uppercase text-navy-700">{String(name || "?").slice(0, 2)}</div>;
}

function EmptyTitleFallback({ resource }) {
  return resource;
}

function emptyTitle(resource) {
  return {
    users: "No users found",
    suppliers: "No suppliers yet",
    products: "No products yet",
    warehouses: "No warehouses found",
    orders: "No orders yet",
    transactions: "No stock activity yet",
    alerts: "No low-stock alerts",
    "supply-requests": "No supply requests"
  }[resource] || <EmptyTitleFallback resource="No records found" />;
}

function emptyDescription(resource) {
  return {
    users: "Create a user account to give your team access.",
    suppliers: "Supplier accounts will appear here when created.",
    products: "Add products to start tracking inventory.",
    warehouses: "Create a warehouse or ask an administrator to assign one.",
    orders: "New orders will appear here.",
    transactions: "Inventory changes are recorded here automatically.",
    alerts: "Nothing is at or below its reorder point.",
    "supply-requests": "Supplier requests will appear when submitted."
  }[resource] || "No records are available.";
}

function singular(resource) {
  return {
    users: "user", suppliers: "supplier", products: "product", warehouses: "warehouse",
    orders: "order", transactions: "transaction", alerts: "alert", "supply-requests": "supply request"
  }[resource] || resource;
}

function plural(resource) {
  if (resource === "alerts") return "alerts";
  if (resource === "supply-requests") return "supply requests";
  return `${singular(resource)}${resource.endsWith("s") ? "" : "s"}`;
}

function money(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}
