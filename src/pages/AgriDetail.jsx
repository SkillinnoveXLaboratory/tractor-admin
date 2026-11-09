import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction, useApi } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { dateTime, shortId, titleCase } from "../lib/format";
import { Avatar, Badge, Card, DetailList, ErrorState, PageHeader, Spinner } from "../components/ui";
import { HistoryList } from "../components/tables";
import { Gallery } from "./TractorDetail";
import AiCheck from "../components/AiCheck";

export default function AgriDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const action = useAction();
  const query = useApi(`/agri/${id}`);
  const [advice, setAdvice] = useState("");
  const [error, setError] = useState("");
  const c = query.data?.case;
  useEffect(() => { if (c) setAdvice(c.advice || ""); }, [c]);

  if (query.isPending) return <><PageHeader title="Agri Doctor case" crumbs={[{ label: "Agri Doctor", to: "/agri" }]} /><Spinner /></>;
  if (query.isError) return <><PageHeader title="Agri Doctor case" crumbs={[{ label: "Agri Doctor", to: "/agri" }]} /><ErrorState error={query.error} onRetry={() => query.refetch()} /></>;

  const save = async (e) => {
    e.preventDefault();
    const text = advice.trim();
    if (text.length < 10) { setError("Write at least 10 characters of advice."); return; }
    setError("");
    try { await action.mutateAsync({ path: `/agri/${c._id}/advice`, method: "PUT", body: { advice: text }, throwOnly: true }); } catch (err) { setError(err.message); }
  };

  return (
    <>
      <PageHeader
        title={`${titleCase(c.type)} testing ${shortId(c._id)}`}
        crumbs={[{ label: "Agri Doctor", to: "/agri" }, { label: shortId(c._id) }]}
        actions={
          <>
            <button type="button" className="btn-light" onClick={() => navigate(-1)}><i className="fa-solid fa-arrow-left text-[10px]" /> Back</button>
            {c.status === "submitted" && <button type="button" className="btn-primary" onClick={() => action.mutate({ path: `/agri/${c._id}/review` })} disabled={action.isPending}><i className="fa-solid fa-magnifying-glass" /> Start review</button>}
          </>
        }
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <Card title="Photos"><Gallery images={c.images} /></Card>
          <Card title="Farmer">
            <div className="flex items-center gap-3 mb-3">
              <Avatar src={c.farmer?.avatarUrl} name={c.farmer?.fullName} />
              <div>{can("users") ? <Link to={`/users/${c.farmer?._id}`} className="text-xs font-bold text-gray-800 hover:text-blue-600">{c.farmer?.fullName}</Link> : <p className="text-xs font-bold text-gray-800">{c.farmer?.fullName}</p>}<p className="text-[11px] text-gray-400">{c.farmer?.mobile}</p></div>
            </div>
            <DetailList items={[["Location", c.farmer?.location?.address || "—"], ["Submitted", dateTime(c.createdAt)], ["Status", <Badge key="s" status={c.status} />]]} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <Card title="Farmer's question"><p className="text-sm text-gray-700 whitespace-pre-wrap">{c.notes}</p></Card>
          <Card title={c.status === "advised" ? "Advice sent" : "Write advice"}>
            <form onSubmit={save} className="space-y-3">
              <textarea className="input" rows={8} maxLength={3000} value={advice} onChange={(e) => { setAdvice(e.target.value); setError(""); }} placeholder="Diagnosis, what to apply and how much, when to irrigate, when to check again…" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-gray-400">{advice.length}/3000 · the farmer is notified and reads it in Agri Doctor.</span>
                <button type="submit" className="btn-primary" disabled={action.isPending}>{action.isPending && <i className="fa-solid fa-circle-notch fa-spin" />}{c.status === "advised" ? "Update advice" : "Send advice"}</button>
              </div>
              {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
            </form>
            <AiCheck caseId={c._id} current={advice} onUse={(text) => { setAdvice(text); setError(""); }} />
          </Card>
          <Card title="Admin changes"><HistoryList items={query.data.history} /></Card>
        </div>
      </div>
    </>
  );
}
