import React, { useState } from 'react';
import { 
  Building2, 
  PackageCheck, 
  Printer, 
  Users, 
  Pill, 
  Search,
  ChevronRight,
  Truck,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  History,
  ShieldCheck
} from 'lucide-react';
import { Efector, RolUsuario } from '../types';

interface EfectoresViewProps {
  efectores: Efector[];
  onOpenPlanilla: (efectorNombre: string, initialTab?: 'pendientes' | 'historial') => void;
  activeRol?: RolUsuario;
  onReloadData?: () => void;
  showToast?: (msg: string) => void;
}

export const EfectoresView: React.FC<EfectoresViewProps> = ({
  efectores,
  onOpenPlanilla,
  activeRol = 'ADMIN',
  onReloadData,
  showToast,
}) => {
  const canViewHistorial = activeRol === 'ADMIN' || activeRol === 'FARMACEUTICO' || activeRol === 'DIRECCION';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTE' | 'PREPARADO' | 'ENTREGADO' | 'SIN_MOVIMIENTOS'>('TODOS');

  // Modal States
  const [showModalForm, setShowModalForm] = useState(false);
  const [editingEfector, setEditingEfector] = useState<Efector | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    tipo: 'UNIDAD_SANITARIA',
    direccion: '',
    telefono: '',
    observaciones: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingEfector, setDeletingEfector] = useState<Efector | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isNombreSabatto = (nombre: string) => {
    const clean = nombre.toUpperCase();
    return clean.includes('SABATTO') || clean.includes('SABATO') || clean.includes('CAPS N1');
  };

  const handleOpenCreate = () => {
    setEditingEfector(null);
    setFormData({
      nombre: '',
      codigo: '',
      tipo: 'UNIDAD_SANITARIA',
      direccion: '',
      telefono: '',
      observaciones: '',
    });
    setFormError(null);
    setShowModalForm(true);
  };

  const handleOpenEdit = (ef: Efector, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEfector(ef);
    setFormData({
      nombre: ef.nombre || '',
      codigo: ef.codigo || '',
      tipo: ef.tipo || 'UNIDAD_SANITARIA',
      direccion: ef.direccion || '',
      telefono: ef.telefono || '',
      observaciones: ef.observaciones || '',
    });
    setFormError(null);
    setShowModalForm(true);
  };

  const handleOpenDelete = (ef: Efector, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingEfector(ef);
    setDeleteError(null);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setFormError('El nombre del efector es obligatorio.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const url = editingEfector
        ? `/api/efectores/${editingEfector.id}`
        : '/api/efectores';

      const method = editingEfector ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || 'Error al guardar efector.');
      }

      if (showToast) {
        showToast(data.mensaje || 'Efector guardado con éxito.');
      }

      setShowModalForm(false);
      if (onReloadData) {
        onReloadData();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error al procesar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEfector) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const res = await fetch(`/api/efectores/${deletingEfector.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || 'Error al eliminar efector.');
      }

      if (showToast) {
        showToast(data.mensaje || 'Efector eliminado con éxito.');
      }

      setDeletingEfector(null);
      if (onReloadData) {
        onReloadData();
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Error al eliminar el efector.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredEfectores = efectores.filter((ef) => {
    const matchesSearch = ef.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (ef.codigo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const estado = ef.estadoGral || ((ef.medicamentosPendientes || 0) === 0 ? ((ef.unidadesEntregadas || 0) > 0 ? 'ENTREGADO' : 'SIN_MOVIMIENTOS') : 'PENDIENTE');
    const matchesStatus = statusFilter === 'TODOS' || estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title Bar & Search & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-teal-400" />
            Efectores de Carga ({efectores.length} Unidades)
          </h2>
          <p className="text-sm text-slate-400">
            Administración de Unidades Sanitarias, CAPS y Unidades Móviles para distribución y seguimiento de stock.
          </p>
        </div>

        {/* Action button + Filter controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* New Efector Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Efector</span>
          </button>

          {/* Status Filter Buttons */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs w-full sm:w-auto overflow-x-auto">
            {(['TODOS', 'PENDIENTE', 'PREPARADO', 'ENTREGADO', 'SIN_MOVIMIENTOS'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'TODOS'
                  ? 'Todos'
                  : st === 'PENDIENTE'
                  ? 'Pendientes'
                  : st === 'PREPARADO'
                  ? 'Preparados'
                  : st === 'ENTREGADO'
                  ? 'Entregados'
                  : 'Sin Envíos'}
              </button>
            ))}
          </div>

          {/* Search filter */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of Efectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEfectores.map((ef) => {
          const tienePendientes = (ef.medicamentosPendientes || 0) > 0;
          const estado = ef.estadoGral || (!tienePendientes ? ((ef.unidadesEntregadas || 0) > 0 ? 'ENTREGADO' : 'SIN_MOVIMIENTOS') : 'PENDIENTE');
          const esSabatto = isNombreSabatto(ef.nombre);

          return (
            <div
              key={ef.id}
              className={`bg-slate-900 border rounded-2xl p-5 transition-all flex flex-col justify-between ${
                esSabatto
                  ? 'border-orange-500/50 bg-slate-900/90'
                  : estado === 'PREPARADO'
                  ? 'border-blue-500/40 bg-slate-900'
                  : estado === 'ENTREGADO'
                  ? 'border-emerald-500/40 bg-slate-900/80'
                  : estado === 'SIN_MOVIMIENTOS'
                  ? 'border-rose-900/30 bg-slate-900/40 opacity-80 hover:opacity-100'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      esSabatto
                        ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                        : ef.tipo === 'UNIDAD_MOVIL'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {ef.tipo === 'UNIDAD_MOVIL' ? (
                        <Truck className="w-5 h-5" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm leading-snug">{ef.nombre}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">{ef.codigo}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {/* Status Badge */}
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-wider ${
                      estado === 'PREPARADO'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : estado === 'ENTREGADO'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : estado === 'SIN_MOVIMIENTOS'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {estado === 'PREPARADO'
                        ? 'Preparado'
                        : estado === 'ENTREGADO'
                        ? 'Entregado'
                        : estado === 'SIN_MOVIMIENTOS'
                        ? 'Sin Envíos'
                        : 'Pendiente'}
                    </span>

                    {/* Edit / Delete Buttons */}
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(ef, e)}
                        className="p-1 text-slate-400 hover:text-orange-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar efector"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {!esSabatto && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenDelete(ef, e)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Eliminar efector"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 my-4">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" /> Pacientes
                    </span>
                    <span className="text-base font-bold text-white">
                      {ef.pacientesCount || 0}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                      <Pill className="w-3 h-3 text-slate-400" />
                      {tienePendientes ? 'Unid. Pendientes' : 'Unid. Entregadas'}
                    </span>
                    <span className={`text-base font-bold ${
                      tienePendientes
                        ? 'text-amber-400'
                        : estado === 'ENTREGADO'
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}>
                      {tienePendientes
                        ? (ef.medicamentosPendientes || 0).toLocaleString('es-AR')
                        : (ef.unidadesEntregadas || 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: Planilla de Envío + Historial (Auditoría) if Authorized */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onOpenPlanilla(ef.nombre, 'pendientes')}
                  className="w-full font-semibold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border bg-slate-800 hover:bg-slate-700 text-white border-slate-700 hover:border-orange-500/50 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-orange-400" />
                  <span>
                    {estado === 'ENTREGADO'
                      ? 'Planilla de Envío / Remisión'
                      : estado === 'SIN_MOVIMIENTOS'
                      ? 'Planilla / Sin Movimientos'
                      : 'Planilla de Envío / Armar Caja'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-500" />
                </button>

                {canViewHistorial && (
                  <button
                    type="button"
                    onClick={() => onOpenPlanilla(ef.nombre, 'historial')}
                    className="w-full font-semibold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-800/80 hover:border-emerald-500/50 shadow-sm"
                    title="Ver historial cronológico completo de entregas para auditoría de stock"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ver Historial de Entregas (Auditoría)</span>
                    <ShieldCheck className="w-3.5 h-3.5 ml-auto text-emerald-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowModalForm(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingEfector ? 'Editar Efector de Carga' : 'Nuevo Efector de Carga'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingEfector
                    ? 'Modifique la información o nombre de la unidad sanitaria.'
                    : 'Registre un nuevo centro de salud o unidad para la recepción de medicamentos.'}
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nombre del Efector <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: UNIDAD SANITARIA N° 35"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Código del Efector</label>
                  <input
                    type="text"
                    placeholder="Ej: EFEC-35"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Unidad</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="UNIDAD_SANITARIA">Unidad Sanitaria</option>
                    <option value="CAPS">CAPS / Centro Salud</option>
                    <option value="UNIDAD_MOVIL">Unidad Móvil</option>
                    <option value="HOSPITAL">Hospital / CDT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dirección / Localidad</label>
                <input
                  type="text"
                  placeholder="Ej: Calle 123 e/ 45 y 46"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingEfector ? 'Actualizar Efector' : 'Crear Efector'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingEfector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setDeletingEfector(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ¿Eliminar Efector de Carga?
                </h3>
                <p className="text-xs text-slate-400">
                  Esta acción quitará a <strong className="text-white">{deletingEfector.nombre}</strong> de la lista activa.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDeletingEfector(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
