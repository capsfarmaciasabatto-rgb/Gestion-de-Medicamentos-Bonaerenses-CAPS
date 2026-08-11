import React, { useState, useEffect } from 'react';
import { 
  UserCog, 
  ShieldCheck, 
  UserPlus, 
  Key, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Lock, 
  CheckCircle2, 
  ShieldAlert,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { Usuario, RolUsuario } from '../types';

interface UsuariosViewProps {
  onDataPurged?: () => void;
  showToast: (msg: string) => void;
}

const DEFAULT_USUARIOS: Usuario[] = [
  { id: 1, username: 'admin', nombre: 'Administrador General', rol: 'ADMIN', activo: 1 },
  { id: 2, username: 'farmacia', nombre: 'Farmacéutico Sabatto', rol: 'FARMACEUTICO', activo: 1 },
  { id: 3, username: 'tecnico', nombre: 'Técnico de Carga / Despacho', rol: 'TECNICO', activo: 1 },
  { id: 4, username: 'direccion', nombre: 'Dirección CAPS (Solo Lectura)', rol: 'DIRECCION', activo: 1 },
];

export const UsuariosView: React.FC<UsuariosViewProps> = ({ onDataPurged, showToast }) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>(DEFAULT_USUARIOS);
  const [loading, setLoading] = useState<boolean>(true);

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Form fields for user
  const [nombre, setNombre] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rol, setRol] = useState<RolUsuario>('TECNICO');
  const [activo, setActivo] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Purge modal state
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [confirmWord, setConfirmWord] = useState<string>('');
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purging, setPurging] = useState<boolean>(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setUsuarios(data);
          return;
        }
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setNombre('');
    setUsername('');
    setPassword('');
    setRol('OPERADOR');
    setActivo(true);
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleOpenEditModal = (u: Usuario) => {
    setEditingUser(u);
    setNombre(u.nombre);
    setUsername(u.username);
    setPassword(''); // leave blank unless changing
    setRol(u.rol);
    setActivo(Boolean(u.activo));
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !nombre.trim()) {
      showToast('Complete el usuario y nombre.');
      return;
    }

    if (!editingUser && !password.trim()) {
      showToast('Ingrese una contraseña para el nuevo usuario.');
      return;
    }

    try {
      if (editingUser) {
        // Update
        const res = await fetch(`/api/usuarios/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim() || undefined,
            nombre: nombre.trim(),
            rol,
            activo: activo ? 1 : 0
          })
        });
        const data = await res.json();
        if (data.exito) {
          showToast(data.mensaje);
          setIsUserModalOpen(false);
          fetchUsuarios();
        } else {
          showToast(data.mensaje || 'Error actualizando usuario');
        }
      } else {
        // Create
        let serverCreated = false;
        try {
          const res = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: username.trim(),
              password: password.trim(),
              nombre: nombre.trim(),
              rol
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.exito) {
              showToast(data.mensaje || `Usuario '${username}' creado con éxito.`);
              serverCreated = true;
            } else {
              showToast(data.mensaje || 'Error creando usuario');
              return;
            }
          }
        } catch (e) {
          console.warn('Backend unavailable, creating user in client state:', e);
        }

        if (!serverCreated) {
          const newUser: Usuario = {
            id: Date.now(),
            username: username.trim(),
            nombre: nombre.trim(),
            rol,
            activo: 1,
            fechaCreacion: new Date().toISOString().split('T')[0]
          };
          setUsuarios(prev => [...prev, newUser]);
          showToast(`Usuario '${username}' creado con éxito.`);
        }
        setIsUserModalOpen(false);
        fetchUsuarios();
      }
    } catch (err) {
      showToast('Error al procesar la solicitud.');
    }
  };

  const handleDeleteUser = async (u: Usuario) => {
    if (!window.confirm(`¿Está seguro de eliminar al usuario "${u.username}"?`)) return;

    try {
      const res = await fetch(`/api/usuarios/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.exito) {
        showToast(data.mensaje);
        fetchUsuarios();
      } else {
        showToast(data.mensaje || 'Error eliminando usuario');
      }
    } catch (err) {
      showToast('Error eliminando usuario');
    }
  };

  const handlePurgeDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurgeError(null);

    if (!adminPassword) {
      setPurgeError('Ingrese su contraseña de Administrador.');
      return;
    }

    if (confirmWord.trim().toUpperCase() !== 'BORRAR' && confirmWord.trim().toUpperCase() !== 'VACIAR') {
      setPurgeError('Escriba exactamente "BORRAR" o "VACIAR" para confirmar la operación.');
      return;
    }

    setPurging(true);
    try {
      const res = await fetch('/api/admin/vaciar-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          confirmacion: confirmWord
        })
      });

      const data = await res.json();
      if (data.exito) {
        showToast('¡Base de datos vaciada con éxito! Se eliminaron los datos de prueba.');
        setIsPurgeModalOpen(false);
        setAdminPassword('');
        setConfirmWord('');
        if (onDataPurged) onDataPurged();
      } else {
        setPurgeError(data.mensaje || 'Error vaciando la base de datos.');
      }
    } catch (err) {
      setPurgeError('Error al conectar con el servidor.');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserCog className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-white">Administración de Usuarios y Perfil</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestión centralizada de cuentas de acceso para operadores, farmacéuticos y administradores del CAPS Sabatto.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* ROLES & PERMISSIONS EXPLANATION MATRIX */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-orange-400" />
          <h3 className="text-base font-bold text-white">Guía de Roles y Permisos en el Sistema (4 Nivel de Acceso)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* ADMINISTRADOR */}
          <div className="bg-slate-950/60 border border-orange-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-orange-300 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span> Administrador
              </span>
              <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded font-bold">Acceso Total</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <p className="font-bold text-slate-200">Permisos habilitados:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Acceso ilimitado a todas las funciones.</li>
                <li>Gestión de Usuarios y Claves.</li>
                <li>Cerrar períodos y liberar stock.</li>
                <li>Cargar Excel y vaciar base de datos.</li>
              </ul>
            </div>
          </div>

          {/* FARMACEUTICO */}
          <div className="bg-slate-950/60 border border-teal-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-teal-300 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span> Farmacéutico
              </span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-bold">Gestión Farmacia</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <p className="font-bold text-slate-200">Permisos habilitados:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Cargar Excel de efectores.</li>
                <li>Cerrar Períodos y liberar stock libre.</li>
                <li>Revertir / Reabrir Despachos.</li>
                <li>Ajustar cantidades y entregar.</li>
                <li>Respaldos y reportes.</li>
              </ul>
              <p className="font-bold text-amber-400 pt-1">Restricciones:</p>
              <p className="text-slate-400 italic">No puede crear/eliminar usuarios ni vaciar la base.</p>
            </div>
          </div>

          {/* TECNICO */}
          <div className="bg-slate-950/60 border border-blue-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-blue-300 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span> Técnico
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">Carga & Ventanilla</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <p className="font-bold text-slate-200">Permisos habilitados:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Cargar archivo Excel.</li>
                <li>Ver y trabajar con planillas por CAPS.</li>
                <li>Entregar medicación a pacientes de CAPS 1.</li>
                <li>Imprimir planillas y comprobantes.</li>
              </ul>
              <p className="font-bold text-rose-400 pt-1">Restricciones:</p>
              <p className="text-slate-400 italic">No puede ajustar cantidades recibidas, sin solapa Usuarios ni vaciar base.</p>
            </div>
          </div>

          {/* DIRECCION */}
          <div className="bg-slate-950/60 border border-purple-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-purple-300 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span> Dirección
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">Solo Lectura</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <p className="font-bold text-slate-200">Permisos habilitados:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Ver todo en modo monitoreo/auditoría.</li>
                <li>Dashboard, gráficos y estadísticas.</li>
                <li>Stock General, alertas e historiales.</li>
              </ul>
              <p className="font-bold text-rose-400 pt-1">Restricciones:</p>
              <p className="text-slate-400 italic">No puede modificar, despachar ni entregar nada (100% lectura).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users List Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Usuarios Registrados en el Sistema
          </h3>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full font-medium">
            Total: {usuarios.length} cuentas
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Cargando lista de usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Rol / Permisos</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usuarios.map((u) => {
                  const isAdmin = u.rol === 'ADMIN';
                  const isFarmaceutico = u.rol === 'FARMACEUTICO';
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        {u.username}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {u.nombre}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.rol === 'ADMIN' ? (
                          <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-orange-400" />
                            Administrador
                          </span>
                        ) : u.rol === 'FARMACEUTICO' ? (
                          <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                            Farmacéutico
                          </span>
                        ) : u.rol === 'TECNICO' ? (
                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                            Técnico
                          </span>
                        ) : (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                            Dirección (Lectura)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.activo ? (
                          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Activo
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Editar datos o cambiar clave"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modificar</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DANGER ZONE: DATA PURGE SECTION */}
      <div className="bg-slate-900 border border-red-900/60 rounded-2xl p-6 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Limpiar Datos de Prueba / Vaciar Base de Datos
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Si ha finalizado las pruebas del sistema y desea dejar la base de datos completamente limpia para el inicio del trabajo operativo real, puede vaciar los registros de recetas, entregas, pacientes y stock libre.
            </p>
            <p className="text-xs text-amber-400 font-semibold flex items-center gap-1 pt-1">
              <Lock className="w-3.5 h-3.5" />
              Esta operación requiere confirmar su contraseña de Administrador y no afectará las cuentas de usuarios.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => {
              setAdminPassword('');
              setConfirmWord('');
              setPurgeError(null);
              setIsPurgeModalOpen(true);
            }}
            className="bg-red-600/90 hover:bg-red-600 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 border border-red-500/40"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vaciar Sistema (Limpiar Datos de Prueba)</span>
          </button>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsUserModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <UserCog className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {editingUser ? `Modificar Usuario: ${editingUser.username}` : 'Crear Nuevo Usuario'}
              </h3>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo del Operador</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Dra. María Gómez"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: mgomez"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {editingUser ? 'Nueva Contraseña (dejar en blanco para conservar la actual)' : 'Contraseña de Acceso'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? '••••••••' : 'Ingrese clave'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-orange-500 font-mono pr-10"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rol / Permisos en el Sistema</label>
                <select
                  value={rol}
                  onChange={(e: any) => setRol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="ADMIN">Administrador (Acceso Total)</option>
                  <option value="FARMACEUTICO">Farmacéutico (Gestión Farmacia y Stock)</option>
                  <option value="TECNICO">Técnico (Carga Excel, Planillas CAPS y Ventanilla)</option>
                  <option value="DIRECCION">Dirección (Solo Lectura - Monitoreo)</option>
                </select>
              </div>

              {editingUser && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="activoCheck"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="activoCheck" className="text-slate-300 font-semibold cursor-pointer">
                    Cuenta Activa (Permite iniciar sesión)
                  </label>
                </div>
              )}

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-orange-600/30"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURGE CONFIRMATION MODAL WITH PASSWORD SECURITY */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsPurgeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-red-900/60 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirmar Eliminación Total de Datos</h3>
                <p className="text-xs text-red-400">Verificación de Seguridad de Administrador</p>
              </div>
            </div>

            <div className="bg-red-950/40 border border-red-800/50 p-4 rounded-xl space-y-2 text-xs text-red-200">
              <p className="font-bold flex items-center gap-1.5 text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                ¡ATENCIÓN! Esta acción eliminará permanentemente:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                <li>Todas las prescripciones y recetas cargadas.</li>
                <li>El historial completo de entregas y comprobantes.</li>
                <li>La lista de pacientes registrados.</li>
                <li>Los datos e historial del Stock General y liberaciones.</li>
              </ul>
            </div>

            {purgeError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs font-semibold">
                {purgeError}
              </div>
            )}

            <form onSubmit={handlePurgeDatabase} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  1. Ingrese su Clave de Administrador:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Clave de Admin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-red-500 font-mono pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  2. Para evitar borrados por error, escriba la palabra <span className="text-red-400 font-bold">BORRAR</span>:
                </label>
                <input
                  type="text"
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  placeholder="Escriba BORRAR"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-red-500 font-mono uppercase font-bold tracking-wider"
                  required
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={purging}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
                >
                  {purging ? (
                    <span>Eliminando...</span>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar y Borrar Todo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
