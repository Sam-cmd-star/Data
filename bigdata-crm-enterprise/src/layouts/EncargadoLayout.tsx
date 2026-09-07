import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, LogOut } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

const APPS_ROUTE = '/apps';

export const EncargadoLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Genera iniciales dinámicas para el avatar del empleado
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="h-screen flex overflow-hidden transition-colors duration-200 bg-slate-950 text-slate-100">
      
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 bg-slate-950/80 backdrop-blur flex flex-col justify-between transition-all duration-300 z-20">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 h-14 flex items-center justify-between border-b border-white/10">
            <p className="font-display text-xs tracking-[0.25em] text-blue-400 font-bold">
              NEXUS
            </p>
          </div>

          <nav className="p-3 space-y-1">
            <NavLink
              to="/employee"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <LayoutDashboard size={18} />
              <span>Mi Panel</span>
            </NavLink>
          </nav>
        </div>

        <div className="h-10 border-t border-white/10 px-3 flex items-center bg-slate-950/80">
          <Link
            to={APPS_ROUTE}
            className="flex items-center gap-3 w-full text-xs text-slate-400 hover:text-white transition truncate"
            title="Cambiar de Módulo"
          >
            <LayoutGrid size={16} className="shrink-0" />
            <span className="truncate">Cambiar de Módulo</span>
          </Link>
        </div>
      </aside>

      {/* Header y Vista Principal */}
      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="h-14 shrink-0 border-b border-white/10 bg-slate-950/80 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Portal de Empleado</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="relative">
              {/* DATOS DE EMPLEADO DINÁMICOS */}
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 hover:bg-white/5 p-1.5 px-2.5 rounded-xl transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {getInitials(user?.nombre || user?.email)}
                </div>
                <span className="text-sm font-medium">
                  {user?.nombre || user?.email || 'Empleado'}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate(APPS_ROUTE);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <LayoutGrid size={15} /> Seleccionar Módulo
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut size={15} /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-auto bg-slate-900/50">
          <Outlet />
        </main>

        <footer className="h-10 shrink-0 border-t border-white/10 bg-slate-950/80 px-6 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono tracking-widest text-[11px]">N E X U S</span>
          <span>Portal de Servicios · 2026</span>
        </footer>
      </div>

    </div>
  );
};