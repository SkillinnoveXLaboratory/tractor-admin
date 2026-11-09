import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const HIGHLIGHTS = [
  ["fa-users", "Farmers, vendors, drivers and shopkeepers"],
  ["fa-tractor", "Tractors, bookings and driver payouts"],
  ["fa-bag-shopping", "Product approvals, orders and payments"],
  ["fa-clock-rotate-left", "Every change recorded in the audit log"],
];

export default function Login() {
  const { signIn, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { document.title = "Sign in · TractorApp Admin"; }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) { setError("Enter your email and password."); return; }
    setBusy(true);
    setError("");
    try {
      await signIn(form.email.trim(), form.password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f3f5f9]">
      <div className="hidden lg:flex w-[42%] bg-sidebar-bg text-[#98a6ad] flex-col justify-between p-10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white"><i className="fa-solid fa-tractor text-sm" /></div>
          <span className="text-white font-bold text-xl tracking-tight">TractorApp</span>
        </div>
        <div>
          <p className="text-[11px] font-bold text-sidebar-title uppercase tracking-wider mb-3">Admin panel</p>
          <h1 className="text-3xl font-bold text-white leading-tight">Run bookings, the marketplace and every account from one place.</h1>
          <ul className="mt-8 space-y-3 text-sm">
            {HIGHLIGHTS.map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3"><i className={`fa-solid ${icon} w-5 text-center text-indigo-400`} />{text}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-title">Authorised staff only. Sign-ins are logged.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm card p-8" noValidate>
          <div className="lg:hidden flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white"><i className="fa-solid fa-tractor text-xs" /></div>
            <span className="text-gray-800 font-bold text-lg">TractorApp</span>
          </div>
          <span className="card-label">Welcome back</span>
          <h2 className="text-xl font-bold text-gray-800 mt-0.5 mb-6">Sign in to the admin panel</h2>
          {notice && !error && <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2">{notice}</p>}
          <label className="block mb-4">
            <span className="label">Email</span>
            <input type="email" autoComplete="username" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
          </label>
          <label className="block mb-2">
            <span className="label">Password</span>
            <div className="relative">
              <input type={show ? "text" : "password"} autoComplete="current-password" className="input pr-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600" aria-label={show ? "Hide password" : "Show password"}>
                <i className={`fa-regular ${show ? "fa-eye-slash" : "fa-eye"} text-sm`} />
              </button>
            </div>
          </label>
          {error && <p className="text-xs text-rose-500 mt-3" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 mt-6 text-sm">
            {busy && <i className="fa-solid fa-circle-notch fa-spin" />} Sign in
          </button>
          <p className="text-[11px] text-gray-400 mt-6 text-center">Forgot your password? Ask the super admin to reset it.</p>
        </form>
      </div>
    </div>
  );
}
