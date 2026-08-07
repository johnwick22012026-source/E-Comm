export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

const getFirstErrorMessage = (body: any): string | null => {
  if (!body || typeof body !== 'object') {
    return null
  }
  if (typeof body.message === 'string' && body.message.trim().length > 0) {
    return body.message
  }
  if (typeof body.error === 'string' && body.error.trim().length > 0) {
    return body.error
  }
  if (Array.isArray(body.errors)) {
    for (const error of body.errors) {
      if (typeof error === 'string' && error.trim().length > 0) {
        return error
      }
      if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim().length > 0) {
        return error.message
      }
    }
  }
  return null
}

export async function parseApiError(response: Response, fallback: string) {
  try {
    const body = await response.clone().json()
    const message = getFirstErrorMessage(body)
    if (message) {
      return message
    }
  } catch (_error) {
    // Ignore parsing failures
  }
  try {
    const text = await response.clone().text()
    if (text) {
      return text
    }
  } catch (_error) {
    // Ignore fallback text parsing failures
  }
  return fallback
}
