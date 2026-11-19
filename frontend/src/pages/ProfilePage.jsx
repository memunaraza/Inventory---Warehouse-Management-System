import { useEffect, useMemo, useState } from "react";
import { Building2, Camera, Mail, Phone, Save, UserRound } from "lucide-react";
import api, { getApiData, getApiError } from "../api/client.js";
import { uploadImage } from "../api/imagekit.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const roleLabels = {
  admin: "Administrator",
  warehouse_manager: "Warehouse Manager",
  supplier: "Supplier",
  sales_representative: "Sales Representative"
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const notify = useToast();
  const [values, setValues] = useState({
    username: user?.username || "",
    phone: user?.phone || "",
    companyName: user?.companyName || ""
  });
  const [profileFile, setProfileFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const profilePreview = useMemo(() => profileFile ? URL.createObjectURL(profileFile) : "", [profileFile]);
  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : "", [logoFile]);

  useEffect(() => () => {
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [profilePreview, logoPreview]);

  useEffect(() => {
    setValues({
      username: user?.username || "",
      phone: user?.phone || "",
      companyName: user?.companyName || ""
    });
  }, [user]);

  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    setError("");
    if (values.username.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: values.username.trim(),
        phone: values.phone.trim()
      };
      if (user.role === "supplier") payload.companyName = values.companyName.trim();
      if (profileFile) payload.profileImage = await uploadImage(profileFile, "/profiles");
      if (user.role === "supplier" && logoFile) payload.supplierLogo = await uploadImage(logoFile, "/suppliers");

      const response = await api.put("/users/me", payload);
      const updatedUser = getApiData(response).user;
      setValues({
        username: updatedUser.username || "",
        phone: updatedUser.phone || "",
        companyName: updatedUser.companyName || ""
      });
      setProfileFile(null);
      setLogoFile(null);
      await refreshUser();
      notify("Your profile has been updated.");
    } catch (saveError) {
      const message = getApiError(saveError);
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-navy-600">Account settings</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Keep your contact and account details up to date.</p>
      </div>

      <form className="panel overflow-hidden" onSubmit={saveProfile}>
        <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:p-7">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400">
            {profilePreview || user?.profileImage?.url
              ? <img src={profilePreview || user.profileImage.url} alt="Profile" className="h-full w-full object-cover" />
              : <UserRound className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900">{user?.username}</h3>
            <p className="mt-1 text-sm text-slate-500">{roleLabels[user?.role] || "Workspace member"}</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-navy-700 hover:text-navy-900">
              <Camera className="h-3.5 w-3.5" /> Change profile photo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setProfileFile(event.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          <Field label="Full name" icon={UserRound}>
            <input className="field pl-10" value={values.username} onChange={(event) => set("username", event.target.value)} minLength={2} required autoComplete="name" />
          </Field>
          <Field label="Email address" icon={Mail}>
            <input className="field pl-10" type="email" value={user?.email || ""} disabled />
          </Field>
          <Field label="Phone number" icon={Phone}>
            <input className="field pl-10" type="tel" value={values.phone} onChange={(event) => set("phone", event.target.value)} autoComplete="tel" />
          </Field>

          {user?.role === "supplier" && (
            <>
              <Field label="Company name" icon={Building2}>
                <input className="field pl-10" value={values.companyName} onChange={(event) => set("companyName", event.target.value)} />
              </Field>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Company logo</span>
                <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 hover:border-navy-400">
                  {logoPreview || user?.supplierLogo?.url
                    ? <img src={logoPreview || user.supplierLogo.url} alt="Company logo" className="h-12 w-12 rounded-lg object-cover" />
                    : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Building2 className="h-5 w-5" /></span>}
                  <span className="text-sm font-semibold text-slate-700">{logoFile?.name || "Choose a company logo"}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
                </span>
                <span className="mt-1 block text-xs text-slate-500">Image uploads are securely handled through ImageKit.</span>
              </label>
            </>
          )}
        </div>

        {error && <div role="alert" className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</div>}
        <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-7">
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving profile…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <span className="relative block">
        <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </span>
    </label>
  );
}
