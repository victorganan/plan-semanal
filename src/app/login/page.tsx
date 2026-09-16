import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/hoy');

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-card border border-base-border bg-base-surface p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Plan Semanal</h1>
        <p className="mt-2 text-sm text-base-muted">
          Tu planificación semanal: hoy, la semana, proyectos y hábitos en un solo sitio.
        </p>
        <form
          className="mt-8"
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/hoy' });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-base-border bg-base-bg px-4 py-2.5 text-sm font-medium transition hover:bg-base-border/40"
          >
            <GoogleIcon />
            Entrar con Google
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.79 2.73v2.27h2.9c1.7-1.57 2.69-3.88 2.69-6.64z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.9-2.27c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34C2.44 15.98 5.48 18 9 18z"
      />
      <path fill="#FBBC05" d="M3.95 10.71A5.4 5.4 0 013.68 9c0-.6.1-1.18.27-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l2.99-2.33z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
