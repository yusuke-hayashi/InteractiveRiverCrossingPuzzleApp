import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminProvider } from './contexts/AdminContext';
import App from './App';
import AdminLogin from './components/AdminLogin';
import AnalyticsDashboard from './components/AnalyticsDashboard';

function AppRouter() {
  return (
    <AdminProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
      </Routes>
    </AdminProvider>
  );
}

export default AppRouter;