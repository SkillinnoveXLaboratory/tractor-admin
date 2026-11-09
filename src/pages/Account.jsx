import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { dateTime, titleCase } from "../lib/format";
import { Avatar, Badge, Card, DetailList, Field, PageHeader, useToast } from "../components/ui";

// Password strength shown while typing: the server enforces 10+ characters with letters and numbers.
function strength(password) {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  return Math.min(score, 4);
}
const LEVELS = [["Too weak", "bg-rose-400"], ["Weak", "bg-rose-400"], ["Fair", "bg-amber-400"], ["Good", "bg-blue-500"], ["Strong", "bg-emerald-500"]];

export default function Account() {
  const { admin, replaceSession, signOut } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const level = strength(form.newPassword);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword) { setError("Enter your current password."); return; }
    if (form.newPassword.length < 10 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) { setError("New password: at least 10 characters with letters and numbers."); return; }
    if (form.newPassword !== form.confirmPassword) { setError("New passwords do not match."); return; }
    setBusy(true);
    setError("");
    try {
      const data = await api("/auth/password", { method: "POST", body: form });
      replaceSession(data.token, data.admin);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const logoutAll = async () => {
    try { await api("/auth/logout-all", { method: "POST" }); } catch (err) { toast(err.message, "error"); }
    signOut();
  };

  return (
    <>
      <PageHeader title="My account" crumbs={[{ label: "System" }, { label: "My account" }]} />
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 lg:col-span-5">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <Avatar name={admin.name} size="w-14 h-14" />
            <div><p className="text-base font-bold text-gray-800">{admin.name}</p><p className="text-xs text-gray-400">{admin.email}</p><div className="mt-1"><Badge status={admin.role} /></div></div>
          </div>
          <DetailList items={[
            ["Sections", admin.role === "super_admin" ? "All sections + admin management" : admin.permissions.map(titleCase).join(", ") || "None"],
            ["Last sign-in", dateTime(admin.lastLoginAt)],
            ["Password changed", admin.passwordChangedAt ? dateTime(admin.passwordChangedAt) : "Never"],
          ]} />
          <button type="button" className="btn-light mt-4" onClick={logoutAll}><i className="fa-solid fa-laptop" /> Sign out on every device</button>
        </Card>
        <Card title="Change password" className="col-span-12 lg:col-span-7">
          <form onSubmit={submit} className="space-y-4 max-w-md" noValidate>
            <Field label="Current password"><input className="input" type={show ? "text" : "password"} autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></Field>
            <Field label="New password" hint="At least 10 characters with letters and numbers.">
              <input className="input" type={show ? "text" : "password"} autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            </Field>
            {form.newPassword && (
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-4 gap-1">{[1, 2, 3, 4].map((i) => <span key={i} className={`h-1 rounded-full ${i <= level ? LEVELS[level][1] : "bg-gray-200"}`} />)}</div>
                <span className="text-[11px] text-gray-500 w-16 text-right">{LEVELS[level][0]}</span>
              </div>
            )}
            <Field label="Confirm new password"><input className="input" type={show ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords</label>
            {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
            <button type="submit" className="btn-primary" disabled={busy}>{busy && <i className="fa-solid fa-circle-notch fa-spin" />} Change password</button>
            <p className="text-[11px] text-gray-400">Changing your password signs you out on your other devices.</p>
          </form>
        </Card>
      </div>
    </>
  );
}
