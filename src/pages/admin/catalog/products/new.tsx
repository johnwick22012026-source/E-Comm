import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, parseApiError } from '../../../../lib/api'

const NewProductPage: React.FC = () => {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [price, setPrice] = useState('0')
  const [categoryId, setCategoryId] = useState('')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [availableQuantity, setAvailableQuantity] = useState('0')
  const [reservedQuantity, setReservedQuantity] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: any = {
        name,
        slug,
        price: parseFloat(price),
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        stockQuantity: parseInt(stockQuantity, 10),
        availableQuantity: parseInt(availableQuantity, 10),
        reservedQuantity: parseInt(reservedQuantity, 10),
        isActive,
        isAvailable,
      }
      const res = await fetch(`${API_BASE}/admin/catalog/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Creation failed'))
      }
      router.push('/admin/catalog/products')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>New Product</h1>
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
            Price:{' '}
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Category ID (optional):{' '}
            <input
              type="number"
              min="1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Stock Qty:{' '}
            <input
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Available Qty:{' '}
            <input
              type="number"
              min="0"
              value={availableQuantity}
              onChange={(e) => setAvailableQuantity(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Reserved Qty:{' '}
            <input
              type="number"
              min="0"
              value={reservedQuantity}
              onChange={(e) => setReservedQuantity(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Active:{' '}
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </label>
        </div>
        <div>
          <label>
            Available:{' '}
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
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

export default NewProductPage
