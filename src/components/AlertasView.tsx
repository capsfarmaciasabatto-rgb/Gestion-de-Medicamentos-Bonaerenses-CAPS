import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  XCircle, 
  UserCheck, 
  Search, 
  Building2, 
  Pill,
  ChevronRight,
  Filter
} from 'lucide-react';

interface AlertasViewProps {
  alertasData: {
    total: number;
    sinRetirar: any[];
    proximosVencer: any[];
    vencidos: any[];
  } | null;
  onSelectPaciente: (dni: string) => void;
}

export const AlertasView: React.FC<AlertasViewProps> = ({
  alertasData,
  onSelectPaciente,
}) => {
  const [filterType, setFilterType] = useState<'TODAS' | 'SIN_RETIRAR' | 'PROXIMOS' | 'VENCIDOS'>('TODAS');

  const sinRetirar = alertasData?.sinRetirar || [];
  const proximosVencer = alertasData?.proximosVencer || [];
  const vencidos = alertasData?.vencidos || [];

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Centro de Alertas y Vencimientos
          </h2>
          <p className="text-sm text-slate-400">
            Seguimiento de medicación sin retirar (&gt;60 días) y control de vigencia de recetas.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setFilterType('TODAS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'TODAS'
                ? 'bg-orange-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({alertasData?.total || 0})
          </button>
          <button
            onClick={() => setFilterType('SIN_RETIRAR')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'SIN_RETIRAR'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sin Retirar ({sinRetirar.length})
          </button>
          <button
            onClick={() => setFilterType('PROXIMOS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'PROXIMOS'
                ? 'bg-yellow-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Próximos a Vencer ({proximosVencer.length})
          </button>
          <button
            onClick={() => setFilterType('VENCIDOS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'VENCIDOS'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Vencidos ({vencidos.length})
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sin Retirar > 60 días */}
        <div 
          onClick={() => setFilterType('SIN_RETIRAR')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Sin Retirar &gt; 60 Días
            </span>
            <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded text-xs">
              {sinRetirar.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Pacientes con recetas procesadas hace más de dos meses (&gt;60 días) que aún no se presentaron a retirar.
          </p>
        </div>

        {/* Próximos a vencer */}
        <div 
          onClick={() => setFilterType('PROXIMOS')}
          className="bg-slate-900 border border-slate-800 hover:border-yellow-500/50 p-5 rounded-2xl cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Próximos a Vencer (7d)
            </span>
            <span className="bg-yellow-500/20 text-yellow-300 font-bold px-2 py-0.5 rounded text-xs">
              {proximosVencer.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Recetas cuya vigencia trimestral o mensual expira en los próximos 7 días.
          </p>
        </div>

        {/* Vencidos */}
        <div 
          onClick={() => setFilterType('VENCIDOS')}
          className="bg-slate-900 border border-slate-800 hover:border-red-500/50 p-5 rounded-2xl cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Vencidos
            </span>
            <span className="bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded text-xs">
              {vencidos.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Tratamientos que superaron la fecha límite de cobertura sin completarse.
          </p>
        </div>
      </div>

      {/* List of Alert Items */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-white font-bold text-base">
          Listado de Alertas Activas
        </h3>

        {alertasData?.total === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            ¡Excelente! No hay alertas activas de vencimientos o demoras en retiros.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Show Sin Retirar */}
            {(filterType === 'TODAS' || filterType === 'SIN_RETIRAR') &&
              sinRetirar.map((item) => (
                <div
                  key={`sr-${item.id}`}
                  className="bg-slate-950 border border-amber-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/20 text-amber-300 font-bold text-[10px] px-2 py-0.5 rounded border border-amber-500/30">
                        SIN RETIRAR ({item.diasSinRetirar} días)
                      </span>
                      <h4 className="text-white font-bold text-sm">{item.pacienteNombre}</h4>
                      <span className="text-xs text-slate-400 font-mono">(DNI {item.dni})</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Medicamento: <strong className="text-teal-300">{item.generico}</strong> — Saldo sin entregar: <strong className="text-amber-400">{item.saldoPendiente} un.</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Efector: {item.efectorCarga}</span>
                      <span>•</span>
                      <span>Fecha Prescripción: {item.fechaPrescripcion}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectPaciente(item.dni)}
                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1 shrink-0"
                  >
                    Atender Paciente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}

            {/* Show Próximos */}
            {(filterType === 'TODAS' || filterType === 'PROXIMOS') &&
              proximosVencer.map((item) => (
                <div
                  key={`pv-${item.id}`}
                  className="bg-slate-950 border border-yellow-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-500/20 text-yellow-300 font-bold text-[10px] px-2 py-0.5 rounded border border-yellow-500/30">
                        PRÓXIMO A VENCER (en {item.diasParaVencer}d)
                      </span>
                      <h4 className="text-white font-bold text-sm">{item.pacienteNombre}</h4>
                      <span className="text-xs text-slate-400 font-mono">(DNI {item.dni})</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Medicamento: <strong className="text-teal-300">{item.generico}</strong> — Vence el {item.fechaVencimiento}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Efector: {item.efectorCarga}</span>
                      <span>•</span>
                      <span>Saldo: {item.saldoPendiente} un.</span>
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectPaciente(item.dni)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1 shrink-0"
                  >
                    Ver Paciente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}

            {/* Show Vencidos */}
            {(filterType === 'TODAS' || filterType === 'VENCIDOS') &&
              vencidos.map((item) => (
                <div
                  key={`v-${item.id}`}
                  className="bg-slate-950 border border-red-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-500/20 text-red-300 font-bold text-[10px] px-2 py-0.5 rounded border border-red-500/30">
                        VENCIDO el {item.fechaVencimiento}
                      </span>
                      <h4 className="text-white font-bold text-sm">{item.pacienteNombre}</h4>
                      <span className="text-xs text-slate-400 font-mono">(DNI {item.dni})</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Medicamento: <strong className="text-teal-300">{item.generico}</strong> — Quedaron sin retirar {item.saldoPendiente} un.
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Efector: {item.efectorCarga}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectPaciente(item.dni)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1 shrink-0 border border-slate-700"
                  >
                    Ver Ficha <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
