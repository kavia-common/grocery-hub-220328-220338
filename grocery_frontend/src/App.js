import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ProductGrid from "./pages/ProductGrid";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import LoginPage from "./pages/LoginPage";
import WishlistPage from "./pages/WishlistPage";
import CouponsPage from "./pages/CouponsPage";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { WishlistProvider } from "./wishlist/WishlistContext";
import OrderDetailPage from "./pages/OrderDetailPage";

/**
 * PUBLIC_INTERFACE
 * ProtectedRoute ensures routes are accessible only when authenticated.
 * If no token is present, it redirects to /login.
 */
function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <div className="app" style={{ background: "var(--bg)" }}>
          <Header />
          <div className="container">
            <Sidebar />
            <main className="content">
              <Routes>
                <Route path="/" element={<ProductGrid />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:orderId"
                  element={
                    <ProtectedRoute>
                      <OrderDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </WishlistProvider>
    </AuthProvider>
  );
}
