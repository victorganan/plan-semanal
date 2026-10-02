'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { api } from '@/lib/api-client';
import type { PersonDTO } from '@/lib/people';

// Lista de Personas compartida por todos los desplegables de la página:
// se pide una vez y se actualiza al añadir/editar desde cualquier sitio.
let people: PersonDTO[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: PersonDTO[]) {
  people = [...next].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  listeners.forEach((l) => l());
}

export function reloadPeople() {
  loading = api
    .get('/api/people')
    .then((list: PersonDTO[]) => {
      loaded = true;
      emit(list);
    })
    .catch(() => {
      loading = null;
    });
  return loading;
}

export async function createPerson(data: { name: string; email?: string | null; areaIds?: string[] }): Promise<PersonDTO> {
  const person: PersonDTO = await api.post('/api/people', data);
  emit([...people, person]);
  return person;
}

export async function updatePerson(id: string, data: { name?: string; email?: string | null; areaIds?: string[] }) {
  const person: PersonDTO = await api.patch(`/api/people/${id}`, data);
  emit(people.map((p) => (p.id === id ? person : p)));
  return person;
}

export async function deletePerson(id: string) {
  await api.delete(`/api/people/${id}`);
  emit(people.filter((p) => p.id !== id));
}

export function usePeople(): PersonDTO[] {
  useEffect(() => {
    if (!loaded && !loading) reloadPeople();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => people,
    () => people
  );
}
