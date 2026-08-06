import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { API_BASE, parseApiError } from '../../../../lib/api'

interface Category {
  id: number
  name: string
  slug: string
  parentId?: number | null
}

const linkButtonStyle: React.CSSProperties = {
  marginLeft: '0.5rem',
  padding: '0.35rem 0.75rem',
  border: '1px solid rgba(0, 0, 0, 0.15)',
  borderRadius: '4px',
  textDecoration: 'none',
  color: 'inherit',
  backgroundColor: 'transparent',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const EditCategoryPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategory = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/catalog/categories/${id}`)
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to load'))
      }
      const data = (await res.json()) as Category
      setCategory(data)
      setName(data.name)
      setSlug(data.slug)
      setParentId(data.parentId?.toString() || '')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategory()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const body: any = { name, slug }
      if (parentId) body.parentId = parseInt(parentId, 10)
      else body.parentId = null
      const res = await fetch(`${API_BASE}/admin/catalog/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Update failed'))
      }
      navigate('/admin/catalog/categories')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Edit Category</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {category && (
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              Name:{' '}
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          </div>
          <div>
            <label>
              Slug:{' '}
              <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </label>
          </div>
          <div>
            <label>
              Parent ID (optional):{' '}
              <input
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                type="number"
                min="1"
              />
            </label>
          </div>
          <div>
            <button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update'}
            </button>{' '}
            <Link
              to="/admin/catalog/categories"
              style={
                loading
                  ? { ...linkButtonStyle, pointerEvents: 'none', opacity: 0.6, cursor: 'not-allowed' }
                  : linkButtonStyle
              }
              aria-disabled={loading}
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

export default EditCategoryPage
