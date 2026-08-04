export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export async function parseApiError(response: Response, fallback: string) {
  try {
    const body = await response.json()
    if (body && typeof body === 'object' && 'message' in body) {
      return (body as { message?: string }).message ?? fallback
    }
  } catch (_error) {
    // Ignore parsing failures
  }
  return fallback
}
