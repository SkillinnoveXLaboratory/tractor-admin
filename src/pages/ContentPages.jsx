import { useEffect, useState } from "react";
import { useAction, useApi, useUrlState } from "../lib/hooks";
import { dateTime } from "../lib/format";
import { Card, EmptyState, ErrorState, Field, PageHeader, Spinner, Tabs } from "../components/ui";

function Editor({ page }) {
  const action = useAction();
  const [title, setTitle] = useState(page.title);
  const [sections, setSections] = useState(page.sections.map(({ heading, body }) => ({ heading, body })));
  const [error, setError] = useState("");
  useEffect(() => {
    setTitle(page.title);
    setSections(page.sections.map(({ heading, body }) => ({ heading, body })));
    setError("");
  }, [page]);
  const dirty = title !== page.title || JSON.stringify(sections) !== JSON.stringify(page.sections.map(({ heading, body }) => ({ heading, body })));
  const update = (i, patch) => setSections(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i, dir) => {
    const next = [...sections];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setSections(next);
  };
  const save = async () => {
    if (title.trim().length < 2) { setError("Enter a title."); return; }
    if (!sections.length || sections.some((s) => !s.heading.trim() || !s.body.trim())) { setError("Every section needs a heading and text."); return; }
    setError("");
    try { await action.mutateAsync({ path: `/pages/${page.key}`, method: "PUT", body: { title: title.trim(), sections }, throwOnly: true }); } catch (err) { setError(err.message); }
  };
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-7 space-y-4">
        <Card title="Edit" actions={<span className="text-[11px] text-gray-400">Last saved {dateTime(page.updatedAt)}</span>}>
          <div className="space-y-4">
            <Field label="Page title"><input className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            {sections.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400 w-5">{i + 1}</span>
                  <input className="input" maxLength={120} value={s.heading} onChange={(e) => update(i, { heading: e.target.value })} placeholder="Heading" />
                  <button type="button" className="btn-light px-2" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><i className="fa-solid fa-arrow-up" /></button>
                  <button type="button" className="btn-light px-2" disabled={i === sections.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><i className="fa-solid fa-arrow-down" /></button>
                  <button type="button" className="btn-light px-2" onClick={() => setSections(sections.filter((_, j) => j !== i))} aria-label="Remove section"><i className="fa-solid fa-trash text-rose-400" /></button>
                </div>
                <textarea className="input" rows={4} maxLength={3000} value={s.body} onChange={(e) => update(i, { body: e.target.value })} placeholder="Text" />
              </div>
            ))}
            <button type="button" className="btn-light" onClick={() => setSections([...sections, { heading: "", body: "" }])} disabled={sections.length >= 30}><i className="fa-solid fa-plus" /> Add section</button>
            {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-light" disabled={!dirty} onClick={() => { setTitle(page.title); setSections(page.sections.map(({ heading, body }) => ({ heading, body }))); }}>Discard changes</button>
              <button type="button" className="btn-primary" disabled={!dirty || action.isPending} onClick={save}>{action.isPending && <i className="fa-solid fa-circle-notch fa-spin" />} Publish to app</button>
            </div>
          </div>
        </Card>
      </div>
      <div className="col-span-12 xl:col-span-5">
        <Card title="Preview (as in the app)">
          <div className="max-w-sm mx-auto rounded-2xl border border-gray-200 p-4 bg-[#f6f8f5]">
            <h3 className="text-base font-bold text-gray-800 mb-3">{title || "Untitled"}</h3>
            <div className="space-y-3">
              {sections.map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-sm font-bold text-gray-800">{s.heading || "Heading"}</p>
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{s.body || "Text"}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ContentPages() {
  const [state, update] = useUrlState({ key: "" });
  const query = useApi("/pages");
  const pages = query.data?.pages || [];
  const current = pages.find((p) => p.key === state.key) || pages[0];
  return (
    <>
      <PageHeader title="Content pages" crumbs={[{ label: "Business" }, { label: "Content pages" }]} />
      {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : !current ? <Card><EmptyState title="No pages" /></Card> : (
        <>
          <Tabs value={current.key} onChange={(key) => update({ key })} tabs={pages.map((p) => ({ value: p.key, label: p.title }))} />
          <Editor page={current} />
        </>
      )}
    </>
  );
}
