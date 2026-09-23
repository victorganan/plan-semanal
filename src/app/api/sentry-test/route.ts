import { requireUserId, isResponse } from '@/lib/api-auth';

// Ruta temporal para verificar la integración con Sentry. Se elimina tras
// confirmar que los errores llegan correctamente.
export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  throw new Error('Prueba de integración con Sentry (borrar tras verificar)');
}
