import React from 'react'
import { Layout } from 'src/components/Layout'

export default function OperationsPage() {
  return (
    <Layout>
      <h1>Operations</h1>
      <p>
        The Operations section consolidates workstreams related to fulfillment and reporting. Individual
        areas such as Orders and Customers will be available from this menu once their respective
        dashboards are built out.
      </p>
      <ul>
        <li>Orders (coming soon)</li>
        <li>Customers (coming soon)</li>
        <li>
          <a href="/admin/reporting">Reporting</a>
        </li>
      </ul>
    </Layout>
  )
}
