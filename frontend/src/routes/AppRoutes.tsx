import { Routes, Route } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { PortalLayout } from '../layouts/PortalLayout';
import { PublicLayout } from '../layouts/PublicLayout';

import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { VerifyOtp } from '../pages/auth/VerifyOtp';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';

import { Home } from '../pages/public/Home';
import { AdminDashboard } from '../pages/admin/Dashboard';
import { PortalDashboard } from '../pages/portal/Dashboard';
import { KitchenSink } from '../pages/dev/KitchenSink';
import { Forbidden } from '../pages/Forbidden';
import { NotFound } from '../pages/NotFound';

import { ProtectedRoute } from './ProtectedRoute';
import { RoleGate } from './RoleGate';
import { Role } from '../types/auth.types';

export function AppRoutes() {
  return (
    <Routes>
      {/* Dev Route */}
      <Route path="/dev/ui" element={<KitchenSink />} />

      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/track" element={<div className="p-6 text-left">Public Tracking Page Stub</div>} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleGate allowedRoles={[Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF]}>
              <AdminLayout />
            </RoleGate>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="categories" element={<div className="p-6 text-left">Categories Panel Stub</div>} />
        <Route path="services" element={<div className="p-6 text-left">Services Panel Stub</div>} />
        <Route path="forms" element={<div className="p-6 text-left">Forms Panel Stub</div>} />
        <Route path="workflows" element={<div className="p-6 text-left">Workflows Panel Stub</div>} />
        <Route path="requests" element={<div className="p-6 text-left">Requests Management Stub</div>} />
        <Route path="queue" element={<div className="p-6 text-left">Queue Desk Stub</div>} />
        <Route path="appointments" element={<div className="p-6 text-left">Appointments Panel Stub</div>} />
        <Route path="payments" element={<div className="p-6 text-left">Payments Dashboard Stub</div>} />
        <Route path="cms" element={<div className="p-6 text-left">CMS Settings Stub</div>} />
        <Route path="settings" element={<div className="p-6 text-left">Admin Settings Panel Stub</div>} />
      </Route>

      {/* Portal Protected Routes */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <RoleGate allowedRoles={[Role.CUSTOMER]}>
              <PortalLayout />
            </RoleGate>
          </ProtectedRoute>
        }
      >
        <Route index element={<PortalDashboard />} />
        <Route path="requests" element={<div className="p-6 text-left">My Requests Panel Stub</div>} />
        <Route path="payments" element={<div className="p-6 text-left">My Payments History Stub</div>} />
        <Route path="profile" element={<div className="p-6 text-left">My Profile Settings Stub</div>} />
      </Route>

      {/* Error Pages */}
      <Route path="/403" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
