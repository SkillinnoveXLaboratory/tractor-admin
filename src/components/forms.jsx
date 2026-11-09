import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "../lib/hooks";
import { titleCase } from "../lib/format";
import { Field } from "./ui";

// Searchable picker for app users of one role (vendor, shopkeeper, driver…).
export function UserPicker({ role, vendor, value, onChange, placeholder = "Search by name, email or mobile", label, error, initialLabel = "" }) {
  const [text, setText] = useState(initialLabel);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const timer = useRef();
  const query = useApi("/lookup/users", { role, vendor, q }, { enabled: open, staleTime: 30000 });
  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { document.removeEventListener("mousedown", close); clearTimeout(timer.current); };
  }, []);
  useEffect(() => { if (!value) setText(initialLabel); }, [value, initialLabel]);
  return (
    <Field as="div" label={label} error={error}>
      <div className="relative" ref={box}>
        <input
          className="input pr-8"
          value={text}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (value) onChange("", null);
            clearTimeout(timer.current);
            const next = e.target.value;
            timer.current = setTimeout(() => setQ(next), 250);
          }}
        />
        <i className={`fa-solid ${value ? "fa-circle-check text-emerald-500" : "fa-chevron-down text-gray-300"} absolute right-3 top-1/2 -translate-y-1/2 text-xs`} />
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {query.isPending && <p className="px-3 py-2 text-xs text-gray-400">Searching…</p>}
            {query.data?.users?.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No {role ? `${role}s` : "users"} found.</p>}
            {query.data?.users?.map((u) => (
              <button
                key={u._id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs"
                onClick={() => { onChange(u._id, u); setText(u.fullName); setOpen(false); }}
              >
                <span className="font-semibold text-gray-700">{u.fullName}</span>
                <span className="text-gray-400"> · {u.email}{!role ? ` · ${titleCase(u.role)}` : ""}{u.status === "suspended" ? " · suspended" : ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

// Latitude / longitude / address with a "use my location" helper for the admin's browser.
export function LocationFields({ value, onChange, required }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locate = () => {
    if (!navigator.geolocation) { setError("This browser can't share its location."); return; }
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { onChange({ ...value, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }); setBusy(false); },
      () => { setError("Location permission was denied."); setBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const mapUrl = value.latitude && value.longitude ? `https://www.google.com/maps?q=${encodeURIComponent(`${value.latitude},${value.longitude}`)}` : null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Latitude${required ? "" : " (optional)"}`}><input className="input" inputMode="decimal" value={value.latitude ?? ""} onChange={(e) => onChange({ ...value, latitude: e.target.value })} placeholder="22.5726" /></Field>
        <Field label={`Longitude${required ? "" : " (optional)"}`}><input className="input" inputMode="decimal" value={value.longitude ?? ""} onChange={(e) => onChange({ ...value, longitude: e.target.value })} placeholder="88.3639" /></Field>
      </div>
      <Field label="Address / place name"><input className="input" maxLength={200} value={value.address ?? ""} onChange={(e) => onChange({ ...value, address: e.target.value })} placeholder="Village, district" /></Field>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className="btn-light" onClick={locate} disabled={busy}><i className={`fa-solid ${busy ? "fa-circle-notch fa-spin" : "fa-location-crosshairs"}`} /> Use my current location</button>
        {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline"><i className="fa-solid fa-map-location-dot" /> Check on map</a>}
        {error && <span className="text-rose-500">{error}</span>}
      </div>
    </div>
  );
}

// Existing image URLs (removable) plus new files (max 6 total, JPG/PNG/WEBP up to 5 MB).
export function ImagesField({ existing = [], onExistingChange, files, onFilesChange, max = 6, error }) {
  const input = useRef(null);
  const [problem, setProblem] = useState("");
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);
  const add = (list) => {
    const picked = [...list];
    const bad = picked.find((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 5 * 1024 * 1024);
    if (bad) { setProblem(`${bad.name}: use JPG, PNG or WEBP up to 5 MB.`); return; }
    if (existing.length + files.length + picked.length > max) { setProblem(`Up to ${max} images.`); return; }
    setProblem("");
    onFilesChange([...files, ...picked]);
  };
  return (
    <Field as="div" label={`Photos (${existing.length + files.length}/${max})`} error={problem || error}>
      <div className="flex flex-wrap gap-2">
        {existing.map((url) => (
          <div key={url} className="relative w-20 h-20">
            <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
            <button type="button" onClick={() => onExistingChange(existing.filter((u) => u !== url))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px]" aria-label="Remove photo"><i className="fa-solid fa-xmark" /></button>
          </div>
        ))}
        {previews.map((p) => (
          <div key={p.url} className="relative w-20 h-20">
            <img src={p.url} alt="" className="w-20 h-20 rounded-lg object-cover border border-blue-200" />
            <button type="button" onClick={() => onFilesChange(files.filter((f) => f !== p.file))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px]" aria-label="Remove photo"><i className="fa-solid fa-xmark" /></button>
          </div>
        ))}
        {existing.length + files.length < max && (
          <button type="button" onClick={() => input.current?.click()} className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 flex flex-col items-center justify-center text-[11px]">
            <i className="fa-solid fa-plus mb-1" /> Add
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    </Field>
  );
}
