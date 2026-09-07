import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppFooter } from '../components/AppChrome';
import { SystemPreview } from '../components/SystemPreview';
import { ThemeToggle } from '../components/ThemeToggle';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }
    if (!result.cargo) {
      setErrorMessage('No se encontró tu usuario.');
      return;
    }

    // Redirección directa al menú de selección estilo Odoo
    navigate('/apps');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 grid lg:grid-cols-2">
        <section className="relative hidden lg:flex flex-col justify-center px-12 py-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/25 via-transparent to-cyan-500/10" />
          <div className="relative max-w-md space-y-5">
            <div className="flex items-center gap-3">
              <p className="font-display text-sm tracking-[0.3em] text-blue-300">NEXUS</p>
              <span className="text-[10px] tracking-[0.14em] uppercase text-blue-300/90 border border-blue-500/25 bg-blue-600/10 rounded-full px-2.5 py-0.5">
                Para tu empresa
              </span>
            </div>
            <h1 className="font-display text-[2rem] xl:text-4xl font-extrabold leading-tight text-white">
              Nexus para tu empresa.
            </h1>
            <p className="text-slate-300 text-[15px] leading-relaxed">
              Todo tu negocio en una sola plataforma.¡Sencillo, eficiente y a buen precio!
            </p>
            <SystemPreview />
            <p className="text-xs text-slate-500">
              Acceso con el correo de la empresa. Cada persona entra a su panel según su cargo.
            </p>
          </div>
        </section>

        <section className="relative flex items-center justify-center p-8">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
            <div>
              <h2 className="font-display text-3xl font-bold text-white">Acceso</h2>
              <p className="text-slate-400 text-sm mt-2">Correo de la empresa. El sistema te lleva a tu panel.</p>
            </div>
            {errorMessage && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{errorMessage}</div>
            )}
            <label className="block text-sm text-slate-400">
              Correo
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="nx-input pl-10"
                  placeholder="usuario@empresa.com"
                />
              </div>
            </label>
            <label className="block text-sm text-slate-400">
              Contraseña
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="nx-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </label>
            <button type="submit" disabled={busy} className="nx-btn w-full py-3">
              {busy ? 'Entrando…' : 'Continuar'}
              <ArrowRight size={16} />
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              ¿Tienes un código de invitación?{' '}
              <Link to="/registro" className="text-blue-400 hover:underline font-medium">
                Canjear invitación aquí
              </Link>
            </p>
          </form>
        </section>
      </div>
      <AppFooter />
    </div>
  );
};