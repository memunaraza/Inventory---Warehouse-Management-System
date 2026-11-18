import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="panel w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">403 · Access denied</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">This area isn’t available</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Your account doesn’t have permission to view this page. Contact an administrator if you need access.</p>
        <Link to="/overview" className="btn-primary mt-6"><ArrowLeft className="h-4 w-4" /> Back to overview</Link>
      </div>
    </div>
  );
}
