const JWT_EXPIRED_RE = /jwt expired|invalid jwt|jwt.*expired/i
const NETWORK_RE = /failed to fetch|network ?error|load failed/i

export function isJwtExpiredError(err) {
  const message = err?.message ?? ''
  return err?.code === 'PGRST301' || JWT_EXPIRED_RE.test(message)
}

/**
 * Translates raw Supabase/Postgrest/network errors into plain Spanish
 * messages suitable for non-technical field users.
 */
export function getFriendlyErrorMessage(err) {
  const message = err?.message ?? ''
  const status = err?.status ?? err?.statusCode

  if (isJwtExpiredError(err)) {
    return 'Tu sesión venció. Por favor vuelve a iniciar sesión.'
  }
  if (err?.name === 'AbortError' || NETWORK_RE.test(message)) {
    return 'Sin conexión. Verifica tu internet e intenta de nuevo.'
  }
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    err?.code === '42501' ||
    /\b(400|401|403)\b/.test(message) ||
    /permission denied|row-level security/i.test(message)
  ) {
    return 'No tienes permiso para realizar esta acción.'
  }
  if (status === 404 || err?.code === 'PGRST116' || /\b404\b/.test(message) || /not found/i.test(message)) {
    return 'No se encontró la información. Intenta recargar la página.'
  }
  if (status === 500 || /\b500\b/.test(message) || /internal server error/i.test(message)) {
    return 'Ocurrió un error en el servidor. Intenta de nuevo en unos minutos.'
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}
