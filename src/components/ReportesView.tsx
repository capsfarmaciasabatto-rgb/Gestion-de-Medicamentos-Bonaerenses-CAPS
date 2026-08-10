import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Building2, Package, Printer, Pill, Users, Calendar, TrendingUp, 
  CheckCircle2, AlertTriangle, ShieldCheck, Activity, Search, ArrowUpRight, Clock, Award, Filter
} from 'lucide-react';
import { StockEfector, RolUsuario } from '../types';
import { openCleanPrintWindow } from '../utils/pdfPrint';

interface ReportesViewProps {
  stockEfectores: StockEfector[];
  activeRol?: RolUsuario;
  onSelectPaciente?: (dni: string) => void;
}

interface EstadisticasFarmaceuticas {
  kpis: {
    totalEntregas: number;
    totalUnidadesDispensadas: number;
    pacientesAtendidosUnicos: number;
    promedioUnidadesPorEntrega: string;
    diaPicoDispensacion: string;
    totalPrescripcionesCount: number;
    countEntregadasCompletas: number;
    countEntregadasParciales: number;
    countPendientes: number;
    countLiberadas: number;
    pctCompletas: number;
    pctParciales: number;
    pctPendientes: number;
  };
  diasSemana: { dia: string; orden: number; entregasCount: number; totalUnidades: number }[];
  evolucionMensual: { mesIso: string; mesNombre: string; entregasCount: number; totalUnidades: number }[];
  evolucionDiaria: { fechaIso: string; entregasCount: number; totalUnidades: number }[];
  topMedicamentos: { generico: string; totalUnidades: number; entregasCount: number; pacientesUnicos: number; categoria: string }[];
  categoriasTerapeuticas: { categoria: string; totalUnidades: number; entregasCount: number; pacientesUnicos: number; porcentaje: number; topDroga: string }[];
  rankingCumplidores: { dni: string; pacienteNombre: string; efectorCarga: string; totalPrescripciones: number; totalEntregadasCompletas: number; totalUnidadesEntregadas: number; tasaCumplimiento: number; drogas: string }[];
  rankingBajaAdherencia: { id: number; dni: string; pacienteNombre: string; efectorCarga: string; generico: string; saldoPendiente: number; diasSinRetirar: number; fechaPrescripcion: string; esCronico: boolean }[];
  estacionalidadMeses: string[];
}

