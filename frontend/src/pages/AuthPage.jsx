import { useState } from "react";
import { ArrowRight, Boxes, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, loading, login, register } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && user) return <Navigate to="/overview" replace />;

  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) await register(values);
      else await login({ email: values.email, password: values.password });
      notify(isRegister ? "Your account is ready." : "Welcome back.");
      navigate(location.state?.from || "/overview", { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to authenticate. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-navy-900 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-36 -top-32 h-[440px] w-[440px] rounded-full border border-white/10" />
        <div className="absolute -right-20 -top-16 h-[300px] w-[300px] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy-900"><Boxes className="h-6 w-6" /></div>
          <span className="text-sm font-bold tracking-[0.16em]">STOCKROOM</span>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Inventory clarity, at every step</p>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight xl:text-6xl">One workspace for your entire operation.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Coordinate stock, warehouses, orders and suppliers with a clear view of what moves next.</p>
          <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Secure access for every team
          </div>
        </div>
        <p className="relative text-xs text-slate-400">Inventory &amp; Warehouse Management</p>
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white"><Boxes className="h-5 w-5" /></div>
            <span className="text-sm font-bold tracking-[0.16em] text-navy-900">STOCKROOM</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-600">{isRegister ? "Create your account" : "Welcome back"}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{isRegister ? "Get started" : "Sign in to Stockroom"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isRegister ? "Register as a sales representative to start managing orders." : "Enter your account details to continue to your workspace."}
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {isRegister && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Username</span>
                <span className="relative block">
                  <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="field pl-10" name="username" value={values.username} onChange={update} placeholder="Your name" minLength={2} required autoComplete="username" />
                </span>
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
              <span className="relative block">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="field pl-10" type="email" name="email" value={values.email} onChange={update} placeholder="you@company.com" required autoComplete="email" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
              <span className="relative block">
                <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="field pl-10 pr-11" type={showPassword ? "text" : "password"} name="password" value={values.password} onChange={update} placeholder="At least 8 characters" minLength={8} required autoComplete={isRegister ? "new-password" : "current-password"} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
              {submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {isRegister ? "Already have an account?" : "New to Stockroom?"}{" "}
            <Link to={isRegister ? "/login" : "/register"} className="font-semibold text-navy-700 hover:text-navy-900">
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">Your access level is managed by your administrator. Public registration creates a sales representative account.</p>
        </div>
      </div>
    </div>
  );
}
