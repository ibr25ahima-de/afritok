import { LIVE_LAYOUTS, type LiveLayoutId } from "./live-layouts";

type LiveLayoutSelectorProps = {
  value: LiveLayoutId;
  onChange: (value: LiveLayoutId) => void;
};

export function LiveLayoutSelector({ value, onChange }: LiveLayoutSelectorProps) {
  return (
    <section aria-labelledby="live-layout-title" className="mt-5">
      <h2 id="live-layout-title" className="text-sm font-semibold mb-3">Présentation du Live</h2>
      <div className="grid grid-cols-2 gap-3">
        {LIVE_LAYOUTS.map((layout) => {
          const selected = value === layout.id;
          return (
            <button
              key={layout.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(layout.id)}
              className={`rounded-2xl border p-3 text-left transition active:scale-[.98] ${selected ? "border-red-400 bg-red-500/15" : "border-white/10 bg-gray-950"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">{layout.icon}</span>
                <span className="font-bold text-sm">{layout.label}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{layout.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
