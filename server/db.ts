import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { LISTA_EFECTORES, normalizarNombreEfector } from '../src/data/efectoresList';

function getDataDir(): string {
  if (process.env.VERCEL) {
    return '/tmp';
  }
  const defaultDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    return defaultDir;
  } catch (e) {
    return '/tmp';
  }
}

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const dataDir = getDataDir();
  const dbFile = path.join(dataDir, 'farmacia_caps.db');

  let SQL: any;
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      path.join(process.cwd(), 'dist', 'sql-wasm.wasm'),
      path.join(process.cwd(), 'sql-wasm.wasm'),
      '/tmp/sql-wasm.wasm'
    ];

    let wasmBinary: Buffer | null = null;
    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          wasmBinary = fs.readFileSync(p);
          break;
        }
      } catch (e) {}
    }

    if (wasmBinary) {
      SQL = await initSqlJs({ wasmBinary });
    } else {
      SQL = await initSqlJs({
        locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
      });
    }
  } catch (e) {
    console.error('Warning loading sql.js with wasmBinary, falling back:', e);
    try {
      SQL = await initSqlJs();
    } catch (err2) {
      console.error('Error initializing sql.js:', err2);
      throw err2;
    }
  }

  if (fs.existsSync(dbFile)) {
    try {
      const filebuffer = fs.readFileSync(dbFile);
      db = new SQL.Database(filebuffer);
    } catch (err) {
      console.error('Error leyendo DB de disco:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  saveDbToDisk();
  return db;
}

export function saveDbToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dataDir = getDataDir();
    const dbFile = path.join(dataDir, 'farmacia_caps.db');
    fs.writeFileSync(dbFile, buffer);
  } catch (err) {
    console.error('Error guardando DB en disco:', err);
  }
}

