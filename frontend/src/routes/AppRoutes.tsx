import { Routes, Route } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { PortalLayout } from '../layouts/PortalLayout';
import { PublicLayout } from '../layouts/PublicLayout';

// Auth Pages
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { VerifyOtp } from '../pages/auth/VerifyOtp';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';

// Public Pages
import { Home } from '../pages/public/Home';
import { TrackApplication } from '../pages/public/TrackApplication';
import { QueueDisplay } from '../pages/public/QueueDisplay';
import { CategoryPage } from '../pages/public/CategoryPage';
import { ServiceDetail } from '../pages/public/ServiceDetail';
import { DynamicPage } from '../pages/public/DynamicPage';
import { CustomerVerification } from '../pages/public/CustomerVerification';

// Admin Pages
import { AdminDashboard } from '../pages/admin/Dashboard';
import { Categories } from '../pages/admin/Categories';
import { Services } from '../pages/admin/Services';
import { Forms } from '../pages/admin/Forms';
import { FormBuilder } from '../pages/admin/FormBuilder';
import { Workflows } from '../pages/admin/Workflows';
import { WorkflowBuilder } from '../pages/admin/WorkflowBuilder';
import { Requests } from '../pages/admin/Requests';
import { RequestDetail } from '../pages/admin/RequestDetail';
import { QueueDesk } from '../pages/admin/QueueDesk';
import { Appointments } from '../pages/admin/Appointments';
import { Payments } from '../pages/admin/Payments';
import { CMSConfig } from '../pages/admin/CMSConfig';
import { AutomationRules } from '../pages/admin/AutomationRules';
import { StaffManagement } from '../pages/admin/StaffManagement';
import { StaffForm } from '../pages/admin/StaffForm';
import { Customers } from '../pages/admin/Customers';
import { CustomerProfile } from '../pages/admin/CustomerProfile';

// Portal Pages
import { PortalDashboard } from '../pages/portal/Dashboard';
import { MyRequests } from '../pages/portal/MyRequests';
import { PortalRequestDetail } from '../pages/portal/PortalRequestDetail';
import { MyPayments } from '../pages/portal/MyPayments';
import { Locker } from '../pages/portal/Locker';
import { Profile } from '../pages/portal/Profile';

// Platform Pages
import { PlatformLayout } from '../layouts/PlatformLayout';
import { PlatformDashboard } from '../pages/platform/Dashboard';
import { ApplicationsPage } from '../pages/platform/Applications';
import { CreateApp } from '../pages/platform/CreateApp';
import { ApplicationDetail } from '../pages/platform/ApplicationDetail';
import { BillingPage } from '../pages/platform/Billing';
import { NotificationsPage } from '../pages/platform/Notifications';
import { AccountPage } from '../pages/platform/Account';
import { SecurityPage } from '../pages/platform/Security';

// Shared Gates
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGate } from './RoleGate';
import { Role } from '../types/auth.types';
import { Forbidden } from '../pages/Forbidden';
import { NotFound } from '../pages/NotFound';
import { KitchenSink } from '../pages/dev/KitchenSink';

export function AppRoutes() {
  return (
    <Routes>
      {/* Dev Route */}
      <Route path="/dev/ui" element={<KitchenSink />} />

      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/track" element={<TrackApplication />} />
        <Route path="/track/:applicationNumber" element={<TrackApplication />} />
        <Route path="/queue-display" element={<QueueDisplay />} />
        <Route path="/categories/:slug" element={<CategoryPage />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/pages/:slug" element={<DynamicPage />} />
      </Route>

      {/* Auth Pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Admin Panel Console */}
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
        <Route path="categories" element={<Categories />} />
        <Route path="services" element={<Services />} />
        <Route path="forms" element={<Forms />} />
        <Route path="forms/build/:id" element={<FormBuilder />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="workflows/build/:id" element={<WorkflowBuilder />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="staff/new" element={<StaffForm />} />
        <Route path="staff/edit/:id" element={<StaffForm />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerProfile />} />
        <Route path="queue" element={<QueueDesk />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="payments" element={<Payments />} />
        <Route path="cms" element={<CMSConfig />} />
        <Route path="automation" element={<AutomationRules />} />
      </Route>

      {/* Customer Portal */}
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
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/:id" element={<PortalRequestDetail />} />
        <Route path="payments" element={<MyPayments />} />
        <Route path="locker" element={<Locker />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Platform Control Plane Console */}
      <Route
        path="/platform"
        element={
          <ProtectedRoute>
            <PlatformLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PlatformDashboard />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="create-app" element={<CreateApp />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="account/security" element={<SecurityPage />} />
      </Route>

      <Route path="/verify-customer/:token" element={<CustomerVerification />} />

      {/* Error Pages */}
      <Route path="/403" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
