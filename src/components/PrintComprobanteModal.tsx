import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Entrega, Paciente, Prescripcion } from '../types';
import { openCleanPrintWindow } from '../utils/pdfPrint';

interface PrintComprobanteModalProps {
  entrega: Entrega | null;
  paciente: Paciente | null;
  prescripcion: Prescripcion | null;
  onClose: () => void;
}

export const PrintComprobanteModal: React.FC<PrintComprobanteModalProps> = ({
  entrega,
  paciente,
  prescripcion,
  onClose,
}) => {
  if (!entrega || !paciente) return null;

  const handlePrint = () => {
    openCleanPrintWindow('printable-comprobante-doc', `Comprobante Entrega ${paciente.dni}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6 print:m-0 print:p-0 print:shadow-none print:max-w-none printable-document">
        {/* Screen Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Comprobante de Entrega
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all"
              title="Imprimir comprobante o guardar como PDF"
            >
              <Printer className="w-4 h-4 text-white" /> Imprimir / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-1.5 rounded-xl text-xs transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Document */}
        <div id="printable-comprobante-doc" className="space-y-4 text-xs bg-white p-4 rounded-xl">
          <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
            <h2 className="text-base font-black text-slate-900">GESTION DE MEDICAMENTOS BONAERENSES CAPS</h2>
            <p className="text-[11px] font-bold text-slate-600">CAPS N°1 DR. SABATTO — FARMACIA & RED DE SALUD</p>
            <p className="text-[10px] text-slate-500">COMPROBANTE DE ENTREGA DE MEDICACIÓN</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <p><strong>Fecha y Hora de Operación:</strong> {entrega.fechaHora}</p>
            <p><strong>Operador / Ventanilla:</strong> <span className="font-bold text-orange-800">{entrega.operador || 'Farmacia CAPS Sabatto'}</span></p>
            <p><strong>Paciente:</strong> {paciente.apellidoNombre} (DNI {paciente.dni})</p>
            <p><strong>Efector de Carga:</strong> {paciente.efectorCarga}</p>
          </div>

          <div className="border border-slate-300 rounded-lg p-3 space-y-2">
            <p className="font-bold text-slate-900 border-b border-slate-200 pb-1">MEDICACIÓN ENTREGADA</p>
            <div className="flex justify-between items-center text-sm font-bold text-emerald-800">
              <span>{entrega.generico}</span>
              <span>{entrega.cantidadEntregada} comprimidos/un.</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">DATOS DE QUIEN RETIRA</p>
            <p><strong>Nombre:</strong> {entrega.retiranteNombre}</p>
            <p><strong>DNI Retirante:</strong> {entrega.retiranteDni}</p>
            <p><strong>Parentesco / Relación:</strong> {entrega.retiranteParentesco}</p>
            {entrega.observaciones && <p><strong>Obs:</strong> {entrega.observaciones}</p>}
          </div>

          <div className="pt-10 text-center border-t border-slate-300 space-y-1">
            <p className="font-bold text-slate-800">Firma del Paciente / Retirante</p>
            <p className="text-[10px] text-slate-500">Aclaro DNI: {entrega.retiranteDni}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
