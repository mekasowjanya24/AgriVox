import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SyncProvider } from './context/SyncContext.jsx';
import { Layout } from './components/Layout.jsx';

const Login = lazy(() => import('./pages/Login.jsx').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register.jsx').then(m => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx').then(m => ({ default: m.Dashboard })));
const Plots = lazy(() => import('./pages/Plots.jsx').then(m => ({ default: m.Plots })));
const PlotForm = lazy(() => import('./pages/PlotForm.jsx').then(m => ({ default: m.PlotForm })));
const Cycles = lazy(() => import('./pages/Cycles.jsx').then(m => ({ default: m.Cycles })));
const CycleForm = lazy(() => import('./pages/CycleForm.jsx').then(m => ({ default: m.CycleForm })));
const CycleDetail = lazy(() => import('./pages/CycleDetail.jsx').then(m => ({ default: m.CycleDetail })));
const AddExpense = lazy(() => import('./pages/AddExpense.jsx').then(m => ({ default: m.AddExpense })));
const AddHarvest = lazy(() => import('./pages/AddHarvest.jsx').then(m => ({ default: m.AddHarvest })));
const Prices = lazy(() => import('./pages/Prices.jsx').then(m => ({ default: m.Prices })));
const Reports = lazy(() => import('./pages/Reports.jsx').then(m => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings.jsx').then(m => ({ default: m.Settings })));

const AdminStats = lazy(() => import('./pages/admin/AdminStats.jsx').then(m => ({ default: m.AdminStats })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx').then(m => ({ default: m.AdminUsers })));
const AdminPrices = lazy(() => import('./pages/admin/AdminPrices.jsx').then(m => ({ default: m.AdminPrices })));

const LoadingSpinner = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8 text-agri-800 font-bold text-base">
    లోడ్ అవుతోంది...
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

export const App = () => {
  return (
    <AuthProvider>
      <SyncProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="plots" element={<Plots />} />
                <Route path="plots/new" element={<PlotForm />} />
                <Route path="plots/:id" element={<Plots />} />

                <Route path="cycles" element={<Cycles />} />
                <Route path="cycles/new" element={<CycleForm />} />
                <Route path="cycles/:id" element={<CycleDetail />} />

                <Route path="expenses/add" element={<AddExpense />} />
                <Route path="harvests/add" element={<AddHarvest />} />
                <Route path="reports" element={<Reports />} />
                <Route path="prices" element={<Prices />} />
                <Route path="settings" element={<Settings />} />

                {/* Admin Routes */}
                <Route
                  path="admin/stats"
                  element={
                    <AdminRoute>
                      <AdminStats />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <AdminRoute>
                      <AdminUsers />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/prices"
                  element={
                    <AdminRoute>
                      <AdminPrices />
                    </AdminRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SyncProvider>
    </AuthProvider>
  );
};

export default App;
