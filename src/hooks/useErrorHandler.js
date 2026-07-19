import { useCallback } from 'react'
import { useToast } from './useToast.jsx'
import { useAuth } from './useAuth.jsx'
import { getFriendlyErrorMessage, isJwtExpiredError } from '../lib/errorHandler'

/**
 * Returns a stable function that translates an error to Spanish, shows it as
 * a toast, and signs the user out (redirecting to Login) when it's an
 * expired-session error. Every module's catch block should route through
 * this instead of showing err.message directly.
 */
export function useErrorHandler() {
  const { showError } = useToast()
  const { signOut } = useAuth()

  return useCallback(
    (err) => {
      const message = getFriendlyErrorMessage(err)
      showError(message)
      if (isJwtExpiredError(err)) {
        signOut()
      }
      return message
    },
    [showError, signOut]
  )
}
