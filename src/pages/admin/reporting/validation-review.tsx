import { useEffect, useMemo, useState, type CSSProperties } from 'react'

type ValidationEvidence = {
  id: string
  category: string
  description: string
  result: 'PASS' | 'FAIL' | 'PENDING' | string
  artifactUrl?: string
}

type TestResult = {
  id: string
  name: string
  outcome: string
  details: string
}

type ValidationReview = {
  finalStatus: string
  residualRiskNotes: string
  lastReviewedAt: string
  reviewer: string
  evidence: ValidationEvidence[]
  testResults: TestResult[]
  canUpdate: boolean
}

const pageWrapperStyle: CSSProperties = {
  padding: '2rem',
  maxWidth: '960px',
  margin: '0 auto',
}

const sectionCardStyle: CSSProperties = {
  padding: '1.25rem',
  borderRadius: '0.75rem',
  border: '1px solid #e0e0e0',
  backgroundColor: '#fff',
  boxShadow: '0 1px 3px rgba(15, 15, 15, 0.08)',
}

const evidenceGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '0.75rem',
  marginTop: '1rem',
}

const evidenceCardStyle: CSSProperties = {
  padding: '0.85rem',
  borderRadius: '0.65rem',
  border: '1px solid #d1d5db',
  backgroundColor: '#f9fafb',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
}

const statusBadgeStyle: CSSProperties = {
  padding: '0.25rem 0.65rem',
  borderRadius: '999px',
  backgroundColor: '#e0f2fe',
  color: '#0c4a6e',
  fontWeight: 600,
  fontSize: '0.85rem',
}

const inputFieldStyle: CSSProperties = {
  width: '100%',
  marginTop: '0.25rem',
  padding: '0.55rem',
  borderRadius: '0.5rem',
  border: '1px solid #d1d5db',
  fontFamily: 'inherit',
  fontSize: '1rem',
}

const statusOptions = [
  { value: 'PENDING', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REQUIRES_REMEDIATION', label: 'Requires remediation' },
]

const ValidationReviewPage = () => {
  const [review, setReview] = useState<ValidationReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState(statusOptions[0].value)
  const [notesDraft, setNotesDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadReview = async () => {
      try {
        const response = await fetch('/api/reporting/validation-review')
        if (!response.ok) {
          throw new Error('Unable to load validation review.')
        }
        const data: ValidationReview = await response.json()
        if (!isMounted) return
        setReview(data)
        setStatusDraft(data.finalStatus)
        setNotesDraft(data.residualRiskNotes)
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Something went wrong.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadReview()

    return () => {
      isMounted = false
    }
  }, [])

  const formattedReviewDate = useMemo(() => {
    if (!review?.lastReviewedAt) return null
    return new Date(review.lastReviewedAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }, [review])

  const statusLabel = useMemo(() => {
    return statusOptions.find((option) => option.value === review?.finalStatus)?.label ?? 'Pending review'
  }, [review])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!review) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const response = await fetch('/api/reporting/validation-review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalStatus: statusDraft,
          residualRiskNotes: notesDraft,
        }),
      })
      if (!response.ok) {
        throw new Error('Unable to save validation review.')
      }
      const updated = (await response.json()) as ValidationReview
      setReview(updated)
      setStatusDraft(updated.finalStatus)
      setNotesDraft(updated.residualRiskNotes)
      setSaveSuccess('Validation review saved successfully.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save validation review.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={pageWrapperStyle}>
      <header>
        <p style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: '#4b5563' }}>
          Admin reporting
        </p>
        <h1 style={{ margin: '0.25rem 0 0.5rem', fontSize: '2rem', lineHeight: 1.2 }}>Validation review</h1>
        <p style={{ color: '#4b5563', marginBottom: '1rem', maxWidth: '640px' }}>
          Record the supporting validation evidence, the outcome of automated tests, and the residual risk acknowledgments.
        </p>
      </header>

      {loading && (
        <div style={{ padding: '1rem 0', color: '#2563eb', fontWeight: 600 }}>Loading validation review…</div>
      )}

      {error && !loading && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            backgroundColor: '#fff1f2',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {review && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <section style={sectionCardStyle}>
            <div style={{ marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>Current validation status</h2>
              <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>
                {review.reviewer} · {formattedReviewDate ?? 'No review timestamp available'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
              <span style={statusBadgeStyle}>{statusLabel}</span>
              <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Final status</span>
            </div>
            <div>
              <h3 style={{ margin: '0', fontSize: '0.95rem', color: '#6b7280' }}>Residual risk notes</h3>
              <p style={{ margin: '0.35rem 0 0', color: '#374151' }}>
                {review.residualRiskNotes || 'No residual risk notes recorded yet.'}
              </p>
            </div>
          </section>

          <section style={sectionCardStyle}>
            <h2 style={{ marginTop: 0 }}>Validation evidence</h2>
            {review.evidence.length ? (
              <div style={evidenceGridStyle}>
                {review.evidence.map((item) => (
                  <article key={item.id} style={evidenceCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{item.category}</strong>
                      <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{item.result}</span>
                    </div>
                    <p style={{ margin: 0, color: '#374151' }}>{item.description}</p>
                    {item.artifactUrl && (
                      <a
                        href={item.artifactUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontSize: '0.85rem' }}
                      >
                        View artifact
                      </a>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#6b7280' }}>No evidence logged for this review.</p>
            )}
          </section>

          <section style={sectionCardStyle}>
            <h2 style={{ marginTop: 0 }}>Automated test results</h2>
            {review.testResults.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '0.75rem' }}>
                {review.testResults.map((test) => (
                  <div
                    key={test.id}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '0.65rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#111827' }}>{test.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{test.outcome}</span>
                    </div>
                    <p style={{ margin: '0.3rem 0 0', color: '#374151' }}>{test.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#6b7280' }}>No tests recorded yet.</p>
            )}
          </section>

          <section style={sectionCardStyle}>
            <h2 style={{ marginTop: 0 }}>Final status review</h2>
            {review.canUpdate ? (
              <form onSubmit={handleSave}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor="final-status" style={{ fontWeight: 600, color: '#374151' }}>
                    Final status
                    <select
                      id="final-status"
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value)}
                      style={inputFieldStyle}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor="residual-risk-note" style={{ fontWeight: 600, color: '#374151' }}>
                    Residual risk note
                    <textarea
                      id="residual-risk-note"
                      value={notesDraft}
                      onChange={(event) => setNotesDraft(event.target.value)}
                      style={{ ...inputFieldStyle, minHeight: '120px' }}
                    />
                  </label>
                </div>
                {saveError && <p style={{ color: '#b91c1c', margin: '0 0 0.5rem' }}>{saveError}</p>}
                {saveSuccess && <p style={{ color: '#047857', margin: '0 0 0.5rem' }}>{saveSuccess}</p>}
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Save review'}
                </button>
              </form>
            ) : (
              <p style={{ color: '#6b7280' }}>
                Final status cannot be edited. Contact the system owner if additional information is required.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default ValidationReviewPage
