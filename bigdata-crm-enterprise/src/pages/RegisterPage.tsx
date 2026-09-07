import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { KeyRound, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { AppFooter } from '../components/AppChrome';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';

  const [codigo, setCodigo] = useState(codeFromUrl);
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [invitationData, setInvitationData] = useState<{ email: string; cargo: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (codeFromUrl) {
      setCodigo(codeFromUrl.toUpperCase());
    }
  }, [codeFromUrl]);

  // 1. Validar el código y capturar el email + cargo asignado
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setBusy(true);

    const { data, error } = await supabase
      .from('invitaciones')
      .select('*')
      .eq('codigo', codigo.trim().toUpperCase())
      .eq('usado', false)
      .single();

    setBusy(false);

    if (error || !data) {
      setErrorMessage('Código de invitación inválido o ya utilizado.');
      return;
    }

    // Capturar el cargo de la invitación (o fallback a "Empleado")
    const cargoInvitacion = data.cargo || data.rol || 'Empleado';
    setInvitationData({ email: data.email, cargo: cargoInvitacion });
  };

  // 2. Registrar usuario en el orden correcto para ejecutar el Trigger exitosamente
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationData) return;

    setErrorMessage('');
    setBusy(true);

    try {
      let userId: string | null = null;

      // 1. Intentar registrar en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password,
        options: {
          data: {
            nombre,
            cargo: invitationData.cargo,
          },
        },
      });

      if (authError) {
        // Si el usuario ya existe, intentar iniciar sesión para continuar la activación
        if (authError.message.includes('User already registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: invitationData.email,
            password,
          });
          if (signInError) {
            throw new Error('El usuario ya existe. Verifica la contraseña ingresada.');
          }
          userId = signInData.user?.id || null;
        } else {
          throw authError;
        }
      } else {
        userId = authData.user?.id || null;
      }

      // 2. Insertar/Actualizar en la tabla publica usuarios
      if (userId) {
        await supabase.from('usuarios').upsert({
          id: userId,
          email: invitationData.email,
          nombre,
          cargo: invitationData.cargo,
        });
      }

      // 3. Marcar invitación como usada (Dispara el Trigger en la BD)
      const { error: invError } = await supabase
        .from('invitaciones')
        .update({ usado: true, estado: 'usado' })
        .eq('codigo', codigo.trim().toUpperCase());

      if (invError) throw invError;

      setBusy(false);
      alert('¡Cuenta registrada e invitación procesada exitosamente!');
      navigate('/login');

    } catch (err: any) {
      setBusy(false);
      setErrorMessage(err.message || 'Error en el proceso de registro.');
    }
  };

  return (
    <div className="h-screen flex flex-col justify-between bg-slate-950 text-white">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold">Registro de Usuario</h2>
            <p className="text-slate-400 text-xs mt-1">Ingresa el código proporcionado por tu administrador.</p>
          </div>

          {errorMessage && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">
              {errorMessage}
            </div>
          )}

          {!invitationData ? (
            /* Paso 1: Validar Código */
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <label className="block text-xs text-slate-400">
                Código de Invitación
                <div className="relative mt-1">
                  <KeyRound className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="NEX-XXXXXX"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm uppercase text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </label>
              <button 
                type="submit" 
                disabled={busy} 
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {busy ? 'Verificando...' : 'Verificar Código'}
              </button>
            </form>
          ) : (
            /* Paso 2: Crear Cuenta */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <CheckCircle2 size={16} />
                <span>Código verificado ({invitationData.cargo}): {invitationData.email}</span>
              </div>

              <label className="block text-xs text-slate-400">
                Nombre Completo
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </label>

              <label className="block text-xs text-slate-400">
                Contraseña
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </label>

              <button 
                type="submit" 
                disabled={busy} 
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? 'Creando cuenta...' : 'Completar Registro'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          <div className="text-center text-xs text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-400 hover:underline">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};