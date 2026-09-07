import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3, LayoutDashboard, Upload, FileText, 
  ShieldCheck, ChevronLeft, ChevronRight, LayoutGrid, LogOut, Activity 
} from 'lucide-react';
import { DatasetProvider } from '../context/DatasetContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext'; // <--- 1. IMPORTAR AUTH CONTEXT

const APPS_ROUTE = '/apps';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // <--- 2. OBTENER USER Y LOGOUT
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Obtener iniciales dinámicas
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getNavLinks = () => {
    if (location.pathname.includes('/documentos')) {
      return [
        { to: '/admin/documentos', label: 'Mis Documentos', icon: FileText, end: true },
      ];
    }
    if (location.pathname.includes('/invitaciones') || location.pathname.includes('/sistema')) {
      return [
        { to: '/admin/invitaciones', label: 'Gestión de Permisos', icon: ShieldCheck, end: true },
        { to: '/admin/sistema', label: 'Salud del Servicio', icon: Activity, end: false },
      ];
    }
    return [
      { to: '/admin', label: 'Inicio', icon: LayoutDashboard, end: true },
      { to: '/admin/cargas', label: 'Subir Datasets', icon: Upload, end: false },
      { to: '/admin/analisis', label: 'Comparar', icon: BarChart3, end: false },
    ];
  };

  const links = getNavLinks();

  const getModuleName = () => {
    if (location.pathname.includes('/documentos')) return 'Gestión Documental';
    if (location.pathname.includes('/invitaciones') || location.pathname.includes('/sistema')) return 'Permisos e Invitaciones';
    return 'Big Data & Analytics';
  };

  return (
    <DatasetProvider>
      <div className="h-screen flex overflow-hidden transition-colors duration-200">
        
        {/* Sidebar */}
        <aside 
          className={`${
            collapsed ? 'w-16' : 'w-56'
          } shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 backdrop-blur flex flex-col justify-between transition-all duration-300 z-20`}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 h-14 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
              {!collapsed && (
                <p className="font-display text-xs tracking-[0.25em] text-blue-600 dark:text-blue-400 font-bold">
                  NEXUS
                </p>
              )}
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mx-auto transition-colors"
                title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
              >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>

            <nav className="p-3 space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                >
                  <link.icon size={18} />
                  {!collapsed && <span>{link.label}</span>}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="h-10 border-t border-slate-200 dark:border-white/10 px-3 flex items-center bg-white dark:bg-slate-950/80">
            <Link
              to={APPS_ROUTE}
              className="flex items-center gap-3 w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition truncate"
              title="Cambiar de Módulo"
            >
              <LayoutGrid size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">Cambiar de Módulo</span>}
            </Link>
          </div>
        </aside>

        {/* Header y Vista Principal */}
        <div className="flex-1 min-w-0 flex flex-col h-screen">
          <header className="h-14 shrink-0 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 px-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{getModuleName()}</span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <div className="relative">
                {/* 3. DATOS DE USUARIO DINÁMICOS */}
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-white/5 p-1.5 px-2.5 rounded-xl transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {getInitials(user?.nombre || user?.email)}
                  </div>
                  <span className="text-sm font-medium">
                    {user?.nombre || user?.email || 'Usuario'}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate(APPS_ROUTE);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <LayoutGrid size={15} /> Seleccionar Módulo
                    </button>
                    <div className="border-t border-slate-200 dark:border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut size={15} /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>

          <footer className="h-10 shrink-0 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 px-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tracking-widest text-[11px]">N E X U S</span>
            <span>Inteligencia de negocio · 2026</span>
          </footer>
        </div>

      </div>
    </DatasetProvider>
  );
};