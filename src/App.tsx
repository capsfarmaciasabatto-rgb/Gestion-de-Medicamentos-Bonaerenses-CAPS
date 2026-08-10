import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { ExcelUploadView } from './components/ExcelUploadView';
import { EfectoresView } from './components/EfectoresView';
import { PacientesView } from './components/PacientesView';
import { AlertasView } from './components/AlertasView';
import { StockGeneralView } from './components/StockGeneralView';
import { ReportesView } from './components/ReportesView';
import { RespaldosView } from './components/RespaldosView';
import { UsuariosView } from './components/UsuariosView';
import { LoginScreen } from './components/LoginScreen';
import { PrintPlanillaModal } from './components/PrintPlanillaModal';
import { PrintComprobanteModal } from './components/PrintComprobanteModal';

import { LISTA_EFECTORES } from './data/efectoresList';
import { DashboardStats, StockEfector, Entrega, Efector, Paciente, Prescripcion, Usuario } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // User auth state
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('activeUsuario');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const handleUserChange = (user: Usuario) => {
    setCurrentUser(user);
    localStorage.setItem('activeUsuario', JSON.stringify(user));
    showToast(`Operador cambiado: ${user.nombre} (${user.rol})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('activeUsuario');
    showToast('Sesión cerrada correctamente.');
  };
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [efectores, setEfectores] = useState<Efector[]>(LISTA_EFECTORES);
  const [ultimasEntregas, setUltimasEntregas] = useState<Entrega[]>([]);
  const [alertasData, setAlertasData] = useState<any>(null);

  // Search & Navigation state
  const [preselectedDni, setPreselectedDni] = useState<string>('');

  // Modals
  const [selectedPlanilla, setSelectedPlanilla] = useState<{ nombre: string; initialTab?: 'pendientes' | 'historial' } | null>(null);
  const [comprobanteData, setComprobanteData] = useState<{
    entrega: Entrega | null;
    paciente: Paciente | null;
    prescripcion: Prescripcion | null;
  }>({ entrega: null, paciente: null, prescripcion: null });

  // Toast / notification
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Load Initial Global Data
  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    try {
      // 1. Stats
      const resStats = await fetch('/api/dashboard/stats');
      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data);
      }

      // 2. Efectores
      const resEf = await fetch('/api/efectores');
      if (resEf.ok) {
        const data = await resEf.json();
        setEfectores(data);
      }

      // 3. Recent deliveries
      const resEnt = await fetch('/api/entregas');
      if (resEnt.ok) {
        const data = await resEnt.json();
        setUltimasEntregas(data);
      }

      // 4. Alerts
      const resAl = await fetch('/api/alertas');
      if (resAl.ok) {
        const data = await resAl.json();
        setAlertasData(data);
      }
    } catch (err) {
      console.error('Error cargando datos globales:', err);
    }
  };

  const handleSeedDemo = async () => {
    try {
      const res = await fetch('/api/excel/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (data.exito) {
        showToast('¡Datos demo cargados con éxito!');
        loadAllData();
      }
    } catch (err) {
      showToast('Error cargando datos demo.');
    }
  };

  const handleSelectPacienteFromAlerts = (dni: string) => {
    setPreselectedDni(dni);
    setActiveTab('pacientes');
  };

  // Compute stock per efector for Dashboard / Reports
  const stockEfectores: StockEfector[] = efectores
    .filter((ef) => (ef.medicamentosPendientes || 0) > 0)
    .map((ef) => ({
      efectorNombre: ef.nombre,
      pacientesCount: ef.pacientesCount || 0,
      totalUnidadesPendientes: ef.medicamentosPendientes || 0,
      itemsCount: ef.prescripcionesCount || 0,
    }));

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('activeUsuario', JSON.stringify(user));
          showToast(`Bienvenido/a, ${user.nombre} (${user.rol})`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeRol={currentUser.rol}
        activeOperador={currentUser.nombre}
        onUserChange={handleUserChange}
        onLogout={handleLogout}
        alertasCount={alertasData?.total || 0}
        onNavigateAlertas={() => setActiveTab('alertas')}
        onNavigateHome={() => setActiveTab('dashboard')}
      />

      {/* Main Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertasCount={alertasData?.total || 0}
        activeRol={currentUser.rol}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl shadow-2xl border border-emerald-400 text-xs animate-in slide-in-from-bottom duration-200">
          {toast}
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            stockEfectores={stockEfectores}
            ultimasEntregas={ultimasEntregas}
            onNavigate={(tab) => setActiveTab(tab)}
            onSeedDemo={handleSeedDemo}
          />
        )}

        {activeTab === 'excel' && (
          <ExcelUploadView
            onUploadSuccess={() => {
              showToast('Excel procesado correctamente.');
              loadAllData();
            }}
            onSeedDemo={handleSeedDemo}
            onNavigateEfectores={() => setActiveTab('efectores')}
            onOpenPlanilla={(nombre, tab) => setSelectedPlanilla({ nombre, initialTab: tab })}
            activeRol={currentUser.rol}
          />
        )}

        {activeTab === 'efectores' && (
          <EfectoresView
            efectores={efectores}
            onOpenPlanilla={(nombre, tab) => setSelectedPlanilla({ nombre, initialTab: tab })}
            activeRol={currentUser.rol}
            onReloadData={loadAllData}
            showToast={showToast}
          />
        )}

        {activeTab === 'pacientes' && (
          <PacientesView
            preselectedDni={preselectedDni}
            onOpenComprobante={(entrega, paciente, prescripcion) => {
              setComprobanteData({ entrega, paciente, prescripcion });
            }}
            activeRol={currentUser.rol}
          />
        )}

        {activeTab === 'stock-general' && (
          <StockGeneralView />
        )}

        {activeTab === 'alertas' && (
          <AlertasView
            alertasData={alertasData}
            onSelectPaciente={handleSelectPacienteFromAlerts}
          />
        )}

        {activeTab === 'reportes' && (
          <ReportesView
            stockEfectores={stockEfectores}
            activeRol={currentUser.rol}
            onSelectPaciente={handleSelectPacienteFromAlerts}
          />
        )}

        {activeTab === 'respaldos' && <RespaldosView />}

        {activeTab === 'usuarios' && (
          <UsuariosView
            showToast={showToast}
            onDataPurged={() => {
              loadAllData();
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Gestion de Medicamentos Bonaerenses CAPS — CAPS N° 1 Dr. Sabatto</p>
          <p className="text-slate-400">Red Local 4 PCs — Farmacia & Red de Efectores Bonaerenses</p>
        </div>
      </footer>

      {/* Print Planilla Modal */}
      {selectedPlanilla && (
        <PrintPlanillaModal
          efectorNombre={selectedPlanilla.nombre}
          initialTab={selectedPlanilla.initialTab}
          onClose={() => setSelectedPlanilla(null)}
          onDeliverySuccess={loadAllData}
          activeRol={currentUser.rol}
        />
      )}

      {/* Print Comprobante Modal */}
      {comprobanteData.entrega && (
        <PrintComprobanteModal
          entrega={comprobanteData.entrega}
          paciente={comprobanteData.paciente}
          prescripcion={comprobanteData.prescripcion}
          onClose={() => setComprobanteData({ entrega: null, paciente: null, prescripcion: null })}
        />
      )}
    </div>
  );
}
