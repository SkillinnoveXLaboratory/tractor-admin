import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { initials, titleCase } from "../lib/format";

// ---------- Page header with breadcrumbs (template: title left, crumbs right) ----------

export function PageHeader({ title, crumbs = [], actions }) {
  useEffect(() => {
    document.title = `${title} · TractorApp Admin`;
  }, [title]);
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">{title}</h1>
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex items-center space-x-2 flex-wrap">
          <Link to="/" className="hover:text-blue-600">TractorApp</Link>
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center space-x-2">
              <i className="fa-solid fa-chevron-right text-[9px] text-gray-400" />
              {crumb.to ? <Link to={crumb.to} className="hover:text-blue-600">{crumb.label}</Link> : <span className="text-gray-400">{crumb.label}</span>}
            </span>
          ))}
        </nav>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 mt-3">{actions}</div>}
    </div>
  );
}

// ---------- Cards ----------

export function Card({ title, actions, children, className = "", bodyClass = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
          {typeof title === "string" ? <h2 className="card-title">{title}</h2> : title}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, icon, change, hint, tone = "blue", to }) {
  const tones = { blue: "bg-blue-50 text-blue-500", green: "bg-emerald-50 text-emerald-500", amber: "bg-amber-50 text-amber-500", rose: "bg-rose-50 text-rose-500", indigo: "bg-indigo-50 text-indigo-500", teal: "bg-teal-50 text-teal-500" };
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="card-label">{label}</span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base ${tones[tone]}`}><i className={icon} /></div>
      </div>
      <div className="my-3"><h3 className="text-2xl font-bold text-gray-800">{value}</h3></div>
      <div className="text-xs font-medium min-h-[16px]">
        {typeof change === "number" && (
          <span className={`${change < 0 ? "text-red-500" : "text-emerald-500"} font-semibold`}>
            <i className={`fa-solid ${change < 0 ? "fa-arrow-down" : "fa-arrow-up"} text-[10px]`} /> {Math.abs(change).toFixed(2)}%
          </span>
        )}
        {hint && <span className={`text-gray-400 ${typeof change === "number" ? "ml-1" : ""}`}>{hint}</span>}
      </div>
    </>
  );
  const cls = "card flex flex-col justify-between";
  return to ? <Link to={to} className={`${cls} hover:border-blue-200 transition-colors`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function MiniStat({ label, value, icon, tone = "text-gray-400" }) {
  return (
    <div className="min-w-0">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center space-x-1.5 mt-1">
        {icon && <i className={`${icon} ${tone} text-xs`} />}
        <span className="text-base font-bold text-gray-800 truncate">{value}</span>
      </div>
    </div>
  );
}

// ---------- Badges ----------

const STATUS_TONES = {
  active: "emerald", available: "emerald", completed: "emerald", delivered: "emerald", received: "emerald", advised: "emerald",
  pending: "amber", placed: "amber", submitted: "amber", under_review: "indigo", pending_payment: "gray", refunded: "indigo",
  accepted: "blue", confirmed: "blue", assigned: "indigo", on_the_way: "indigo", in_progress: "indigo", packed: "blue", out_for_delivery: "indigo",
  cancelled: "rose", rejected: "rose", suspended: "rose", unavailable: "gray", hidden: "gray",
  super_admin: "indigo", admin: "blue", farmer: "emerald", vendor: "blue", driver: "amber", shopkeeper: "teal",
};
const BADGE_CLASSES = {
  emerald: "text-emerald-600 bg-emerald-50 border-emerald-200/60",
  amber: "text-amber-600 bg-amber-50 border-amber-200/60",
  rose: "text-rose-500 bg-rose-50 border-rose-200/60",
  blue: "text-blue-600 bg-blue-50 border-blue-200/60",
  indigo: "text-indigo-600 bg-indigo-50 border-indigo-200/60",
  teal: "text-teal-600 bg-teal-50 border-teal-200/60",
  gray: "text-gray-500 bg-gray-50 border-gray-200",
};

export function Badge({ children, tone, status }) {
  const resolved = tone || STATUS_TONES[status] || "gray";
  return <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap ${BADGE_CLASSES[resolved]}`}>{children ?? titleCase(status)}</span>;
}

// ---------- Avatar ----------

export function Avatar({ src, name, size = "w-9 h-9" }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) return <img src={src} alt="" onError={() => setBroken(true)} className={`${size} rounded-full object-cover border border-gray-200 flex-shrink-0`} />;
  return <div className={`${size} rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0`}>{initials(name)}</div>;
}

export function Thumb({ src, alt = "", className = "w-10 h-10" }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <div className={`${className} rounded-md bg-gray-100 text-gray-300 flex items-center justify-center flex-shrink-0`}><i className="fa-regular fa-image" /></div>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={`${className} rounded-md object-cover border border-gray-200 flex-shrink-0`} />;
}

// ---------- States ----------

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-gray-400" role="status">
      <i className="fa-solid fa-circle-notch fa-spin mr-2 text-blue-500" /> {label}
    </div>
  );
}

