'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { createPerson, deletePerson, updatePerson, usePeople } from '@/lib/use-people';
import type { PersonDTO } from '@/lib/people';
import { ApiError } from '@/lib/api-client';
import { areaBgClass } from '@/types';
import type { Area } from '@/types';
import { text } from '@/i18n/es';

const t = text.peopleManager;
const fieldClass = 'rounded-lg border border-base-border bg-base-bg px-3 py-1.5 text-sm';

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : t.saveError;
}

function AreaToggles({ areas, value, onChange }: { areas: Area[]; value: string[]; onChange: (ids: string[]) => void }) {
  if (areas.length === 0) return null;
  return (
    <fieldset>
      <legend className="mb-1 text-xs text-base-muted">{t.areasLabel}</legend>
      <div className="flex flex-wrap gap-1.5">
        {areas.map((a) => {
          const on = value.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((id) => id !== a.id) : [...value, a.id])}
              className={clsx(
                'flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-xs',
                on ? 'border-base-text bg-base-border/40 font-medium' : 'border-base-border text-base-muted'
              )}
            >
              <span className={clsx('h-2 w-2 rounded-full', areaBgClass(a.colorIndex))} />
              {a.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PersonRow({ person, areas }: { person: PersonDTO; areas: Area[] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email ?? '');
  const [areaIds, setAreaIds] = useState(person.areas.map((a) => a.id));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return;
    try {
      await updatePerson(person.id, { name: name.trim(), email: email.trim() || null, areaIds });
      setError(null);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove() {
    if (!window.confirm(t.deleteConfirm(person.name))) return;
    try {
      await deletePerson(person.id);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const personAreas = areas.filter((a) => person.areas.some((pa) => pa.id === a.id));

  if (editing) {
    return (
      <li className="space-y-2 rounded-lg border border-base-border px-3 py-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t.namePlaceholder} className={fieldClass} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            aria-label={t.emailPlaceholder}
            className={fieldClass}
          />
        </div>
        <AreaToggles areas={areas} value={areaIds} onChange={setAreaIds} />
        {error ? <p className="text-xs text-priority-high">{error}</p> : null}
        <div className="flex gap-2">
          <button onClick={save} className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white">
            {text.common.save}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setName(person.name);
              setEmail(person.email ?? '');
              setAreaIds(person.areas.map((a) => a.id));
              setError(null);
            }}
            className="rounded-full border border-base-border px-4 py-1.5 text-xs"
          >
            {text.common.cancel}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-base-border px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{person.name}</p>
        {person.email ? <p className="truncate text-xs text-base-muted">{person.email}</p> : null}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-base-muted">
          {personAreas.length === 0
            ? t.noAreas
            : personAreas.map((a) => (
                <span key={a.id} className="flex items-center gap-1">
                  <span className={clsx('h-2 w-2 rounded-full', areaBgClass(a.colorIndex))} />
                  {a.name}
                </span>
              ))}
        </p>
        {error ? <p className="mt-1 text-xs text-priority-high">{error}</p> : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setEditing(true)} className="rounded-full border border-base-border px-3 py-1 text-xs hover:bg-base-border/40">
          {text.common.edit}
        </button>
        <button onClick={remove} className="rounded-full px-3 py-1 text-xs text-priority-high hover:bg-priority-high/10">
          {text.common.delete}
        </button>
      </div>
    </li>
  );
}

export function PeopleManager({ areas }: { areas: Area[] }) {
  const people = usePeople();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createPerson({ name: name.trim(), email: email.trim() || null, areaIds });
      setName('');
      setEmail('');
      setAreaIds([]);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div id="personas" className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="text-sm font-semibold">{t.title}</h3>
      <p className="mb-3 text-xs text-base-muted">{t.subtitle}</p>
      <ul className="space-y-2">
        {people.map((p) => (
          <PersonRow key={`${p.id}-${p.name}-${p.email}-${p.areas.map((a) => a.id).join()}`} person={p} areas={areas} />
        ))}
        {people.length === 0 ? <p className="text-sm text-base-muted">{t.empty}</p> : null}
      </ul>
      <form onSubmit={add} className="mt-3 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} aria-label={t.namePlaceholder} className={fieldClass} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            aria-label={t.emailPlaceholder}
            className={fieldClass}
          />
        </div>
        <AreaToggles areas={areas} value={areaIds} onChange={setAreaIds} />
        {error ? <p className="text-xs text-priority-high">{error}</p> : null}
        <button type="submit" disabled={!name.trim()} className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">
          {t.addButton}
        </button>
      </form>
    </div>
  );
}
