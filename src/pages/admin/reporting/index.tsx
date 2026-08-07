import { useEffect, useMemo, useState, type CSSProperties } from 'react'

type ArchitectureSummary = {
  overview: string
  infrastructure: string[]
  keyDecisions: string[]
}

type ReviewedScope = {
  domains: string[]
  timeframe: string
  focusAreas: string[]
}

type FindingsApplicabilityNote = {
  area: string
  applicability: string
  rootCause: string
  fixApplied: string
  filesChanged: string[]
}

type FindingsApplicability = {
  summary: string
  applicabilityNotes: FindingsApplicabilityNote[]
}

type FinalAuditReport = {
  architectureSummary: ArchitectureSummary
  reviewedScope: ReviewedScope
  findingsApplicability: FindingsApplicability
}

const reportSectionGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1rem',
  marginTop: '1.5rem',
}

const sectionCardStyle: CSSProperties = {
  padding: '1.25rem',
  borderRadius: '0.75rem',
  border: '1px solid #e0e0e0',
  backgroundColor: '#fff',
  boxShadow: '0 1px 3px rgba(15, 15, 15, 0.08)',
}

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  padding: '0.3rem 0.75rem',
  borderRadius: '999px',
  backgroundColor: '#f3f4f6',
  fontSize: '0.85rem',
  margin: '0.25rem',
}

const fileListContainerStyle: CSSProperties = {
  marginTop: '0.35rem',
  padding: '0.75rem',
  borderRadius: '0.65rem',
  border: '1px dashed #d1d5db',
  backgroundColor: '#f9fafb',
  maxHeight: '160px',
  overflowY: 'auto',
}

const fileChipStyle: CSSProperties = {
  padding: '0.35rem 0.65rem',
  borderRadius: '0.45rem',
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  fontSize: '0.8rem',
  color: '#1f2937',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  marginBottom: '0.25rem',
}

const FinalAuditReportPage = () => {
  const [report, setReport] = useState<FinalAuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadReport = async () => {
      try {
        const response = await fetch('/api/reporting/final-audit-report')
        if (!response.ok) {
          throw new Error('Unable to load the final audit report.')
        }
        const data: FinalAuditReport = await response.json()
        if (isMounted) {
          setReport(data)
        }
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

    loadReport()

    return () => {
      isMounted = false
    }
  }, [])

  const renderedFocus = useMemo(() => report?.reviewedScope.focusAreas ?? [], [report])

  return (
    <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <header>
        <p style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: '#4b5563' }}>
          Admin reporting
        </p>
        <h1 style={{ margin: '0.25rem 0 0.5rem', fontSize: '2rem', lineHeight: 1.2 }}>
          Final Audit Report
        </h1>
        <p style={{ color: '#4b5563', marginBottom: '1rem', maxWidth: '640px' }}>
          A concise, maintainable overview of the recent audit findings and the system areas they apply to.
        </p>
      </header>

      {loading && (
        <div style={{ padding: '1rem 0', color: '#2563eb', fontWeight: 600 }}>Loading audit report…</div>
      )}

      {error && !loading && (
        <div role="alert" style={{ padding: '1rem', border: '1px solid #fecaca', borderRadius: '0.5rem', backgroundColor: '#fff1f2', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {report && (
        <div style={reportSectionGridStyle}>
          <section style={sectionCardStyle}>
            <h2 style={{ marginTop: 0 }}>Architecture Summary</h2>
            <p style={{ color: '#374151' }}>{report.architectureSummary.overview}</p>
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: '#6b7280' }}>Infrastructure highlights</h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, color: '#374151' }}>
                {report.architectureSummary.infrastructure.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: '#6b7280' }}>Key decisions</h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, color: '#374151' }}>
                {report.architectureSummary.keyDecisions.map((decision) => (
                  <li key={decision}>{decision}</li>
                ))}
              </ul>
            </div>
          </section>

          <section style={sectionCardStyle}>
            <h2 style={{ marginTop: 0 }}>Scope of Review</h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: '#6b7280' }}>Domains assessed</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {report.reviewedScope.domains.map((domain) => (
                  <span key={domain} style={chipStyle}>
                    {domain}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: '#6b7280' }}>Timeframe</h3>
              <p style={{ margin: 0, color: '#374151' }}>{report.reviewedScope.timeframe}</p>
            </div>
            <div>
              <h3 style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: '#6b7280' }}>Primary focus</h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, color: '#374151' }}>
                {renderedFocus.map((focus) => (
                  <li key={focus}>{focus}</li>
                ))}
              </ul>
            </div>
          </section>

          <section style={sectionCardStyle}>
            <h2 style={{ marginTop: 0 }}>Findings Applicability</h2>
            <p style={{ color: '#374151' }}>{report.findingsApplicability.summary}</p>
            <div style={{ marginTop: '1rem' }}>
              {report.findingsApplicability.applicabilityNotes.map((note) => (
                <div key={note.area} style={{ marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#111827' }}>{note.area}</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#374151' }}>{note.applicability}</p>
                  <div style={{ marginTop: '0.35rem', color: '#1f2937' }}>
                    <p style={{ margin: '0.2rem 0' }}>
                      <strong>Root cause:</strong> {note.rootCause}
                    </p>
                    <p style={{ margin: '0.2rem 0' }}>
                      <strong>Fix applied:</strong> {note.fixApplied}
                    </p>
                  </div>
                  <div style={fileListContainerStyle}>
                    <p style={{ margin: '0 0 0.35rem', fontSize: '0.8rem', color: '#6b7280' }}>Files changed</p>
                    {note.filesChanged.length ? (
                      note.filesChanged.map((path) => (
                        <div key={path} style={fileChipStyle} title={path}>
                          {path}
                        </div>
                      ))
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>No files recorded for this finding.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default FinalAuditReportPage
