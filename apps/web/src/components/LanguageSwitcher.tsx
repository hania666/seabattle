import { useEffect, useRef, useState } from "react";
import { LANGS, getLang, setLang, useLang, type Lang } from "../lib/i18n";

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGS.find((l) => l.code === (lang ?? getLang())) ?? LANGS[0];

  function pick(next: Lang) {
    setLang(next);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-sea-900/60 px-3 py-1.5 text-sm text-sea-100 ring-1 ring-sea-700/60 hover:bg-sea-800/80"
      >
        <span aria-hidden>{current.flag}</span>
        <span className="hidden font-semibold uppercase tracking-wider sm:inline">
          {current.code}
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-sea-700/70 bg-sea-900/95 shadow-arcade backdrop-blur"
        >
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(l.code)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition ${
                    active
                      ? "bg-sea-700/60 text-sea-50"
                      : "text-sea-200 hover:bg-sea-800/60 hover:text-sea-100"
                  }`}
                >
                  <span aria-hidden className="text-base">
                    {l.flag}
                  </span>
                  <span className="flex-1 text-left">{l.label}</span>
                  <span className="font-mono text-[10px] uppercase text-sea-400">{l.code}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
