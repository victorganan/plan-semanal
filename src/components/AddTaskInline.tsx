'use client';

import { useState } from 'react';

export function AddTaskInline({ onAdd, placeholder }: { onAdd: (text: string) => Promise<void>; placeholder: string }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    await onAdd(value.trim());
    setValue('');
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <span className="text-base-muted">+</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-base-muted"
      />
    </form>
  );
}
