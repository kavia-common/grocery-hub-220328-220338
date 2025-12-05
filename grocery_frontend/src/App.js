import React, { useEffect } from "react";
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
import InstantPage from "./pages/InstantPage";
import NotificationBanner from "./components/NotificationBanner";
import { useNotifications } from "./notifications/NotificationsContext";
import AddressBookPage from "./pages/AddressBookPage";
import { AddressProvider } from "./addresses/AddressContext";
import BuyAgainPage from "./pages/BuyAgainPage";
import CombosPage from "./pages/CombosPage";
import ComboDetailPage from "./pages/ComboDetailPage";
import ImageSearchPage from "./pages/ImageSearchPage";
import MembershipsPage from "./pages/MembershipsPage";
import ReturnsPage from "./pages/ReturnsPage";
import OrganicPage from "./pages/OrganicPage";

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

function AppShell() {
  const { notify, NotificationTypes } = useNotifications();

  // Smart suggestions: subtle info on first load with CTA hint
  useEffect(() => {
    const key = "gh_suggestions_notified_v1";
    if (!sessionStorage.getItem(key)) {
      notify({
        type: NotificationTypes.info,
        message: "Smart suggestions ready. Review items tailored for you in the cart.",
        meta: { cta: "/cart" },
      });
      sessionStorage.setItem(key, "1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app" style={{ background: "var(--bg)" }}>
      <Header />
      <div className="container">
        <Sidebar />
        <main className="content">
          <NotificationBanner />
          <Routes>
            <Route path="/" element={<ProductGrid />} />
            <Route path="/combos" element={<CombosPage />} />
            <Route path="/combos/:comboId" element={<ComboDetailPage />} />
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
            <Route
              path="/returns"
              element={
                <ProtectedRoute>
                  <ReturnsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/instant" element={<InstantPage />} />
            <Route path="/addresses" element={<AddressBookPage />} />
            <Route path="/image-search" element={<ImageSearchPage />} />
            <Route path="/memberships" element={<MembershipsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/buy-again"
              element={
                <ProtectedRoute>
                  <BuyAgainPage />
                </ProtectedRoute>
              }
            />
            <Route path="/organic" element={<OrganicPage />} />
            <Route path="/organic/:tab" element={<OrganicPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <AddressProvider>
          <AppShell />
        </AddressProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
