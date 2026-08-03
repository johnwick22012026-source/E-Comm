import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import QuantitySelector from '../components/QuantitySelector'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

type CategoryInfo = { id: number; name: string; slug: string }
type PricingInfo = {
  price: number
  currency: string
  listPrice: number
  salePrice: number | null
}

type AvailabilityInfo = {
  isAvailable: boolean
  availabilityUpdatedAt?: string | null
  inventoryStatus: string
  availableQuantity: number
}

type RatingInfo = {
  average: number
  count: number
}

type Specification = {
  id: number
  label: string
  value: string
  groupName?: string | null
}

type ImageInfo = {
  id: number
  url: string
  altText?: string | null
}

type RelatedProduct = {
  id: number
  name: string
  slug: string
  price: number
  currency: string
  primaryImageUrl: string | null
}

type ProductDetail = {
  id: number
  name: string
  description?: string | null
  brand?: string | null
  category: CategoryInfo | null
  subcategory: CategoryInfo | null
  pricing: PricingInfo
  availability: AvailabilityInfo
  ratings: RatingInfo
  specifications: Specification[]
  images: ImageInfo[]
  relatedProducts: RelatedProduct[]
}

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(value)
  } catch (error) {
    return `${currency} ${value.toFixed(2)}`
  }
}

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reloadProduct = useCallback(async () => {
    if (!productId) {
      setProduct(null)
      setLoading(false)
      setError('Product not found.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/catalog/products/${productId}`)
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.message ?? 'Failed to fetch product details.')
      }
      const data: ProductDetail = await response.json()
      setProduct(data)
      setSelectedImageIndex(0)
      const available = Math.max(0, data.availability.availableQuantity ?? 0)
      setQuantity(available > 0 ? 1 : 0)
      setQuantityError(null)
    } catch (err) {
      setProduct(null)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading the product.')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    reloadProduct()
  }, [reloadProduct])

  const maxAvailable = useMemo(() => {
    if (!product) {
      return 0
    }
    return Math.max(0, product.availability.availableQuantity ?? 0)
  }, [product])

  const isSoldOut = useMemo(() => {
    if (!product) {
      return true
    }
    return maxAvailable <= 0 || !product.availability.isAvailable
  }, [maxAvailable, product])

  const handleQuantityChange = (value: number) => {
    setFeedback(null)
    const minimum = maxAvailable > 0 ? 1 : 0
    const normalized = Math.max(minimum, Number.isFinite(value) ? Math.round(value) : minimum)
    if (maxAvailable > 0 && normalized > maxAvailable) {
      setQuantityError(`Only ${maxAvailable} item${maxAvailable === 1 ? '' : 's'} left in stock.`)
      setQuantity(maxAvailable)
      return
    }
    setQuantityError(null)
    setQuantity(normalized)
  }

  const handleAddToCart = async () => {
    if (!product || isSoldOut || quantity < 1) {
      return
    }

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(`${API_BASE}/cart/items`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: product.id, quantity }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const message = body?.message ?? 'Unable to add item to your cart right now.'
        setFeedback({ type: 'error', message })
        if (message.toLowerCase().includes('stock')) {
          setQuantityError(message)
        }
        return
      }
      setFeedback({ type: 'success', message: 'Item added to cart.' })
      await reloadProduct()
    } catch (err) {
      setFeedback({ type: 'error', message: 'Unable to reach the cart service. Please try again soon.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="product-detail-state">Loading product details…</p>
  }

  if (error) {
    return <p className="product-detail-state error">{error}</p>
  }

  if (!product) {
    return <p className="product-detail-state">Product not found.</p>
  }

  const mainImage = product.images[selectedImageIndex] || product.images[0]
  const inventoryText = product.availability.inventoryStatus

  return (
    <section className="product-detail-page">
      <div className="product-detail-gallery">
        {mainImage && (
          <img
            src={mainImage.url}
            alt={mainImage.altText || product.name}
            className="product-detail-main-image"
          />
        )}
        <div className="product-detail-thumbnails">
          {product.images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              className={idx === selectedImageIndex ? 'active' : ''}
              onClick={() => setSelectedImageIndex(idx)}
            >
              <img src={img.url} alt={img.altText || product.name} />
            </button>
          ))}
        </div>
      </div>
      <div className="product-detail-info">
        <h1>{product.name}</h1>
        {product.brand && <p className="brand">Brand: {product.brand}</p>}
        <p className="category-path">
          {product.category && <Link to={`/catalog?category=${product.category.slug}`}>{product.category.name}</Link>}
          {product.subcategory && (
            <>
              {' '}›{' '}
              <Link
                to={`/catalog?category=${product.category?.slug ?? ''}&subcategory=${product.subcategory.slug}`}
              >
                {product.subcategory.name}
              </Link>
            </>
          )}
        </p>
        <p className="price">
          {product.pricing.salePrice != null ? (
            <>
              <span className="list-price">{formatCurrency(product.pricing.listPrice, product.pricing.currency)}</span>{' '}
              <span className="sale-price">{formatCurrency(product.pricing.salePrice, product.pricing.currency)}</span>
            </>
          ) : (
            <span>{formatCurrency(product.pricing.price, product.pricing.currency)}</span>
          )}
        </p>
        <p className={`availability ${inventoryText === 'IN_STOCK' ? 'in-stock' : 'out-of-stock'}`}>
          Availability: {product.availability.isAvailable ? 'In stock' : 'Out of stock'} ({inventoryText})
        </p>
        <p className="product-stock">
          {maxAvailable > 0 ? `${maxAvailable} available for immediate fulfillment` : 'Availability pending update'}
        </p>
        <QuantitySelector
          label="Quantity"
          value={quantity}
          min={maxAvailable > 0 ? 1 : 0}
          max={maxAvailable > 0 ? maxAvailable : 0}
          onChange={handleQuantityChange}
          disabled={isSoldOut}
          error={quantityError}
        />
        <button
          className="primary"
          type="button"
          onClick={handleAddToCart}
          disabled={isSoldOut || submitting || Boolean(quantityError) || quantity < 1}
        >
          {submitting ? 'Adding to cart…' : 'Add to cart'}
        </button>
        {feedback && (
          <p className={`status ${feedback.type === 'success' ? 'status--success' : 'status--error'}`}>
            {feedback.message}
          </p>
        )}
        <p className="ratings">{product.ratings.count} reviews • {Array.from({ length: 5 }, (_, index) => (
          <span key={index}>{index < Math.round(product.ratings.average) ? '★' : '☆'}</span>
        ))}</p>
        {product.description && <p className="description">{product.description}</p>}

        {product.specifications.length > 0 && (
          <div className="product-detail-specs">
            <h2>Specifications</h2>
            <dl>
              {product.specifications.map((spec) => (
                <div key={spec.id} className="spec-row">
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {product.relatedProducts.length > 0 && (
          <div className="product-detail-related">
            <h2>Related products</h2>
            <div className="related-grid">
              {product.relatedProducts.map((rp) => (
                <Link key={rp.id} to={`/products/${rp.id}`} className="related-card">
                  {rp.primaryImageUrl && <img src={rp.primaryImageUrl} alt={rp.name} />}
                  <p className="related-name">{rp.name}</p>
                  <p className="related-price">{formatCurrency(rp.price, rp.currency)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ProductDetailPage
