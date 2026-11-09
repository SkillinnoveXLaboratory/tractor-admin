import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi, useUrlState } from "../lib/hooks";
import { downloadCsv } from "../lib/api";
import { date, titleCase } from "../lib/format";
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Select, Spinner, Table, Tabs, useToast } from "../components/ui";
import UserForm from "./UserForm";

const DEFAULTS = { role: "", status: "", q: "", sort: "newest" };
const SORTS = [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "name", label: "Name A–Z" }, { value: "role", label: "Role" }];

export default function Users() {
  const navigate = useNavigate();
  const toast = useToast();
  const [state, update] = useUrlState(DEFAULTS);
  const [creating, setCreating] = useState(false);
  const meta = useApi("/meta", null, { staleTime: Infinity });
  const query = useApi("/users", { ...state, limit: 20 }, { keepPrevious: true });
  const roles = meta.data?.roles || [];
  const counts = query.data?.roleCounts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  const exportCsv = async () => {
    try { await downloadCsv("/export/users.csv", { role: state.role, status: state.status, q: state.q }, "users.csv"); } catch (err) { toast(err.message, "error"); }
  };

  const columns = [
    { key: "name", title: "User", render: (u) => <div className="flex items-center gap-3 min-w-[200px]"><Avatar src={u.avatarUrl} name={u.fullName} /><div className="min-w-0"><p className="font-bold text-gray-800 truncate">{u.fullName}</p><p className="text-[11px] text-gray-400 truncate">{u.email}</p></div></div> },
    { key: "role", title: "Role", render: (u) => <Badge status={u.role} /> },
    { key: "mobile", title: "Mobile", render: (u) => u.mobile },
    { key: "vendor", title: "Vendor", className: "hidden lg:table-cell", render: (u) => u.createdByVendor?.fullName || "—" },
    { key: "location", title: "Location", className: "hidden xl:table-cell", render: (u) => <span className="truncate block max-w-[180px]">{u.location?.address || (u.location?.latitude ? `${u.location.latitude.toFixed(3)}, ${u.location.longitude.toFixed(3)}` : "—")}</span> },
    { key: "status", title: "Status", render: (u) => <Badge status={u.status} /> },
    { key: "joined", title: "Joined", className: "hidden md:table-cell", render: (u) => date(u.createdAt) },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        crumbs={[{ label: "Operations" }, { label: "Users" }]}
        actions={<><button type="button" className="btn-primary" onClick={() => setCreating(true)}><i className="fa-solid fa-user-plus" /> New account</button><button type="button" className="btn-light" onClick={exportCsv}><i className="fa-solid fa-arrow-up-from-bracket text-[10px]" /> Export CSV</button></>}
      />
      <Card>
        <Tabs
          value={state.role}
          onChange={(role) => update({ role })}
          tabs={[{ value: "", label: "All", count: query.data ? all : undefined }, ...roles.map((r) => ({ value: r, label: `${titleCase(r)}s`, count: query.data ? counts[r] || 0 : undefined }))]}
        />
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Name, email or mobile" />
          <Select value={state.status} onChange={(status) => update({ status })} placeholder="Any status" options={[{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }]} />
          <Select value={state.sort} onChange={(sort) => update({ sort })} options={SORTS} />
          {query.isFetching && !query.isPending && <i className="fa-solid fa-circle-notch fa-spin text-blue-500 text-xs" />}
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <Table columns={columns} rows={query.data.items} onRowClick={(u) => navigate(`/users/${u._id}`)} empty={<EmptyState icon="fa-solid fa-users" title="No users match" text="Try another role, status or search." />} />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
      <UserForm open={creating} onClose={() => setCreating(false)} roles={roles.length ? roles : undefined} />
    </>
  );
}
