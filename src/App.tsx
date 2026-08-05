import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>        
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
      </Route>
    </Routes>
  )
}

export default App
