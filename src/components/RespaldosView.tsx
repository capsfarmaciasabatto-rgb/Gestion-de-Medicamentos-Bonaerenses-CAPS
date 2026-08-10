import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  ShieldCheck, 
  Server, 
  Network, 
  Terminal, 
  Copy, 
  FileCode,
  HardDrive
} from 'lucide-react';

export const RespaldosView: React.FC = () => {
  const [copiedScript, setCopiedScript] = useState(false);

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup/export';
  };

  const batScriptText = `@echo off
title Servidor Farmacia CAPS Sabatto
echo ========================================================
echo   INICIANDO SERVIDOR PRINCIPAL DE FARMACIA CAPS SABATTO
echo ========================================================
cd /d "%~dp0"
node dist/server.cjs
pause`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(batScriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-orange-400" />
          Respaldos de Base de Datos y Configuración Red Local (4 PCs)
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Gestión de copias de seguridad de la base de datos SQLite (<code className="text-amber-300">farmacia_caps.db</code>) y guía completa de conexión en red local sin Internet.
        </p>
      </div>

      {/* Backup Actions Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Exportar Respaldo Manual (.db)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Descargue una copia de seguridad exacta de la base de datos SQLite actual con todas las recetas, entregas registradas e historial de pacientes.
            </p>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30"
          >
            <Download className="w-4 h-4" />
            Descargar Base de Datos (.db)
          </button>
        </div>

        {/* Auto Backup Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Respaldo Automático de Disco</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            El sistema guarda automáticamente el archivo en el disco local (<code className="text-amber-300">./data/farmacia_caps.db</code>) tras cada entrega o carga de Excel. Para copias en Google Drive, copie dicha carpeta al directorio de sincronización de Google Drive.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono">
            Ruta local: C:\farmacia-caps\data\farmacia_caps.db
          </div>
        </div>
      </div>

      {/* Local Network Installation Guide (Prompt Step #5 & #9) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Guía de Instalación en Red Local (4 PCs en CAPS Sabatto)</h3>
            <p className="text-xs text-slate-400">Configuración Cliente-Servidor para trabajar en red sin depender de Internet.</p>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-4 text-xs text-slate-300">
          {/* Step 1 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm text-teal-400 flex items-center gap-2">
              <Server className="w-4 h-4" /> 1. Configuración de la PC Principal (SERVIDOR)
            </h4>
            <p className="leading-relaxed">
              La PC del farmacéutico funcionará como Servidor Principal.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-2">
              <li>Instalar <strong>Node.js v20+</strong> (LTS) en la PC Principal.</li>
              <li>Extraer el proyecto en <code className="text-teal-300">C:\farmacia-caps</code>.</li>
              <li>Abrir la consola (CMD) y ejecutar: <code className="text-teal-300">npm install</code> y luego <code className="text-teal-300">npm run build</code>.</li>
              <li>Para iniciar el servidor, ejecutar: <code className="text-teal-300">npm start</code>.</li>
            </ol>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm text-teal-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> 2. Regla de Firewall de Windows (Puerto 3000)
            </h4>
            <p className="leading-relaxed">
              Para que las otras 3 PC's puedan conectarse, abra el puerto 3000 en el Firewall de Windows de la PC Principal:
            </p>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300">
              netsh advfirewall firewall add rule name="Farmacia CAPS" dir=in action=allow protocol=TCP localport=3000
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm text-teal-400 flex items-center gap-2">
              <Network className="w-4 h-4" /> 3. Acceso desde las otras 3 PC's (CLIENTES)
            </h4>
            <p className="leading-relaxed">
              Desde cualquier navegador de las otras PC's conectadas a la red local o VPN, ingrese utilizando el nombre de la PC o la IP local:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>Por nombre de PC: <code className="text-teal-300 font-bold">http://NOMBRE-PC-FARMACIA:3000</code></li>
              <li>Por dirección IP local: <code className="text-teal-300 font-bold">http://192.168.1.50:3000</code></li>
            </ul>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm text-teal-400 flex items-center gap-2">
                <FileCode className="w-4 h-4" /> 4. Script de Inicio Automático (.bat)
              </h4>
              <button
                onClick={copyScriptToClipboard}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 font-semibold text-[11px]"
              >
                <Copy className="w-3.5 h-3.5 text-teal-400" />
                {copiedScript ? '¡Copiado!' : 'Copiar Script .bat'}
              </button>
            </div>
            <p className="text-slate-400">
              Cree un archivo llamado <code className="text-teal-300 font-mono">iniciar_farmacia.bat</code> en la carpeta Inicio de Windows para que el servidor se ejecute automáticamente al encender la PC:
            </p>
            <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto">
              {batScriptText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
