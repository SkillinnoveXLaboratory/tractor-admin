import { useState } from "react";
import { useApi, useUrlState } from "../lib/hooks";
import { dateTime, titleCase } from "../lib/format";
import { Badge, Card, EmptyState, ErrorState, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, Table } from "../components/ui";

const ENTITY_LINK = { user: "/users/", booking: "/bookings/", order: "/orders/", product: "/products/", tractor: "/tractors/", agri: "/agri/" };
const ACTION_TONE = { delete: "rose", suspend: "rose", reject: "rose", reverse_payment: "rose", create: "emerald", approve: "emerald", activate: "emerald", verify_payment: "emerald", login: "gray" };

function Json({ value }) {
  if (value == null) return <p className="text-xs text-gray-400">—</p>;
  return <pre className="text-[11px] bg-slate-50 border border-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(value, null, 2)}</pre>;
}

export default function Audit() {
  const [state, update] = useUrlState({ q: "", entity: "", action: "", admin: "", from: "", to: "" });
  const [open, setOpen] = useState(null);
  const query = useApi("/audit", { ...state, limit: 25 }, { keepPrevious: true });
  const f = query.data?.filters;
  return (
    <>
      <PageHeader title="Audit log" crumbs={[{ label: "System" }, { label: "Audit log" }]} />
      <Card>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Search summaries or admins" />
          <Select value={state.entity} onChange={(entity) => update({ entity })} placeholder="Any section" options={(f?.entities || []).map((e) => ({ value: e, label: titleCase(e) }))} />
          <Select value={state.action} onChange={(action) => update({ action })} placeholder="Any action" options={(f?.actions || []).map((a) => ({ value: a, label: titleCase(a) }))} />
          <Select value={state.admin} onChange={(admin) => update({ admin })} placeholder="Any admin" options={(f?.admins || []).map((a) => ({ value: a._id, label: a.name }))} />
          <label className="text-[11px] text-gray-400">From<input type="date" className="input py-1.5 text-xs mt-0.5" value={state.from} onChange={(e) => update({ from: e.target.value })} /></label>
          <label className="text-[11px] text-gray-400">To<input type="date" className="input py-1.5 text-xs mt-0.5" value={state.to} onChange={(e) => update({ to: e.target.value })} /></label>
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <Table
              rows={query.data.items}
              onRowClick={setOpen}
              columns={[
                { key: "w", title: "When", render: (a) => <span className="whitespace-nowrap">{dateTime(a.createdAt)}</span> },
                { key: "a", title: "Admin", render: (a) => <div><p className="font-semibold text-gray-700">{a.adminName}</p><p className="text-[11px] text-gray-400">{a.adminEmail}</p></div> },
                { key: "x", title: "Action", render: (a) => <Badge tone={ACTION_TONE[a.action] || "blue"}>{titleCase(a.action)}</Badge> },
                { key: "e", title: "Section", className: "hidden md:table-cell", render: (a) => titleCase(a.entity) },
                { key: "s", title: "Summary", render: (a) => <span className="line-clamp-2 max-w-md">{a.summary}</span> },
              ]}
              empty={<EmptyState icon="fa-solid fa-clock-rotate-left" title="No entries match" />}
            />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} size="max-w-2xl" title={open ? `${titleCase(open.action)} · ${titleCase(open.entity)}` : ""}>
        {open && (
          <div className="space-y-4 text-xs">
            <p className="text-sm text-gray-700">{open.summary}</p>
            <p className="text-gray-400">{open.adminName} ({open.adminEmail}) · {dateTime(open.createdAt)} · IP {open.ip || "—"}</p>
            {ENTITY_LINK[open.entity] && open.entityId && <a href={`/admin${ENTITY_LINK[open.entity]}${open.entityId}`} className="text-blue-600 hover:underline">Open the {open.entity}</a>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><p className="card-label mb-1">Before</p><Json value={open.before} /></div>
              <div><p className="card-label mb-1">After</p><Json value={open.after} /></div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
