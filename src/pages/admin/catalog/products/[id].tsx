import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_BASE, parseApiError } from '../../../../lib/api'

interface ProductImage {
  id: number
  url: string
  altText?: string
  isPrimary: boolean
}

interface Product {
  id: number
  name: string
  slug: string
  price: number
  categoryId?: number | null
  stockQuantity: number
  availableQuantity: number
  reservedQuantity: number
  isActive: boolean
  isAvailable: boolean
  images: ProductImage[]
}

const EditProductPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [price, setPrice] = useState('0')
  const [categoryId, setCategoryId] = useState('')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [availableQuantity, setAvailableQuantity] = useState('0')
  const [reservedQuantity, setReservedQuantity] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [images, setImages] = useState<ProductImage[]>([])

  const fetchProduct = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/catalog/products/${id}`)
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to load product'))
      }
      const data = (await res.json()) as Product
      setProduct(data)
      setName(data.name)
      setSlug(data.slug)
      setPrice(data.price.toString())
      setCategoryId(data.categoryId?.toString() || '')
      setStockQuantity(data.stockQuantity.toString())
      setAvailableQuantity(data.availableQuantity.toString())
      setReservedQuantity(data.reservedQuantity.toString())
      setIsActive(data.isActive)
      setIsAvailable(data.isAvailable)
      setImages(data.images || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [id])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: any = {
        name,
        slug,
        price: parseFloat(price),
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        stockQuantity: parseInt(stockQuantity, 10),
        availableQuantity: parseInt(availableQuantity, 10),
        reservedQuantity: parseInt(reservedQuantity, 10),
        isActive,
        isAvailable,
      }
      const res = await fetch(`${API_BASE}/admin/catalog/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Update failed'))
      }
      fetchProduct()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageAdd = async () => {
    if (!id) return
    const url = prompt('Enter image URL')
    if (!url) return
    try {
      const res = await fetch(`${API_BASE}/admin/catalog/products/${id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Image upload failed'))
      }
      const img = (await res.json()) as ProductImage
      setImages((prev) => [...prev, img])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleImageRemove = async (imageId: number) => {
    if (!id) return
    if (!confirm('Remove this image?')) return
    try {
      const res = await fetch(`${API_BASE}/admin/catalog/products/${id}/images/${imageId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Remove failed'))
      }
      setImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div>
      <h1>Edit Product</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {product && (
        <form onSubmit={handleUpdate}>
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
          <div>
            <button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update'}
            </button>{' '}
            <button type="button" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {product && (
        <div style={{ marginTop: '20px' }}>
          <h2>Images</h2>
          <button onClick={handleImageAdd}>Add Image</button>
          {images.length === 0 && <p>No images</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {images.map((img) => (
              <div key={img.id} style={{ border: '1px solid #ccc', padding: '4px' }}>
                <img src={img.url} alt={img.altText || ''} width={100} height={100} />
                <div>
                  <small>{img.isPrimary ? 'Primary' : ''}</small>
                </div>
                <button onClick={() => handleImageRemove(img.id)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default EditProductPage
