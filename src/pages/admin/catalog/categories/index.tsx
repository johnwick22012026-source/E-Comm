import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, parseApiError } from '../../../../lib/api'

interface Category {
  id: number
  name: string
  slug: string
  parentId?: number | null
}

const CategoriesPage: React.FC = () => {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/catalog/categories`)
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to load categories'))
      }
      const data = (await res.json()) as Category[]
      setCategories(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      const res = await fetch(`${API_BASE}/admin/catalog/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Delete failed'))
      }
      fetchCategories()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div>
      <h1>Categories</h1>
      <button onClick={() => router.push('/admin/catalog/categories/new')}>New Category</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          {categories.length === 0 ? (
            <p>No categories found.</p>
          ) : (
            <table border={1} cellPadding={4} cellSpacing={0}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Parent ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.id}</td>
                    <td>{cat.name}</td>
                    <td>{cat.slug}</td>
                    <td>{cat.parentId ?? '-'}</td>
                    <td>
                      <button onClick={() => router.push(`/admin/catalog/categories/${cat.id}`)}>
                        Edit
                      </button>{' '}
                      <button onClick={() => handleDelete(cat.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

export default CategoriesPage
