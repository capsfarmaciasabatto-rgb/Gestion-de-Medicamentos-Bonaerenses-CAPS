import React from 'react';
import { 
  Users, 
  Package, 
  Truck, 
  AlertCircle, 
  FileSpreadsheet, 
  Search, 
  Printer, 
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { DashboardStats, StockEfector, Entrega } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  stockEfectores: StockEfector[];
  ultimasEntregas: Entrega[];
  onNavigate: (tab: 'excel' | 'efectores' | 'pacientes' | 'alertas') => void;
  onSeedDemo: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  stockEfectores,
  ultimasEntregas,
  onNavigate,
  onSeedDemo,
}) => {
  return (
    <div className="space-y-6">
      {/* Banner Welcome when empty */}
      {(!stats || stats.totalPacientes === 0) && (
        <div className="bg-gradient-to-r from-orange-950/80 via-slate-900 to-amber-950/80 border border-orange-500/40 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold">¡Bienvenido a Gestion de Medicamentos Bonaerenses CAPS!</h2>
            </div>
            <p className="text-sm text-slate-300">
              No hay datos cargados en el sistema. Inicie la operación cargando el archivo Excel oficial <code className="bg-slate-800 px-2 py-0.5 rounded font-mono text-xs text-amber-300">efectores.xls</code>.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('excel')}
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Cargar Archivo Excel
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Pacientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pacientes</span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white">
              {stats?.totalPacientes ? stats.totalPacientes.toLocaleString('es-AR') : '0'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Registrados en el sistema
            </p>
          </div>
        </div>

        {/* Prescripciones Activas / Pendientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recetas Pendientes</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white">
              {stats?.prescripcionesPendientes ? stats.prescripcionesPendientes.toLocaleString('es-AR') : '0'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              De {stats?.totalPrescripciones || 0} totales cargadas
            </p>
          </div>
        </div>

        {/* Stock General CAPS 1 */}
        <div 
          onClick={() => onNavigate('stock-general' as any)}
          className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-5 shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock General Libre</span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-amber-400">
              {stats?.stockGeneralTotalUnidades ? stats.stockGeneralTotalUnidades.toLocaleString('es-AR') : '0'}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 group-hover:text-orange-300">
              Sobrantes CAPS 1 Sabatto <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* Entregas Hoy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entregas Hoy</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white">
              {stats?.entregasHoy ? stats.entregasHoy.toLocaleString('es-AR') : '0'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Despachos realizados
            </p>
          </div>
        </div>

        {/* Alertas Críticas */}
        <div 
          onClick={() => onNavigate('alertas')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas Activas</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white">
              {stats?.alertasTotal || 0}
            </p>
            <span className="text-xs text-amber-400 group-hover:underline flex items-center gap-1">
              Ver alertas <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Vencimientos & Sin retirar (&gt;30d)
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('excel')}
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-orange-500/50 p-5 rounded-2xl text-left transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm group-hover:text-orange-400 transition-colors">
              1. Cargar Archivo Excel
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Subir <code className="text-slate-300">efectores.xls</code> con 21 columnas
            </p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('efectores')}
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl text-left transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm group-hover:text-amber-400 transition-colors">
              2. Planillas de Envío por CAPS
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Separación y paquetes para las 17 Unidades
            </p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('pacientes')}
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl text-left transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm group-hover:text-emerald-400 transition-colors">
              3. Entregas a Pacientes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Búsqueda por DNI y registro parcial mensual
            </p>
          </div>
        </button>
      </div>

      {/* Grid: Stock per CAPS & Recent Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock por Efector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-base">Medicación Pendiente por Efector</h3>
              <p className="text-xs text-slate-400">Resumen de stock asignado a repartir por cada CAPS</p>
            </div>
            <button
              onClick={() => onNavigate('efectores')}
              className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-medium"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto pr-1">
            {stockEfectores.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No hay medicación pendiente por repartir.
              </div>
            ) : (
              stockEfectores.slice(0, 8).map((ef) => (
                <div key={ef.efectorNombre} className="py-3 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <p className="text-slate-200 font-medium">{ef.efectorNombre}</p>
                    <p className="text-xs text-slate-400">{ef.pacientesCount} pacientes en espera</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2.5 py-1 rounded-lg font-bold text-xs">
                      {ef.totalUnidadesPendientes.toLocaleString('es-AR')} un.
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimas Entregas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-base">Historial de Despachos Recientes</h3>
              <p className="text-xs text-slate-400">Últimos retiros registrados en ventanilla</p>
            </div>
            <button
              onClick={() => onNavigate('pacientes')}
              className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-medium"
            >
              Buscar Paciente <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto pr-1">
            {ultimasEntregas.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                Aún no se han registrado entregas en el día.
              </div>
            ) : (
              ultimasEntregas.map((e) => (
                <div key={e.id} className="py-3 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-semibold">{e.pacienteNombre}</span>
                      <span className="text-xs text-slate-400">(DNI {e.dni})</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <span className="text-emerald-400 font-medium">{e.cantidadEntregada} un.</span> de {e.generico} — Retiró: {e.retiranteNombre} ({e.retiranteParentesco})
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {e.fechaHora.substring(11, 16)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
