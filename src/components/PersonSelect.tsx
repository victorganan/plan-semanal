'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { createPerson, usePeople } from '@/lib/use-people';
import { splitPeopleByArea } from '@/lib/people';
import { ApiError } from '@/lib/api-client';
import { text } from '@/i18n/es';

const ADD = '__add__';

// Desplegable de persona para delegar / "En espera". Muestra primero a
// quien colabora en el área de la tarea y permite añadir a alguien nuevo
// sin salir de aquí (se le asigna el área de la tarea).
export function PersonSelect({
  value,
  onChange,
  areaId,
  emptyLabel,
  ariaLabel,
  className,
  excludeIds,
}: {
  value: string;
  onChange: (name: string) => void;
  areaId?: string | null;
  emptyLabel: string;
  ariaLabel?: string;
  className?: string;
  excludeIds?: string[]; // personas que no deben ofrecerse (p.ej. las que ya están en el área)
}) {
  const allPeople = usePeople();
  const people = excludeIds?.length ? allPeople.filter((p) => !excludeIds.includes(p.id)) : allPeople;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { inArea, others } = splitPeopleByArea(people, areaId);
  const current = value.trim();
  const known = !current || people.some((p) => p.name === current);
  const fieldClass = clsx('w-full rounded-lg border border-base-border bg-base-bg', className ?? 'px-2 py-1.5 text-sm');

  async function add() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const person = await createPerson({ name: n, areaIds: areaId ? [areaId] : [] });
      onChange(person.name);
      setAdding(false);
      setName('');
      setError(null);
    } catch (err) {
      // Ya existe (409): se elige la que ya hay en vez de duplicarla.
      const existing = allPeople.find((p) => p.name.toLowerCase() === n.toLowerCase());
      if (err instanceof ApiError && err.status === 409 && existing) {
        onChange(existing.name);
        setAdding(false);
        setName('');
        setError(null);
      } else {
        setError(err instanceof ApiError ? err.message : text.personSelect.addError);
      }
    } finally {
      setBusy(false);
    }
  }

  if (adding) {
    return (
      <div className="space-y-1">
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setAdding(false);
              }
            }}
            placeholder={text.personSelect.newNamePlaceholder}
            aria-label={text.personSelect.newNamePlaceholder}
            className={clsx(fieldClass, 'min-w-0 flex-1')}
          />
          <button
            type="button"
            onClick={add}
            disabled={!name.trim() || busy}
            className="shrink-0 rounded-full bg-accent px-3 text-xs font-medium text-white disabled:opacity-40"
          >
            {text.personSelect.addButton}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
            className="shrink-0 rounded-full border border-base-border px-3 text-xs"
          >
            {text.common.cancel}
          </button>
        </div>
        {error ? <p className="text-xs text-priority-high">{error}</p> : null}
      </div>
    );
  }

  const option = (n: string) => (
    <option key={n} value={n}>
      {n}
    </option>
  );

  return (
    <select
      value={current}
      aria-label={ariaLabel}
      onChange={(e) => {
        if (e.target.value === ADD) setAdding(true);
        else onChange(e.target.value);
      }}
      className={fieldClass}
    >
      <option value="">{emptyLabel}</option>
      {!known ? <option value={current}>{text.personSelect.notInList(current)}</option> : null}
      {inArea.length > 0 ? (
        <>
          <optgroup label={text.personSelect.groupArea}>{inArea.map((p) => option(p.name))}</optgroup>
          <optgroup label={text.personSelect.groupOthers}>{others.map((p) => option(p.name))}</optgroup>
        </>
      ) : (
        others.map((p) => option(p.name))
      )}
      <option value={ADD}>{text.personSelect.addOption}</option>
    </select>
  );
}
