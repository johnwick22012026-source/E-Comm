import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AdminGuard } from './components/AdminGuard'
import CatalogPage from './pages/CatalogPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RequestPasswordResetPage from './pages/RequestPasswordResetPage'
import SetNewPasswordPage from './pages/SetNewPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import AccountPage from './pages/AccountPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OperationsPage from './pages/admin/operations'
import CatalogCategoriesPage from './pages/admin/catalog/categories'
import PromotionsPage from './pages/admin/promotions'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="catalog/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="confirmation/:orderReference" element={<OrderConfirmationPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="request-password" element={<RequestPasswordResetPage />} />
        <Route path="set-password" element={<SetNewPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="account/orders" element={<OrderHistoryPage />} />
        <Route path="account/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="admin" element={<AdminGuard />}>
          <Route index element={<Navigate to="catalog/categories" replace />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="catalog/categories" element={<CatalogCategoriesPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
