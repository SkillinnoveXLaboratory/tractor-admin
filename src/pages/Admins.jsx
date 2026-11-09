import { useEffect, useState } from "react";
import { useAction, useApi } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { dateTime, titleCase } from "../lib/format";
import { Avatar, Badge, Card, ConfirmDialog, ErrorState, Field, Modal, PageHeader, Spinner, Table } from "../components/ui";

const POWER_HELP = {
  dashboard: "Overview numbers and charts",
  users: "App accounts: create, edit, suspend, reset passwords",
  tractors: "Tractor listings",
  bookings: "Booking status and driver assignment",
  products: "Product approval and listings",
  orders: "Order status",
  payments: "Payment verification, ledger and driver payouts",
  agri: "Agri Doctor cases and advice",
  subscriptions: "Plans and subscribers",
  notifications: "Send notifications",
  content: "Help, terms and privacy pages",
  settings: "Driver pay, approvals, limits",
  audit: "Read the audit log",
};

function AdminForm({ open, onClose, admin, powers }) {
  const editing = Boolean(admin);
  const action = useAction();
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setForm({ name: admin?.name || "", email: admin?.email || "", password: "", role: admin?.role || "admin", permissions: admin?.role === "admin" ? [...admin.permissions] : ["dashboard"] });
      setError("");
    }
  }, [open, admin]);
  if (!open) return null;
  const toggle = (power) => setForm({ ...form, permissions: form.permissions.includes(power) ? form.permissions.filter((p) => p !== power) : [...form.permissions, power] });
  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { setError("Enter the admin's name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError("Enter a valid email."); return; }
    if (!editing && (form.password.length < 10 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))) { setError("Password: at least 10 characters with letters and numbers."); return; }
    const body = { name: form.name.trim(), email: form.email.trim(), role: form.role, permissions: form.role === "super_admin" ? [] : form.permissions };
    try {
      await action.mutateAsync({ path: editing ? `/admins/${admin.id}` : "/admins", method: editing ? "PATCH" : "POST", body: editing ? body : { ...body, password: form.password }, throwOnly: true });
      onClose();
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal open={open} onClose={onClose} size="max-w-2xl" title={editing ? `Edit ${admin.name}` : "New admin"} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="submit" form="admin-form" className="btn-primary" disabled={action.isPending}>{editing ? "Save" : "Create admin"}</button></>}>
      <form id="admin-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name"><input className="input" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email (sign-in)"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          {!editing && <Field label="Temporary password" hint="They should change it after first sign-in."><input className="input" type="text" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>}
        </div>
        <div>
          <span className="label">Role</span>
          <div className="grid grid-cols-2 gap-2">
            {[["admin", "Admin", "Only the sections you choose"], ["super_admin", "Super admin", "Everything, including admins"]].map(([value, label, hint]) => (
              <button key={value} type="button" onClick={() => setForm({ ...form, role: value })} className={`text-left px-3 py-2.5 rounded-lg border ${form.role === value ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                <p className={`text-xs font-bold ${form.role === value ? "text-blue-600" : "text-gray-700"}`}>{label}</p><p className="text-[11px] text-gray-400">{hint}</p>
              </button>
            ))}
          </div>
        </div>
        {form.role === "admin" && (
          <div>
            <div className="flex items-center justify-between mb-1.5"><span className="label mb-0">Powers</span><span className="text-[11px] space-x-3"><button type="button" className="text-blue-600" onClick={() => setForm({ ...form, permissions: [...powers] })}>Select all</button><button type="button" className="text-blue-600" onClick={() => setForm({ ...form, permissions: [] })}>Clear</button></span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {powers.map((power) => (
                <label key={power} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer ${form.permissions.includes(power) ? "border-blue-300 bg-blue-50/50" : "border-gray-200"}`}>
                  <input type="checkbox" className="mt-0.5" checked={form.permissions.includes(power)} onChange={() => toggle(power)} />
                  <span><span className="text-xs font-bold text-gray-700">{titleCase(power)}</span><br /><span className="text-[11px] text-gray-400">{POWER_HELP[power]}</span></span>
                </label>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

function ResetPassword({ admin, onClose }) {
  const action = useAction();
  const { admin: me, replaceSession } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError("At least 10 characters with letters and numbers."); return; }
    try {
      const data = await action.mutateAsync({ path: `/admins/${admin.id}/password`, body: { password }, throwOnly: true });
      if (admin.id === me.id && data.token) replaceSession(data.token);
      onClose();
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal open onClose={onClose} title={`Reset password for ${admin.name}`} footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="submit" form="admin-pw" className="btn-primary" disabled={action.isPending}>Reset</button></>}>
      <form id="admin-pw" onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-600">Their sessions end and the account is unlocked.</p>
        <Field label="New password" error={error}><input className="input" type="text" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} /></Field>
      </form>
    </Modal>
  );
}

export default function Admins() {
  const { admin: me } = useAuth();
  const action = useAction();
  const query = useApi("/admins");
  const [editing, setEditing] = useState(null);
  const [dialog, setDialog] = useState(null);

  return (
    <>
      <PageHeader title="Admins" crumbs={[{ label: "System" }, { label: "Admins" }]} actions={<button type="button" className="btn-primary" onClick={() => setEditing("new")}><i className="fa-solid fa-user-plus" /> New admin</button>} />
      <Card>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <Table
            rows={query.data.admins}
            rowKey={(a) => a.id}
            columns={[
              { key: "a", title: "Admin", render: (a) => <div className="flex items-center gap-3 min-w-[200px]"><Avatar name={a.name} /><div><p className="font-bold text-gray-800">{a.name}{a.id === me.id && <span className="text-blue-600 font-normal"> (you)</span>}</p><p className="text-[11px] text-gray-400">{a.email}</p></div></div> },
              { key: "r", title: "Role", render: (a) => <Badge status={a.role} /> },
              { key: "p", title: "Powers", render: (a) => a.role === "super_admin" ? <span className="text-gray-400">All sections</span> : <div className="flex flex-wrap gap-1 max-w-xs">{a.permissions.length ? a.permissions.map((p) => <span key={p} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600">{titleCase(p)}</span>) : <span className="text-rose-400">None</span>}</div> },
              { key: "s", title: "Status", render: (a) => <Badge status={a.status} /> },
              { key: "l", title: "Last sign-in", className: "hidden md:table-cell", render: (a) => dateTime(a.lastLoginAt) },
              { key: "x", title: "", render: (a) => (
                <div className="flex justify-end gap-1">
                  <button type="button" className="btn-light px-2.5 py-1.5" onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`}><i className="fa-solid fa-pen" /></button>
                  <button type="button" className="btn-light px-2.5 py-1.5" onClick={() => setDialog({ type: "password", admin: a })} aria-label={`Reset password for ${a.name}`}><i className="fa-solid fa-key" /></button>
                  {a.id !== me.id && <button type="button" className="btn-light px-2.5 py-1.5" onClick={() => setDialog({ type: "status", admin: a })} aria-label={a.status === "active" ? "Suspend" : "Reactivate"}><i className={`fa-solid ${a.status === "active" ? "fa-ban text-amber-500" : "fa-user-check text-emerald-500"}`} /></button>}
                  {a.id !== me.id && <button type="button" className="btn-light px-2.5 py-1.5" onClick={() => setDialog({ type: "delete", admin: a })} aria-label={`Delete ${a.name}`}><i className="fa-solid fa-trash text-rose-400" /></button>}
                </div>
              ) },
            ]}
          />
        )}
      </Card>
      <AdminForm open={Boolean(editing)} onClose={() => setEditing(null)} admin={editing === "new" ? null : editing} powers={query.data?.powers || []} />
      {dialog?.type === "password" && <ResetPassword admin={dialog.admin} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog?.type === "status"}
        onClose={() => setDialog(null)}
        title={dialog?.admin?.status === "active" ? `Suspend ${dialog?.admin?.name}?` : `Reactivate ${dialog?.admin?.name}?`}
        tone={dialog?.admin?.status === "active" ? "danger" : "success"}
        confirmLabel={dialog?.admin?.status === "active" ? "Suspend" : "Reactivate"}
        message={dialog?.admin?.status === "active" ? "They are signed out at once and can't sign in." : "They can sign in again with their password."}
        onConfirm={() => action.mutateAsync({ path: `/admins/${dialog.admin.id}`, method: "PATCH", body: { status: dialog.admin.status === "active" ? "suspended" : "active" }, throwOnly: true })}
      />
      <ConfirmDialog open={dialog?.type === "delete"} onClose={() => setDialog(null)} title={`Delete ${dialog?.admin?.name}?`} tone="danger" confirmLabel="Delete admin" message="Their account is removed. Their past actions stay in the audit log." onConfirm={() => action.mutateAsync({ path: `/admins/${dialog.admin.id}`, method: "DELETE", throwOnly: true })} />
    </>
  );
}
