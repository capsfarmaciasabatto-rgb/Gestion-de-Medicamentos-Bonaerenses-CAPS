import React, { useState, useEffect } from 'react';
import { Pill, Shield, Stethoscope, FileText, Eye, Lock, Key, LogIn, CheckCircle2, AlertCircle, ArrowLeft, Building2 } from 'lucide-react';
import { Usuario, RolUsuario } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: Usuario) => void;
}

const DEFAULT_USUARIOS: Usuario[] = [
  { id: 1, username: 'admin', nombre: 'Administrador General', rol: 'ADMIN', activo: 1 },
  { id: 2, username: 'farmacia', nombre: 'Farmacéutico Sabatto', rol: 'FARMACEUTICO', activo: 1 },
  { id: 3, username: 'tecnico', nombre: 'Técnico de Carga / Despacho', rol: 'TECNICO', activo: 1 },
  { id: 4, username: 'direccion', nombre: 'Dirección CAPS (Solo Lectura)', rol: 'DIRECCION', activo: 1 },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [usuariosList, setUsuariosList] = useState<Usuario[]>(DEFAULT_USUARIOS);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState<boolean>(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        // Filter active users
        if (Array.isArray(data) && data.length > 0) {
          const activeUsers = data.filter((u: Usuario) => Boolean(u.activo));
          if (activeUsers.length > 0) {
            setUsuariosList(activeUsers);
            return;
          }
        }
      }
      setUsuariosList(DEFAULT_USUARIOS);
    } catch (e) {
      console.error('Error cargando usuarios:', e);
      setUsuariosList(DEFAULT_USUARIOS);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: Usuario) => {
    setSelectedUser(user);
    setPassword('');
    setErrorMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!password.trim()) {
      setErrorMsg('Por favor ingrese su contraseña.');
      return;
    }

    setAuthenticating(true);
    setErrorMsg(null);

    const demoPassMap: Record<string, string> = {
      admin: 'admin',
      farmacia: 'farmacia',
      tecnico: 'tecnico',
      direccion: 'direccion',
    };

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUser.username,
          password: password.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valido && data.usuario) {
          const loggedUser: Usuario = {
            id: data.usuario.id,
            username: data.usuario.username,
            nombre: data.usuario.nombre,
            rol: data.usuario.rol,
            activo: 1,
          };
          onLoginSuccess(loggedUser);
          return;
        } else {
          setErrorMsg(data.mensaje || 'Contraseña incorrecta. Verifique e intente nuevamente.');
          return;
        }
      }

      // Fallback if backend returned non-200
      const expectedDemoPass = demoPassMap[selectedUser.username] || 'admin';
      if (password.trim() === expectedDemoPass) {
        onLoginSuccess(selectedUser);
      } else {
        setErrorMsg('Contraseña incorrecta. Verifique e intente nuevamente.');
      }
    } catch (err: any) {
      console.error('Error autenticando:', err);
      // Client-side fallback check
      const expectedDemoPass = demoPassMap[selectedUser.username] || 'admin';
      if (password.trim() === expectedDemoPass) {
        onLoginSuccess(selectedUser);
      } else {
        setErrorMsg('Contraseña incorrecta.');
      }
    } finally {
      setAuthenticating(false);
    }
  };

  const getRoleBadge = (rol: RolUsuario) => {
    switch (rol) {
      case 'ADMIN':
        return {
          label: 'Administrador General',
          color: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          cardBg: 'from-orange-950/40 via-slate-900 to-slate-900 hover:border-orange-500/50',
          iconBg: 'bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-orange-600/30',
          icon: Shield,
          demoPass: 'admin',
        };
      case 'FARMACEUTICO':
        return {
          label: 'Farmacéutico',
          color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          cardBg: 'from-teal-950/40 via-slate-900 to-slate-900 hover:border-teal-500/50',
          iconBg: 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-teal-600/30',
          icon: Stethoscope,
          demoPass: 'farmacia',
        };
      case 'TECNICO':
        return {
          label: 'Técnico Carga/Despacho',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          cardBg: 'from-blue-950/40 via-slate-900 to-slate-900 hover:border-blue-500/50',
          iconBg: 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-blue-600/30',
          icon: FileText,
          demoPass: 'tecnico',
        };
      case 'DIRECCION':
        return {
          label: 'Dirección (Lectura)',
          color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          cardBg: 'from-purple-950/40 via-slate-900 to-slate-900 hover:border-purple-500/50',
          iconBg: 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-600/30',
          icon: Building2,
          demoPass: 'direccion',
        };
      default:
        return {
          label: rol,
          color: 'bg-slate-700 text-slate-300 border-slate-600',
          cardBg: 'from-slate-900 to-slate-900 hover:border-slate-700',
          iconBg: 'bg-slate-800 text-slate-300',
          icon: Lock,
          demoPass: '1234',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden selection:bg-orange-500 selection:text-slate-950">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-5xl mx-auto w-full px-4 py-10 sm:py-16 flex-1 flex flex-col justify-center items-center z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-10 max-w-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-xl shadow-orange-600/25 mb-4 border border-orange-400/30 animate-pulse">
            <Pill className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Gestión de Medicamentos Bonaerenses CAPS
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-2 font-medium">
            CAPS N° 1 Dr. Sabatto — Farmacia & Red de 17 Efectores de Salud
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-full text-xs text-slate-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Acceso Seguro de Operadores — Seleccione su Perfil</span>
          </div>
        </div>

        {/* User Selection Grid */}
        <div className="w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Cargando perfiles de usuario precargados...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {usuariosList.map((user) => {
                const info = getRoleBadge(user.rol);
                const RoleIcon = info.icon;
                const isSelected = selectedUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={`relative text-left p-5 rounded-2xl border transition-all duration-200 bg-gradient-to-b ${info.cardBg} flex flex-col justify-between group shadow-lg ${
                      isSelected
                        ? 'border-orange-500 ring-2 ring-orange-500/50 scale-[1.02]'
                        : 'border-slate-800 hover:border-slate-700 hover:-translate-y-1'
                    }`}
                  >
                    <div>
                      {/* Icon & Role Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${info.iconBg} group-hover:scale-110 transition-transform`}>
                          <RoleIcon className="w-6 h-6" />
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold border ${info.color}`}>
                          {info.label}
                        </span>
                      </div>

                      {/* User Info */}
                      <h3 className="text-base font-bold text-white group-hover:text-orange-300 transition-colors">
                        {user.nombre}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        @{user.username}
                      </p>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300 font-semibold group-hover:text-white">
                      <span>Ingresar perfil</span>
                      <LogIn className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal / Card overlay for Password Entry */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
              
              {/* Header inside modal */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${getRoleBadge(selectedUser.rol).iconBg}`}>
                    {React.createElement(getRoleBadge(selectedUser.rol).icon, { className: 'w-5 h-5' })}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-white leading-tight">
                      {selectedUser.nombre}
                    </h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${getRoleBadge(selectedUser.rol).color}`}>
                      {getRoleBadge(selectedUser.rol).label}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Volver"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Contraseña de Acceso</span>
                    <span className="text-[11px] text-orange-400/90 lowercase font-normal italic">
                      Clave demo: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-orange-300 font-mono not-italic">{getRoleBadge(selectedUser.rol).demoPass}</code>
                    </span>
                  </label>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingrese su contraseña..."
                      autoFocus
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-sm transition-all border border-slate-700"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="submit"
                    disabled={authenticating}
                    className="w-2/3 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authenticating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Iniciar Sesión</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-900 z-10">
        CAPS N° 1 Dr. Sabatto — Sistema de Gestión de Medicamentos & Red de Efectores Bonaerenses v2.0
      </footer>
    </div>
  );
};
