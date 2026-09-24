'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { text } from '@/i18n/es';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: Option[];
  selectedIds: string[];
  onToggle: (id: string, selected: boolean) => void;
  placeholder?: string;
  emptyLabel?: string;
  noSelectionLabel?: string;
}

const PANEL_ESTIMATED_HEIGHT = 280; // input + hasta ~7 filas visibles

export function MultiSelectDropdown({
  options,
  selectedIds,
  onToggle,
  placeholder = text.multiSelect.searchPlaceholder,
  emptyLabel = text.multiSelect.noResults,
  noSelectionLabel = text.multiSelect.noSelection,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function toggleOpen() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < PANEL_ESTIMATED_HEIGHT && spaceAbove > spaceBelow);
    }
    setOpen((v) => !v);
  }

  const selected = options.filter((o) => selectedIds.includes(o.id));
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {selected.map((o) => (
          <span key={o.id} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
            {o.label}
            <button type="button" onClick={() => onToggle(o.id, false)} aria-label={text.multiSelect.removeAriaLabel(o.label)} className="hover:opacity-70">
              ✕
            </button>
          </span>
        ))}
        {selected.length === 0 ? <span className="text-xs text-base-muted">{noSelectionLabel}</span> : null}
      </div>

      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-1.5 text-left text-sm text-base-muted hover:border-accent"
      >
        {text.multiSelect.addTrigger}
      </button>

      {open ? (
        <div
          className={clsx(
            'absolute z-20 w-full rounded-lg border border-base-border bg-base-surface shadow-lg',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full border-b border-base-border bg-transparent px-3 py-2 text-sm outline-none"
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-base-muted">{emptyLabel}</p>
            ) : (
              filtered.map((o) => {
                const isSelected = selectedIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onToggle(o.id, !isSelected)}
                    className={clsx(
                      'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-base-border/40',
                      isSelected && 'bg-accent/5 text-accent'
                    )}
                  >
                    <span>
                      {o.label}
                      {o.sublabel ? <span className="ml-1 text-xs text-base-muted">· {o.sublabel}</span> : null}
                    </span>
                    {isSelected ? <span>✓</span> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