function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS pacientes (
      dni TEXT PRIMARY KEY,
      apellido_nombre TEXT NOT NULL,
      efector_carga TEXT NOT NULL,
      fecha_nacimiento TEXT,
      sexo TEXT,
      domicilio TEXT,
      localidad TEXT,
      telefono TEXT,
      fecha_creacion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prescripciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dni TEXT NOT NULL,
      paciente_nombre TEXT NOT NULL,
      efector_carga TEXT NOT NULL,
      generico TEXT NOT NULL,
      presentacion TEXT,
      cantidad_total INTEGER NOT NULL,
      cantidad_entregada INTEGER NOT NULL DEFAULT 0,
      periodo TEXT NOT NULL,
      fecha_prescripcion TEXT NOT NULL,
      fecha_vencimiento TEXT NOT NULL,
      fecha_carga TEXT NOT NULL,
      nro_receta TEXT,
      medico TEXT,
      diagnostico TEXT,
      observaciones TEXT,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE',
      UNIQUE(dni, periodo, generico, fecha_prescripcion)
    );

    CREATE TABLE IF NOT EXISTS entregas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescripcion_id INTEGER NOT NULL,
      dni TEXT NOT NULL,
      paciente_nombre TEXT NOT NULL,
      generico TEXT NOT NULL,
      fecha_hora TEXT NOT NULL,
      cantidad_entregada INTEGER NOT NULL,
      retirante_nombre TEXT NOT NULL,
      retirante_dni TEXT NOT NULL,
      retirante_parentesco TEXT NOT NULL,
      observaciones TEXT
    );

    CREATE TABLE IF NOT EXISTS archivos_cargados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_archivo TEXT NOT NULL,
      fecha_carga TEXT NOT NULL,
      registros_procesados INTEGER NOT NULL,
      efectores_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_general (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generico TEXT UNIQUE NOT NULL,
      presentacion TEXT,
      cantidad_disponible INTEGER NOT NULL DEFAULT 0,
      fecha_actualizacion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimientos_stock_general (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generico TEXT NOT NULL,
      tipo_movimiento TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      dni_paciente TEXT,
      paciente_nombre TEXT,
      motivo TEXT,
      fecha_hora TEXT NOT NULL,
      usuario TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'OPERADOR',
      activo INTEGER NOT NULL DEFAULT 1,
      fecha_creacion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS efectores (
      id TEXT PRIMARY KEY,
      nombre TEXT UNIQUE NOT NULL,
      codigo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'UNIDAD_SANITARIA',
      direccion TEXT,
      telefono TEXT,
      observaciones TEXT
    );
  `);

  // Seed default efectores if table is empty
  try {
    const stmtEf = database.prepare(`SELECT COUNT(*) as count FROM efectores;`);
    let countEf = 0;
    if (stmtEf.step()) {
      countEf = (stmtEf.getAsObject().count as number) || 0;
    }
    stmtEf.free();

    if (countEf === 0) {
      for (const ef of LISTA_EFECTORES) {
        database.run(
          `INSERT OR IGNORE INTO efectores (id, nombre, codigo, tipo, direccion) VALUES (?, ?, ?, ?, ?);`,
          [ef.id, ef.nombre, ef.codigo, ef.tipo || 'UNIDAD_SANITARIA', ef.direccion || '']
        );
      }
    }
  } catch (e) {
    console.error('Error seeding default efectores:', e);
  }

  // Migration checks
  try {
    database.run(`ALTER TABLE prescripciones ADD COLUMN estado TEXT NOT NULL DEFAULT 'PENDIENTE';`);
  } catch (e) {
    // Column already exists
  }

  try {
    database.run(`ALTER TABLE prescripciones ADD COLUMN operador_despacho TEXT;`);
  } catch (e) {}

  try {
    database.run(`ALTER TABLE prescripciones ADD COLUMN fecha_despacho TEXT;`);
  } catch (e) {}

  try {
    database.run(`ALTER TABLE entregas ADD COLUMN operador TEXT;`);
  } catch (e) {}

  // Seed default users for all 4 roles if empty
  try {
    const stmtUsr = database.prepare(`SELECT COUNT(*) as count FROM usuarios;`);
    let countUsr = 0;
    if (stmtUsr.step()) {
      countUsr = (stmtUsr.getAsObject().count as number) || 0;
    }
    stmtUsr.free();

    if (countUsr === 0) {
      const hoy = new Date().toISOString().split('T')[0];
      database.run(
        `INSERT INTO usuarios (username, password, nombre, rol, activo, fecha_creacion) VALUES
         ('admin', 'admin', 'Administrador General', 'ADMIN', 1, ?),
         ('farmacia', 'farmacia', 'Farmacéutico Sabatto', 'FARMACEUTICO', 1, ?),
         ('tecnico', 'tecnico', 'Técnico de Carga / Despacho', 'TECNICO', 1, ?),
         ('direccion', 'direccion', 'Dirección CAPS (Solo Lectura)', 'DIRECCION', 1, ?);`,
        [hoy, hoy, hoy, hoy]
      );
    }
  } catch (e) {
    console.error('Error seeding default users:', e);
  }

  // Migration: Normalize any existing non-standard efector_carga in DB
  try {
    const stmt = database.prepare(`SELECT DISTINCT efector_carga FROM pacientes;`);
    const efectores: string[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.efector_carga) efectores.push(String(row.efector_carga));
    }
    stmt.free();

    for (const rawEf of efectores) {
      const norm = normalizarNombreEfector(rawEf);
      if (norm !== rawEf) {
        database.run(`UPDATE pacientes SET efector_carga = ? WHERE efector_carga = ?;`, [norm, rawEf]);
        database.run(`UPDATE prescripciones SET efector_carga = ? WHERE efector_carga = ?;`, [norm, rawEf]);
      }
    }

    // Cleanup and sync prescripciones cantidad_entregada with actual entregas log
    database.run(`
      UPDATE prescripciones
      SET cantidad_entregada = COALESCE((
        SELECT SUM(e.cantidad_entregada)
        FROM entregas e
        WHERE e.prescripcion_id = prescripciones.id
      ), 0),
      estado = CASE
        WHEN COALESCE((
          SELECT SUM(e.cantidad_entregada)
          FROM entregas e
          WHERE e.prescripcion_id = prescripciones.id
        ), 0) >= cantidad_total THEN 'ENTREGADO'
        WHEN COALESCE((
          SELECT SUM(e.cantidad_entregada)
          FROM entregas e
          WHERE e.prescripcion_id = prescripciones.id
        ), 0) > 0 THEN 'PARCIAL'
        ELSE 'PENDIENTE'
      END;
    `);
  } catch (e) {
    console.error('Error running efector migration or entregas sync:', e);
  }
}

export function getFechaArgentina(): string {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function getFechaHoraArgentina(): string {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  let hour = parts.find(p => p.type === 'hour')?.value || '00';
  if (hour === '24') hour = '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  const second = parts.find(p => p.type === 'second')?.value || '00';
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function getFechaEmisionArgentina(): string {
  return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
}

export function calcularFechaVencimiento(fechaPrescripcion: string, periodo: string): string {
  try {
    const parts = fechaPrescripcion.split(/[-/]/);
    let dateObj: Date;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        // DD/MM/YYYY
        dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else {
      dateObj = new Date(fechaPrescripcion);
    }

    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }

    const pLower = (periodo || '').toLowerCase();
    if (pLower.includes('trimestral') || pLower.includes('tri') || pLower.includes('3')) {
      dateObj.setDate(dateObj.getDate() + 90);
    } else if (pLower.includes('bimestral')) {
      dateObj.setDate(dateObj.getDate() + 60);
    } else {
      // Mensual default
      dateObj.setDate(dateObj.getDate() + 30);
    }

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }
}

export function formatFechaIso(fechaRaw: string): string {
  if (!fechaRaw) return new Date().toISOString().split('T')[0];
  let str = String(fechaRaw).trim();
  if (str.includes(' ')) {
    str = str.split(' ')[0];
  }
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

export function seedDemoData(database: Database) {
  const hoy = new Date().toISOString().split('T')[0];
  const hace15Dias = new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0];
  const hace35Dias = new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0];

  const demoRecords = [
    {
      dni: '28456123',
      paciente: 'GARCÍA, MARIA ELENA',
      efector: 'CAPS N1 Dr Sabatto',
      generico: 'Losartán 50mg',
      presentacion: 'Comprimidos x 30',
      cantidad: 90,
      periodo: 'Trimestral',
      fecha: hace15Dias,
      nroReceta: 'REC-2026-001',
      medico: 'Dr. Gómez Carlos (MN 45892)',
    },
    {
      dni: '28456123',
      paciente: 'GARCÍA, MARIA ELENA',
      efector: 'CAPS N1 Dr Sabatto',
      generico: 'Enalapril 10mg',
      presentacion: 'Comprimidos x 30',
      cantidad: 90,
      periodo: 'Trimestral',
      fecha: hace15Dias,
      nroReceta: 'REC-2026-001',
      medico: 'Dr. Gómez Carlos (MN 45892)',
    },
    {
      dni: '32111456',
      paciente: 'FERNÁNDEZ, JUAN CARLOS',
      efector: 'UNIDAD SANITARIA N° 2',
      generico: 'Metformina 850mg',
      presentacion: 'Comprimidos x 60',
      cantidad: 180,
      periodo: 'Trimestral',
      fecha: hace35Dias, // Alerta: sin retirar > 30 días
      nroReceta: 'REC-2026-012',
      medico: 'Dra. Rossi Andrea (MN 61204)',
    },
    {
      dni: '18992341',
      paciente: 'LÓPEZ, ANA MÁXIMA',
      efector: 'UNIDAD SANITARIA N° 5',
      generico: 'Levotiroxina 100mcg',
      presentacion: 'Comprimidos x 30',
      cantidad: 90,
      periodo: 'Trimestral',
      fecha: hace15Dias,
      nroReceta: 'REC-2026-045',
      medico: 'Dr. Martínez Hugo',
    },
    {
      dni: '25789012',
      paciente: 'RODRÍGUEZ, PEDRO ALBERTO',
      efector: 'UNIDAD SANITARIA MOVIL N° 1 a',
      generico: 'Amlodipina 5mg',
      presentacion: 'Comprimidos x 30',
      cantidad: 30,
      periodo: 'Mensual',
      fecha: hace15Dias,
      nroReceta: 'REC-2026-089',
      medico: 'Dra. Benítez Nora',
    },
    {
      dni: '35444123',
      paciente: 'TORRES, ROBERTO DANIEL',
      efector: 'UNIDAD SANITARIA N° 11',
      generico: 'Atorvastatín 20mg',
      presentacion: 'Comprimidos x 30',
      cantidad: 90,
      periodo: 'Trimestral',
      fecha: hace15Dias,
      nroReceta: 'REC-2026-102',
      medico: 'Dr. Varela José',
    }
  ];

  database.exec('BEGIN TRANSACTION;');
  for (const r of demoRecords) {
    const fechaVenc = calcularFechaVencimiento(r.fecha, r.periodo);
    database.run(
      `INSERT OR REPLACE INTO pacientes (dni, apellido_nombre, efector_carga, fecha_creacion)
       VALUES (?, ?, ?, ?);`,
      [r.dni, r.paciente, r.efector, hoy]
    );

    database.run(
      `INSERT OR IGNORE INTO prescripciones 
       (dni, paciente_nombre, efector_carga, generico, presentacion, cantidad_total, cantidad_entregada, periodo, fecha_prescripcion, fecha_vencimiento, fecha_carga, nro_receta, medico, estado)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'PENDIENTE');`,
      [r.dni, r.paciente, r.efector, r.generico, r.presentacion, r.cantidad, r.periodo, r.fecha, fechaVenc, hoy, r.nroReceta, r.medico]
    );
  }

  database.run(
    `INSERT INTO archivos_cargados (nombre_archivo, fecha_carga, registros_procesados, efectores_json)
     VALUES ('efectores_demo_inicial.xls', ?, 6, ?);`,
    [hoy, JSON.stringify({ 'CAPS N1 Dr Sabatto': 2, 'UNIDAD SANITARIA N° 2': 1, 'UNIDAD SANITARIA N° 5': 1, 'UNIDAD SANITARIA MOVIL N° 1 a': 1, 'UNIDAD SANITARIA N° 11': 1 })]
  );

  database.exec('COMMIT;');
  saveDbToDisk();
}
