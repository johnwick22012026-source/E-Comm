import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, parseApiError } from '../../../../lib/api'

interface Product {
  id: number
  name: string
  slug: string
  price: number
  isActive: boolean
  isAvailable: boolean
}

const ProductsPage: React.FC = () => {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/catalog/products`)
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to load products'))
      }
      const data = (await res.json()) as Product[]
      setProducts(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      const res = await fetch(`${API_BASE}/admin/catalog/products/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Delete failed'))
      }
      fetchProducts()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div>
      <h1>Products</h1>
      <button onClick={() => router.push('/admin/catalog/products/new')}>New Product</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          {products.length === 0 ? (
            <p>No products found.</p>
          ) : (
            <table border={1} cellPadding={4} cellSpacing={0}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Price</th>
                  <th>Active</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.slug}</td>
                    <td>{p.price}</td>
                    <td>{p.isActive ? 'Yes' : 'No'}</td>
                    <td>{p.isAvailable ? 'Yes' : 'No'}</td>
                    <td>
                      <button onClick={() => router.push(`/admin/catalog/products/${p.id}`)}>
                        Edit
                      </button>{' '}
                      <button onClick={() => handleDelete(p.id)}>Delete</button>
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

export default ProductsPage
