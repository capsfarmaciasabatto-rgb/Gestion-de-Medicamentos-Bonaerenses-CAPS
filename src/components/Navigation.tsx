import React from 'react';
import { LayoutDashboard, FileSpreadsheet, PackageCheck, Users, Package, Bell, BarChart3, Database, UserCog } from 'lucide-react';
import { RolUsuario } from '../types';

export type TabType = 'dashboard' | 'excel' | 'efectores' | 'pacientes' | 'stock-general' | 'alertas' | 'reportes' | 'respaldos' | 'usuarios';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  alertasCount: number;
  activeRol?: RolUsuario;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  alertasCount,
  activeRol = 'ADMIN',
}) => {
  const allTabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'excel' as TabType, label: 'Cargar Excel', icon: FileSpreadsheet },
    { id: 'efectores' as TabType, label: 'Reparto por CAPS', icon: PackageCheck },
    { id: 'pacientes' as TabType, label: 'Pacientes y Entregas', icon: Users },
    { id: 'stock-general' as TabType, label: 'Stock General CAPS 1', icon: Package },
    { 
      id: 'alertas' as TabType, 
      label: 'Alertas', 
      icon: Bell, 
      badge: alertasCount > 0 ? alertasCount : undefined 
    },
    { id: 'reportes' as TabType, label: 'Estadísticas y Reportes', icon: BarChart3 },
    { id: 'respaldos' as TabType, label: 'Respaldos y Red', icon: Database },
    { id: 'usuarios' as TabType, label: 'Usuarios y Perfil', icon: UserCog },
  ];

  // Filter tabs by user role
  const tabs = allTabs.filter(t => {
    if (activeRol === 'TECNICO') {
      if (t.id === 'usuarios' || t.id === 'reportes' || t.id === 'respaldos') {
        return false;
      }
    }
    if (activeRol === 'DIRECCION' && t.id === 'usuarios') {
      return false;
    }
    return true;
  });

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors relative ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-sm shadow-orange-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
