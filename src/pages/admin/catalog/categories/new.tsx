import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, parseApiError } from '../../../../lib/api'

const NewCategoryPage: React.FC = () => {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: any = { name, slug }
      if (parentId) body.parentId = parseInt(parentId, 10)
      const res = await fetch(`${API_BASE}/admin/catalog/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Creation failed'))
      }
      router.push('/admin/catalog/categories')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>New Category</h1>
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
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>{' '}
          <button type="button" onClick={() => router.back()} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewCategoryPage
