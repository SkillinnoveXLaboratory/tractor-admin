import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAction, useApi, useUrlState } from "../lib/hooks";
import { dateTime, num, titleCase } from "../lib/format";
import { Badge, Card, EmptyState, ErrorState, Field, PageHeader, Pagination, Spinner, Table } from "../components/ui";
import { UserPicker } from "../components/forms";

export default function Broadcasts() {
  const [search] = useSearchParams();
  const [state, update] = useUrlState({ user: "", name: "" });
  const meta = useApi("/meta", null, { staleTime: 60000 });
  const history = useApi("/broadcasts", { page: state.page, limit: 10 }, { keepPrevious: true });
  const action = useAction();
  const [form, setForm] = useState(() => ({ audience: search.get("user") ? "user" : "all", role: "farmer", userId: search.get("user") || "", title: "", body: "" }));
  const [error, setError] = useState("");

  const send = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3) { setError("Title must be at least 3 characters."); return; }
    if (form.body.trim().length < 3) { setError("Write the message."); return; }
    if (form.audience === "user" && !form.userId) { setError("Choose the user."); return; }
    setError("");
    try {
      await action.mutateAsync({ path: "/broadcasts", body: { audience: form.audience, role: form.role, userId: form.userId, title: form.title.trim(), body: form.body.trim() }, throwOnly: true });
      setForm({ ...form, title: "", body: "" });
      if (state.user) update({ user: "", name: "" });
    } catch (err) { setError(err.message); }
  };

  return (
    <>
      <PageHeader title="Notifications" crumbs={[{ label: "Business" }, { label: "Notifications" }]} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5">
          <Card title="Send a notification">
            <form onSubmit={send} className="space-y-4" noValidate>
              <div>
                <span className="label">Send to</span>
                <div className="grid grid-cols-3 gap-2">
                  {[["all", "Everyone"], ["role", "One role"], ["user", "One user"]].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setForm({ ...form, audience: value })} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${form.audience === value ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-600"}`}>{label}</button>
                  ))}
                </div>
              </div>
              {form.audience === "role" && (
                <Field label="Role"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{(meta.data?.roles || []).map((r) => <option key={r} value={r}>{titleCase(r)}s</option>)}</select></Field>
              )}
              {form.audience === "user" && <UserPicker label="User" value={form.userId} initialLabel={state.name} onChange={(id) => setForm((f) => ({ ...f, userId: id }))} />}
              <Field label="Title"><input className="input" maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Monsoon booking offer" /></Field>
              <Field label={`Message (${form.body.length}/500)`}><textarea className="input" rows={5} maxLength={500} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
              <p className="text-[11px] text-gray-400">Appears in the app’s Notifications screen. Suspended accounts are skipped.</p>
              {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={action.isPending}>{action.isPending ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-regular fa-paper-plane" />} Send notification</button>
            </form>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-7">
          <Card title="Sent">
            {history.isPending ? <Spinner /> : history.isError ? <ErrorState error={history.error} onRetry={() => history.refetch()} /> : (
              <>
                <Table
                  rows={history.data.items}
                  columns={[
                    { key: "t", title: "Message", render: (b) => <div className="max-w-sm"><p className="font-bold text-gray-800">{b.title}</p><p className="text-[11px] text-gray-400 line-clamp-2">{b.body}</p></div> },
                    { key: "a", title: "To", render: (b) => (b.audience === "all" ? <Badge tone="blue">Everyone</Badge> : b.audience === "role" ? <Badge status={b.role}>{titleCase(b.role)}s</Badge> : <span>{b.user?.fullName || "User"}</span>) },
                    { key: "n", title: "Recipients", render: (b) => num(b.recipients) },
                    { key: "w", title: "Sent", render: (b) => <div><p>{dateTime(b.createdAt)}</p><p className="text-[11px] text-gray-400">by {b.sentByName}</p></div> },
                  ]}
                  empty={<EmptyState icon="fa-regular fa-bell" title="Nothing sent yet" />}
                />
                <Pagination page={history.data.page} pages={history.data.pages} total={history.data.total} onPage={(page) => update({ page })} />
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
