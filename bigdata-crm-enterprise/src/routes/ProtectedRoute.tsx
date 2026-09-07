import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredPermission?: string;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Verificando credenciales...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Permite verificar 'permisos' incluso si 'UserProfile' no los define explícitamente en el AuthContext
  const userPermisos = (user as { permisos?: string[] }).permisos || [];
  const userCargo = (user.cargo || '').toLowerCase();

  // Validación por Rol
  if (allowedRoles && !allowedRoles.map((r) => r.toLowerCase()).includes(userCargo)) {
    return <Navigate to="/apps" replace />;
  }

  // Validación por Permiso
  if (requiredPermission && !userPermisos.includes(requiredPermission)) {
    return <Navigate to="/apps" replace />;
  }

  return <Outlet />;
};