import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, Send, History, CheckCircle2, AlertCircle, ArrowUpRight, Plus, Sparkles, Layers, ShieldAlert, User, FileText } from 'lucide-react';
import { StockGeneralItem, MovimientoStockGeneral } from '../types';

export const StockGeneralView: React.FC = () => {
  const [items, setItems] = useState<StockGeneralItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoStockGeneral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'DISPONIBLE' | 'HISTORIAL'>('DISPONIBLE');

  // Action states
  const [closingPeriod, setClosingPeriod] = useState(false);
  const [showConfirmCloseModal, setShowConfirmCloseModal] = useState(false);
  const [closeResultMsg, setCloseResultMsg] = useState<string | null>(null);

  // Intake modal states
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [ingresoGenerico, setIngresoGenerico] = useState('');
  const [ingresoPresentacion, setIngresoPresentacion] = useState('');
  const [ingresoCantidad, setIngresoCantidad] = useState(1);
  const [ingresoMotivo, setIngresoMotivo] = useState('Recepción física directa en CAPS 1 Sabatto');
  const [submittingIngreso, setSubmittingIngreso] = useState(false);
  const [ingresoError, setIngresoError] = useState<string | null>(null);
  const [ingresoSuccessMsg, setIngresoSuccessMsg] = useState<string | null>(null);

  // Dispense modal states
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedGenerico, setSelectedGenerico] = useState('');
  const [maxDisponible, setMaxDisponible] = useState(0);
  const [dispenseDni, setDispenseDni] = useState('');
  const [dispensePaciente, setDispensePaciente] = useState('');
  const [dispenseCantidad, setDispenseCantidad] = useState(1);
  const [dispenseMotivo, setDispenseMotivo] = useState<'Nuevo Tratamiento' | 'Incremento de Dosis' | 'Otras Causas'>('Nuevo Tratamiento');
  const [dispenseObs, setDispenseObs] = useState('');
  const [submittingDispense, setSubmittingDispense] = useState(false);
  const [dispenseError, setDispenseError] = useState<string | null>(null);
  const [dispenseSuccessMsg, setDispenseSuccessMsg] = useState<string | null>(null);

  const fetchStockGeneral = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stock-general');
      if (!res.ok) throw new Error('Error al cargar Stock General');
      const data = await res.json();
      setItems(data.items || []);
      setMovimientos(data.movimientos || []);
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockGeneral();
  }, []);

  const handleExecClosePeriod = async () => {
    setClosingPeriod(true);
    setCloseResultMsg(null);
    try {
      const res = await fetch('/api/stock-general/cerrar-periodo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || 'Error al ejecutar cierre de período');
      }
      setCloseResultMsg(data.mensaje);
      setShowConfirmCloseModal(false);
      fetchStockGeneral();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setClosingPeriod(false);
    }
  };

  const handleOpenDispense = (generico: string, disponible: number) => {
    setSelectedGenerico(generico);
    setMaxDisponible(disponible);
    setDispenseCantidad(1);
    setDispenseDni('');
    setDispensePaciente('');
    setDispenseMotivo('Nuevo Tratamiento');
    setDispenseObs('');
    setDispenseError(null);
    setDispenseSuccessMsg(null);
    setShowDispenseModal(true);
  };

  const handleSubmitDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGenerico || !dispenseDni || !dispensePaciente || dispenseCantidad <= 0) {
      setDispenseError('Complete todos los campos requeridos.');
      return;
    }

    if (dispenseCantidad > maxDisponible) {
      setDispenseError(`La cantidad excede el stock disponible (${maxDisponible} un.).`);
      return;
    }

    setSubmittingDispense(true);
    setDispenseError(null);

    try {
      const res = await fetch('/api/stock-general/dispensar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generico: selectedGenerico,
          cantidad: dispenseCantidad,
          dniPaciente: dispenseDni,
          pacienteNombre: dispensePaciente,
          motivo: `${dispenseMotivo}${dispenseObs ? ` - ${dispenseObs}` : ''}`,
          operador: localStorage.getItem('activeOperador') || 'Farm. Sabatto (Operador)'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || 'Error procesando la dispensación.');
      }

      setDispenseSuccessMsg(data.mensaje);
      setTimeout(() => {
        setShowDispenseModal(false);
        fetchStockGeneral();
      }, 1500);

    } catch (err: any) {
      setDispenseError(err.message);
    } finally {
      setSubmittingDispense(false);
    }
  };

  const handleSubmitIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingresoGenerico.trim() || ingresoCantidad <= 0) {
      setIngresoError('Ingrese el nombre del medicamento y una cantidad mayor a 0.');
      return;
    }

    setSubmittingIngreso(true);
    setIngresoError(null);

    try {
      const res = await fetch('/api/stock-general/ingresar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generico: ingresoGenerico.toUpperCase().trim(),
          presentacion: ingresoPresentacion.trim() || 'Comprimidos',
          cantidad: ingresoCantidad,
          motivo: ingresoMotivo,
          operador: localStorage.getItem('activeOperador') || 'Farm. Sabatto (Operador)'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || 'Error registrando el ingreso.');
      }

      setIngresoSuccessMsg(data.mensaje);
      setTimeout(() => {
        setShowIngresoModal(false);
        setIngresoSuccessMsg(null);
        setIngresoGenerico('');
        setIngresoPresentacion('');
        setIngresoCantidad(1);
        fetchStockGeneral();
      }, 1500);

    } catch (err: any) {
      setIngresoError(err.message);
    } finally {
      setSubmittingIngreso(false);
    }
  };

  const totalUnidades = items.reduce((acc, curr) => acc + curr.cantidadDisponible, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-bold text-white">Stock General Disponible (CAPS 1 Sabatto)</h2>
              <span className="bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Sobrantes Fin de Período y Recepción Directa
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-3xl">
              Toda la medicación desasignada de pacientes o recibida directamente en el CAPS integra el <strong>Stock General de Farmacia</strong>. Disponible para nuevos inicios de tratamiento o libre dispensación a cualquier vecino.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIngresoGenerico('');
                setIngresoPresentacion('');
                setIngresoCantidad(1);
                setIngresoError(null);
                setIngresoSuccessMsg(null);
                setShowIngresoModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              title="Ingresar físicamente cajas/medicación a Stock General"
            >
              <Plus className="w-4 h-4" />
              <span>➕ Ingresar Medicación a Stock General</span>
            </button>

            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => setShowConfirmCloseModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-600/20 flex items-center gap-2"
                title="Exclusivo Farmacéutico / Admin"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Cerrar Período y Liberar Sobrantes</span>
              </button>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                🔒 Acción de Farmacéutico / Admin
              </span>
            </div>
          </div>
        </div>

        {closeResultMsg && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{closeResultMsg}</span>
            </div>
            <button onClick={() => setCloseResultMsg(null)} className="text-emerald-400 font-bold text-xs hover:underline">
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Unidades Totales Libres</span>
            <p className="text-3xl font-black text-amber-400 mt-1">
              {totalUnidades.toLocaleString('es-AR')} <span className="text-xs font-normal text-slate-400">un.</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Medicamentos Distintos</span>
            <p className="text-3xl font-black text-orange-400 mt-1">
              {items.length} <span className="text-xs font-normal text-slate-400">genéricos</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Movimientos Registrados</span>
            <p className="text-3xl font-black text-slate-200 mt-1">
              {movimientos.length} <span className="text-xs font-normal text-slate-400">registros</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('DISPONIBLE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'DISPONIBLE'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Stock General Disponible ({items.length})
        </button>
        <button
          onClick={() => setActiveSubTab('HISTORIAL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'HISTORIAL'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Historial de Movimientos ({movimientos.length})
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
          Cargando Stock General...
        </div>
      ) : activeSubTab === 'DISPONIBLE' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {items.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-white font-bold text-base">No hay medicamentos en el Stock General</p>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Al ejecutar el <strong>Cierre de Período</strong> o subir una nueva planilla Excel, la medicación no retirada por los pacientes de CAPS 1 Sabatto se transferirá automáticamente a este stock libre.
              </p>
              <button
                onClick={() => setShowConfirmCloseModal(true)}
                className="mt-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Liberar Sobrantes Ahora
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Medicamento / Genérico</th>
                    <th className="p-4">Presentación</th>
                    <th className="p-4 text-center">Unidades Disponibles</th>
                    <th className="p-4">Última Actualización</th>
                    <th className="p-4 text-right">Acción Despacho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-white font-bold text-sm">
                        {item.generico}
                      </td>
                      <td className="p-4 text-slate-400">
                        {item.presentacion || 'Comprimidos'}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black px-3 py-1 rounded-full">
                          {item.cantidadDisponible} un.
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {item.fechaActualizacion}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenDispense(item.generico, item.cantidadDisponible)}
                          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 ml-auto"
                          title="Habilitado para Operador, Farmacéutico y Admin"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispensar (Operador / Farma)</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* HISTORIAL SUBTAB */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {movimientos.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No hay movimientos registrados en el Stock General aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Fecha / Hora</th>
                    <th className="p-4">Tipo Movimiento</th>
                    <th className="p-4">Medicamento</th>
                    <th className="p-4 text-center">Cantidad</th>
                    <th className="p-4">Paciente / Motivo</th>
                    <th className="p-4">Registrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {movimientos.map((mov) => {
                    const isLiberacion = mov.tipoMovimiento === 'LIBERACION_PERIODO';
                    return (
                      <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono text-[11px] text-slate-400">
                          {mov.fechaHora}
                        </td>
                        <td className="p-4">
                          {isLiberacion ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Ingreso por Fin Período
                            </span>
                          ) : (
                            <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Dispensación / Salida
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-white font-bold">
                          {mov.generico}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-bold text-xs ${isLiberacion ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {isLiberacion ? `+${mov.cantidad}` : `-${mov.cantidad}`} un.
                          </span>
                        </td>
                        <td className="p-4 space-y-0.5">
                          {mov.pacienteNombre && (
                            <p className="font-bold text-slate-200">{mov.pacienteNombre} <span className="text-slate-400 font-normal font-mono">(DNI {mov.dniPaciente})</span></p>
                          )}
                          <p className="text-[11px] text-slate-400 italic">{mov.motivo}</p>
                        </td>
                        <td className="p-4 text-slate-400 text-[11px]">
                          {mov.usuario || 'Farmacia Sabatto'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Confirm Close Period */}
      {showConfirmCloseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-400 pb-3 border-b border-slate-800">
              <RefreshCw className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Cerrar Período y Liberar Medicación No Retirada</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción tomará toda la medicación con saldo pendiente perteneciente únicamente a los pacientes del <strong>CAPS N° 1 Dr. Sabatto</strong>:
            </p>

            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-5 font-medium">
              <li>Se removerá la asignación individual del paciente en sus recetas pendientes de este período.</li>
              <li>El stock sobrante ingresará automáticamente al <strong>Stock General Disponible de Farmacia CAPS 1</strong>.</li>
              <li>Podrá utilizar estos medicamentos libres para iniciar nuevos tratamientos a pacientes que aún no tienen su planilla de Excel o incrementar dosis.</li>
            </ul>

            <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200">
              💡 <em>Nota: Los demás CAPS de la red realizan su propio reparto de stock de forma independiente.</em>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmCloseModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecClosePeriod}
                disabled={closingPeriod}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-600/20 disabled:opacity-50"
              >
                {closingPeriod ? 'Procesando Cierre...' : 'Sí, Liberar Sobrantes a Stock General'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Direct Ingest to Stock General */}
      {showIngresoModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Ingresar Medicación a Stock General</h3>
              </div>
              <button
                onClick={() => setShowIngresoModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {ingresoSuccessMsg ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-white font-bold text-sm">{ingresoSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitIngreso} className="space-y-4">
                {ingresoError && (
                  <div className="bg-red-950/60 border border-red-500/40 p-3 rounded-xl text-xs text-red-200">
                    {ingresoError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Nombre del Medicamento / Genérico *</label>
                  <input
                    type="text"
                    required
                    value={ingresoGenerico}
                    onChange={(e) => setIngresoGenerico(e.target.value.toUpperCase())}
                    placeholder="Ej: ENALAPRIL 10 MG o PARACETAMOL 500 MG"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                  {items.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">O seleccione uno existente:</p>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {items.map(it => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => {
                              setIngresoGenerico(it.generico);
                              setIngresoPresentacion(it.presentacion || 'Comprimidos');
                            }}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold px-2 py-0.5 rounded-md border border-slate-700"
                          >
                            + {it.generico}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Presentación</label>
                    <input
                      type="text"
                      value={ingresoPresentacion}
                      onChange={(e) => setIngresoPresentacion(e.target.value)}
                      placeholder="Ej: Comprimidos, Frasco, Jarabe"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Cantidad Recibida (un.) *</label>
                    <input
                      type="number"
                      min={1}
                      value={ingresoCantidad}
                      onChange={(e) => setIngresoCantidad(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-black text-center focus:outline-none focus:border-emerald-500 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Motivo / Origen de Recepción</label>
                  <input
                    type="text"
                    value={ingresoMotivo}
                    onChange={(e) => setIngresoMotivo(e.target.value)}
                    placeholder="Ej: Entrega directa de Ministerio, Donación, Devolución o Sobrante"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowIngresoModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingIngreso}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submittingIngreso ? 'Ingresando...' : 'Ingresar a Stock General'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Dispense from Stock General */}
      {showDispenseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">Dispensar desde Stock General</h3>
              </div>
              <button
                onClick={() => setShowDispenseModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {dispenseSuccessMsg ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-white font-bold text-sm">{dispenseSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitDispense} className="space-y-4">
                {dispenseError && (
                  <div className="bg-red-950/60 border border-red-500/40 p-3 rounded-xl text-xs text-red-200">
                    {dispenseError}
                  </div>
                )}

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Medicamento Seleccionado</span>
                  <p className="text-orange-300 font-bold text-sm">{selectedGenerico}</p>
                  <p className="text-slate-400">
                    Disponible en Stock General: <strong className="text-white">{maxDisponible} unidades</strong>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">DNI del Paciente *</label>
                  <input
                    type="text"
                    required
                    value={dispenseDni}
                    onChange={(e) => setDispenseDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 30123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Apellido y Nombre del Paciente *</label>
                  <input
                    type="text"
                    required
                    value={dispensePaciente}
                    onChange={(e) => setDispensePaciente(e.target.value.toUpperCase())}
                    placeholder="Ej: PÉREZ, JUAN MANUEL"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Cantidad a Entregar *</label>
                    <input
                      type="number"
                      min={1}
                      max={maxDisponible}
                      value={dispenseCantidad}
                      onChange={(e) => setDispenseCantidad(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold text-center focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Motivo de Dispensación</label>
                    <select
                      value={dispenseMotivo}
                      onChange={(e: any) => setDispenseMotivo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="Nuevo Tratamiento">Nuevo Tratamiento</option>
                      <option value="Incremento de Dosis">Incremento de Dosis</option>
                      <option value="Otras Causas">Otras Causas</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Observaciones (Opcional)</label>
                  <input
                    type="text"
                    value={dispenseObs}
                    onChange={(e) => setDispenseObs(e.target.value)}
                    placeholder="Ej: Receta médica de guardia, inicio urgente"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDispenseModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDispense}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submittingDispense ? 'Registrando...' : 'Confirmar Dispensación'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
