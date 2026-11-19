import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, RequireRole } from "./components/ProtectedRoute.jsx";
import AppShell from "./components/AppShell.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import ManagementPage from "./pages/ManagementPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import StockPage from "./pages/StockPage.jsx";
import SupplierPage from "./pages/SupplierPage.jsx";
import AccessDenied from "./pages/AccessDenied.jsx";
import {
  AboutPage,
  ContactPage,
  FeaturesPage,
  PublicHomePage,
  PublicSiteLayout
} from "./pages/PublicSite.jsx";

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to="/overview" replace />;
}

function Restricted({ roles, children }) {
  return <RequireRole roles={roles}>{children}</RequireRole>;
}

function OrdersRoute() {
  const { user } = useAuth();
  return user.role === "sales_representative"
    ? <OrdersPage mode="orders" />
    : <ManagementPage resource="orders" />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicSiteLayout />}>
        <Route index element={<PublicHomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route element={<AppShell />}>
          <Route path="overview" element={<DashboardHome />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="users" element={<Restricted roles={["admin"]}><ManagementPage resource="users" /></Restricted>} />
          <Route path="products" element={<Restricted roles={["admin"]}><ManagementPage resource="products" /></Restricted>} />
          <Route path="warehouses" element={<Restricted roles={["admin", "warehouse_manager", "supplier", "sales_representative"]}><ManagementPage resource="warehouses" /></Restricted>} />
          <Route path="suppliers" element={<Restricted roles={["admin"]}><ManagementPage resource="suppliers" /></Restricted>} />
          <Route path="transactions" element={<Restricted roles={["admin", "warehouse_manager"]}><ManagementPage resource="transactions" /></Restricted>} />
          <Route path="alerts" element={<Restricted roles={["admin", "warehouse_manager"]}><ManagementPage resource="alerts" /></Restricted>} />
          <Route path="supply-requests" element={<Restricted roles={["admin"]}><ManagementPage resource="supply-requests" /></Restricted>} />
          <Route path="inventory" element={<Restricted roles={["warehouse_manager"]}><StockPage /></Restricted>} />
          <Route path="catalog" element={<Restricted roles={["sales_representative"]}><OrdersPage mode="catalog" /></Restricted>} />
          <Route path="orders" element={<Restricted roles={["admin", "warehouse_manager", "sales_representative"]}><OrdersRoute /></Restricted>} />
          <Route path="supplier" element={<Restricted roles={["supplier"]}><SupplierPage /></Restricted>} />
          <Route path="supplier/products" element={<Restricted roles={["supplier"]}><SupplierPage /></Restricted>} />
          <Route path="supplier/new-request" element={<Restricted roles={["supplier"]}><SupplierPage /></Restricted>} />
          <Route path="supplier/requests" element={<Restricted roles={["supplier"]}><SupplierPage /></Restricted>} />
        </Route>
      </Route>
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}
