import Link from 'next/link';

export default function HerramientasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Herramientas</h1>
        <p className="text-sm text-base-muted">
          Aplicaciones complementarias de ayuda a la productividad.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/herramientas/matriz"
          className="block rounded-card border border-base-border bg-base-surface p-5 transition hover:border-accent"
        >
          <h2 className="text-lg font-semibold">🎯 Matriz de Eisenhower</h2>
          <p className="mt-1 text-sm text-base-muted">
            Clasifica tus tareas pendientes de la semana por urgencia e importancia.
          </p>
        </Link>

        <Link
          href="/herramientas/pomodoro"
          className="block rounded-card border border-base-border bg-base-surface p-5 transition hover:border-accent"
        >
          <h2 className="text-lg font-semibold">🍅 Temporizador Pomodoro</h2>
          <p className="mt-1 text-sm text-base-muted">
            Bloques de enfoque de 25 minutos con descansos, vinculados a tus tareas de hoy.
          </p>
        </Link>
      </div>
    </div>
  );
}
