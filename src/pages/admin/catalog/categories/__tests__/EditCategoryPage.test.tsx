import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => {
  throw new Error('next/link should not be used in this client app.')
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  const Link = ({ to, children, href, ...props }: any) => {
    if (href !== undefined) {
      throw new Error('React Router Link should be used with `to`, not `href`.')
    }
    if (to === undefined || to === null) {
      throw new Error('React Router Link requires a `to` prop.')
    }
    const serializedTo = typeof to === 'string' ? to : JSON.stringify(to)
    return (
      <a {...props} data-mocked-router-link-to={serializedTo}>
        {children}
      </a>
    )
  }

  return {
    ...actual,
    Link,
  }
})

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { API_BASE } from '../../../../lib/api'
import EditCategoryPage from '../[id]'

const fakeCategory = {
  id: 42,
  name: 'Test Category',
  slug: 'test-category',
  parentId: null,
}

describe('EditCategoryPage admin navigation', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => fakeCategory,
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders category form and Cancel link with React Router `to` prop', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/catalog/categories/42']}>
        <Routes>
          <Route path="/admin/catalog/categories/:id" element={<EditCategoryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/admin/catalog/categories/42`)
    })

    await screen.findByRole('heading', { name: /edit category/i })
    await screen.findByDisplayValue('Test Category')

    const cancelLink = screen.getByRole('link', { name: /cancel/i })
    expect(cancelLink).toHaveAttribute('data-mocked-router-link-to', '/admin/catalog/categories')
  })
})
