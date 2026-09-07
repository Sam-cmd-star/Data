import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, LayoutGrid, ChevronLeft, ChevronRight, LogOut, Sun, Moon } from 'lucide-react';
import { DatasetProvider } from '../context/DatasetContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppFooter } from '../components/AppChrome';

// Menú exclusivo para el módulo de Gestión de Servicios
const serviciosLinks = [
  { to: '/servicios', label: 'Salud del Servicio', icon: Activity, end: true },
];

export const ServiciosLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <DatasetProvider>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        
        {/* Header Superior */}
        <header className="h-14 border-b border-white/10 bg-slate-950 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/apps')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Volver al selector de aplicaciones"
            >
              <LayoutGrid size={18} />
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
              title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            <span className="font-display text-xs tracking-[0.25em] text-blue-400 font-bold">GESTIÓN DE SERVICIOS</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Cambiar tema"
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-300" />}
            </button>

            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>En línea</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition text-xs font-medium text-slate-200 border border-white/5"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-[10px]">
                  {user?.nombre?.[0] || 'A'}
                </div>
                <span>{user?.nombre || 'Usuario'}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1 z-50">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition text-left"
                  >
                    <LogOut size={14} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Sidebar + Main */}
        <div className="flex-1 flex min-w-0">
          <aside
            className={`${
              collapsed ? 'w-16' : 'w-56'
            } shrink-0 border-r border-white/10 bg-slate-950/80 backdrop-blur flex flex-col transition-all duration-300 justify-between`}
          >
            <nav className="p-3 space-y-1">
              {serviciosLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <link.icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{link.label}</span>}
                </NavLink>
              ))}
            </nav>

            <div className="p-3 border-t border-white/10">
              <button
                onClick={() => navigate('/apps')}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition"
                title="Volver a Apps"
              >
                <LayoutGrid size={18} className="shrink-0 text-blue-400" />
                {!collapsed && <span className="truncate font-medium">Menú Aplicaciones</span>}
              </button>
            </div>
          </aside>

          <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-auto bg-slate-900/40">
            <Outlet />
          </main>
        </div>

        {/* Footer */}
        <div className="w-full border-t border-white/10 bg-slate-950 shrink-0">
          <AppFooter />
        </div>

      </div>
    </DatasetProvider>
  );
};