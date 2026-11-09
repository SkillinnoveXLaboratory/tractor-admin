import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";

const STEPS = ["Reading the photos…", "Looking for disease, pests and deficiencies…", "Checking the farmer's notes…", "Writing advice…"];

// Clipboard API needs https or localhost; older browsers fall back to a hidden textarea.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

// "Check with AI": asks the server to send the case photos to Gemini and shows the draft, which can be
// translated into the farmer's language and copied. It only fills the advice box when the admin chooses to.
export default function AiCheck({ caseId, current, onUse }) {
  const [state, setState] = useState({ status: "idle" });
  const [seconds, setSeconds] = useState(0);
  const [language, setLanguage] = useState("en");
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState("");
  const [translateError, setTranslateError] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef();
  const languages = useApi("/agri-languages", null, { staleTime: Infinity });
  const running = state.status === "running";
  const shown = language === "en" ? state.advice : translations[language];
  const languageName = (code) => languages.data?.languages.find((l) => l.code === code)?.name || code;

  useEffect(() => {
    if (!running) return undefined;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const check = async () => {
    setState({ status: "running" });
    setTranslations({});
    setLanguage("en");
    setTranslateError("");
    try {
      const data = await api(`/agri/${caseId}/ai-advice`, { method: "POST" });
      setState({ status: "done", advice: data.advice, model: data.model, images: data.images });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  };

  // Each language is translated once per draft and then kept.
  const choose = async (code) => {
    setLanguage(code);
    setTranslateError("");
    if (code === "en" || translations[code]) return;
    setTranslating(code);
    try {
      const data = await api(`/agri/${caseId}/ai-translate`, { method: "POST", body: { text: state.advice, language: code } });
      setTranslations((all) => ({ ...all, [code]: data.text }));
    } catch (err) {
      setTranslateError(err.message);
    } finally {
      setTranslating((busy) => (busy === code ? "" : busy));
    }
  };

  const copy = async () => {
    if (!shown) return;
    const ok = await copyText(shown);
    setCopied(ok ? "ok" : "fail");
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const waiting = translating === language;

  return (
    <div className="pt-4 mt-1 border-t border-dashed border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-700">Not sure? Get a second opinion</p>
          <p className="text-[11px] text-gray-400">AI looks at the photos and notes and drafts advice for you to review.</p>
        </div>
        <button type="button" onClick={check} disabled={running} className={`ai-btn ${running ? "is-running" : ""}`}>
          <i className={`fa-solid ${running ? "fa-circle-notch fa-spin" : "fa-wand-magic-sparkles"}`} />
          {running ? "Checking…" : state.status === "done" ? "Check again" : "Check with AI"}
        </button>
      </div>

      {running && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-4" role="status">
          <div className="flex items-center gap-3">
            <div className="ai-orb"><i className="fa-solid fa-leaf" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-indigo-700">{STEPS[Math.min(Math.floor(seconds / 6), STEPS.length - 1)]}</p>
              <div className="ai-progress mt-2" />
              <p className="text-[11px] text-indigo-400 mt-1.5">{seconds}s · usually under a minute; up to 2–3 minutes when the AI service is busy</p>
            </div>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <p className="mt-3 text-xs text-rose-500 bg-rose-50 border border-rose-200/60 rounded-lg px-3 py-2" role="alert"><i className="fa-solid fa-triangle-exclamation mr-1" />{state.message}</p>
      )}

      {state.status === "done" && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 ai-reveal">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-indigo-100">
            <span className="text-xs font-bold text-indigo-700"><i className="fa-solid fa-wand-magic-sparkles mr-1.5" />AI draft</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-indigo-500">
                <i className="fa-solid fa-language text-sm" />
                <span className="sr-only">Language</span>
                <select
                  value={language}
                  onChange={(e) => choose(e.target.value)}
                  className="py-1 pl-2 pr-7 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {(languages.data?.languages || [{ code: "en", name: "English" }]).map((l) => <option key={l.code} value={l.code}>{l.name}{translations[l.code] ? " ✓" : ""}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={copy}
                disabled={!shown}
                title="Copy"
                aria-label="Copy advice"
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-40 ${copied === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-600" : "border-indigo-200 bg-white text-indigo-500 hover:bg-indigo-50"}`}
              >
                <i className={`fa-${copied === "ok" ? "solid fa-check" : "regular fa-copy"} text-sm`} />
              </button>
            </div>
          </div>

          {waiting ? (
            <div className="px-4 py-6 flex items-center gap-3" role="status">
              <div className="ai-orb w-8 h-8 text-xs"><i className="fa-solid fa-language" /></div>
              <div className="flex-1"><p className="text-xs font-semibold text-indigo-700">Translating into {languageName(language)}…</p><div className="ai-progress mt-2" /></div>
            </div>
          ) : translateError && !shown ? (
            <div className="px-4 py-4 text-xs text-rose-500">
              <i className="fa-solid fa-triangle-exclamation mr-1" />{translateError}
              <button type="button" className="ml-2 text-indigo-600 font-semibold hover:underline" onClick={() => choose(language)}>Try again</button>
            </div>
          ) : (
            <p lang={language} className="px-4 py-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto ai-reveal" key={language}>{shown}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-indigo-100">
            <button type="button" className="btn-primary" disabled={!shown} onClick={() => onUse(shown)}><i className="fa-solid fa-check" /> Use this advice{language !== "en" ? ` (${languageName(language)})` : ""}</button>
            {current.trim() && <button type="button" className="btn-light" disabled={!shown} onClick={() => onUse(`${current.trim()}\n\n${shown}`.slice(0, 3000))}><i className="fa-solid fa-plus" /> Add below mine</button>}
            <button type="button" className="btn-light" disabled={!shown} onClick={copy}><i className={`fa-${copied === "ok" ? "solid fa-check" : "regular fa-copy"}`} /> {copied === "ok" ? "Copied" : copied === "fail" ? "Copy failed" : "Copy"}</button>
            <button type="button" className="btn-light" onClick={() => setState({ status: "idle" })}>Discard</button>
            <span className="text-[11px] text-amber-600 ml-auto"><i className="fa-solid fa-circle-info mr-1" />AI can be wrong. Check doses before sending.</span>
          </div>
        </div>
      )}
    </div>
  );
}
