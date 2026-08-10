import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Sparkles, 
  FileText,
  Building2,
  RefreshCw
} from 'lucide-react';
import { ExcelUploadSummary, RolUsuario } from '../types';

interface ExcelUploadViewProps {
  onUploadSuccess: () => void;
  onSeedDemo?: () => void;
  onNavigateEfectores?: () => void;
  onOpenPlanilla?: (efectorNombre: string) => void;
  activeRol?: RolUsuario;
}

export const ExcelUploadView: React.FC<ExcelUploadViewProps> = ({
  onUploadSuccess,
  onNavigateEfectores,
  onOpenPlanilla,
  activeRol = 'ADMIN',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExcelUploadSummary | null>(null);
  const [cerrarAnteriorSabatto, setCerrarAnteriorSabatto] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
      setSummary(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
      setSummary(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('archivo', file);

      let url = '/api/excel/upload';
      if (cerrarAnteriorSabatto) {
        url += '?cerrarPeriodoAnterior=true';
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      let data: any = {};
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const rawText = await response.text();
        console.error('Servidor retornó respuesta no JSON:', rawText);
        throw new Error(`El servidor respondió con un error (${response.status}): ${response.statusText || 'Error procesando archivo'}`);
      }

      if (!response.ok || !data.exito) {
        throw new Error(data.mensaje || 'Error al procesar el archivo Excel.');
      }

      setSummary(data);
      onUploadSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocurrió un error inesperado al subir el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPlantilla = () => {
    window.location.href = '/api/excel/plantilla';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-orange-400" />
              Carga de Datos desde Excel (efectores.xls)
            </h2>
            <p className="text-sm text-slate-400">
              Sube el archivo Excel provisto por la administración con los pedidos de medicación para las 17 Unidades Sanitarias.
            </p>
          </div>

          <button
            onClick={downloadPlantilla}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Descargar Plantilla (.xls)
          </button>
        </div>

        {/* 21 Columns Info */}
        <div className="mt-6 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <FileText className="w-4 h-4 text-orange-400" />
            Formato de 21 Columnas del Archivo:
          </div>
          <p className="leading-relaxed">
            El archivo debe contener las columnas oficiales: <code className="text-amber-300">EFECTOR DE CARGA</code>, <code className="text-amber-300">NRO DOCUMENTO</code>, <code className="text-amber-300">APELLIDO Y NOMBRE</code>, <code className="text-amber-300">GENERICO</code>, <code className="text-amber-300">CANTIDAD</code> (unidades/comprimidos), <code className="text-amber-300">PERIODO</code> (Mensual/Trimestral), <code className="text-amber-300">FECHA PRESCRIPCION</code>, entre otras.
          </p>
        </div>
      </div>

      {/* Upload Box */}
      {activeRol === 'DIRECCION' ? (
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-8 space-y-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-purple-200">Modo Solo Lectura (Dirección)</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Su cuenta posee el rol de Dirección/Supervisión. Puede descargar plantillas e inspeccionar la información, pero las cargas y modificaciones están restringidas.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-center">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
            file
              ? 'border-orange-500/80 bg-orange-500/5'
              : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
          }`}
        >
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            id="excel-file-input"
          />
          <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-3 w-full">
            <div className="w-16 h-16 rounded-2xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            {file ? (
              <div className="space-y-1">
                <p className="text-white font-bold text-base">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB — Haga clic para cambiar de archivo
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-white font-bold text-base">
                  Arrastre su archivo Excel aquí o haga clic para seleccionar
                </p>
                <p className="text-xs text-slate-400">
                  Archivos soportados: <span className="text-amber-300 font-mono">efectores.xls</span>, <span className="text-amber-300 font-mono">.xlsx</span>
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Option for Stock General Rollover */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-left flex items-start gap-3">
          <input
            type="checkbox"
            id="chk-cerrar-sabatto"
            checked={cerrarAnteriorSabatto}
            onChange={(e) => setCerrarAnteriorSabatto(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-900 border-slate-700"
          />
          <label htmlFor="chk-cerrar-sabatto" className="text-xs text-slate-300 cursor-pointer space-y-0.5">
            <span className="font-bold text-white block">Liberar medicación no retirada de CAPS 1 Sabatto del período anterior</span>
            <span className="text-slate-400 block text-[11px]">
              Al activar esta casilla, las unidades no retiradas por pacientes de CAPS 1 Sabatto se desasignarán y pasarán al <strong>Stock General Libre</strong> para ser usadas en nuevos inicios de tratamiento e incremento de dosis.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`w-full sm:w-auto font-bold px-8 py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
              !file || loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Procesando Excel...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Procesar y Cargar Recetas
              </>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error al procesar archivo</p>
            <p className="mt-0.5 text-xs text-red-200">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Upload Summary Result Card */}
      {summary && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-6 text-white space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-300">¡Carga Finalizada con Éxito!</h3>
              <p className="text-xs text-slate-300">{summary.mensaje}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Total Leídos</span>
              <p className="text-xl font-bold text-white">{summary.totalProcesados}</p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Nuevos Registrados</span>
              <p className="text-xl font-bold text-emerald-400">+{summary.nuevosRegistros}</p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Duplicados Omitidos</span>
              <p className="text-xl font-bold text-amber-400">{summary.omitidosDuplicados}</p>
            </div>
          </div>

          {/* Breakdown by Efectores */}
          {summary.efectoresInvolucrados && summary.efectoresInvolucrados.length > 0 && (
            <div className="pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-emerald-500/30 pt-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-400" />
                  Resumen por Efector de Carga:
                </h4>
                <p className="text-[11px] text-amber-300 font-medium">
                  ✏️ Si la cantidad física recibida difiere del Excel, haga clic en el efector para ajustar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {summary.efectoresInvolucrados.map((ef) => (
                  <button
                    key={ef.nombre}
                    type="button"
                    onClick={() => onOpenPlanilla ? onOpenPlanilla(ef.nombre) : (onNavigateEfectores && onNavigateEfectores())}
                    className="bg-slate-900/80 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-700/80 flex items-center justify-between transition-all group text-left"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-slate-200 font-bold group-hover:text-amber-300 transition-colors truncate">{ef.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded text-[11px]">
                        {ef.cantidad} reg.
                      </span>
                      <span className="bg-orange-600/30 text-orange-300 border border-orange-500/30 font-bold px-2 py-0.5 rounded text-[10px] group-hover:bg-orange-600 group-hover:text-white transition-all">
                        Ajustar / Planilla ➔
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {onNavigateEfectores && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onNavigateEfectores}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Ir a Control de Efectores (17 Unidades)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
