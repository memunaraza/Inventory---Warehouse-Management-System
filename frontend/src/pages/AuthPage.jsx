import { useState } from "react";
import { ArrowLeft, ArrowRight, Boxes, Building2, Camera, Eye, EyeOff, LockKeyhole, Mail, Phone, ShoppingCart, Truck, UserRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { uploadImage } from "../api/imagekit.js";
import BrandLogo from "../components/BrandLogo.jsx";

const phonePattern = /^[+]?[\d\s().-]{7,20}$/;

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, loading, login, register } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ username: "", email: "", phone: "", password: "", confirmPassword: "", companyName: "" });
  const [role, setRole] = useState("");
  const [logo, setLogo] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!loading && user) return <Navigate to="/overview" replace />;

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  const selectRole = (selectedRole) => {
    setRole(selectedRole);
    setError("");
    setSuccess("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (isRegister) {
      if (!role) {
        setError("Choose your account type to continue.");
        return;
      }
      if (values.username.trim().length < 2) {
        setError("Enter your full name.");
        return;
      }
      if (!phonePattern.test(values.phone.trim())) {
        setError("Enter a valid phone number.");
        return;
      }
      if (values.password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }
      if (values.password !== values.confirmPassword) {
        setError("Password and confirm password must match.");
        return;
      }
      if (role === "supplier" && values.companyName.trim().length < 2) {
        setError("Enter your company name.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        let supplierLogo;
        if (role === "supplier" && logo) {
          supplierLogo = await uploadImage(logo, "stockroom/supplier-logos");
        }
        await register({
          username: values.username.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
          role,
          ...(role === "supplier" ? { companyName: values.companyName.trim(), supplierLogo } : {})
        });
        setSuccess("Your account has been created successfully.");
        notify("Your account is ready.");
      } else {
        await login({ email: values.email, password: values.password });
        notify("Welcome back.");
      }
      navigate(location.state?.from || "/overview", { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Unable to authenticate. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden min-h-screen overflow-hidden bg-navy-900 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=85" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1117]/95 via-[#0b1117]/75 to-[#0b1117]/45" />
        <Link to="/" className="relative flex items-center gap-3">
          <BrandLogo size={44} />
        </Link>
        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#ff984e]">WAREHOUSE OPERATIONS · INVENTORY CONTROL</p>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight xl:text-6xl">One workspace for your entire operation.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Coordinate stock, warehouses, orders and suppliers with a clear view of what moves next.</p>
          <div className="mt-10 flex items-center gap-3 text-sm text-slate-300"><span className="h-2 w-2 rounded-full bg-[#f47e25]" />Secure access for every team</div>
        </div>
        <p className="relative text-xs text-slate-400">Inventory &amp; Warehouse Management</p>
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className={`w-full ${isRegister ? "max-w-[520px]" : "max-w-[420px]"}`}>
          <Link to="/" className="mb-7 flex items-center gap-3 lg:hidden">
            <BrandLogo darkText />
          </Link>

          {isRegister ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-navy-600">Create your account</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Choose your role</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Select the workspace that matches how you work.</p>
                </div>
                {role && (
                  <button type="button" onClick={() => setRole("")} className="mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">
                    <ArrowLeft className="h-3.5 w-3.5" /> Change
                  </button>
                )}
              </div>

              {!role ? (
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <RoleCard icon={Truck} title="Supplier" description="Manage company details and submit stock supply requests." selected={role === "supplier"} onClick={() => selectRole("supplier")} />
                  <RoleCard icon={ShoppingCart} title="Sales Representative" description="Create and track customer orders for your sales operations." selected={role === "sales_representative"} onClick={() => selectRole("sales_representative")} />
                </div>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" icon={UserRound}>
                      <input className="field pl-10" name="username" value={values.username} onChange={update} placeholder="Your full name" minLength={2} required autoComplete="name" />
                    </Field>
                    <Field label="Email address" icon={Mail}>
                      <input className="field pl-10" type="email" name="email" value={values.email} onChange={update} placeholder="you@company.com" required autoComplete="email" />
                    </Field>
                  </div>
                  <Field label="Phone number" icon={Phone}>
                    <input className="field pl-10" type="tel" name="phone" value={values.phone} onChange={update} placeholder="+92 300 1234567" required autoComplete="tel" />
                  </Field>

                  {role === "supplier" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Company name" icon={Building2}>
                        <input className="field pl-10" name="companyName" value={values.companyName} onChange={update} placeholder="Company name" minLength={2} required />
                      </Field>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Company logo <span className="font-normal text-slate-400">(optional)</span></span>
                        <span className="flex h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 hover:border-[#f47e25]/60">
                          {logo ? <img src={URL.createObjectURL(logo)} alt="Logo preview" className="h-7 w-7 rounded object-cover" /> : <Camera className="h-4 w-4 text-slate-400" />}
                          <span className="truncate text-xs font-semibold text-slate-600">{logo?.name || "Choose image"}</span>
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setLogo(event.target.files?.[0] || null)} />
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <PasswordField label="Password" name="password" value={values.password} onChange={update} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                    <PasswordField label="Confirm password" name="confirmPassword" value={values.confirmPassword} onChange={update} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />
                  </div>

                  {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                  {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
                  <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
                    {submitting ? "Creating account…" : `Create ${role === "supplier" ? "supplier" : "sales representative"} account`}
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-navy-600">Welcome back</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Sign in to Stockroom</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Enter your account details to continue to your workspace.</p>
              </div>
              <form onSubmit={submit} className="mt-8 space-y-5">
                <Field label="Email address" icon={Mail}>
                  <input className="field pl-10" type="email" name="email" value={values.email} onChange={update} placeholder="you@company.com" required autoComplete="email" />
                </Field>
                <PasswordField label="Password" name="password" value={values.password} onChange={update} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
                  {submitting ? "Signing in…" : "Sign in"} {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}

          <p className="mt-7 text-center text-sm text-slate-500">
            {isRegister ? "Already have an account?" : "New to Stockroom?"}{" "}
            <Link to={isRegister ? "/login" : "/register"} className="font-semibold text-navy-700 hover:text-navy-900">
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
          {isRegister && <p className="mt-6 text-center text-xs leading-5 text-slate-400">Public registration is available only for Suppliers and Sales Representatives. Admin and Warehouse Manager accounts are assigned by an administrator.</p>}
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon: Icon, title, description, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#f47e25]/50 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f47e25]/10 text-[#e86f1b]"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-navy-700">Continue <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
    </button>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <span className="relative block">
        {Icon && <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        {children}
      </span>
    </label>
  );
}

function PasswordField({ label, name, value, onChange, visible, onToggle }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <span className="relative block">
        <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="field pl-10 pr-11" type={visible ? "text" : "password"} name={name} value={value} onChange={onChange} placeholder="At least 8 characters" minLength={8} required autoComplete={name === "confirmPassword" ? "new-password" : label === "Password" ? "current-password" : "new-password"} />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}
