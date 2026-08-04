import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE, parseApiError } from '../../lib/api'

type Preference = {
  id: number
  channel: string
  preference: string
  enabled: boolean
}

type Feedback = {
  message: string
  type: 'success' | 'error'
}

const CommunicationPreferencesSection = () => {
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const loadPreferences = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/customer-profile/preferences`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to load communication preferences.')
        throw new Error(message)
      }
      const data = await response.json()
      setPreferences(Array.isArray(data.preferences) ? data.preferences : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const handleToggle = async (pref: Preference, value: boolean) => {
    setTogglingId(pref.id)
    setFeedback(null)
    try {
      const response = await fetch(`${API_BASE}/customer-profile/preferences`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: [
            {
              channel: pref.channel,
              preference: pref.preference,
              enabled: value,
            },
          ],
        }),
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to update preference.')
        throw new Error(message)
      }
      const updated = await response.json()
      setPreferences(Array.isArray(updated.preferences) ? updated.preferences : preferences)
      setFeedback({ message: 'Preferences saved.', type: 'success' })
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Failed to update preference.',
        type: 'error',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const sections = useMemo(() => {
    const grouped: Record<string, Preference[]> = {}
    preferences.forEach((pref) => {
      grouped[pref.channel] = grouped[pref.channel] ?? []
      grouped[pref.channel].push(pref)
    })
    return grouped
  }, [preferences])

  return (
    <section className="account-section" aria-live="polite">
      <header className="account-section-header">
        <div>
          <p className="catalog-tag">Communication</p>
          <h2>Notification preferences</h2>
          <p className="muted">Control which channels you hear from us through.</p>
        </div>
      </header>
      <div className="account-section-body">
        {loading ? (
          <p className="muted">Loading preferences…</p>
        ) : error ? (
          <p className="status status--error">{error}</p>
        ) : (
          <div className="pref-board">
            {Object.entries(sections).map(([channel, prefs]) => (
              <div key={channel} className="pref-group">
                <h3 className="section-subtitle">{channel}</h3>
                {prefs.map((pref) => (
                  <article key={pref.id} className="pref-row">
                    <div>
                      <strong>{pref.preference}</strong>
                      <p className="muted">Opt-in to {pref.preference.toLowerCase()} updates.</p>
                    </div>
                    <button
                      type="button"
                      className={`pref-toggle ${pref.enabled ? 'is-on' : ''}`}
                      aria-pressed={pref.enabled}
                      onClick={() => handleToggle(pref, !pref.enabled)}
                      disabled={togglingId === pref.id}
                    >
                      {togglingId === pref.id ? 'Saving…' : pref.enabled ? 'On' : 'Off'}
                    </button>
                  </article>
                ))}
              </div>
            ))}
          </div>
        )}
        {feedback && (
          <p className={`status ${feedback.type === 'success' ? 'status--success' : 'status--error'}`}>
            {feedback.message}
          </p>
        )}
      </div>
    </section>
  )
}

export default CommunicationPreferencesSection
