import React, { useEffect, useState, useRef } from 'react';
import { 
  Printer, 
  X, 
  Building2, 
  PackageCheck, 
  CheckCircle2, 
  Users, 
  Pill, 
  AlertCircle,
  History,
  RotateCcw,
  Clock,
  ArrowUp,
  Edit3,
  Save,
  FileEdit,
  Search,
  ArrowRight,
  Snowflake,
  Filter
} from 'lucide-react';
import { RolUsuario } from '../types';
import { isNombreSabatto } from '../data/efectoresList';
import { openCleanPrintWindow } from '../utils/pdfPrint';

interface PrintPlanillaModalProps {
  efectorNombre: string | null;
  onClose: () => void;
  onDeliverySuccess?: () => void;
  activeRol?: RolUsuario;
  initialTab?: 'pendientes' | 'historial';
}

export const PrintPlanillaModal: React.FC<PrintPlanillaModalProps> = ({
  efectorNombre,
  onClose,
  onDeliverySuccess,
  activeRol = 'ADMIN',
  initialTab,
}) => {
  const canViewHistorial = activeRol === 'ADMIN' || activeRol === 'FARMACEUTICO' || activeRol === 'DIRECCION';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'historial'>(
    initialTab === 'historial' && canViewHistorial ? 'historial' : 'pendientes'
  );
  const [viewMode, setViewMode] = useState<'consolidada' | 'detallada'>('consolidada');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [despachando, setDespachando] = useState(false);
  const [showConfirmDespacho, setShowConfirmDespacho] = useState(false);
  const [showConfirmRevertir, setShowConfirmRevertir] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Selection state for partial dispatch
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Helper to detect cold chain / insulins
  const isCadenaFrio = (item: any): boolean => {
    const text = ((item?.generico || '') + ' ' + (item?.presentacion || '')).toUpperCase();
    const keywords = ['INSULIN', 'NPH', 'GLARGINA', 'DETEMIR', 'DEGLUDEC', 'LISPRO', 'ASPART', 'HELADERA', 'COLD', 'CADENA DE FRIO', 'VACUNA', 'SUERO', 'INTERFERON', 'OXITOCINA'];
    return keywords.some(kw => text.includes(kw));
  };

  // Adjustment state
  const [itemToAdjust, setItemToAdjust] = useState<any | null>(null);
  const [adjustCantidad, setAdjustCantidad] = useState<number>(0);
  const [adjustMotivo, setAdjustMotivo] = useState<string>('');
  const [adjustingLoading, setAdjustingLoading] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const reloadData = () => {
    if (efectorNombre) {
      setLoading(true);
      fetch(`/api/efectores/${encodeURIComponent(efectorNombre)}/planilla`)
        .then((res) => res.json())
        .then((d) => {
          setData(d);
          if (d.itemsPendientes && d.itemsPendientes.length > 0) {
            setSelectedIds(new Set(d.itemsPendientes.map((i: any) => String(i.id))));
          } else {
            setSelectedIds(new Set());
          }

          if (initialTab === 'historial' && canViewHistorial) {
            setActiveTab('historial');
          } else if (d.itemsPendientes && d.itemsPendientes.length > 0) {
            setActiveTab('pendientes');
          } else if (d.itemsEntregados && d.itemsEntregados.length > 0 && canViewHistorial) {
            setActiveTab('historial');
          } else {
            setActiveTab('pendientes');
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  };

  // Selection handlers for partial dispatch
  const handleSelectAll = () => {
    if (data?.itemsPendientes) {
      setSelectedIds(new Set(data.itemsPendientes.map((i: any) => String(i.id))));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSelectCadenaFrio = () => {
    if (data?.itemsPendientes) {
      const coldIds = data.itemsPendientes.filter((i: any) => isCadenaFrio(i)).map((i: any) => String(i.id));
      setSelectedIds(new Set(coldIds));
    }
  };

  const handleSelectSecos = () => {
    if (data?.itemsPendientes) {
      const secosIds = data.itemsPendientes.filter((i: any) => !isCadenaFrio(i)).map((i: any) => String(i.id));
      setSelectedIds(new Set(secosIds));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectMedication = (genericoName: string) => {
    if (!data?.itemsPendientes) return;
    const itemsForGen = data.itemsPendientes.filter((i: any) => String(i.generico).toUpperCase().trim() === String(genericoName).toUpperCase().trim());
    const allSelected = itemsForGen.every((i: any) => selectedIds.has(String(i.id)));

    setSelectedIds(prev => {
      const next = new Set(prev);
      itemsForGen.forEach((i: any) => {
        if (allSelected) {
          next.delete(String(i.id));
        } else {
          next.add(String(i.id));
        }
      });
      return next;
    });
  };

  const isMedicationSelected = (genericoName: string) => {
    if (!data?.itemsPendientes) return false;
    const itemsForGen = data.itemsPendientes.filter((i: any) => String(i.generico).toUpperCase().trim() === String(genericoName).toUpperCase().trim());
    if (itemsForGen.length === 0) return false;
    return itemsForGen.every((i: any) => selectedIds.has(String(i.id)));
  };

  useEffect(() => {
    reloadData();
  }, [efectorNombre]);

  // ESC key handler to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !itemToAdjust && !showConfirmDespacho && !showConfirmRevertir) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, itemToAdjust, showConfirmDespacho, showConfirmRevertir]);

  if (!efectorNombre) return null;

  const handlePrint = () => {
    openCleanPrintWindow('printable-planilla-doc', `Planilla ${efectorNombre}`);
  };

  const getActiveOperador = () => {
    return localStorage.getItem('activeOperador') || 'Farm. Sabatto (Operador)';
  };

  const handleMarcarEstado = async (nuevoEstado: 'PENDIENTE' | 'PREPARADO') => {
    if (isNombreSabatto(efectorNombre) && nuevoEstado === 'PREPARADO' && selectedIds.size === 0) {
      setMensajeError('Por favor seleccione al menos un medicamento (tildando su casilla) para habilitarlo en Ventanilla.');
      return;
    }

    setDespachando(true);
    setMensajeExito(null);
    setMensajeError(null);
    try {
      const res = await fetch(`/api/efectores/${encodeURIComponent(efectorNombre)}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevoEstado,
          usuario: getActiveOperador(),
          operador: getActiveOperador(),
          prescripcionIds: Array.from(selectedIds)
        })
      });
      const resData = await res.json();
      if (resData.exito) {
        setMensajeExito(resData.mensaje || `Estado cambiado a ${nuevoEstado}`);
        reloadData();
        if (onDeliverySuccess) onDeliverySuccess();
      } else {
        setMensajeError(resData.mensaje || 'Error al cambiar estado');
      }
    } catch (err) {
      console.error(err);
      setMensajeError('Error de conexión con el servidor.');
    } finally {
      setDespachando(false);
    }
  };

  const ejecutarDespachar = async () => {
    setDespachando(true);
    setShowConfirmDespacho(false);
    setMensajeExito(null);
    setMensajeError(null);
    try {
      const res = await fetch(`/api/efectores/${encodeURIComponent(efectorNombre)}/despachar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: getActiveOperador(),
          operador: getActiveOperador(),
          prescripcionIds: Array.from(selectedIds)
        })
      });
      const resData = await res.json();
      if (resData.exito) {
        setMensajeExito(resData.mensaje);
        reloadData();
        if (onDeliverySuccess) onDeliverySuccess();
      } else {
        setMensajeError(resData.mensaje || 'Error al procesar el despacho.');
      }
    } catch (err) {
      console.error(err);
      setMensajeError('Error de conexión con el servidor.');
    } finally {
      setDespachando(false);
    }
  };

  const ejecutarRevertir = async () => {
    setDespachando(true);
    setShowConfirmRevertir(false);
    setMensajeExito(null);
    setMensajeError(null);
    try {
      const res = await fetch(`/api/efectores/${encodeURIComponent(efectorNombre)}/revertir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const resData = await res.json();
      if (resData.exito) {
        setMensajeExito(resData.mensaje);
        reloadData();
        if (onDeliverySuccess) onDeliverySuccess();
      } else {
        setMensajeError(resData.mensaje || 'Error al reabrir el despacho.');
      }
    } catch (err) {
      setMensajeError('Error de conexión con el servidor.');
    } finally {
      setDespachando(false);
    }
  };

  const handleOpenAdjustModal = (item: any) => {
    setItemToAdjust(item);
    setAdjustCantidad(item.cantidadTotal !== undefined ? item.cantidadTotal : (item.saldoPendiente !== undefined ? item.saldoPendiente : 0));
    setAdjustMotivo('');
    setMensajeError(null);
  };

  const handleSaveAdjust = async () => {
    if (!itemToAdjust) return;
    if (adjustCantidad < 0 || isNaN(adjustCantidad)) {
      setMensajeError('La cantidad debe ser un número válido mayor o igual a 0.');
      return;
    }

    setAdjustingLoading(true);
    setMensajeError(null);
    setMensajeExito(null);

    try {
      const res = await fetch(`/api/prescripciones/${itemToAdjust.id}/ajustar-cantidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidadReal: adjustCantidad,
          motivo: adjustMotivo || 'Ajuste de cantidad física recibida',
          operador: getActiveOperador()
        })
      });

      const resData = await res.json();
      if (resData.exito) {
        setMensajeExito(resData.mensaje);
        setItemToAdjust(null);
        reloadData();
        if (onDeliverySuccess) onDeliverySuccess();
      } else {
        setMensajeError(resData.mensaje || 'Error al guardar el ajuste de cantidad.');
      }
    } catch (err) {
      console.error(err);
      setMensajeError('Error de conexión con el servidor.');
    } finally {
      setAdjustingLoading(false);
    }
  };

  const estadoGral = data?.estadoGral || 'PENDIENTE';
  const hasPendientes = (data?.itemsPendientes?.length || 0) > 0;
  const hasEntregados = (data?.itemsEntregados?.length || 0) > 0;

  // Active items and summary based on tab and search filter
  const rawItems = activeTab === 'pendientes' ? (data?.itemsPendientes || []) : (data?.itemsEntregados || []);
  const rawSummary = activeTab === 'pendientes' ? (data?.resumenPendientes || []) : (data?.resumenEntregados || []);

  const displayItems = rawItems.filter((item: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (item.pacienteNombre && item.pacienteNombre.toLowerCase().includes(q)) ||
      (item.dni && item.dni.toString().includes(q)) ||
      (item.generico && item.generico.toLowerCase().includes(q))
    );
  });

  const displaySummary = rawSummary.filter((m: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return m.generico && m.generico.toLowerCase().includes(q);
  });

  const displayPacientes = activeTab === 'pendientes' ? (data?.totalPacientesPendientes || 0) : (data?.totalPacientesEntregados || 0);
  const displayUnidades = activeTab === 'pendientes' ? (data?.totalUnidadesPendientes || 0) : (data?.totalUnidadesEntregadas || 0);

  const selectedPendingItems = (data?.itemsPendientes || []).filter((i: any) => selectedIds.has(String(i.id)));
  const selectedPendingUnits = selectedPendingItems.reduce((acc: number, item: any) => {
    const val = item.saldoPendiente !== undefined ? item.saldoPendiente : item.cantidadTotal;
    return acc + (Number(val) || 0);
  }, 0);
  const totalPendingItemsCount = data?.itemsPendientes?.length || 0;
  const isPartialDispatch = selectedIds.size < totalPendingItemsCount;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:m-0 print:p-0 print:shadow-none print:max-w-none print:max-h-none printable-document my-auto">
        
        {/* Sticky Screen Controls Header (Hidden when printing) */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-white flex-shrink-0 z-20 space-y-4 no-print print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-orange-600 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  Gestión y Planilla — {efectorNombre}
                </h3>
                <p className="text-xs text-slate-500">
                  Planilla de armado para caja de reparto e historial de entregas realizadas
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar Input */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 w-full sm:w-64 no-print">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar paciente, DNI o droga..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 font-medium focus:outline-none w-full placeholder-slate-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1">
                    ✕
                  </button>
                )}
              </div>

              {/* View Mode Toggle (Consolidada vs Detallada) */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('consolidada')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'consolidada'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>Totales por Medicamento</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('detallada')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'detallada'
                      ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/50'
                      : 'bg-amber-100 text-amber-950 hover:bg-amber-200 font-extrabold border border-amber-300'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5 text-orange-600" />
                  <span>✏️ Detalle y Ajustar Recibido</span>
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all"
                title="Abrir ventana de impresión (permite imprimir o guardar como PDF)"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Imprimir / Guardar PDF (A4)</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 border border-slate-300 transition-colors"
                title="Cerrar planilla (o presione ESC)"
              >
                <X className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Cerrar (ESC)</span>
              </button>
            </div>
          </div>

          {/* Main Tab Bar: Envíos Pendientes vs Historial Entregado */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('pendientes')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                  activeTab === 'pendientes'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Envíos Pendientes de Armado</span>
                {hasPendientes && (
                  <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px]">
                    {data?.totalUnidadesPendientes || 0} un.
                  </span>
                )}
              </button>

              {canViewHistorial && (
                <button
                  type="button"
                  onClick={() => setActiveTab('historial')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                    activeTab === 'historial'
                      ? 'bg-emerald-700 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Acceso exclusivo de auditoría para Administrador, Farmacéutico y Director"
                >
                  <History className="w-4 h-4 text-emerald-300" />
                  <span>Historial Cronológico de Entregas (Auditoría)</span>
                  {hasEntregados && (
                    <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-[10px]">
                      {data?.totalUnidadesEntregadas || 0} un.
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Actions related to current active tab */}
            {activeTab === 'pendientes' && hasPendientes && activeRol !== 'DIRECCION' && (
              <div className="flex items-center gap-2">
                {isNombreSabatto(efectorNombre) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMarcarEstado('PREPARADO')}
                      disabled={despachando || selectedIds.size === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      title="Habilita únicamente los medicamentos seleccionados (tildados) para su dispensación o liberación a stock en Ventanilla"
                    >
                      <PackageCheck className="w-4 h-4 text-emerald-200" />
                      <span>
                        {selectedIds.size === (data?.itemsPendientes?.length || 0)
                          ? 'Marcar PREPARADO (Habilitar TODO en Ventanilla)'
                          : `Marcar PREPARADO (${selectedIds.size} seleccionados - Habilitar Ventanilla)`
                        }
                      </span>
                    </button>

                    {((data?.itemsPendientes?.filter((i: any) => i.estado === 'PREPARADO').length || 0) > 0) && (
                      <button
                        type="button"
                        onClick={() => handleMarcarEstado('PENDIENTE')}
                        disabled={despachando || selectedIds.size === 0}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="Vuelve a poner los medicamentos seleccionados en estado Pendiente (los deshabilita de Ventanilla)"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Volver a Pendiente ({selectedIds.size} sel.)</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMarcarEstado(estadoGral === 'PREPARADO' ? 'PENDIENTE' : 'PREPARADO')}
                      disabled={despachando}
                      className={`font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all border ${
                        estadoGral === 'PREPARADO'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                      }`}
                      title="Marca la caja de envío como PREPARADA"
                    >
                      <PackageCheck className="w-4 h-4 text-emerald-600" />
                      <span>
                        {estadoGral === 'PREPARADO' ? 'Caja PREPARADA' : 'Marcar PREPARADO (Caja Armada)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowConfirmDespacho(true)}
                      disabled={despachando}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                      title="Confirma la entrega y despacho de la caja a esta Unidad Sanitaria"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Marcar ENTREGADO / DESPACHADO (Redistribuir)</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === 'historial' && hasEntregados && (activeRol === 'ADMIN' || activeRol === 'FARMACEUTICO') && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmRevertir(true)}
                  disabled={despachando}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 transition-all"
                  title="Permite volver este lote a estado pendiente en caso de error"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                  <span>Reabrir / Revertir Despacho</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Document Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:p-0 print:overflow-visible">
          
          {/* Informative Workflow Banner */}
          {isNombreSabatto(efectorNombre) ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 text-xs text-orange-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-orange-600 shrink-0" />
                <div>
                  <span className="font-extrabold text-orange-900 block">
                    CAPS N° 1 DR. SABATTO — FARMACIA CENTRAL (ATENCIÓN Y DISPENSACIÓN EN VENTANILLA)
                  </span>
                  <span className="text-orange-800 text-[11px]">
                    El stock recibido de la remisión queda disponible en Farmacia Sabatto para dispensar <strong>paciente por paciente</strong> a medida que se presentan en ventanilla (pestaña "Pacientes y Entregas").
                  </span>
                </div>
              </div>
              <span className="bg-orange-200 text-orange-900 font-bold px-3 py-1 rounded-lg text-[10px] uppercase tracking-wide shrink-0">
                Dispensación por Ventanilla
              </span>
            </div>
          ) : (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 text-xs text-teal-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-teal-600 shrink-0" />
                <div>
                  <span className="font-extrabold text-teal-900 block">
                    {efectorNombre} — REDISTRIBUCIÓN DE CAJAS A UNIDAD SANITARIA
                  </span>
                  <span className="text-teal-800 text-[11px]">
                    Los medicamentos para este efector se preparan en caja en Farmacia Sabatto y se redistribuyen/envían a la Unidad Sanitaria de destino.
                  </span>
                </div>
              </div>
              <span className="bg-teal-200 text-teal-900 font-bold px-3 py-1 rounded-lg text-[10px] uppercase tracking-wide shrink-0">
                Redistribución a CAPS
              </span>
            </div>
          )}

          {/* Confirmation Dialog Box for Despachar */}
          {showConfirmDespacho && (
            <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl text-xs space-y-3 no-print shadow-md">
              <div className="flex items-start gap-3">
                <PackageCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 w-full">
                  <h4 className="font-extrabold text-amber-950 text-sm">
                    ¿Confirmar Despacho / Entrega {isPartialDispatch ? 'Parcial' : 'Completa'} a {efectorNombre}?
                  </h4>

                  {isPartialDispatch ? (
                    <div className="bg-sky-50 border border-sky-300 p-3 rounded-lg text-xs text-sky-950 space-y-1">
                      <p className="font-bold text-sky-900 flex items-center gap-1.5">
                        <Snowflake className="w-4 h-4 text-sky-600" />
                        <span>ENTREGA PARCIAL DETECTADA:</span>
                      </p>
                      <p>
                        Se despacharán únicamente <strong>{selectedIds.size} de {totalPendingItemsCount} prescripciones</strong> ({selectedPendingUnits} unidades) que tiene seleccionadas (ej: Cadena de Frío / Insulinas).
                      </p>
                      <p className="text-sky-800 font-semibold bg-sky-100/70 p-1.5 rounded">
                        Las <strong>{totalPendingItemsCount - selectedIds.size} prescripciones restantes</strong> seguirán en estado <span className="bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-bold">PENDIENTE</span> para la entrega posterior (ej: Medicamentos Secos).
                      </p>
                    </div>
                  ) : (
                    <p className="text-amber-800 font-medium mt-0.5">
                      Se registrará la entrega completa de <strong>{data?.totalUnidadesPendientes || 0} unidades</strong> ({data?.itemsPendientes?.length || 0} ítems) para <strong>{efectorNombre}</strong>.
                      Esto cambiará el estado a <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 font-mono">ENTREGADO</span>.
                    </p>
                  )}

                  {isNombreSabatto(efectorNombre) && (
                    <div className="bg-red-100 border border-red-300 p-2.5 rounded-lg text-[11px] text-red-950 font-bold my-1 space-y-1">
                      <p>⚠️ <strong>ATENCIÓN VENTANILLA CAPS 1 SABATTO:</strong></p>
                      <p>
                        Los pacientes de CAPS 1 retiran individualmente por ventanilla. Si confirma, se marcarán como ENTREGADOS los ítems seleccionados.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDespacho(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 bg-white border border-slate-300 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarDespachar}
                  disabled={despachando || selectedIds.size === 0}
                  className="px-5 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-extrabold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {despachando
                      ? 'Procesando Despacho...'
                      : (isPartialDispatch
                          ? `Sí, Despachar ${selectedIds.size} ítems (${selectedPendingUnits} un.)`
                          : 'Sí, Confirmar Entregado / Despachado Total')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Dialog Box for Revertir */}
          {showConfirmRevertir && (
            <div className="bg-slate-100 border-2 border-teal-600 p-4 rounded-xl text-xs space-y-3 no-print shadow-lg">
              <div className="flex items-start gap-3">
                <RotateCcw className="w-6 h-6 text-teal-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      ¿Reabrir y Revertir Despacho de {efectorNombre}?
                    </h4>
                    <span className="bg-teal-100 text-teal-800 border border-teal-300 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase">
                      Exclusivo Farmacéutico / Admin
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    Las recetas marcadas como entregadas volverán a estado <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-mono">PENDIENTE</span> para corregir el pedido o rearmar la caja de envío.
                  </p>
                  <p className="text-[11px] text-teal-900 font-bold bg-teal-50 p-2 rounded-lg border border-teal-200">
                    🔒 Seguridad: Esta acción queda registrada en la auditoría del sistema bajo la responsabilidad técnica del Farmacéutico/Administrador.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmRevertir(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 bg-white border border-slate-300 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarRevertir}
                  disabled={despachando}
                  className="px-5 py-2 rounded-xl text-white bg-teal-700 hover:bg-teal-800 font-extrabold shadow-md flex items-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-amber-300" />
                  <span>{despachando ? 'Reabriendo...' : 'Confirmar Reversión (Autorización Farmacéutica)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {mensajeError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{mensajeError}</span>
              </div>
              <button onClick={() => setMensajeError(null)} className="text-rose-500 hover:text-rose-800 font-bold">✕</button>
            </div>
          )}

          {/* Success Alert */}
          {mensajeExito && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{mensajeExito}</span>
              </div>
              <button onClick={() => setMensajeExito(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
            </div>
          )}

          {/* Printable Document Content */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-medium">Generando planilla y consultando registros...</div>
          ) : !data ? (
            <div className="py-12 text-center text-red-500 font-medium">Error al cargar datos del efector.</div>
          ) : (
            <div id="printable-planilla-doc" className="space-y-6 print:space-y-4 bg-white p-4 sm:p-6 rounded-xl">
              {/* Header Document */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    GESTION DE MEDICAMENTOS BONAERENSES CAPS
                  </h1>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {activeTab === 'historial'
                      ? (viewMode === 'consolidada'
                          ? 'HISTORIAL Y MANIFIESTO DE ENTREGAS REALIZADAS (POR MEDICAMENTO)'
                          : 'HISTORIAL Y COMPROBANTE DE RECEPCIÓN NOMINAL POR PACIENTE')
                      : (viewMode === 'consolidada' 
                          ? 'PLANILLA CONSOLIDADA DE PEDIDO Y REPARTO POR MEDICAMENTO'
                          : 'MANIFIESTO DE ENVÍO Y PLANILLA DE RECEPCIÓN POR PACIENTE')}
                  </p>
                  <p className="text-xs text-slate-500">
                    Farmacia Central CAPS N1 Dr Sabatto — Red de Salud Bonaerense
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 inline-block">
                    <span className="text-[10px] uppercase font-bold text-orange-700 block">DESTINO / UNIDAD SANITARIA</span>
                    <span className="text-sm font-black text-orange-950">{data.efectorNombre}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Fecha Emisión: <strong>{data.fechaEmision}</strong>
                  </p>
                </div>
              </div>

              {/* Metrics Summary Box */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold">
                <div>Pacientes: <strong className="text-slate-900 font-black">{displayPacientes}</strong></div>
                <div>Ítems Registrados: <strong className="text-slate-900 font-black">{displayItems.length}</strong></div>
                <div>Total Unidades: <strong className="text-orange-700 font-black">{displayUnidades} un.</strong></div>
                <div>
                  Estado:{' '}
                  <strong className={
                    activeTab === 'historial'
                      ? 'text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-black'
                      : estadoGral === 'PREPARADO'
                      ? 'text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-black'
                      : 'text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-black'
                  }>
                    {activeTab === 'historial'
                      ? 'ENTREGADO / EN HISTORIAL'
                      : estadoGral === 'PREPARADO'
                      ? 'PAQUETE PREPARADO'
                      : 'PENDIENTE ARMADO'}
                  </strong>
                </div>
              </div>

              {/* QUICK SELECTION BAR FOR PARTIAL DELIVERIES */}
              {activeTab === 'pendientes' && hasPendientes && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-white space-y-3 no-print shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="w-4 h-4 text-orange-400 shrink-0" />
                      <span className="font-extrabold text-slate-200">
                        Selección para Entregas Parciales (Heladera vs Secos):
                      </span>
                      <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-slate-700">
                        Seleccionados: <strong className="text-orange-400">{selectedIds.size}</strong> de {totalPendingItemsCount} ítems (<strong className="text-orange-400">{selectedPendingUnits} un.</strong>)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                      <button
                        type="button"
                        onClick={handleSelectCadenaFrio}
                        className="bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-700/80 px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
                        title="Selecciona únicamente insulinas y productos que requieren refrigeración/heladera"
                      >
                        <Snowflake className="w-3.5 h-3.5 text-sky-400" />
                        <span>Solo Heladera / Insulinas ({data.itemsPendientes.filter((i: any) => isCadenaFrio(i)).length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSelectSecos}
                        className="bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-700/80 px-3 py-1.5 rounded-lg font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
                        title="Selecciona todos los medicamentos secos/generales"
                      >
                        <Pill className="w-3.5 h-3.5 text-amber-400" />
                        <span>Solo Secos / General ({data.itemsPendientes.filter((i: any) => !isCadenaFrio(i)).length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg font-bold transition-all"
                      >
                        Todos
                      </button>

                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 px-2 py-1.5 rounded-lg font-bold transition-all"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* NO ITEMS MESSAGE IF EMPTY */}
              {displayItems.length === 0 && (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <p className="text-sm font-bold text-slate-700">
                    {activeTab === 'pendientes'
                      ? 'No hay medicamentos pendientes de envío para este efector.'
                      : 'Aún no se registraron entregas en el historial para este efector.'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeTab === 'pendientes' && hasEntregados
                      ? 'Puede consultar el historial de entregas realizadas en la pestaña superior.'
                      : 'Esta Unidad Sanitaria no posee demandas activas.'}
                  </p>
                </div>
              )}

              {/* VIEW 1: CONSOLIDATED SUMMARY BY MEDICATION */}
              {viewMode === 'consolidada' && displayItems.length > 0 && (
                <div className="space-y-3">
                  {/* Adjustment Banner */}
                  {activeTab === 'pendientes' && (
                    <div className="bg-amber-50 border-2 border-amber-400 p-3.5 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <FileEdit className="w-5 h-5 text-orange-600 shrink-0" />
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">
                            ¿Necesita ajustar la cantidad real física recibida?
                          </p>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Si la cantidad real recibida en el envío difiere de lo programado por el Excel, ingrese al <strong>"Detalle por Paciente"</strong> o toque <strong>"Ajustar Pacientes"</strong> en la fila del medicamento.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewMode('detallada')}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shrink-0 flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <span>Ir a Detalle y Ajustar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-orange-600" />
                      {activeTab === 'historial'
                        ? 'Resumen Consolidado de Medicamentos Entregados (Auditoría / Reclamos)'
                        : 'Resumen General de Medicamentos Solicitados (Para Armado de Cajas)'}
                    </h4>
                    <span className="text-[11px] text-slate-500 italic">
                      {activeTab === 'historial' ? 'Totales acumulados despachados' : 'Totales para armado'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                          {activeTab === 'pendientes' && (
                            <th className="p-2.5 border border-slate-900 w-10 text-center no-print">Sel.</th>
                          )}
                          <th className="p-2.5 border border-slate-900 w-12 text-center">#</th>
                          <th className="p-2.5 border border-slate-900">Medicamento (Monodroga / Genérico)</th>
                          <th className="p-2.5 border border-slate-900 text-center w-36">Pacientes Beneficiarios</th>
                          <th className="p-2.5 border border-slate-900 text-center w-40 bg-orange-950 text-orange-200">
                            {activeTab === 'historial' ? 'Total Unidades Entregadas' : 'Total Unidades a Enviar'}
                          </th>
                          {activeTab === 'pendientes' && (
                            <th className="p-2.5 border border-slate-900 text-center w-36 no-print">Acción / Ajustar</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 text-slate-800 font-medium">
                        {displaySummary.map((m: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {activeTab === 'pendientes' && (
                              <td className="p-2.5 border border-slate-300 text-center no-print bg-slate-50/50">
                                <input
                                  type="checkbox"
                                  checked={isMedicationSelected(m.generico)}
                                  onChange={() => toggleSelectMedication(m.generico)}
                                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
                                  title={`Seleccionar/deseleccionar todas las prescripciones de ${m.generico}`}
                                />
                              </td>
                            )}
                            <td className="p-2.5 border border-slate-300 font-mono text-center text-slate-500 font-bold">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 border border-slate-300 font-bold text-slate-900 text-sm">
                              {m.generico}
                              {m.presentacion && <span className="text-slate-500 font-normal text-xs ml-2">({m.presentacion})</span>}
                            </td>
                            <td className="p-2.5 border border-slate-300 text-center font-bold text-slate-700">
                              {m.totalPacientes} paciente(s)
                            </td>
                            <td className="p-2.5 border border-slate-300 text-center font-black text-orange-700 bg-orange-50/50 text-base">
                              {m.totalUnidades} un.
                            </td>
                            {activeTab === 'pendientes' && (
                              <td className="p-2.5 border border-slate-300 text-center no-print">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchQuery(m.generico);
                                    setViewMode('detallada');
                                  }}
                                  className="bg-orange-100 hover:bg-orange-200 text-orange-950 border border-orange-300 font-extrabold px-2.5 py-1 rounded-lg text-[11px] flex items-center justify-center gap-1 mx-auto transition-all shadow-2xs"
                                  title={`Ver pacientes y ajustar la cantidad recibida de ${m.generico}`}
                                >
                                  <FileEdit className="w-3.5 h-3.5 text-orange-700" />
                                  <span>Ajustar Pacientes</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: DETAILED LIST BY PATIENT */}
              {viewMode === 'detallada' && displayItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-orange-600" />
                      {activeTab === 'historial'
                        ? 'Detalle Nominal de Medicamentos Entregados por Paciente'
                        : 'Detalle Nominal por Paciente y Receta'}
                    </h4>
                    <span className="text-[11px] text-slate-500 italic no-print">
                      {activeTab === 'pendientes' && 'Permite ajustar la cantidad real recibida si difiere del Excel programado.'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                          {activeTab === 'pendientes' && (
                            <th className="p-2 border border-slate-900 w-10 text-center no-print">Sel.</th>
                          )}
                          <th className="p-2 border border-slate-900 w-8 text-center">#</th>
                          <th className="p-2 border border-slate-900">Paciente (Apellido y Nombre)</th>
                          <th className="p-2 border border-slate-900">DNI</th>
                          <th className="p-2 border border-slate-900">Medicamento (Genérico)</th>
                          <th className="p-2 border border-slate-900 text-center w-24">
                            {activeTab === 'historial' ? 'Entregado' : 'Cantidad Recibida'}
                          </th>
                          <th className="p-2 border border-slate-900">Período</th>
                          {activeTab === 'pendientes' && (
                            <th className="p-2 border border-slate-900 text-center w-28 no-print">Acción / Ajuste</th>
                          )}
                          {activeTab === 'historial' && (
                            <>
                              <th className="p-2 border border-slate-900">Fecha y Hora</th>
                              <th className="p-2 border border-slate-900">Operador / Armó</th>
                            </>
                          )}
                          <th className="p-2 border border-slate-900 text-center w-28">Firma / Conformidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 text-slate-800">
                        {displayItems.map((item: any, idx: number) => {
                          const tieneAjustes = item.observaciones && item.observaciones.includes('Ajuste de Recibido');
                          return (
                            <tr key={item.id || idx} className={`hover:bg-slate-50 ${tieneAjustes ? 'bg-amber-50/40' : ''}`}>
                              {activeTab === 'pendientes' && (
                                <td className="p-2 border border-slate-300 text-center no-print bg-slate-50/50">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(String(item.id))}
                                    onChange={() => toggleSelectItem(String(item.id))}
                                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
                                    title={`Incluir u omitir esta entrega de ${item.generico} a ${item.pacienteNombre}`}
                                  />
                                </td>
                              )}
                              <td className="p-2 border border-slate-300 font-mono text-[10px] text-slate-500 text-center font-bold">{idx + 1}</td>
                              <td className="p-2 border border-slate-300 font-bold">{item.pacienteNombre}</td>
                              <td className="p-2 border border-slate-300 font-mono text-slate-700">{item.dni}</td>
                              <td className="p-2 border border-slate-300 font-semibold text-slate-900">
                                {item.generico}
                                {tieneAjustes && (
                                  <span className="block text-[10px] text-amber-700 font-normal italic mt-0.5" title={item.observaciones}>
                                    ⚠️ Cantidad Ajustada
                                  </span>
                                )}
                              </td>
                              <td className="p-2 border border-slate-300 text-center font-extrabold text-slate-900 bg-orange-50/40 text-sm">
                                {activeTab === 'historial' ? item.cantidadEntregada : (item.saldoPendiente !== undefined ? item.saldoPendiente : item.cantidadTotal)} un.
                              </td>
                              <td className="p-2 border border-slate-300 text-slate-600">{item.periodo}</td>
                              {activeTab === 'pendientes' && (
                                <td className="p-2 border border-slate-300 text-center no-print">
                                  {(activeRol === 'ADMIN' || activeRol === 'FARMACEUTICO') ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAdjustModal(item)}
                                      className="bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-300 font-extrabold px-2 py-1 rounded text-[11px] flex items-center justify-center gap-1 mx-auto transition-all shadow-2xs"
                                      title="Modificar la cantidad real física recibida de este ítem"
                                    >
                                      <FileEdit className="w-3 h-3 text-orange-700" />
                                      <span>Ajustar Recibido</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium italic">Sin permisos de ajuste</span>
                                  )}
                                </td>
                              )}
                              {activeTab === 'historial' && (
                                <>
                                  <td className="p-2 border border-slate-300 font-mono text-[11px] text-slate-700">
                                    {item.fechaEntrega || 'Reg. Anterior'}
                                  </td>
                                  <td className="p-2 border border-slate-300 font-semibold text-slate-900 text-[11px]">
                                    {item.operadorDespacho || 'Farm. Sabatto'}
                                  </td>
                                </>
                              )}
                              <td className="p-2 border border-slate-300"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Signatures Footer */}
              {displayItems.length > 0 && (
                <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2 space-y-0.5">
                    <p className="font-bold text-slate-900">Firma Farmacéutico / Responsable Envíos</p>
                    <p className="text-[10px] text-slate-500">CAPS N1 Dr. Sabatto</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2 space-y-0.5">
                    <p className="font-bold text-slate-900">Firma Responsable Recepción</p>
                    <p className="text-[10px] text-slate-500">{data.efectorNombre}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Modal Footer (Hidden when printing) */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0 z-20 no-print print:hidden rounded-b-2xl">
          <button
            type="button"
            onClick={scrollToTop}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
            title="Volver a la parte superior de la planilla"
          >
            <ArrowUp className="w-4 h-4 text-orange-600" />
            <span>Volver arriba</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 hidden sm:flex">
            <span>Total ítems: <strong className="text-slate-900 font-bold">{displayItems.length}</strong></span>
            <span>•</span>
            <span>Total unidades: <strong className="text-orange-700 font-bold">{displayUnidades} un.</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
          >
            <X className="w-4 h-4 text-amber-400" />
            <span>Cerrar Ventana</span>
          </button>
        </div>

      </div>

      {/* Quantity Adjustment Modal Dialog */}
      {itemToAdjust && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Ajustar Cantidad Real Recibida</h3>
                  <p className="text-xs text-slate-400">Ajuste de físico recibido para {efectorNombre}</p>
                </div>
              </div>
              <button
                onClick={() => setItemToAdjust(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <p><strong className="text-slate-300">Paciente:</strong> <span className="text-orange-300 font-bold">{itemToAdjust.pacienteNombre}</span> (DNI {itemToAdjust.dni})</p>
              <p><strong className="text-slate-300">Medicamento:</strong> <span className="text-white font-semibold">{itemToAdjust.generico}</span></p>
              <p><strong className="text-slate-300">Cantidad Inicial Programada:</strong> <span className="text-amber-400 font-mono font-bold">{itemToAdjust.cantidadTotal || itemToAdjust.saldoPendiente} un.</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Cantidad Realmente Recibida (Físico en Envío):
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustCantidad}
                  onChange={(e) => setAdjustCantidad(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-black text-amber-300 focus:outline-none focus:border-orange-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Si la cantidad física es menor o mayor a la programada por Excel, ingrese el valor real aquí.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Motivo / Justificación de la Diferencia:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Bulto incompleto provisión central / Rotura de frasco / Faltante"
                  value={adjustMotivo}
                  onChange={(e) => setAdjustMotivo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setItemToAdjust(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAdjust}
                disabled={adjustingLoading}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/30 flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{adjustingLoading ? 'Guardando...' : 'Confirmar Ajuste'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
