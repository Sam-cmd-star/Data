import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AdminLayout } from '../layouts/AdminLayout';
import { EncargadoLayout } from '../layouts/EncargadoLayout';
import { ServiciosLayout } from '../layouts/ServiciosLayout';
import { AnalisisPage } from '../pages/admin/AnalisisPage';
import { CargasPage } from '../pages/admin/CargasPage';
import { ResumenPage } from '../pages/admin/ResumenPage';
import { InvitationsManager } from '../pages/admin/InvitacionesManager';
import { DocumentUploader } from '../components/DocumentUploader';
import { MisDatasets } from '../components/MisDatasets'; // <--- 1. IMPORTAR COMPONENTE
import { SistemaPage } from '../pages/encargado/SistemaPage';
import { EmployeeDashboard } from '../pages/EmployeeDashboard';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AppLauncherPage } from '../pages/AppLauncherPage';
import { ADMIN_CARGOS, INTEGRADOR_CARGOS } from '../types/auth';

const Gate: React.FC<{ children: React.ReactNode; allowed: string[] }> = ({ children, allowed }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.cargo)) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const AppRouter: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />

          {/* Selector de Aplicaciones (Menu Odoo) */}
          <Route
            path="/apps"
            element={
              <Gate allowed={[...ADMIN_CARGOS, ...INTEGRADOR_CARGOS]}>
                <AppLauncherPage />
              </Gate>
            }
          />

          {/* Módulo 1: Inteligencia de Negocio */}
          <Route
            path="/admin"
            element={
              <Gate allowed={[...ADMIN_CARGOS]}>
                <AdminLayout />
              </Gate>
            }
          >
            <Route index element={<ResumenPage />} />
            <Route path="cargas" element={<CargasPage />} />
            <Route path="analisis" element={<AnalisisPage />} />
            <Route path="documentos" element={<DocumentUploader />} />
            <Route path="mis-datasets" element={<MisDatasets />} /> {/* <--- 2. NUEVA RUTA ADMIN */}
            <Route path="invitaciones" element={<InvitationsManager />} />
            <Route path="sistema" element={<SistemaPage />} />
          </Route>

          {/* Módulo 2: Gestión de Servicios */}
          <Route
            path="/servicios"
            element={
              <Gate allowed={[...ADMIN_CARGOS]}>
                <ServiciosLayout />
              </Gate>
            }
          >
            <Route index element={<SistemaPage />} />
          </Route>

          {/* Módulo 3: Portal Empleado */}
          <Route
            path="/employee"
            element={
              <Gate allowed={[...INTEGRADOR_CARGOS]}>
                <EncargadoLayout />
              </Gate>
            }
          >
            <Route index element={<EmployeeDashboard />} />
            <Route path="mis-datasets" element={<MisDatasets />} /> {/* <--- 3. NUEVA RUTA EMPLEADO */}
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);