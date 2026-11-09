import { useNavigate } from "react-router-dom";
import { useApi, useUrlState } from "../lib/hooks";
import { ago, titleCase } from "../lib/format";
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Select, Spinner, Table, Tabs, Thumb } from "../components/ui";

const DEFAULTS = { status: "submitted", type: "", q: "" };

export default function Agri() {
  const navigate = useNavigate();
  const [state, update] = useUrlState(DEFAULTS);
  const query = useApi("/agri", { ...state, status: state.status === "all" ? "" : state.status, limit: 20 }, { keepPrevious: true });
  const counts = query.data?.statusCounts || {};
  return (
    <>
      <PageHeader title="Agri Doctor" crumbs={[{ label: "Operations" }, { label: "Agri Doctor" }]} />
      <Card>
        <Tabs
          value={state.status}
          onChange={(status) => update({ status })}
          tabs={[
            { value: "submitted", label: "New", count: query.data ? counts.submitted || 0 : undefined },
            { value: "under_review", label: "Under review", count: query.data ? counts.under_review || 0 : undefined },
            { value: "advised", label: "Advised", count: query.data ? counts.advised || 0 : undefined },
            { value: "all", label: "All" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchInput value={state.q} onChange={(q) => update({ q })} placeholder="Search notes or advice" />
          <Select value={state.type} onChange={(type) => update({ type })} placeholder="Crop and soil" options={[{ value: "crop", label: "Crop testing" }, { value: "soil", label: "Soil testing" }]} />
        </div>
        {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : (
          <>
            <Table
              rows={query.data.items}
              onRowClick={(c) => navigate(`/agri/${c._id}`)}
              columns={[
                { key: "c", title: "Case", render: (c) => <div className="flex items-center gap-3 min-w-[220px]"><Thumb src={c.images?.[0]} /><div className="min-w-0"><p className="font-bold text-gray-800">{titleCase(c.type)} testing <span className="text-gray-400 font-normal">· {c.images?.length} photo{c.images?.length === 1 ? "" : "s"}</span></p><p className="text-[11px] text-gray-400 truncate max-w-[300px]">{c.notes}</p></div></div> },
                { key: "f", title: "Farmer", render: (c) => <div className="flex items-center gap-2"><Avatar src={c.farmer?.avatarUrl} name={c.farmer?.fullName} size="w-7 h-7" /><span>{c.farmer?.fullName}</span></div> },
                { key: "loc", title: "Location", className: "hidden lg:table-cell", render: (c) => c.farmer?.location?.address || "—" },
                { key: "w", title: "Submitted", render: (c) => ago(c.createdAt) },
                { key: "s", title: "Status", render: (c) => <Badge status={c.status} /> },
              ]}
              empty={<EmptyState icon="fa-solid fa-seedling" title={state.status === "submitted" ? "No new cases" : "No cases"} text="Farmers' crop and soil questions appear here." />}
            />
            <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
    </>
  );
}
