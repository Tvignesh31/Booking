import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivacyModal from './components/PrivacyModal';

// Pages
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import HotelDetailPage from './pages/HotelDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';

export default function App() {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)} />

          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)} />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/hotel/:id" element={<HotelDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/bookings" element={<MyBookingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
            </Routes>
          </main>

          <Footer onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)} />

          {/* Responsible Privacy Modal */}
          <PrivacyModal
            isOpen={isPrivacyModalOpen}
            onClose={() => setIsPrivacyModalOpen(false)}
          />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
