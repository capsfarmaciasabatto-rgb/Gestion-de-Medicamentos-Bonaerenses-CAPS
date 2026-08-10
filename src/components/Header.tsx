import React from 'react';
import { Pill, ShieldCheck, AlertTriangle, UserCheck, LogOut } from 'lucide-react';
import { Usuario, RolUsuario } from '../types';

interface HeaderProps {
  activeRol: RolUsuario;
  activeOperador: string;
  onUserChange?: (user: Usuario) => void;
  onLogout: () => void;
  alertasCount: number;
  onNavigateAlertas: () => void;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeRol,
  activeOperador,
  onLogout,
  alertasCount,
  onNavigateAlertas,
  onNavigateHome,
}) => {

  const getRoleBadgeColor = (rol: RolUsuario) => {
    switch (rol) {
      case 'ADMIN':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'FARMACEUTICO':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'TECNICO':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'DIRECCION':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getRoleLabel = (rol: RolUsuario) => {
    switch (rol) {
      case 'ADMIN':
        return 'Administrador';
      case 'FARMACEUTICO':
        return 'Farmacéutico';
      case 'TECNICO':
        return 'Técnico';
      case 'DIRECCION':
        return 'Dirección (Lectura)';
      default:
        return rol;
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Title */}
        <div 
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-95 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover:scale-105 transition-transform">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
                Gestion de Medicamentos Bonaerenses CAPS
              </h1>
              <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium">
                v2.0 Local
              </span>
            </div>
            <p className="text-xs text-slate-400">
              CAPS N° 1 Dr. Sabatto — Farmacia & Red de Efectores Bonaerenses
            </p>
          </div>
        </div>

        {/* Active Role & Server Status */}
        <div className="flex items-center gap-3">
          {/* Active Operator Badge */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <UserCheck className="w-4 h-4 text-orange-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase leading-none">Usuario:</span>
              <span className="text-slate-100 font-bold text-xs">{activeOperador}</span>
            </div>

            {/* Role Badge */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${getRoleBadgeColor(activeRol)}`}>
              {getRoleLabel(activeRol)}
            </span>
          </div>

          {/* Server Connection Status */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Servidor Activo</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 ml-1" />
          </div>

          {/* Alert Notification Button */}
          <button
            onClick={onNavigateAlertas}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              alertasCount > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${alertasCount > 0 ? 'text-amber-400 animate-bounce' : ''}`} />
            <span className="hidden sm:inline">Alertas</span>
            {alertasCount > 0 && (
              <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                {alertasCount}
              </span>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Cerrar Sesión del sistema"
            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 hover:border-red-500/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
