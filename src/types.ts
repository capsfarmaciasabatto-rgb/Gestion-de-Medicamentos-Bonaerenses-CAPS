export interface Efector {
  id: string;
  nombre: string;
  codigo: string;
  tipo: 'CAPS' | 'UNIDAD_SANITARIA' | 'UNIDAD_MOVIL' | 'HOSPITAL' | string;
  direccion?: string;
  telefono?: string;
  observaciones?: string;
  pacientesCount?: number;
  medicamentosPendientes?: number;
  unidadesEntregadas?: number;
  prescripcionesCount?: number;
  preparadosCount?: number;
  estadoGral?: 'PENDIENTE' | 'PREPARADO' | 'ENTREGADO' | 'SIN_MOVIMIENTOS';
}

export interface Paciente {
  dni: string;
  apellidoNombre: string;
  efectorCarga: string;
  fechaNacimiento?: string;
  sexo?: string;
  domicilio?: string;
  localidad?: string;
  telefono?: string;
  fechaCreacion?: string;
  prescripcionesCount?: number;
  saldoTotalPendiente?: number;
}

export interface Prescripcion {
  id: number;
  dni: string;
  pacienteNombre: string;
  efectorCarga: string;
  generico: string;
  presentacion?: string;
  cantidadTotal: number;
  cantidadEntregada: number;
  saldoPendiente: number;
  periodo: string; // "mensual", "trimestral", etc.
  fechaPrescripcion: string; // YYYY-MM-DD
  fechaVencimiento: string; // YYYY-MM-DD
  fechaCarga: string; // YYYY-MM-DD
  nroReceta?: string;
  medico?: string;
  diagnostico?: string;
  observaciones?: string;
  estado: 'PENDIENTE' | 'PARCIAL' | 'ENTREGADO' | 'VENCIDO';
  diasParaVencer?: number;
  diasSinRetirar?: number;
  operadorDespacho?: string;
  fechaDespacho?: string;
}

export interface Entrega {
  id: number;
  prescripcionId: number;
  dni: string;
  pacienteNombre: string;
  generico: string;
  fechaHora: string;
  cantidadEntregada: number;
  retiranteNombre: string;
  retiranteDni: string;
  retiranteParentesco: string;
  observaciones?: string;
  operador?: string;
}

export interface Alerta {
  id: string;
  tipo: 'SIN_RETIRAR' | 'PROXIMO_VENCER' | 'VENCIDO';
  dni: string;
  pacienteNombre: string;
  efectorCarga: string;
  generico: string;
  detalles: string;
  diasContador: number;
  prescripcionId: number;
}

export interface ExcelRegistroPreview {
  efectorCarga: string;
  nroReceta?: string;
  tipoDoc?: string;
  dni: string;
  apellidoNombre: string;
  generico: string;
  presentacion?: string;
  cantidad: number;
  periodo: string;
  fechaPrescripcion: string;
  esDuplicado?: boolean;
}

export interface ExcelUploadSummary {
  exito: boolean;
  mensaje: string;
  nombreArchivo: string;
  totalProcesados: number;
  nuevosRegistros: number;
  omitidosDuplicados: number;
  efectoresInvolucrados: { nombre: string; cantidad: number }[];
}

export interface StockGeneralItem {
  id: number;
  generico: string;
  presentacion?: string;
  cantidadDisponible: number;
  fechaActualizacion: string;
}

export interface MovimientoStockGeneral {
  id: number;
  generico: string;
  tipoMovimiento: 'LIBERACION_PERIODO' | 'DISPENSACION_NUEVO_TRATAMIENTO' | 'INCREMENTO_DOSIS' | 'AJUSTE';
  cantidad: number;
  dniPaciente?: string;
  pacienteNombre?: string;
  motivo?: string;
  fechaHora: string;
  usuario?: string;
}

export interface DashboardStats {
  totalPacientes: number;
  totalPrescripciones: number;
  prescripcionesPendientes: number;
  entregasHoy: number;
  alertasTotal: number;
  alertasSinRetirar: number;
  alertasProximosVencer: number;
  alertasVencidos: number;
  efectoresConStock: number;
  stockGeneralTotalUnidades?: number;
}

export interface StockEfector {
  efectorNombre: string;
  pacientesCount: number;
  totalUnidadesPendientes: number;
  itemsCount: number;
}

export type RolUsuario = 'ADMIN' | 'FARMACEUTICO' | 'TECNICO' | 'DIRECCION';

export interface Usuario {
  id: number;
  username: string;
  nombre: string;
  rol: RolUsuario;
  activo: number; // 1 or 0
  fechaCreacion?: string;
}