export const ReportesView: React.FC<ReportesViewProps> = ({
  stockEfectores,
  activeRol = 'ADMIN',
  onSelectPaciente
}) => {
  const [subTab, setSubTab] = useState<'kpis' | 'dias' | 'adherencia' | 'top' | 'efectores'>('kpis');
  const [stats, setStats] = useState<EstadisticasFarmaceuticas | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters for Adherence lists
  const [searchAdherencia, setSearchAdherencia] = useState<string>('');
  const [searchRiesgo, setSearchRiesgo] = useState<string>('');

  const totalUnidadesEfectores = stockEfectores.reduce((acc, curr) => acc + curr.totalUnidadesPendientes, 0);
  const totalPacientesEfectores = stockEfectores.reduce((acc, curr) => acc + curr.pacientesCount, 0);

  const fetchEstadisticas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reportes/estadisticas-farmaceuticas');
      const data = await res.json();
      if (res.ok && data.exito) {
        setStats(data);
      } else {
        setError(data.mensaje || 'Error cargando estadísticas farmacéuticas');
      }
    } catch (err) {
      setError('Error de conexión al obtener datos de reportes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const handlePrintReport = () => {
    openCleanPrintWindow('printable-reporte-doc', 'Informe Estadístico Farmacéutico - CAPS Sabatto');
  };

  const filteredCumplidores = (stats?.rankingCumplidores || []).filter(p => 
    p.pacienteNombre.toLowerCase().includes(searchAdherencia.toLowerCase()) ||
    p.dni.includes(searchAdherencia) ||
    p.drogas.toLowerCase().includes(searchAdherencia.toLowerCase())
  );

  const filteredRiesgo = (stats?.rankingBajaAdherencia || []).filter(p => 
    p.pacienteNombre.toLowerCase().includes(searchRiesgo.toLowerCase()) ||
    p.dni.includes(searchRiesgo) ||
    p.generico.toLowerCase().includes(searchRiesgo.toLowerCase())
  );

  const maxEntregasDiaSemana = Math.max(...(stats?.diasSemana.map(d => d.entregasCount) || [1]), 1);
  const maxUnidadesTop = Math.max(...(stats?.topMedicamentos.map(m => m.totalUnidades) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
              Perfil Farmacéutico / Dirección
            </span>
            <span className="text-slate-500 text-xs">• CAPS N° 1 Dr. Sabatto</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-400" />
            Estadísticas y Reportes Farmacéuticos
          </h2>
          <p className="text-xs text-slate-400">
            Análisis de dispensaciones por día, adherencia de pacientes, ranking de drogas y estacionalidad.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchEstadisticas}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3.5 py-2 rounded-xl text-xs transition-all border border-slate-700 flex items-center gap-1.5"
            title="Actualizar métricas"
          >
            <Activity className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-orange-600/30 flex items-center gap-2"
            title="Imprimir o guardar reporte en PDF"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSubTab('kpis')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'kpis'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Indicadores Globales</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('dias')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'dias'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Días y Flujo de Atención</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('adherencia')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'adherencia'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Adherencia de Pacientes</span>
          {stats && stats.rankingBajaAdherencia.length > 0 && (
            <span className="bg-amber-500/30 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {stats.rankingBajaAdherencia.length} en riesgo
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('top')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'top'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Top Medicamentos y Patologías</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('efectores')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'efectores'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Stock Pendiente por CAPS</span>
        </button>
      </div>

      {/* Main Container Wrapper for Printing */}
      <div id="printable-reporte-doc" className="space-y-6 bg-slate-900 p-3 sm:p-5 rounded-2xl border border-slate-800">

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Activity className="w-8 h-8 text-orange-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-semibold">Procesando y generando informes estadísticos de farmacia...</p>
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-500/30 p-4 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        ) : stats && (
          <>
            {/* SUBTAB 1: INDICADORES GLOBALES */}
            {subTab === 'kpis' && (
              <div className="space-y-6">
                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Dispensaciones Realizadas
                    </span>
                    <p className="text-3xl font-black text-emerald-400 font-mono">
                      {stats.kpis.totalEntregas.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Total de actos de entrega por ventanilla
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-cyan-400" /> Unidades Entregadas
                    </span>
                    <p className="text-3xl font-black text-cyan-400 font-mono">
                      {stats.kpis.totalUnidadesDispensadas.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Promedio: {stats.kpis.promedioUnidadesPorEntrega} un. por entrega
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" /> Pacientes Atendidos
                    </span>
                    <p className="text-3xl font-black text-purple-400 font-mono">
                      {stats.kpis.pacientesAtendidosUnicos.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Personas únicas que retiraron su medicación
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" /> Día con Mayor Flujo
                    </span>
                    <p className="text-3xl font-black text-amber-400">
                      {stats.kpis.diaPicoDispensacion}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Día con más movimiento semanal en ventanilla
                    </p>
                  </div>
                </div>

                {/* Cobertura de Prescripciones */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        Tasa de Cobertura de Prescripciones Recibidas
                      </h3>
                      <p className="text-xs text-slate-400">
                        Total de prescripciones cargadas en sistema ({stats.kpis.totalPrescripcionesCount.toLocaleString('es-AR')} recetas) y su nivel de cumplimiento.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Visual Bar */}
                    <div className="w-full bg-slate-900 h-5 rounded-xl overflow-hidden border border-slate-800 flex">
                      <div 
                        style={{ width: `${stats.kpis.pctCompletas}%` }}
                        className="bg-emerald-500 h-full text-[10px] font-bold text-slate-950 flex items-center justify-center transition-all"
                        title={`Entregadas Completas: ${stats.kpis.pctCompletas}%`}
                      >
                        {stats.kpis.pctCompletas > 10 ? `${stats.kpis.pctCompletas}%` : ''}
                      </div>
                      <div 
                        style={{ width: `${stats.kpis.pctParciales}%` }}
                        className="bg-cyan-500 h-full text-[10px] font-bold text-slate-950 flex items-center justify-center transition-all"
                        title={`Entregadas Parciales: ${stats.kpis.pctParciales}%`}
                      >
                        {stats.kpis.pctParciales > 10 ? `${stats.kpis.pctParciales}%` : ''}
                      </div>
                      <div 
                        style={{ width: `${stats.kpis.pctPendientes}%` }}
                        className="bg-amber-500 h-full text-[10px] font-bold text-slate-950 flex items-center justify-center transition-all"
                        title={`Pendientes Sin Retirar: ${stats.kpis.pctPendientes}%`}
                      >
                        {stats.kpis.pctPendientes > 10 ? `${stats.kpis.pctPendientes}%` : ''}
                      </div>
                    </div>

                    {/* Breakdown Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                      <div className="bg-slate-900 p-3 rounded-xl border border-emerald-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">Completadas 100%</span>
                          <span className="bg-emerald-500/20 text-emerald-300 font-mono font-bold px-1.5 py-0.5 rounded">
                            {stats.kpis.pctCompletas}%
                          </span>
                        </div>
                        <p className="text-lg font-black text-white font-mono">{stats.kpis.countEntregadasCompletas}</p>
                        <p className="text-[10px] text-slate-400">Pacientes con 0 saldo pendiente</p>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-cyan-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-400 font-bold">Entregadas Parciales</span>
                          <span className="bg-cyan-500/20 text-cyan-300 font-mono font-bold px-1.5 py-0.5 rounded">
                            {stats.kpis.pctParciales}%
                          </span>
                        </div>
                        <p className="text-lg font-black text-white font-mono">{stats.kpis.countEntregadasParciales}</p>
                        <p className="text-[10px] text-slate-400">Retiraron parte de sus dosis</p>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-400 font-bold">Pendientes Sin Retirar</span>
                          <span className="bg-amber-500/20 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded">
                            {stats.kpis.pctPendientes}%
                          </span>
                        </div>
                        <p className="text-lg font-black text-white font-mono">{stats.kpis.countPendientes}</p>
                        <p className="text-[10px] text-slate-400">Recetas listas en espera</p>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 font-bold">Liberadas a Stock</span>
                          <span className="bg-slate-800 text-slate-300 font-mono font-bold px-1.5 py-0.5 rounded">
                            {stats.kpis.countLiberadas}
                          </span>
                        </div>
                        <p className="text-lg font-black text-white font-mono">{stats.kpis.countLiberadas}</p>
                        <p className="text-[10px] text-slate-400">Sobrantes reincorporados al stock</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: DÍAS DE ATENCIÓN Y FLUJO */}
            {subTab === 'dias' && (
              <div className="space-y-6">
                {/* Chart 1: Día de la semana */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-400" />
                        Flujo de Entregas por Día de la Semana
                      </h3>
                      <p className="text-xs text-slate-400">
                        Permite identificar los días de mayor demanda de ventanilla para reforzar la atención del personal.
                      </p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs text-amber-300 font-bold flex items-center gap-1.5">
                      <span>Día Pico:</span>
                      <span className="text-white font-mono uppercase bg-amber-600 px-2 py-0.5 rounded text-[11px]">{stats.kpis.diaPicoDispensacion}</span>
                    </div>
                  </div>

                  {/* Bars Container */}
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 pt-4">
                    {stats.diasSemana.map((d) => {
                      const pct = maxEntregasDiaSemana > 0 ? (d.entregasCount / maxEntregasDiaSemana) * 100 : 0;
                      const esPico = d.dia === stats.kpis.diaPicoDispensacion;

                      return (
                        <div 
                          key={d.dia} 
                          className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                            esPico 
                              ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10' 
                              : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${esPico ? 'text-amber-300' : 'text-slate-300'}`}>
                              {d.dia}
                            </span>
                            {esPico && (
                              <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full uppercase">
                                🔥 Pico
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className="text-xl font-black text-white font-mono">{d.entregasCount}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{d.totalUnidades} un. entregadas</p>
                          </div>

                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className={`h-full rounded-full ${esPico ? 'bg-amber-400' : 'bg-orange-500'}`}
                              style={{ width: `${Math.max(pct, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 2: Evolución Mensual */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Evolución Mensual de Entregas en Farmacia
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">Período / Mes</th>
                          <th className="p-3 text-center">Entregas Realizadas</th>
                          <th className="p-3 text-right">Total Unidades Dispensadas</th>
                          <th className="p-3 text-right">Promedio Un. / Entrega</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {stats.evolucionMensual.map((m) => {
                          const prom = m.entregasCount > 0 ? (m.totalUnidades / m.entregasCount).toFixed(1) : '0';
                          return (
                            <tr key={m.mesIso} className="hover:bg-slate-900/60 transition-colors">
                              <td className="p-3 font-bold text-white capitalize">{m.mesNombre} ({m.mesIso})</td>
                              <td className="p-3 text-center font-mono font-bold text-cyan-400">{m.entregasCount}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                {m.totalUnidades.toLocaleString('es-AR')} un.
                              </td>
                              <td className="p-3 text-right font-mono text-slate-400">{prom}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 3: ADHERENCIA DE PACIENTES */}
            {subTab === 'adherencia' && (
              <div className="space-y-6">
                {/* 1. Ranking Pacientes Cumplidores */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <Award className="w-5 h-5 text-emerald-400" />
                        Ranking de Pacientes Cumplidores (Alta Adherencia)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Pacientes con esquemas crónicos (Metformina, Losartán, Enalapril, etc.) que retiran sus dosis en fecha.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por DNI o Nombre..."
                        value={searchAdherencia}
                        onChange={(e) => setSearchAdherencia(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">Paciente / DNI</th>
                          <th className="p-3">Efector Carga</th>
                          <th className="p-3 text-center">Tasa Cumplimiento</th>
                          <th className="p-3 text-right">Unidades Retiradas</th>
                          <th className="p-3">Medicamentos Retirados</th>
                          <th className="p-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filteredCumplidores.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">
                              No se encontraron registros de pacientes con estos criterios.
                            </td>
                          </tr>
                        ) : (
                          filteredCumplidores.map((p) => (
                            <tr key={p.dni} className="hover:bg-slate-900/60 transition-colors">
                              <td className="p-3">
                                <p className="font-bold text-white">{p.pacienteNombre}</p>
                                <p className="text-[10px] text-slate-500 font-mono">DNI: {p.dni}</p>
                              </td>
                              <td className="p-3 text-slate-400 text-[11px]">{p.efectorCarga}</td>
                              <td className="p-3 text-center">
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                  {p.tasaCumplimiento}% Adherente
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                {p.totalUnidadesEntregadas} un.
                              </td>
                              <td className="p-3 text-slate-300 text-[11px] max-w-xs truncate" title={p.drogas}>
                                {p.drogas}
                              </td>
                              <td className="p-3 text-right">
                                {onSelectPaciente && (
                                  <button
                                    type="button"
                                    onClick={() => onSelectPaciente(p.dni)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 transition-all flex items-center gap-1 ml-auto"
                                  >
                                    <span>Ver Ficha</span>
                                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Pacientes en Riesgo / Discontinuados */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        Pacientes en Riesgo / Tratamiento Discontinuado (&gt;45-60 días sin retirar)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Pacientes con recetas activas que demoran más de un mes y medio en acudir a la farmacia.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por DNI o Medicamento..."
                        value={searchRiesgo}
                        onChange={(e) => setSearchRiesgo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">Paciente / DNI</th>
                          <th className="p-3">Medicamento Sin Retirar</th>
                          <th className="p-3 text-center">Días en Demora</th>
                          <th className="p-3 text-right">Saldo Pendiente</th>
                          <th className="p-3">Efector / Fecha</th>
                          <th className="p-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filteredRiesgo.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">
                              Excelente. No hay pacientes en riesgo o con demoras críticas registradas.
                            </td>
                          </tr>
                        ) : (
                          filteredRiesgo.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-900/60 transition-colors">
                              <td className="p-3">
                                <p className="font-bold text-white">{p.pacienteNombre}</p>
                                <p className="text-[10px] text-slate-500 font-mono">DNI: {p.dni}</p>
                              </td>
                              <td className="p-3">
                                <p className="font-bold text-amber-300">{p.generico}</p>
                                {p.esCronico && (
                                  <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                                    Tratamiento Crónico
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono">
                                <span className="bg-red-950/80 text-red-300 border border-red-500/30 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                  {p.diasSinRetirar} días
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-teal-400">
                                {p.saldoPendiente} un.
                              </td>
                              <td className="p-3 text-[11px] text-slate-400">
                                <p className="text-slate-300">{p.efectorCarga}</p>
                                <p className="text-[10px] text-slate-500">{p.fechaPrescripcion}</p>
                              </td>
                              <td className="p-3 text-right">
                                {onSelectPaciente && (
                                  <button
                                    type="button"
                                    onClick={() => onSelectPaciente(p.dni)}
                                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all flex items-center gap-1 ml-auto"
                                  >
                                    <span>Atender</span>
                                    <ArrowUpRight className="w-3 h-3 text-slate-950" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 4: TOP MEDICAMENTOS Y PATOLOGÍAS */}
            {subTab === 'top' && (
              <div className="space-y-6">
                {/* Top 20 Drugs Ranking */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <Pill className="w-5 h-5 text-orange-400" />
                    Top 20 Medicamentos Más Dispensados
                  </h3>

                  <div className="space-y-3">
                    {stats.topMedicamentos.map((m, idx) => {
                      const pct = maxUnidadesTop > 0 ? (m.totalUnidades / maxUnidadesTop) * 100 : 0;
                      return (
                        <div key={m.generico} className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30 font-mono font-bold text-[11px] flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-white text-sm">{m.generico}</span>
                                <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                                  {m.categoria}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-mono">
                              <span className="text-slate-400">{m.pacientesUnicos} pacientes</span>
                              <span className="text-emerald-400 font-bold text-sm">{m.totalUnidades.toLocaleString('es-AR')} un.</span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className="bg-orange-500 h-full rounded-full"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Categorías Terapéuticas / Patologías */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Distribución de Consumo por Grupo Terapéutico
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.categoriasTerapeuticas.map((cat) => (
                      <div key={cat.categoria} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{cat.categoria}</span>
                          <span className="bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-cyan-500/30">
                            {cat.porcentaje}% del total
                          </span>
                        </div>

                        <div>
                          <p className="text-2xl font-black text-cyan-400 font-mono">
                            {cat.totalUnidades.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-400">un.</span>
                          </p>
                          <p className="text-[11px] text-slate-400">{cat.pacientesUnicos} pacientes atendidos</p>
                        </div>

                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                          Droga principal: <strong className="text-slate-300">{cat.topDroga}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 5: STOCK PENDIENTE POR CAPS */}
            {subTab === 'efectores' && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-orange-400" />
                      Desglose de Medicación Pendiente por CAPS (17 Efectores)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Informe consolidado de medicación en depósito esperando distribución o retiro.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Unidades Sin Retirar</span>
                      <p className="text-2xl font-black text-amber-400 mt-1">
                        {totalUnidadesEfectores.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-300">unidades</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Pill className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase">Pacientes en Espera</span>
                      <p className="text-2xl font-black text-orange-400 mt-1">
                        {totalPacientesEfectores.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-300">personas</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Efector / Unidad Sanitaria</th>
                        <th className="p-3 text-center">Pacientes con Saldo</th>
                        <th className="p-3 text-right">Unidades Pendientes</th>
                        <th className="p-3 text-right">Proporción del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {stockEfectores.map((ef) => {
                        const pct = totalUnidadesEfectores > 0 ? ((ef.totalUnidadesPendientes / totalUnidadesEfectores) * 100).toFixed(1) : '0';
                        return (
                          <tr key={ef.efectorNombre} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3 font-bold text-white flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-500" />
                              {ef.efectorNombre}
                            </td>
                            <td className="p-3 text-center font-mono font-semibold">{ef.pacientesCount}</td>
                            <td className="p-3 text-right font-bold text-teal-400 font-mono">
                              {ef.totalUnidadesPendientes.toLocaleString('es-AR')}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                                  <div
                                    className="bg-teal-500 h-full rounded-full"
                                    style={{ width: `${Math.min(Number(pct), 100)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-slate-400">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
