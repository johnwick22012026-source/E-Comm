import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

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
  inventoryStatus: string
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

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    if (!productId) {
      setLoading(false)
      setError('Product not found.')
      setProduct(null)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`${API_BASE}/catalog/products/${productId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.message || 'Failed to fetch product details.')
        }
        return res.json()
      })
      .then((data: ProductDetail) => {
        setProduct(data)
        setSelectedImageIndex(0)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
        setProduct(null)
      })
      .finally(() => setLoading(false))
  }, [productId])

  const renderStars = (avg: number) => {
    const fullStars = Math.floor(avg)
    const half = avg - fullStars >= 0.5
    const stars: string[] = []
    for (let i = 0; i < fullStars; i++) stars.push('★')
    if (half) stars.push('☆')
    while (stars.length < 5) stars.push('☆')
    return stars.join('')
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

  const {
    name,
    description,
    brand,
    category,
    subcategory,
    pricing,
    availability,
    ratings,
    specifications,
    images,
    relatedProducts,
  } = product

  const mainImage = images[selectedImageIndex] || images[0]

  return (
    <section className="product-detail-page">
      <div className="product-detail-gallery">
        {mainImage && (
          <img
            src={mainImage.url}
            alt={mainImage.altText || name}
            className="product-detail-main-image"
          />
        )}
        <div className="product-detail-thumbnails">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              className={idx === selectedImageIndex ? 'active' : ''}
              onClick={() => setSelectedImageIndex(idx)}
            >
              <img src={img.url} alt={img.altText || name} />
            </button>
          ))}
        </div>
      </div>
      <div className="product-detail-info">
        <h1>{name}</h1>
        {brand && <p className="brand">Brand: {brand}</p>}
        <p className="category-path">
          {category && <Link to={`/catalog?category=${category.slug}`}>{category.name}</Link>}
          {subcategory && (
            <>
              {' '}›{' '}
              <Link to={`/catalog?category=${category.slug}&subcategory=${subcategory.slug}`}>{subcategory.name}</Link>
            </>
          )}
        </p>
        <p className="price">
          {pricing.salePrice != null
            ? <><span className="list-price">{pricing.currency} {pricing.listPrice.toFixed(2)}</span> <span className="sale-price">{pricing.currency} {pricing.salePrice.toFixed(2)}</span></>
            : <span>{pricing.currency} {pricing.price.toFixed(2)}</span>
          }
        </p>
        <p className={`availability ${availability.isAvailable ? 'in-stock' : 'out-of-stock'}`}>Availability: {availability.isAvailable ? 'In stock' : 'Out of stock'}</p>
        <p className="ratings">{renderStars(ratings.average)} ({ratings.count} reviews)</p>
        {description && <p className="description">{description}</p>}

        {specifications.length > 0 && (
          <div className="product-detail-specs">
            <h2>Specifications</h2>
            <dl>
              {specifications.map((spec) => (
                <div key={spec.id} className="spec-row">
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {relatedProducts.length > 0 && (
          <div className="product-detail-related">
            <h2>Related products</h2>
            <div className="related-grid">
              {relatedProducts.map((rp) => (
                <Link key={rp.id} to={`/products/${rp.id}`} className="related-card">
                  {rp.primaryImageUrl && <img src={rp.primaryImageUrl} alt={rp.name} />}
                  <p className="related-name">{rp.name}</p>
                  <p className="related-price">{rp.currency} {rp.price.toFixed(2)}</p>
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
