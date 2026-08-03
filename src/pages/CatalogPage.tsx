import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'
const DEFAULT_SORT = 'popularity'
const DEFAULT_PER_PAGE = 20
const SORT_OPTIONS = [
  { value: 'popularity', label: 'Most popular' },
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
]
const PER_PAGE_OPTIONS = [12, 20, 40]

type CatalogProduct = {
  id: number
  name: string
  slug: string
  description?: string | null
  brand?: string | null
  price: number
  currency: string
  stockQuantity: number
  isAvailable: boolean
  category: { id: number; name: string; slug: string } | null
  subcategory: { id: number; name: string; slug: string } | null
}

type CatalogMetadata = {
  totalCount?: number
  page?: number
  perPage?: number
  hasNextPage: boolean
  nextCursor?: number | null
  sort?: string
}

type CatalogResponse = {
  items: CatalogProduct[]
  metadata: CatalogMetadata
}

type CategoryNavigationItem = {
  slug: string
  name: string
  subcategories: Array<{ slug: string; name: string }>
}

type CatalogCategoriesResponse = {
  categories: CategoryNavigationItem[]
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

const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [catalogData, setCatalogData] = useState<CatalogResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<CategoryNavigationItem[]>([])

  const category = searchParams.get('category') ?? ''
  const subcategory = searchParams.get('subcategory') ?? ''
  const searchValue = searchParams.get('search') ?? ''
  const brand = searchParams.get('brand') ?? ''
  const minPrice = searchParams.get('minPrice') ?? ''
  const maxPrice = searchParams.get('maxPrice') ?? ''
  const available = searchParams.get('available') ?? ''
  const sort = searchParams.get('sort') ?? DEFAULT_SORT

  const parsedPage = Number.parseInt(searchParams.get('page') ?? '', 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const parsedPerPage = Number.parseInt(searchParams.get('perPage') ?? '', 10)
  const perPage = Number.isFinite(parsedPerPage) && parsedPerPage > 0 ? parsedPerPage : DEFAULT_PER_PAGE

  const [draftSearch, setDraftSearch] = useState(searchValue)
  const [draftBrand, setDraftBrand] = useState(brand)
  const [draftMinPrice, setDraftMinPrice] = useState(minPrice)
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice)
  const [availableOnly, setAvailableOnly] = useState(available === 'true')

  useEffect(() => {
    setDraftSearch(searchValue)
  }, [searchValue])

  useEffect(() => {
    setDraftBrand(brand)
  }, [brand])

  useEffect(() => {
    setDraftMinPrice(minPrice)
  }, [minPrice])

  useEffect(() => {
    setDraftMaxPrice(maxPrice)
  }, [maxPrice])

  useEffect(() => {
    setAvailableOnly(available === 'true')
  }, [available])

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (subcategory) query.set('subcategory', subcategory)
    if (searchValue) query.set('search', searchValue)
    if (brand) query.set('brand', brand)
    if (minPrice) query.set('minPrice', minPrice)
    if (maxPrice) query.set('maxPrice', maxPrice)
    if (available) query.set('available', available)
    if (sort) query.set('sort', sort)
    if (page) query.set('page', String(page))
    if (perPage) query.set('perPage', String(perPage))

    const url = `${API_BASE}/catalog?${query.toString()}`

    setLoading(true)
    setError(null)

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.message ?? 'Unable to load catalog data.')
        }
        return response.json()
      })
      .then((data: CatalogResponse) => {
        setCatalogData(data)
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return
        }
        setError(err instanceof Error ? err.message : 'Something went wrong while fetching data.')
        setCatalogData(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [category, subcategory, searchValue, brand, minPrice, maxPrice, available, sort, page, perPage])

  useEffect(() => {
    const controller = new AbortController()
    const url = `${API_BASE}/catalog/categories`

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.message ?? 'Unable to load categories.')
        }
        return response.json()
      })
      .then((data: CatalogCategoriesResponse) => {
        setAllCategories(data.categories ?? [])
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return
        }
        setAllCategories([])
      })

    return () => controller.abort()
  }, [])

  const updateParams = (updates: Record<string, string | undefined>) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        nextParams.delete(key)
      } else {
        nextParams.set(key, value)
      }
    })
    setSearchParams(nextParams)
  }

  const handleFiltersSubmit = (event: FormEvent) => {
    event.preventDefault()
    updateParams({
      search: draftSearch.trim() || undefined,
      brand: draftBrand.trim() || undefined,
      minPrice: draftMinPrice.trim() || undefined,
      maxPrice: draftMaxPrice.trim() || undefined,
      available: availableOnly ? 'true' : undefined,
      page: '1',
    })
  }

  const handleSortChange = (value: string) => {
    updateParams({ sort: value || undefined, page: '1' })
  }

  const handlePerPageChange = (value: number) => {
    updateParams({ perPage: String(value), page: '1' })
  }

  const handleCategorySelect = (slug: string) => {
    updateParams({ category: slug || undefined, subcategory: undefined, page: '1' })
  }

  const handleSubcategorySelect = (slug: string) => {
    updateParams({ subcategory: slug || undefined, page: '1' })
  }

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) })
  }

  const handleClearFilters = () => {
    setDraftSearch('')
    setDraftBrand('')
    setDraftMinPrice('')
    setDraftMaxPrice('')
    setAvailableOnly(false)
    updateParams({
      search: undefined,
      brand: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      available: undefined,
      sort: undefined,
      page: '1',
    })
  }

  const derivedFromPage: CategoryNavigationItem[] = useMemo(() => {
    if (!catalogData?.items) {
      return []
    }
    const map = new Map<string, CategoryNavigationItem>()
    catalogData.items.forEach((product) => {
      const categoryData = product.category
      if (!categoryData) {
        return
      }
      const entry = map.get(categoryData.slug) ?? {
        slug: categoryData.slug,
        name: categoryData.name,
        subcategories: [],
      }
      if (
        product.subcategory &&
        !entry.subcategories.some((sub) => sub.slug === product.subcategory!.slug)
      ) {
        entry.subcategories.push({ slug: product.subcategory.slug, name: product.subcategory.name })
      }
      map.set(categoryData.slug, entry)
    })
    return Array.from(map.values())
  }, [catalogData])

  const derivedCategories = allCategories.length > 0 ? allCategories : derivedFromPage
  const selectedCategory = derivedCategories.find((entry) => entry.slug === category)
  const subcategories = selectedCategory?.subcategories ?? []

  const metadata = catalogData?.metadata
  const totalCount = metadata?.totalCount ?? 0
  const totalPages = metadata?.perPage ? Math.ceil(totalCount / metadata.perPage) : 1
  const hasFilters = Boolean(
    searchValue || brand || minPrice || maxPrice || available === 'true' || sort !== DEFAULT_SORT,
  )

  const showEmptyState = !loading && !error && catalogData && catalogData.items.length === 0

  return (
    <section className="catalog-shell">
      <header className="catalog-header">
        <div>
          <p className="catalog-tag">Browse the catalog</p>
          <h1>Find the right products for your needs</h1>
          <p className="catalog-subtitle">
            Explore categories, refine with filters, and keep your search in sync with the URL so you can share
            what you discover.
          </p>
          {!!totalCount && (
            <p className="catalog-subtitle">
              Showing page {page} of {totalPages}, {totalCount.toLocaleString()} results available.
            </p>
          )}
        </div>
        <div className="catalog-header-actions">
          <label>
            Sort by
            <select value={sort} onChange={(event) => handleSortChange(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Per page
            <select
              value={perPage}
              onChange={(event) =>
                handlePerPageChange(Number.parseInt(event.target.value, 10) || DEFAULT_PER_PAGE)
              }
            >
              {PER_PAGE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <div className="catalog-sidebar-section">
            <h2>Categories</h2>
            <div className="catalog-pill-group" role="group" aria-label="Category navigation">
              <button
                type="button"
                className={`catalog-pill ${!category ? 'is-active' : ''}`}
                onClick={() => handleCategorySelect('')}
              >
                All categories
              </button>
              {derivedCategories.map((entry) => (
                <button
                  type="button"
                  key={entry.slug}
                  className={`catalog-pill ${entry.slug === category ? 'is-active' : ''}`}
                  onClick={() => handleCategorySelect(entry.slug)}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
          {subcategories.length > 0 && (
            <div className="catalog-sidebar-section">
              <h3>Subcategories</h3>
              <div className="catalog-pill-group" role="group" aria-label="Subcategory navigation">
                <button
                  type="button"
                  className={`catalog-pill ${!subcategory ? 'is-active' : ''}`}
                  onClick={() => handleSubcategorySelect('')}
                >
                  All {selectedCategory?.name}
                </button>
                {subcategories.map((entry) => (
                  <button
                    type="button"
                    key={entry.slug}
                    className={`catalog-pill ${entry.slug === subcategory ? 'is-active' : ''}`}
                    onClick={() => handleSubcategorySelect(entry.slug)}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="catalog-main">
          <form className="catalog-filter-form" onSubmit={handleFiltersSubmit}>
            <div className="catalog-filter-grid">
              <label>
                Search
                <input
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                  placeholder="Search by product name or description"
                />
              </label>
              <label>
                Brand
                <input
                  value={draftBrand}
                  onChange={(event) => setDraftBrand(event.target.value)}
                  placeholder="e.g. Alpine, Zephyr"
                />
              </label>
              <label>
                Min price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftMinPrice}
                  onChange={(event) => setDraftMinPrice(event.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                Max price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftMaxPrice}
                  onChange={(event) => setDraftMaxPrice(event.target.value)}
                  placeholder="0.00"
                />
              </label>
              <div className="catalog-availability">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) => setAvailableOnly(event.target.checked)}
                  />
                  <span>Only show available items</span>
                </label>
              </div>
            </div>
            <div className="catalog-filter-actions">
              <button className="primary" type="submit">
                Apply filters
              </button>
              <button className="text-button" type="button" onClick={handleClearFilters}>
                {hasFilters ? 'Clear filters' : 'Reset filters'}
              </button>
            </div>
          </form>

          {loading && (
            <div className="catalog-state catalog-loading">
              <p>Loading catalog…</p>
            </div>
          )}

          {error && (
            <div className="catalog-state catalog-error">
              <p>{error}</p>
            </div>
          )}

          {showEmptyState && (
            <div className="catalog-state catalog-empty">
              <p>No products match your current filters. Try expanding your search or clearing filters.</p>
            </div>
          )}

          {!loading && !error && catalogData && catalogData.items.length > 0 && (
            <>
              <div className="catalog-results-meta">
                <p>
                  Displaying {catalogData.items.length} item{textPlural(catalogData.items.length)} on page {page}.
                </p>
              </div>
              <div className="catalog-grid">
                {catalogData.items.map((product) => (
                  <article key={product.id} className="catalog-card">
                    <div>
                      <p className="catalog-card-category">{product.category?.name ?? 'Uncategorized'}</p>
                      <h3>{product.name}</h3>
                      <p className="catalog-card-description">{product.description ?? product.brand ?? 'No description'}</p>
                    </div>
                    <div className="catalog-card-footer">
                      <p className="catalog-card-price">{formatCurrency(product.price, product.currency)}</p>
                      <p className={`catalog-card-stock ${product.isAvailable ? 'in-stock' : 'out-of-stock'}`}>
                        {product.isAvailable ? 'In stock' : 'Out of stock'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="catalog-pagination">
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span>
                  Page {page} / {Math.max(1, totalPages)}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!metadata?.hasNextPage}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </section>
  )
}

const textPlural = (count: number) => (count === 1 ? '' : 's')

export default CatalogPage
