import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserCheck, 
  Pill, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  AlertTriangle, 
  PlusCircle, 
  Printer, 
  History,
  FileText,
  Building2,
  ChevronRight,
  Edit3,
  Save,
  X,
  Package,
  RotateCcw
} from 'lucide-react';
import { Paciente, Prescripcion, Entrega, RolUsuario } from '../types';
import { isNombreSabatto } from '../data/efectoresList';

interface PacientesViewProps {
  onOpenComprobante: (entrega: Entrega, paciente: Paciente, prescripcion: Prescripcion) => void;
  preselectedDni?: string;
  activeRol?: RolUsuario;
}

export const PacientesView: React.FC<PacientesViewProps> = ({
  onOpenComprobante,
  preselectedDni,
  activeRol = 'ADMIN',
}) => {
  const [searchTerm, setSearchTerm] = useState(preselectedDni || '');
  const [searchResults, setSearchResults] = useState<Paciente[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [selectedDni, setSelectedDni] = useState<string | null>(preselectedDni || null);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [prescripciones, setPrescripciones] = useState<Prescripcion[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Delivery Modal state
  const [activePrescripcion, setActivePrescripcion] = useState<Prescripcion | null>(null);
  const [cantidadEntregar, setCantidadEntregar] = useState<number>(30);
  const [retiranteNombre, setRetiranteNombre] = useState('');
  const [retiranteDni, setRetiranteDni] = useState('');
  const [retiranteParentesco, setRetiranteParentesco] = useState('Titular (Paciente)');
  const [operadorVentanilla, setOperadorVentanilla] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Filter state for Sabatto vs Other CAPS
  const [filterType, setFilterType] = useState<'TODOS' | 'SABATTO' | 'OTROS'>('SABATTO');

  // Stock General Modal state for Patient
  const [showStockGenModal, setShowStockGenModal] = useState(false);
  const [stockGenItems, setStockGenItems] = useState<{ generico: string; cantidadDisponible: number }[]>([]);
  const [stockGenGenerico, setStockGenGenerico] = useState('');
  const [stockGenMax, setStockGenMax] = useState(0);
  const [stockGenCantidad, setStockGenCantidad] = useState(1);
  const [stockGenMotivo, setStockGenMotivo] = useState<'Nuevo Tratamiento' | 'Incremento de Dosis' | 'Sin Receta en Excel'>('Nuevo Tratamiento');
  const [stockGenObs, setStockGenObs] = useState('');
  const [submittingStockGen, setSubmittingStockGen] = useState(false);
  const [stockGenError, setStockGenError] = useState<string | null>(null);

  // Prescription physical quantity adjustment state
  const [prescToAdjust, setPrescToAdjust] = useState<Prescripcion | null>(null);
  const [adjustCantidad, setAdjustCantidad] = useState<number>(0);
  const [adjustMotivo, setAdjustMotivo] = useState<string>('');
  const [adjustingLoading, setAdjustingLoading] = useState<boolean>(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Prescription liberation / unassignment to Stock General state
  const [prescToLiberar, setPrescToLiberar] = useState<Prescripcion | null>(null);
  const [liberarCantidad, setLiberarCantidad] = useState<number>(0);
  const [liberarMotivo, setLiberarMotivo] = useState<string>('');
  const [liberandoLoading, setLiberandoLoading] = useState<boolean>(false);
  const [liberarError, setLiberarError] = useState<string | null>(null);

  // Delivery cancellation modal state
  const [entregaToAnular, setEntregaToAnular] = useState<Entrega | null>(null);
  const [anulandoLoading, setAnulandoLoading] = useState<boolean>(false);
  const [anularError, setAnularError] = useState<string | null>(null);

  // Revert dispatch modal state
  const [showConfirmRevertirSabatto, setShowConfirmRevertirSabatto] = useState<boolean>(false);
  const [revertirLoading, setRevertirLoading] = useState<boolean>(false);
  const [revertirError, setRevertirError] = useState<string | null>(null);

  const handleOpenLiberarModal = (p: Prescripcion) => {
    setPrescToLiberar(p);
    setLiberarCantidad(p.saldoPendiente);
    setLiberarMotivo('Desasignación de receta e ingreso a Stock General CAPS 1');
    setLiberarError(null);
  };

  const handleSubmitLiberarPresc = async () => {
    if (!prescToLiberar) return;
    if (liberarCantidad <= 0 || isNaN(liberarCantidad)) {
      setLiberarError('La cantidad a desasignar debe ser mayor a 0.');
      return;
    }

    setLiberandoLoading(true);
    setLiberarError(null);

    try {
      const res = await fetch(`/api/prescripciones/${prescToLiberar.id}/liberar-a-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: liberarCantidad,
          motivo: liberarMotivo || 'Desasignado de paciente e ingresado a Stock General',
          operador: localStorage.getItem('activeOperador') || 'Farm. Sabatto (Operador)'
        })
      });

      const resData = await res.json();
      if (resData.exito) {
        setPrescToLiberar(null);
        if (selectedDni) {
          fetchPatientDetails(selectedDni);
        }
      } else {
        setLiberarError(resData.mensaje || 'Error al liberar a stock general.');
      }
    } catch (err) {
      console.error(err);
      setLiberarError('Error de conexión con el servidor.');
    } finally {
      setLiberandoLoading(false);
    }
  };

  const handleOpenAnularModal = (e: Entrega) => {
    setEntregaToAnular(e);
    setAnularError(null);
  };

  const confirmarAnularEntrega = async () => {
    if (!entregaToAnular) return;
    setAnulandoLoading(true);
    setAnularError(null);

    try {
      const res = await fetch(`/api/entregas/${entregaToAnular.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.exito) {
        setEntregaToAnular(null);
        if (selectedDni) {
          fetchPatientDetails(selectedDni);
        }
      } else {
        setAnularError(data.mensaje || 'Error anulando la entrega');
      }
    } catch (err) {
      setAnularError('Error de conexión al anular la entrega');
    } finally {
      setAnulandoLoading(false);
    }
  };

  const handleRevertirDespachoGeneralSabatto = async () => {
    setRevertirLoading(true);
    setRevertirError(null);

    try {
      const res = await fetch(`/api/efectores/CAPS%20N1%20Dr%20Sabatto/revertir`, { method: 'POST' });
      const data = await res.json();
      if (data.exito) {
        setShowConfirmRevertirSabatto(false);
        if (selectedDni) fetchPatientDetails(selectedDni);
        fetchPacientes(searchTerm);
      } else {
        setRevertirError(data.mensaje || 'Error revirtiendo el despacho.');
      }
    } catch (err) {
      setRevertirError('Error de conexión con el servidor.');
    } finally {
      setRevertirLoading(false);
    }
  };

  const handleOpenAdjustModal = (p: Prescripcion) => {
    setPrescToAdjust(p);
    setAdjustCantidad(p.cantidadTotal);
    setAdjustMotivo('Ajuste de cantidad física recibida');
    setAdjustError(null);
  };

  const handleSubmitAdjustPresc = async () => {
    if (!prescToAdjust) return;
    if (adjustCantidad < 0 || isNaN(adjustCantidad)) {
      setAdjustError('La cantidad debe ser mayor o igual a 0.');
      return;
    }

    setAdjustingLoading(true);
    setAdjustError(null);

    try {
      const res = await fetch(`/api/prescripciones/${prescToAdjust.id}/ajustar-cantidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidadReal: adjustCantidad,
          motivo: adjustMotivo || 'Ajuste de cantidad física recibida',
          operador: localStorage.getItem('activeOperador') || 'Farm. Sabatto (Operador)'
        })
      });

      const resData = await res.json();
      if (resData.exito) {
        setPrescToAdjust(null);
        if (selectedDni) {
          fetchPatientDetails(selectedDni);
        }
      } else {
        setAdjustError(resData.mensaje || 'Error al guardar el ajuste.');
      }
    } catch (err) {
      console.error(err);
      setAdjustError('Error de conexión con el servidor.');
    } finally {
      setAdjustingLoading(false);
    }
  };

  const fetchStockGenForPatient = async () => {
    try {
      const res = await fetch('/api/stock-general');
      const data = await res.json();
      setStockGenItems(data.items || []);
      if (data.items && data.items.length > 0) {
        setStockGenGenerico(data.items[0].generico);
        setStockGenMax(data.items[0].cantidadDisponible);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenStockGenModal = () => {
    fetchStockGenForPatient();
    setStockGenCantidad(1);
    setStockGenMotivo('Nuevo Tratamiento');
    setStockGenObs('');
    setStockGenError(null);
    setShowStockGenModal(true);
  };

  const handleSubmitStockGenPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaciente || !stockGenGenerico || stockGenCantidad <= 0) {
      setStockGenError('Seleccione un medicamento y una cantidad válida.');
      return;
    }

    if (stockGenCantidad > stockGenMax) {
      setStockGenError(`La cantidad excede el stock disponible (${stockGenMax} un.).`);
      return;
    }

    setSubmittingStockGen(true);
    setStockGenError(null);

    try {
      const res = await fetch('/api/stock-general/dispensar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generico: stockGenGenerico,
          cantidad: stockGenCantidad,
          dniPaciente: selectedPaciente.dni,
          pacienteNombre: selectedPaciente.apellidoNombre,
          motivo: `${stockGenMotivo}${stockGenObs ? ` - ${stockGenObs}` : ''}`,
          retiranteNombre: selectedPaciente.apellidoNombre,
          retiranteDni: selectedPaciente.dni,
          retiranteParentesco: 'Titular (Paciente)',
          operador: localStorage.getItem('activeOperador') || 'Farm. Sabatto (Operador)'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || 'Error dispensando medicamento de Stock General.');
      }

      setShowStockGenModal(false);
      // Reload patient details to update delivery history
      if (selectedDni) {
        const resP = await fetch(`/api/pacientes/${selectedDni}`);
        const dataP = await resP.json();
        setPrescripciones(dataP.prescripciones || []);
        setEntregas(dataP.entregas || []);
      }
    } catch (err: any) {
      setStockGenError(err.message);
    } finally {
      setSubmittingStockGen(false);
    }
  };

  // Helper to check if a patient belongs to CAPS 1 Sabatto
  const isPacienteSabatto = (efectorCarga?: string) => {
    return isNombreSabatto(efectorCarga);
  };

  useEffect(() => {
    if (selectedDni) {
      fetchPatientDetails(selectedDni);
    }
  }, [selectedDni]);

  // Initial load and debounced search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPacientes(searchTerm);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPacientes = async (term: string) => {
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/pacientes?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error buscando pacientes:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectPatientFromSearch = (patient: Paciente) => {
    setSelectedDni(patient.dni);
    setSearchTerm(patient.apellidoNombre);
  };

  const fetchPatientDetails = async (dni: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/pacientes/${dni}`);
      if (!res.ok) throw new Error('Paciente no encontrado');
      const data = await res.json();
      setSelectedPaciente(data.paciente);
      setPrescripciones(data.prescripciones || []);
      setEntregas(data.entregas || []);

      // Auto set retirante default
      if (data.paciente) {
        setRetiranteNombre(data.paciente.apellidoNombre);
        setRetiranteDni(data.paciente.dni);
      }
    } catch (err) {
      console.error('Error cargando detalles:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openDeliveryModal = (p: Prescripcion) => {
    setActivePrescripcion(p);
    // Suggest 30 or remaining balance
    const sugerido = Math.min(30, p.saldoPendiente);
    setCantidadEntregar(sugerido > 0 ? sugerido : p.saldoPendiente);
    if (selectedPaciente) {
      setRetiranteNombre(selectedPaciente.apellidoNombre);
      setRetiranteDni(selectedPaciente.dni);
    }
    setRetiranteParentesco('Titular (Paciente)');
    setOperadorVentanilla(localStorage.getItem('activeOperador') || 'Farm. Sabatto (Operador)');
    setObservaciones('');
    setDeliveryError(null);
  };

  const handleRegisterDelivery = async () => {
    if (!activePrescripcion) return;

    if (cantidadEntregar <= 0 || cantidadEntregar > activePrescripcion.saldoPendiente) {
      setDeliveryError(`Cantidad inválida. Máximo disponible: ${activePrescripcion.saldoPendiente} un.`);
      return;
    }

    setSubmittingDelivery(true);
    setDeliveryError(null);

    try {
      const res = await fetch('/api/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescripcionId: activePrescripcion.id,
          cantidadEntregada: Number(cantidadEntregar),
          retiranteNombre,
          retiranteDni,
          retiranteParentesco,
          observaciones,
          operador: operadorVentanilla.trim() || localStorage.getItem('activeOperador') || 'Farm. Sabatto (Operador)'
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || 'Error registrando entrega.');
      }

      // Close modal & reload patient details
      setActivePrescripcion(null);
      if (selectedDni) {
        fetchPatientDetails(selectedDni);
      }
    } catch (err: any) {
      setDeliveryError(err?.message || 'Error al procesar la entrega.');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-orange-400" />
              Despacho y Ventanilla de Medicación
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              La dispensación por ventanilla se realiza a pacientes del <strong className="text-orange-300">CAPS N° 1 Dr. Sabatto</strong>. Los demás CAPS redistribuyen sus entregas de manera interna.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setFilterType('SABATTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'SABATTO'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nuestros (CAPS 1)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('OTROS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'OTROS'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Otros CAPS
            </button>
            <button
              type="button"
              onClick={() => setFilterType('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'TODOS'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Search Bar Input Form with Buscar Button & Autocomplete */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            fetchPacientes(searchTerm);
          }}
          className="relative space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por DNI, Apellido o Nombre (ej: 17512587 o DURE)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-10 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 shadow-inner font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    fetchPacientes('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/60"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-3.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </button>
          </div>

          {/* Autocomplete Suggestions Box */}
          {searchTerm.trim().length > 0 && searchResults.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-2xl space-y-1 z-20 max-h-60 overflow-y-auto">
              <p className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">
                Sugerencias encontradas ({searchResults.length}):
              </p>
              {searchResults.slice(0, 6).map((p) => {
                const esSabatto = isPacienteSabatto(p.efectorCarga);
                return (
                  <button
                    key={p.dni}
                    type="button"
                    onClick={() => handleSelectPatientFromSearch(p)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-white group-hover:text-orange-400 transition-colors">
                        {p.apellidoNombre}
                      </span>
                      <span className="text-slate-400 font-mono">DNI: {p.dni}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      esSabatto ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {esSabatto ? 'CAPS 1 Sabatto' : p.efectorCarga}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Results Sidebar / List (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {(() => {
            const filteredResults = searchResults.filter((p) => {
              const esSabatto = isPacienteSabatto(p.efectorCarga);
              if (filterType === 'SABATTO') return esSabatto;
              if (filterType === 'OTROS') return !esSabatto;
              return true;
            });

            return (
              <>
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Resultados ({filteredResults.length})
                  </h3>
                  {filterType === 'SABATTO' && (
                    <span className="text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                      Solo CAPS 1 Sabatto
                    </span>
                  )}
                  {filterType === 'OTROS' && (
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Otros Efectores
                    </span>
                  )}
                </div>

                {loadingSearch ? (
                  <div className="py-8 text-center text-xs text-slate-500">Buscando en la base de datos...</div>
                ) : filteredResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                    <p>No se encontraron pacientes en este filtro.</p>
                    {filterType === 'SABATTO' && searchResults.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterType('TODOS')}
                        className="text-orange-400 underline font-semibold text-xs"
                      >
                        Ver todos los resultados ({searchResults.length})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredResults.map((p) => {
                      const isSelected = selectedDni === p.dni;
                      const esSabatto = isPacienteSabatto(p.efectorCarga);
                      return (
                        <button
                          key={p.dni}
                          onClick={() => setSelectedDni(p.dni)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-orange-600/20 border-orange-500 text-white shadow-md'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="space-y-1 truncate pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm truncate">{p.apellidoNombre}</p>
                              {esSabatto ? (
                                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                  CAPS 1
                                </span>
                              ) : (
                                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-medium px-1.5 py-0.2 rounded shrink-0">
                                  Redistribución
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">DNI: <span className="text-slate-200 font-mono">{p.dni}</span></p>
                            <p className="text-[11px] text-amber-400 font-medium truncate">{p.efectorCarga}</p>
                          </div>

                          <div className="text-right shrink-0">
                            {(p.saldoTotalPendiente || 0) > 0 ? (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {p.saldoTotalPendiente} un.
                              </span>
                            ) : (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Completo
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Patient Details & Prescriptions (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedDni ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="font-semibold text-white">Seleccione un paciente de la lista</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Consulte las recetas del paciente y recuerde que solo se dispensa en ventanilla a los pacientes pertenecientes al CAPS N° 1 Dr. Sabatto.
              </p>
            </div>
          ) : loadingDetails ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              Cargando ficha del paciente...
            </div>
          ) : selectedPaciente ? (
            <div className="space-y-6">
              {/* Patient Profile Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-2xl font-black text-white">{selectedPaciente.apellidoNombre}</h3>
                      {isPacienteSabatto(selectedPaciente.efectorCarga) ? (
                        <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" /> Paciente Ventanilla CAPS 1 Sabatto
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-amber-400" /> Redistribución a {selectedPaciente.efectorCarga}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span>DNI: <strong className="text-slate-200 font-mono">{selectedPaciente.dni}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-300 font-medium">
                        <Building2 className="w-3.5 h-3.5" />
                        {selectedPaciente.efectorCarga}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Efector de Origen</span>
                    <span className="text-xs font-bold text-white">{selectedPaciente.efectorCarga}</span>
                  </div>
                </div>

                {/* Banner origin info */}
                {!isPacienteSabatto(selectedPaciente.efectorCarga) ? (
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3.5 space-y-1 text-xs text-amber-200">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Paciente de Redistribución (Pertenece a {selectedPaciente.efectorCarga})</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      La dispensación habitual de este paciente se realiza en su propio CAPS. En CAPS 1 Sabatto únicamente redistribuimos la medicación agrupada en la <strong>Planilla de Envío</strong> para enviársela a su efector de origen.
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-3 flex items-center gap-2 text-xs text-orange-200">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span><strong>Paciente Propio CAPS 1 Sabatto:</strong> Medicación para dispensación directa en nuestra ventanilla de farmacia.</span>
                  </div>
                )}

                {/* Prescriptions Table */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Pill className="w-4 h-4 text-orange-400" />
                      Medicación Prescripta en Excel
                    </h4>

                    {activeRol !== 'DIRECCION' && (
                      <button
                        onClick={handleOpenStockGenModal}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Dispensar desde Stock General (Nuevo Tratamiento)
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {prescripciones.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">No hay prescripciones activas cargadas.</p>
                    ) : (
                      (() => {
                      // Group prescriptions by normalized generic medication name
                      const sameMedGroupMap: Record<string, Prescripcion[]> = {};
                      prescripciones.forEach(p => {
                        const genKey = (p.generico || '').trim().toUpperCase();
                        if (!sameMedGroupMap[genKey]) sameMedGroupMap[genKey] = [];
                        sameMedGroupMap[genKey].push(p);
                      });

                      return prescripciones.map((p) => {
                        const esCompleto = p.saldoPendiente <= 0;
                        const esAlertaVencido = (p.diasParaVencer || 0) < 0;
                        const esAlertaProximo = (p.diasParaVencer || 0) >= 0 && (p.diasParaVencer || 0) <= 7;

                        const genKey = (p.generico || '').trim().toUpperCase();
                        const group = sameMedGroupMap[genKey] || [];
                        const hasMultipleSameMed = group.length > 1;
                        const totalIndex = group.findIndex(item => item.id === p.id);
                        const orderTotal = totalIndex + 1;

                        const pendingGroup = group.filter(item => item.saldoPendiente > 0);
                        const pendingIndex = pendingGroup.findIndex(item => item.id === p.id);
                        const isFirstPending = pendingIndex === 0;
                        const orderPending = pendingIndex + 1;

                        return (
                          <div
                            key={p.id}
                            className={`bg-slate-950 border rounded-2xl p-5 space-y-4 transition-all ${
                              esCompleto
                                ? 'border-slate-800 opacity-90'
                                : isFirstPending && hasMultipleSameMed
                                ? 'border-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-500/5'
                                : esAlertaProximo
                                ? 'border-amber-500/50 bg-amber-950/10'
                                : 'border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-base font-bold text-white flex items-center gap-2">
                                    {p.generico}
                                    {p.presentacion && (
                                      <span className="text-xs font-normal text-slate-400">({p.presentacion})</span>
                                    )}
                                  </h5>

                                  {hasMultipleSameMed && (
                                    p.saldoPendiente > 0 ? (
                                      isFirstPending ? (
                                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                          <span>🥇 Sale 1°</span>
                                          <span className="text-[10px] opacity-90 font-normal">({orderTotal}° de {group.length} prescriptas)</span>
                                        </span>
                                      ) : (
                                        <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                          <span>Sale {orderPending}°</span>
                                          <span className="text-[10px] text-slate-400 font-normal">({orderTotal}° de {group.length} prescriptas)</span>
                                        </span>
                                      )
                                    ) : (
                                      <span className="bg-slate-800/80 text-slate-400 border border-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                        {orderTotal}° de {group.length} (Ya Entregada)
                                      </span>
                                    )
                                  )}
                                </div>

                                <p className="text-xs text-slate-400 mt-1">
                                  Período: <strong className="text-slate-200">{p.periodo}</strong> — Prescripto el <strong className="text-amber-300">{p.fechaPrescripcion}</strong> (Vence el {p.fechaVencimiento})
                                </p>


                                {esAlertaVencido && !esCompleto && (
                                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 mt-1 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                                    <span>Receta cargada en término. Medicación habilitada para entregar en ventanilla.</span>
                                  </p>
                                )}
                              </div>

                              <div>
                                {esCompleto ? (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Retiro Completo
                                  </span>
                                ) : (isPacienteSabatto(p.efectorCarga) || isPacienteSabatto(selectedPaciente?.efectorCarga)) && p.estado !== 'PREPARADO' ? (
                                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1" title="Requiere presionar 'Marcar PREPARADO (Habilitar Ventanilla)' en la Planilla del CAPS 1">
                                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Pendiente 'Marcar PREPARADO'
                                  </span>
                                ) : esAlertaVencido ? (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1" title="Receta cargada a tiempo en el sistema, habilitada para entrega">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Habilitado para Ventanilla
                                  </span>
                                ) : esAlertaProximo ? (
                                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Vence en {p.diasParaVencer}d
                                  </span>
                                ) : (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Habilitado para Ventanilla
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantities Row */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Vino (Excel)</span>
                                <span className="text-lg font-bold text-white">{p.cantidadTotal} un.</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Lleva Entregado</span>
                                <span className="text-lg font-bold text-emerald-400">{p.cantidadEntregada} un.</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo Pendiente</span>
                                <span className={`text-lg font-bold ${p.saldoPendiente > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                  {p.saldoPendiente} un.
                                </span>
                              </div>
                            </div>

                            {/* Delivery Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                              <span className="text-xs text-slate-400 font-medium">
                                {!esCompleto ? (
                                  <>Disponible para retirar: <strong className="text-amber-300 font-bold">{p.saldoPendiente} un.</strong></>
                                ) : (
                                  <span className="text-emerald-400 font-semibold">✓ Tratamiento entregado completo ({p.cantidadTotal} un.)</span>
                                )}
                              </span>

                              <div className="flex items-center gap-2">
                                {!esCompleto && (activeRol === 'ADMIN' || activeRol === 'FARMACEUTICO') && (
                                  !((isPacienteSabatto(p.efectorCarga) || isPacienteSabatto(selectedPaciente?.efectorCarga)) && p.estado !== 'PREPARADO') && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLiberarModal(p)}
                                      className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 hover:border-teal-500/60 font-bold px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                      title="Desasignar del paciente e ingresar directamente al Stock General libre de la Farmacia"
                                    >
                                      <Package className="w-3.5 h-3.5 text-teal-400" />
                                      <span>Liberar a Stock</span>
                                    </button>
                                  )
                                )}

                                {!esCompleto && activeRol !== 'DIRECCION' && (
                                  (isPacienteSabatto(p.efectorCarga) || isPacienteSabatto(selectedPaciente?.efectorCarga)) && p.estado !== 'PREPARADO' ? (
                                    <div className="bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs px-3.5 py-2 rounded-xl font-medium flex items-center gap-2 shadow-sm">
                                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                      <span>Pendiente de Habilitación. Presione <strong>"Marcar PREPARADO"</strong> en Planilla CAPS 1.</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openDeliveryModal(p)}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                                    >
                                      <PlusCircle className="w-4 h-4" />
                                      <span>Dispensar ({p.saldoPendiente} un.)</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                  </div>
                </div>

                {/* Delivery Logs History */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-teal-400" />
                      Historial de Entregas Realizadas
                    </h4>

                    {entregas.some(e => e.retiranteParentesco === 'DESPACHO GENERAL') && (activeRol === 'ADMIN' || activeRol === 'FARMACEUTICO') && (
                      <button
                        type="button"
                        onClick={() => {
                          setRevertirError(null);
                          setShowConfirmRevertirSabatto(true);
                        }}
                        className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        title="Revertir el despacho general masivo y restaurar todo el saldo a pendiente"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>⏪ Revertir Despacho General CAPS 1</span>
                      </button>
                    )}
                  </div>

                  {entregas.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No se han registrado entregas previas para este paciente.</p>
                  ) : (
                    <div className="divide-y divide-slate-800 bg-slate-950 border border-slate-800 rounded-xl max-h-60 overflow-y-auto">
                      {entregas.map((e) => (
                        <div key={e.id} className="p-3 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <p className="font-bold text-white">
                              {e.generico} — <span className="text-emerald-400">{e.cantidadEntregada} un.</span>
                            </p>
                            <p className="text-slate-400">
                              Retiró: <strong className="text-slate-300">{e.retiranteNombre}</strong> (DNI {e.retiranteDni} - {e.retiranteParentesco})
                              {e.operador && <span className="text-orange-400 font-medium ml-2">| Operador: {e.operador}</span>}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">📅 {e.fechaHora}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const matchP = prescripciones.find((pr) => pr.id === e.prescripcionId) || prescripciones[0];
                                if (matchP && selectedPaciente) {
                                  onOpenComprobante(e, selectedPaciente, matchP);
                                }
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <Printer className="w-3 h-3 text-teal-400" />
                              Comprobante
                            </button>

                            {(activeRol === 'ADMIN' || activeRol === 'FARMACEUTICO') && (
                              <button
                                type="button"
                                onClick={() => handleOpenAnularModal(e)}
                                className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-semibold text-[11px] transition-all cursor-pointer hover:scale-105 active:scale-95"
                                title="Anular esta entrega y reincorporar las unidades al saldo del paciente"
                              >
                                <RotateCcw className="w-3 h-3 text-red-400" />
                                Anular
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal: Register Delivery */}
      {activePrescripcion && selectedPaciente && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Registrar Entrega de Medicación
              </h3>
              <button
                onClick={() => setActivePrescripcion(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Item summary */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <p className="text-white font-bold text-sm">{activePrescripcion.generico}</p>
              <p className="text-slate-400">
                Paciente: <strong className="text-slate-200">{selectedPaciente.apellidoNombre}</strong> (DNI {selectedPaciente.dni})
              </p>
              <p className="text-amber-400 font-semibold">
                Saldo pendiente actual: {activePrescripcion.saldoPendiente} unidades
              </p>

              {!isPacienteSabatto(selectedPaciente.efectorCarga) && (
                <div className="mt-2 bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-lg text-[11px] text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Aviso de Redistribución:</strong> Este paciente pertenece a <strong>{selectedPaciente.efectorCarga}</strong>. Habitualmente su medicación se envía agrupada en el remito de su CAPS para que la dispensación la realice dicho efector.
                  </p>
                </div>
              )}
            </div>

            {/* Form Fields for Delivery */}
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-bold">
                    Cantidad a Entregar Hoy (Unidades/Comprimidos):
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Dispensación Parcial
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={activePrescripcion.saldoPendiente}
                    value={cantidadEntregar}
                    onChange={(e) => setCantidadEntregar(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-emerald-400 font-extrabold text-lg focus:outline-none focus:border-emerald-500 shadow-inner"
                  />
                  <span className="text-slate-400 font-bold text-sm shrink-0">un.</span>
                </div>

                {/* Quick Presets for Partial Dispensing */}
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Selección Rápida de Unidades:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 15, 30, 60].filter(n => n <= activePrescripcion.saldoPendiente).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCantidadEntregar(preset)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          cantidadEntregar === preset
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {preset} un. ({preset === 30 ? '1 Mes' : preset === 60 ? '2 Meses' : 'Parcial'})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCantidadEntregar(activePrescripcion.saldoPendiente)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        cantidadEntregar === activePrescripcion.saldoPendiente
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                      }`}
                    >
                      Total ({activePrescripcion.saldoPendiente} un.)
                    </button>
                  </div>
                </div>

                {/* Balance Calculation Preview */}
                <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-center text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Saldo Actual</span>
                    <span className="font-bold text-slate-300">{activePrescripcion.saldoPendiente} un.</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Entrega Hoy</span>
                    <span className="font-bold text-emerald-400">- {cantidadEntregar} un.</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nuevo Saldo</span>
                    <span className="font-bold text-amber-400">
                      {Math.max(0, activePrescripcion.saldoPendiente - (cantidadEntregar || 0))} un.
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quién Retira (Nombre):</label>
                  <input
                    type="text"
                    value={retiranteNombre}
                    onChange={(e) => setRetiranteNombre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">DNI del Retirante:</label>
                  <input
                    type="text"
                    value={retiranteDni}
                    onChange={(e) => setRetiranteDni(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Parentesco / Relación:</label>
                <select
                  value={retiranteParentesco}
                  onChange={(e) => setRetiranteParentesco(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Titular (Paciente)">Titular (El mismo paciente)</option>
                  <option value="Hijo/a">Hijo / Hija</option>
                  <option value="Cónyuge / Pareja">Cónyuge / Pareja</option>
                  <option value="Padre / Madre">Padre / Madre</option>
                  <option value="Familiar / Vecino">Familiar / Vecino</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Operador / Responsable en Ventanilla:</label>
                <input
                  type="text"
                  value={operadorVentanilla}
                  onChange={(e) => setOperadorVentanilla(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-orange-300 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observaciones (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: Retiró 1er mes de tratamiento..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {deliveryError && (
              <p className="text-red-400 text-xs font-bold">{deliveryError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActivePrescripcion(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterDelivery}
                disabled={submittingDelivery}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30"
              >
                {submittingDelivery ? 'Guardando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dispense from Stock General */}
      {showStockGenModal && selectedPaciente && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                Dispensar desde Stock General CAPS 1
              </h3>
              <button
                onClick={() => setShowStockGenModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-400">
                Paciente: <strong className="text-white">{selectedPaciente.apellidoNombre}</strong> (DNI {selectedPaciente.dni})
              </p>
              <p className="text-slate-400">
                Efector: <strong className="text-slate-300">{selectedPaciente.efectorCarga}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitStockGenPatient} className="space-y-4 text-xs">
              {stockGenError && (
                <div className="bg-red-950/60 border border-red-500/40 p-3 rounded-xl text-red-200">
                  {stockGenError}
                </div>
              )}

              {stockGenItems.length === 0 ? (
                <div className="py-4 text-center text-slate-400">
                  No hay stock disponible en el Stock General de CAPS 1 Sabatto.
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold">Medicamento del Stock Libre *</label>
                    <select
                      value={stockGenGenerico}
                      onChange={(e) => {
                        const selName = e.target.value;
                        setStockGenGenerico(selName);
                        const match = stockGenItems.find((it) => it.generico === selName);
                        setStockGenMax(match ? match.cantidadDisponible : 0);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      {stockGenItems.map((it) => (
                        <option key={it.generico} value={it.generico}>
                          {it.generico} — {it.cantidadDisponible} un. disponibles
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold">Cantidad a Entregar *</label>
                      <input
                        type="number"
                        min={1}
                        max={stockGenMax}
                        value={stockGenCantidad}
                        onChange={(e) => setStockGenCantidad(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-center focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold">Motivo</label>
                      <select
                        value={stockGenMotivo}
                        onChange={(e: any) => setStockGenMotivo(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Nuevo Tratamiento">Nuevo Tratamiento</option>
                        <option value="Incremento de Dosis">Incremento de Dosis</option>
                        <option value="Sin Receta en Excel">Sin Receta en Excel</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold">Observaciones (Opcional)</label>
                    <input
                      type="text"
                      value={stockGenObs}
                      onChange={(e) => setStockGenObs(e.target.value)}
                      placeholder="Ej: Indicación médica urgente de guardia"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStockGenModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingStockGen || stockGenItems.length === 0}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingStockGen ? 'Registrando...' : 'Confirmar Dispensación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Liberation / Unassign Modal */}
      {prescToLiberar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Desasignar e Ingresar a Stock General</h3>
              </div>
              <button onClick={() => setPrescToLiberar(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-400">Paciente: <strong className="text-white">{selectedPaciente?.apellidoNombre}</strong></p>
              <p className="text-slate-400">Medicamento: <strong className="text-teal-300">{prescToLiberar.generico}</strong></p>
              <p className="text-slate-400">Saldo Pendiente Actual: <strong className="text-amber-400">{prescToLiberar.saldoPendiente} un.</strong></p>
            </div>

            {liberarError && (
              <div className="bg-red-950/80 border border-red-500/50 p-3 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{liberarError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">
                  Cantidad a Desasignar e Ingresar a Stock General *
                </label>
                <input
                  type="number"
                  min={1}
                  max={prescToLiberar.saldoPendiente}
                  value={liberarCantidad}
                  onChange={(e) => setLiberarCantidad(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-black text-lg focus:outline-none focus:border-teal-400 text-center"
                />
                <p className="text-[11px] text-slate-500 italic">
                  Las unidades indicadas se removerán de esta receta individual y pasarán al Stock General disponible de Farmacia para cualquier otro paciente.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">
                  Motivo de la Desasignación
                </label>
                <input
                  type="text"
                  value={liberarMotivo}
                  onChange={(e) => setLiberarMotivo(e.target.value)}
                  placeholder="Ej: Paciente no retiró / Cambio de tratamiento / Medicación sobrante disponible"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPrescToLiberar(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitLiberarPresc}
                disabled={liberandoLoading}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Package className="w-4 h-4" />
                <span>{liberandoLoading ? 'Procesando...' : 'Confirmar y Pasar a Stock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Physical Quantity Adjustment Modal */}
      {prescToAdjust && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Ajustar Cantidad Recibida</h3>
              </div>
              <button onClick={() => setPrescToAdjust(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-400">Paciente: <strong className="text-white">{selectedPaciente?.apellidoNombre}</strong></p>
              <p className="text-slate-400">Medicamento: <strong className="text-amber-300">{prescToAdjust.generico}</strong></p>
              <p className="text-slate-400">Programado en Excel: <strong className="text-slate-300">{prescToAdjust.cantidadTotal} un.</strong></p>
            </div>

            {adjustError && (
              <div className="bg-red-950/80 border border-red-500/50 p-3 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">
                  Cantidad Física Real Recibida (unidades) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={adjustCantidad}
                  onChange={(e) => setAdjustCantidad(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-black text-lg focus:outline-none focus:border-amber-400 text-center"
                />
                <p className="text-[11px] text-slate-500 italic">
                  Si recibió menos o más que lo que decía la planilla Excel, ingrese el número real recibido.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">
                  Motivo / Observación del Ajuste
                </label>
                <input
                  type="text"
                  value={adjustMotivo}
                  onChange={(e) => setAdjustMotivo(e.target.value)}
                  placeholder="Ej: Faltante de stock en caja enviada por proveedor"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPrescToAdjust(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitAdjustPresc}
                disabled={adjustingLoading}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{adjustingLoading ? 'Guardando...' : 'Guardar Ajuste Real'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Anular Entrega */}
      {entregaToAnular && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-white">Anular Entrega Realizada</h3>
              </div>
              <button onClick={() => setEntregaToAnular(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <p className="text-slate-400">Medicamento: <strong className="text-white text-sm">{entregaToAnular.generico}</strong></p>
              <p className="text-slate-400">Cantidad a Reincorporar: <strong className="text-emerald-400 text-sm">{entregaToAnular.cantidadEntregada} unidades</strong></p>
              <p className="text-slate-400">Retiró: <strong className="text-slate-200">{entregaToAnular.retiranteNombre}</strong> ({entregaToAnular.retiranteParentesco})</p>
              <p className="text-slate-400">Fecha y Hora: <strong className="text-slate-300 font-mono">{entregaToAnular.fechaHora}</strong></p>
            </div>

            <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl">
              ⚠️ Al confirmar, se anulará este registro de entrega y las <strong>{entregaToAnular.cantidadEntregada} unidades</strong> volverán a sumarse al saldo disponible para que puedan ser dispensadas de nuevo.
            </p>

            {anularError && (
              <p className="text-xs text-red-400 font-bold bg-red-950/50 p-2.5 rounded-lg border border-red-500/30">
                {anularError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEntregaToAnular(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAnularEntrega}
                disabled={anulandoLoading}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{anulandoLoading ? 'Anulando...' : 'Confirmar Anulación'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Revertir Despacho Sabatto */}
      {showConfirmRevertirSabatto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Revertir Despacho General CAPS 1</h3>
              </div>
              <button onClick={() => setShowConfirmRevertirSabatto(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
              ¿Desea REVERTIR el Despacho General de <strong>CAPS N° 1 Dr. Sabatto</strong>? Esto restablecerá todas las recetas de CAPS 1 a estado PENDIENTE con su saldo total original para ser dispensadas por ventanilla.
            </p>

            {revertirError && (
              <p className="text-xs text-red-400 font-bold bg-red-950/50 p-2.5 rounded-lg border border-red-500/30">
                {revertirError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmRevertirSabatto(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRevertirDespachoGeneralSabatto}
                disabled={revertirLoading}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{revertirLoading ? 'Revertiendo...' : 'Sí, Revertir Despacho'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
