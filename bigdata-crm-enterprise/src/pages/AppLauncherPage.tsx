import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { ADMIN_CARGOS } from '../types/auth';
import { 
  BarChart2, 
  FileText, 
  ShieldCheck, 
  Briefcase, 
  LogOut
} from 'lucide-react';

export function AppLauncherPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Evaluación flexible de Admin
  const userCargo = user?.cargo?.toUpperCase() || '';
  const isAdmin = Boolean(
    user && (
      ADMIN_CARGOS.some((c) => c.toUpperCase() === userCargo) ||
      userCargo.includes('ADMIN')
    )
  );

  const modules = [
    {
      id: 'bigdata',
      title: 'Big Data & Analytics',
      icon: BarChart2,
      color: 'bg-blue-600',
      path: '/admin',
      show: isAdmin,
    },
    {
      id: 'documentos',
      title: 'Documentación',
      icon: FileText,
      color: 'bg-amber-500',
      path: '/admin/documentos',
      show: isAdmin,
    },
    {
      id: 'permisos',
      title: 'Gestión de permisos',
      icon: ShieldCheck,
      color: 'bg-purple-600',
      path: '/admin/invitaciones',
      show: isAdmin,
    },
    {
      id: 'crm',
      title: 'Acciones CRM / Tareas',
      icon: Briefcase,
      color: 'bg-blue-600',
      path: '/employee',
      show: !isAdmin,
    },
  ];

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden transition-colors duration-200">
      {/* Header Superior */}
      <header className="h-14 shrink-0 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 px-6 flex items-center justify-between z-10 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
            N
          </div>
          <span className="font-semibold text-sm">NEXUS ERP</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-white/5 p-1.5 px-2.5 rounded-xl transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {user?.nombre ? user.nombre.substring(0, 2).toUpperCase() : 'LA'}
              </div>
              <span className="text-sm font-medium">
                {user?.nombre || 'Leonard Admin'}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    void logout().then(() => navigate('/login'));
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

      {/* Rejilla de Módulos */}
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col justify-center items-center overflow-auto">
        <h1 className="text-xl font-bold mb-10 tracking-wide text-slate-800 dark:text-slate-100">
          Selecciona un Módulo
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">
          {modules
            .filter((m) => m.show)
            .map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => navigate(mod.path)}
                  className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl transition-all duration-300 hover:scale-[1.03] group shadow-md hover:shadow-xl h-48"
                >
                  <div className={`w-14 h-14 rounded-2xl ${mod.color} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={26} />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-center leading-tight">
                    {mod.title}
                  </span>
                </button>
              );
            })}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 shrink-0 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 px-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono tracking-widest text-[11px]">N E X U S</span>
        <span>Inteligencia de negocio · 2026</span>
      </footer>
    </div>
  );
}