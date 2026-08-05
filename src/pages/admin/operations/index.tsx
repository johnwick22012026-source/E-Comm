import Link from 'next/link'
import React from 'react'
import { Layout } from '../../../components/Layout'

export default function OperationsPage() {
  return (
    <Layout>
      <h1>Operations</h1>
      <ul>
        <li>
          <Link href="/admin/operations/orders">Orders</Link>
        </li>
        <li>
          <Link href="/admin/operations/customers">Customers</Link>
        </li>
      </ul>
    </Layout>
  )
}