export function EmptyState({ icon = "fa-regular fa-folder-open", title = "Nothing here yet", text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center text-xl mb-3"><i className={icon} /></div>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {text && <p className="text-xs text-gray-400 mt-1 max-w-sm">{text}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center text-xl mb-3"><i className="fa-solid fa-triangle-exclamation" /></div>
      <p className="text-sm font-semibold text-gray-700">{error?.status === 403 ? "You don't have access to this" : "Couldn't load this"}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-sm">{error?.message}</p>
      {onRetry && error?.status !== 403 && <button type="button" onClick={onRetry} className="btn-light mt-4"><i className="fa-solid fa-rotate text-[10px]" /> Try again</button>}
    </div>
  );
}

// Renders loading / error / content for a react-query result.
export function QueryState({ query, children, empty, isEmpty }) {
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (isEmpty && isEmpty(query.data)) return empty || <EmptyState />;
  return children(query.data);
}

// ---------- Table ----------

export function Table({ columns, rows, rowKey = (row) => row._id || row.id, onRowClick, empty }) {
  if (!rows.length) return empty || <EmptyState />;
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="min-w-full">
        <thead className="bg-slate-50/70 border-y border-gray-100">
          <tr>{columns.map((col) => <th key={col.key} className={`th ${col.className || ""}`}>{col.title}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={onRowClick ? "cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none" : ""}
            >
              {columns.map((col) => <td key={col.key} className={`td ${col.className || ""}`}>{col.render ? col.render(row) : row[col.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-1 border-t border-gray-100 text-xs text-gray-500">
      <span>{total} result{total === 1 ? "" : "s"} · page {page} of {pages}</span>
      <div className="flex items-center gap-1">
        <button type="button" className="btn-light px-2.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><i className="fa-solid fa-chevron-left text-[10px]" /></button>
        <button type="button" className="btn-light px-2.5" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><i className="fa-solid fa-chevron-right text-[10px]" /></button>
      </div>
    </div>
  );
}

// ---------- Tabs (template "Today / Monthly / Annual" style) ----------

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex items-center gap-5 overflow-x-auto border-b border-gray-100 mb-4">
      {tabs.map((tab) => (
        <button key={tab.value} type="button" onClick={() => onChange(tab.value)} className={`tab ${value === tab.value ? "tab-active" : ""}`}>
          {tab.label}
          {typeof tab.count === "number" && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${value === tab.value ? "bg-blue-50" : "bg-gray-100"}`}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Form fields ----------

// Use as="div" when the field holds several buttons, so a click on the label can't press one of them.
export function Field({ label, hint, error, children, className = "", as: Tag = "label" }) {
  return (
    <Tag className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
      {error && <span className="block text-[11px] text-rose-500 mt-1">{error}</span>}
    </Tag>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "w-full sm:w-64" }) {
  const [text, setText] = useState(value || "");
  const timer = useRef();
  useEffect(() => setText(value || ""), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={`relative ${className}`}>
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><i className="fa-solid fa-magnifying-glass text-xs" /></span>
      <input
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          clearTimeout(timer.current);
          const next = e.target.value;
          timer.current = setTimeout(() => onChange(next), 350);
        }}
        className="w-full py-1.5 pl-9 pr-3 text-xs bg-slate-50 text-gray-700 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white placeholder-gray-400"
      />
    </div>
  );
}

export function Select({ value, onChange, options, placeholder, className = "" }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={`py-1.5 pl-3 pr-8 text-xs bg-white text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 disabled:opacity-50">
      <span className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-brand-blue" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

// Key/value rows for detail pages.
export function DetailList({ items }) {
  return (
    <dl className="divide-y divide-gray-100">
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label} className="py-2.5 grid grid-cols-3 gap-3 text-xs">
          <dt className="text-gray-400 font-medium">{label}</dt>
          <dd className="col-span-2 text-gray-700 font-medium break-words">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------- Modal ----------

export function Modal({ open, title, onClose, children, footer, size = "max-w-lg" }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Focus moves into the dialog once when it opens and returns to the trigger when it closes.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector("input:not([type=hidden]), textarea, select")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-[#1e1f29]/50" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className={`relative w-full ${size} bg-white rounded-xl shadow-xl border border-gray-100 my-8`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="card-title">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-slate-50/60 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

// A confirm dialog that can require a reason. onConfirm(reason) returns a promise.
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "primary", reason, reasonLabel = "Reason", reasonHint, onConfirm, onClose }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) { setText(""); setError(""); setBusy(false); }
  }, [open]);
  const submit = async (e) => {
    e?.preventDefault();
    if (reason && text.trim().length < 3) { setError("Please give a reason (at least 3 characters)."); return; }
    setBusy(true);
    setError("");
    try {
      await onConfirm(text.trim());
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  const btn = { primary: "btn-primary", danger: "btn-danger", success: "btn-success" }[tone];
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onClose}
      footer={<><button type="button" className="btn-light" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className={btn} onClick={submit} disabled={busy}>{busy && <i className="fa-solid fa-circle-notch fa-spin" />}{confirmLabel}</button></>}
    >
      <form onSubmit={submit} className="space-y-3">
        {message && <p className="text-sm text-gray-600">{message}</p>}
        {reason && (
          <Field label={reasonLabel} hint={reasonHint}>
            <textarea className="input" rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        )}
        {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

// ---------- Toasts ----------

const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-[calc(100%-2rem)] max-w-sm" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${t.tone === "error" ? "bg-rose-500" : "bg-[#1e1f29]"}`}>
            <i className={`fa-solid ${t.tone === "error" ? "fa-circle-exclamation" : "fa-circle-check text-emerald-400"} mt-0.5`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
