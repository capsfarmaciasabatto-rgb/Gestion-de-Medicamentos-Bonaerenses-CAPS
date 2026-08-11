import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  getDb,
  saveDbToDisk,
  seedDemoData,
  calcularFechaVencimiento,
  formatFechaIso,
  getFechaArgentina,
  getFechaHoraArgentina,
  getFechaEmisionArgentina
} from './server/db';
import { parseExcelBuffer, generateSampleExcelBuffer } from './server/excel';
import { LISTA_EFECTORES, normalizarNombreEfector, isNombreSabatto } from './src/data/efectoresList';

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

function ejecutarCierrePeriodoSabatto(db: any) {
  const hoy = getFechaArgentina();
  const fechaHora = getFechaHoraArgentina();

  // Find uncollected prescriptions for CAPS 1 Sabatto
  const stmt = db.prepare(`
    SELECT id, dni, paciente_nombre, generico, presentacion, cantidad_total, cantidad_entregada,
           (cantidad_total - cantidad_entregada) as saldo
    FROM prescripciones
    WHERE (cantidad_total - cantidad_entregada) > 0
      AND (
        LOWER(efector_carga) LIKE '%sabatto%'
        OR LOWER(efector_carga) LIKE '%sabato%'
        OR LOWER(efector_carga) LIKE '%caps 1%'
        OR LOWER(efector_carga) LIKE '%caps n1%'
        OR LOWER(efector_carga) LIKE '%caps n° 1%'
        OR LOWER(efector_carga) LIKE '%cdt 1%'
        OR LOWER(efector_carga) LIKE '%cdt n° 1%'
        OR LOWER(efector_carga) LIKE '%sede central%'
      );
  `);

  const prescripcionesA_Liberar: any[] = [];
  while (stmt.step()) {
    prescripcionesA_Liberar.push(stmt.getAsObject());
  }
  stmt.free();

  if (prescripcionesA_Liberar.length === 0) {
    return {
      exito: true,
      mensaje: 'No hay medicación no retirada de CAPS 1 Sabatto pendiente de liberar.',
      totalUnidadesLiberadas: 0,
      prescripcionesProcesadas: 0
    };
  }

  let totalUnidadesLiberadas = 0;
  const resumenGenericos: Record<string, number> = {};

  for (const pr of prescripcionesA_Liberar) {
    const saldo = pr.saldo;
    if (saldo <= 0) continue;

    totalUnidadesLiberadas += saldo;
    resumenGenericos[pr.generico] = (resumenGenericos[pr.generico] || 0) + saldo;

    // Add to stock_general
    db.run(
      `INSERT INTO stock_general (generico, presentacion, cantidad_disponible, fecha_actualizacion)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(generico) DO UPDATE SET 
         cantidad_disponible = cantidad_disponible + excluded.cantidad_disponible,
         fecha_actualizacion = excluded.fecha_actualizacion;`,
      [pr.generico, pr.presentacion || '', saldo, hoy]
    );

    // Record movement
    db.run(
      `INSERT INTO movimientos_stock_general (generico, tipo_movimiento, cantidad, dni_paciente, paciente_nombre, motivo, fecha_hora, usuario)
       VALUES (?, 'LIBERACION_PERIODO', ?, ?, ?, ?, ?, 'Sistema CAPS 1 Sabatto');`,
      [
        pr.generico,
        saldo,
        pr.dni,
        pr.paciente_nombre,
        `Sobrante liberado por fin de período (${saldo} un. no retiradas)`,
        fechaHora
      ]
    );

    // Update prescription so balance becomes 0
    db.run(
      `UPDATE prescripciones 
       SET cantidad_total = cantidad_entregada, estado = 'LIBERADO_STOCK'
       WHERE id = ?;`,
      [pr.id]
    );
  }

  return {
    exito: true,
    mensaje: `Se liberaron ${totalUnidadesLiberadas} unidades de ${Object.keys(resumenGenericos).length} medicamentos al Stock General de CAPS 1 Sabatto (${prescripcionesA_Liberar.length} recetas ajustadas).`,
    totalUnidadesLiberadas,
    prescripcionesProcesadas: prescripcionesA_Liberar.length,
    resumenGenericos
  };
}

export const app = express();
const PORT = 3000;

// If body is already parsed by platform (e.g. Vercel), mark _body as true so express.json skips re-reading ended stream
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    (req as any)._body = true;
  } else if (req.body && typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
      (req as any)._body = true;
    } catch (e) {}
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

let database: any = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initApp() {
  if (isInitialized && database) return database;
  database = await getDb();
  isInitialized = true;
  return database;
}

// Ensure initPromise starts safely on import
setTimeout(() => {
  if (!initPromise) {
    initPromise = initApp().catch(err => {
      console.error('Error in background initApp:', err);
      initPromise = null;
    });
  }
}, 0);

// API Middleware: Guarantees database is ready before any /api handler runs
app.use('/api', async (req, res, next) => {
  try {
    if (!initPromise) {
      initPromise = initApp();
    }
    await initPromise;
    if (!database) {
      database = await getDb();
    }
    next();
  } catch (err: any) {
    console.error('Error in API DB init middleware:', err);
    res.status(500).json({ exito: false, mensaje: 'Error al conectar con la base de datos: ' + (err?.message || err) });
  }
});

  // API HEALTH
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      sistema: 'Gestión de Medicamentos CAPS',
      sede: 'CAPS N1 Dr Sabatto',
      timestamp: new Date().toISOString()
    });
  });

  // SEED DEMO DATA IF DB IS EMPTY OR UPON REQUEST
  app.post('/api/excel/seed-demo', (req, res) => {
    try {
      seedDemoData(database);
      res.json({ exito: true, mensaje: 'Datos demo de prueba cargados correctamente.' });
    } catch (err: any) {
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error cargando demo.' });
    }
  });

  // DOWNLOAD EXCEL SAMPLE TEMPLATE
  app.get('/api/excel/plantilla', (req, res) => {
    try {
      const buffer = generateSampleExcelBuffer();
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', 'attachment; filename="efectores_plantilla_ejemplo.xls"');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Error generando plantilla de ejemplo' });
    }
  });

  // UPLOAD EXCEL FILE
  app.post('/api/excel/upload', (req, res) => {
    upload.single('archivo')(req, res, (uploadErr: any) => {
      if (uploadErr) {
        console.error('Multer upload error:', uploadErr);
        return res.status(400).json({
          exito: false,
          mensaje: 'Error al subir el archivo: ' + (uploadErr.message || 'Archivo no válido o supera el tamaño máximo de 25MB.')
        });
      }

      let transactionStarted = false;
      try {
        if (!req.file) {
          return res.status(400).json({ exito: false, mensaje: 'No se subió ningún archivo Excel.' });
        }

        const cerrarPeriodoAnterior = req.query.cerrarPeriodoAnterior === 'true' || req.body?.cerrarPeriodoAnterior === 'true';
        let resultadoCierre: any = null;
        if (cerrarPeriodoAnterior) {
          try {
            resultadoCierre = ejecutarCierrePeriodoSabatto(database);
          } catch (e: any) {
            console.error('Error al ejecutar cierre de período previo:', e);
          }
        }

        const nombreArchivo = req.file.originalname;
        const registros = parseExcelBuffer(req.file.buffer);

        if (!registros || registros.length === 0) {
          return res.status(400).json({
            exito: false,
            mensaje: 'No se encontraron registros válidos con DNI, Medicamento y Cantidad en el archivo Excel. Verifique la estructura de columnas de su planilla.'
          });
        }

        const hoy = getFechaArgentina();
        let nuevosRegistros = 0;
        let omitidosDuplicados = 0;
        const efectoresConteo: Record<string, number> = {};

        database.exec('BEGIN TRANSACTION;');
        transactionStarted = true;

        for (const reg of registros) {
          const fechaIso = formatFechaIso(reg.fechaPrescripcion);
          const fechaVenc = calcularFechaVencimiento(fechaIso, reg.periodo);

          // Count per efector
          const ef = reg.efectorCarga || 'CAPS N1 Dr Sabatto';
          efectoresConteo[ef] = (efectoresConteo[ef] || 0) + 1;

          // Upsert Paciente
          database.run(
            `INSERT INTO pacientes (dni, apellido_nombre, efector_carga, fecha_creacion)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(dni) DO UPDATE SET 
               apellido_nombre = excluded.apellido_nombre,
               efector_carga = excluded.efector_carga;`,
            [reg.dni, reg.apellidoNombre, ef, hoy]
          );

          // Try insert prescripción
          try {
            database.run(
              `INSERT OR IGNORE INTO prescripciones 
               (dni, paciente_nombre, efector_carga, generico, presentacion, cantidad_total, cantidad_entregada, periodo, fecha_prescripcion, fecha_vencimiento, fecha_carga, nro_receta, estado)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'PENDIENTE');`,
              [
                reg.dni,
                reg.apellidoNombre,
                ef,
                reg.generico,
                reg.presentacion || '',
                reg.cantidad,
                reg.periodo || 'Mensual',
                fechaIso,
                fechaVenc,
                hoy,
                reg.nroReceta || ''
              ]
            );

            if (database.getRowsModified() > 0) {
              nuevosRegistros++;
            } else {
              omitidosDuplicados++;
            }
          } catch (e) {
            omitidosDuplicados++;
          }
        }

        const efectoresArray = Object.entries(efectoresConteo).map(([nombre, cantidad]) => ({
          nombre,
          cantidad
        }));

        database.run(
          `INSERT INTO archivos_cargados (nombre_archivo, fecha_carga, registros_procesados, efectores_json)
           VALUES (?, ?, ?, ?);`,
          [nombreArchivo, hoy, registros.length, JSON.stringify(efectoresConteo)]
        );

        database.exec('COMMIT;');
        transactionStarted = false;
        saveDbToDisk();

        let msgFinal = `Excel procesado exitosamente. Se cargaron ${nuevosRegistros} recetas nuevas (${omitidosDuplicados} omitidas por ser duplicadas o ya existentes).`;
        if (resultadoCierre && resultadoCierre.mensaje) {
          msgFinal += ` [Cierre de Período: ${resultadoCierre.mensaje}]`;
        }

        res.json({
          exito: true,
          mensaje: msgFinal,
          nombreArchivo,
          totalProcesados: registros.length,
          nuevosRegistros,
          omitidosDuplicados,
          efectoresInvolucrados: efectoresArray,
          resultadoCierre
        });

      } catch (err: any) {
        if (transactionStarted) {
          try {
            database.exec('ROLLBACK;');
          } catch (e) {
            console.error('Error rolling back transaction:', e);
          }
        }
        console.error('Error al procesar Excel:', err);
        res.status(500).json({ exito: false, mensaje: 'Error interno procesando el archivo Excel: ' + (err?.message || err) });
      }
    });
  });

  // LIST PATIENTS / SEARCH
  app.get('/api/pacientes', (req, res) => {
    try {
      const query = String(req.query.q || '').trim();
      const efectorFilter = String(req.query.efector || '').trim();

      let sql = `
        SELECT p.dni, p.apellido_nombre as apellidoNombre, p.efector_carga as efectorCarga,
               p.fecha_creacion as fechaCreacion,
               COUNT(pr.id) as prescripcionesCount,
               SUM(pr.cantidad_total - pr.cantidad_entregada) as saldoTotalPendiente
        FROM pacientes p
        LEFT JOIN prescripciones pr ON p.dni = pr.dni
      `;

      const conditions: string[] = [];
      const params: any[] = [];

      if (query) {
        conditions.push(`(p.dni LIKE ? OR p.apellido_nombre LIKE ?)`);
        params.push(`%${query}%`, `%${query}%`);
      }

      if (efectorFilter) {
        conditions.push(`(p.efector_carga = ? OR p.efector_carga = ?)`);
        params.push(efectorFilter, normalizarNombreEfector(efectorFilter));
      }

      if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
      }

      sql += ` GROUP BY p.dni ORDER BY p.apellido_nombre ASC LIMIT 100;`;

      const stmt = database.prepare(sql);
      stmt.bind(params);

      const result: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row);
      }
      stmt.free();

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error buscando pacientes' });
    }
  });

  // PATIENT DETAILS BY DNI
  app.get('/api/pacientes/:dni', (req, res) => {
    try {
      const { dni } = req.params;

      // Paciente info
      const stmtP = database.prepare(`SELECT dni, apellido_nombre as apellidoNombre, efector_carga as efectorCarga, fecha_nacimiento as fechaNacimiento, domicilio, localidad, telefono FROM pacientes WHERE dni = ?;`);
      stmtP.bind([dni]);
      let paciente: any = null;
      if (stmtP.step()) {
        paciente = stmtP.getAsObject();
      }
      stmtP.free();

      if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }

      // Prescripciones (ordenadas cronológicamente: la más antigua primero)
      const stmtPr = database.prepare(`
        SELECT id, dni, paciente_nombre as pacienteNombre, efector_carga as efectorCarga,
               generico, presentacion, cantidad_total as cantidadTotal, cantidad_entregada as cantidadEntregada,
               (cantidad_total - cantidad_entregada) as saldoPendiente,
               periodo, fecha_prescripcion as fechaPrescripcion, fecha_vencimiento as fechaVencimiento,
               fecha_carga as fechaCarga, nro_receta as nroReceta, medico, observaciones, estado
        FROM prescripciones
        WHERE dni = ?
        ORDER BY fecha_prescripcion ASC, id ASC;
      `);
      stmtPr.bind([dni]);
      const prescripciones: any[] = [];
      const hoyMs = new Date().getTime();

      while (stmtPr.step()) {
        const row: any = stmtPr.getAsObject();
        // Calculate days to expiration
        const vencMs = new Date(row.fechaVencimiento).getTime();
        const diffDays = Math.ceil((vencMs - hoyMs) / 86400000);
        row.diasParaVencer = diffDays;

        // Calculate days without retrieval
        const prescMs = new Date(row.fechaPrescripcion).getTime();
        row.diasSinRetirar = Math.floor((hoyMs - prescMs) / 86400000);

        prescripciones.push(row);
      }
      stmtPr.free();

      // Entregas history
      const stmtE = database.prepare(`
        SELECT id, prescripcion_id as prescripcionId, dni, paciente_nombre as pacienteNombre,
               generico, fecha_hora as fechaHora, cantidad_entregada as cantidadEntregada,
               retirante_nombre as retiranteNombre, retirante_dni as retiranteDni,
               retirante_parentesco as retiranteParentesco, observaciones,
               COALESCE(operador, 'Farmacia Sabatto') as operador
        FROM entregas
        WHERE dni = ?
        ORDER BY fecha_hora DESC;
      `);
      stmtE.bind([dni]);
      const entregas: any[] = [];
      while (stmtE.step()) {
        entregas.push(stmtE.getAsObject());
      }
      stmtE.free();

      res.json({
        paciente,
        prescripciones,
        entregas
      });

    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error cargando paciente' });
    }
  });

  // LIST ALL EFECTORES WITH COUNTS AND STATUSES
  app.get('/api/efectores', (req, res) => {
    try {
      // 1. Fetch efectores from DB
      const stmtEf = database.prepare(`
        SELECT id, nombre, codigo, tipo, direccion, telefono, observaciones 
        FROM efectores 
        ORDER BY CASE WHEN nombre LIKE '%Sabatto%' THEN 0 ELSE 1 END, nombre ASC;
      `);
      const efectoresDb: any[] = [];
      while (stmtEf.step()) {
        efectoresDb.push(stmtEf.getAsObject());
      }
      stmtEf.free();

      // 2. Fetch stats from prescripciones
      const stmt = database.prepare(`
        SELECT efector_carga as nombre,
               COUNT(DISTINCT dni) as pacientesCount,
               SUM(cantidad_total - cantidad_entregada) as unidadesPendientes,
               SUM(cantidad_entregada) as unidadesEntregadas,
               COUNT(id) as prescripcionesCount,
               SUM(CASE WHEN estado = 'PREPARADO' THEN 1 ELSE 0 END) as preparadosCount,
               SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientesCount,
               SUM(CASE WHEN estado = 'ENTREGADO' OR cantidad_entregada > 0 THEN 1 ELSE 0 END) as entregadosCount
        FROM prescripciones
        GROUP BY efector_carga;
      `);

      const mapCounts: Record<string, { 
        pacientesCount: number; 
        unidadesPendientes: number;
        unidadesEntregadas: number;
        prescripcionesCount: number;
        preparadosCount: number;
        pendientesCount: number;
        entregadosCount: number;
      }> = {};

      while (stmt.step()) {
        const row: any = stmt.getAsObject();
        const normNombre = normalizarNombreEfector(row.nombre);
        if (!mapCounts[normNombre]) {
          mapCounts[normNombre] = { 
            pacientesCount: 0, 
            unidadesPendientes: 0, 
            unidadesEntregadas: 0,
            prescripcionesCount: 0,
            preparadosCount: 0,
            pendientesCount: 0,
            entregadosCount: 0,
          };
        }
        mapCounts[normNombre].pacientesCount += (row.pacientesCount || 0);
        mapCounts[normNombre].unidadesPendientes += (row.unidadesPendientes || 0);
        mapCounts[normNombre].unidadesEntregadas += (row.unidadesEntregadas || 0);
        mapCounts[normNombre].prescripcionesCount += (row.prescripcionesCount || 0);
        mapCounts[normNombre].preparadosCount += (row.preparadosCount || 0);
        mapCounts[normNombre].pendientesCount += (row.pendientesCount || 0);
        mapCounts[normNombre].entregadosCount += (row.entregadosCount || 0);
      }
      stmt.free();

      const resultado = efectoresDb.map(ef => {
        const counts = mapCounts[ef.nombre] || mapCounts[normalizarNombreEfector(ef.nombre)] || { 
          pacientesCount: 0, 
          unidadesPendientes: 0, 
          unidadesEntregadas: 0,
          prescripcionesCount: 0,
          preparadosCount: 0,
          pendientesCount: 0,
          entregadosCount: 0,
        };

        let estadoGral: 'PENDIENTE' | 'PREPARADO' | 'ENTREGADO' | 'SIN_MOVIMIENTOS' = 'SIN_MOVIMIENTOS';
        
        if (counts.unidadesPendientes > 0) {
          if (counts.preparadosCount > 0 && counts.preparadosCount >= counts.prescripcionesCount) {
            estadoGral = 'PREPARADO';
          } else {
            estadoGral = 'PENDIENTE';
          }
        } else if (counts.entregadosCount > 0 || counts.unidadesEntregadas > 0) {
          estadoGral = 'ENTREGADO';
        } else {
          estadoGral = 'SIN_MOVIMIENTOS';
        }

        return {
          ...ef,
          pacientesCount: counts.pacientesCount,
          medicamentosPendientes: counts.unidadesPendientes,
          unidadesEntregadas: counts.unidadesEntregadas,
          prescripcionesCount: counts.prescripcionesCount,
          preparadosCount: counts.preparadosCount,
          estadoGral,
        };
      });

      res.json(resultado);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error consultando efectores' });
    }
  });

  // CREAR UN NUEVO EFECTOR DE CARGA
  app.post('/api/efectores', (req, res) => {
    try {
      let { nombre, codigo, tipo, direccion, telefono, observaciones } = req.body;
      if (!nombre || !String(nombre).trim()) {
        return res.status(400).json({ exito: false, mensaje: 'El nombre del efector es obligatorio.' });
      }

      const nombreClean = String(nombre).trim();
      
      // Check duplicate
      const stmtCheck = database.prepare(`SELECT id FROM efectores WHERE LOWER(nombre) = LOWER(?);`);
      stmtCheck.bind([nombreClean]);
      let exists = false;
      if (stmtCheck.step()) {
        exists = true;
      }
      stmtCheck.free();

      if (exists) {
        return res.status(400).json({ exito: false, mensaje: 'Ya existe un efector con ese nombre.' });
      }

      const id = 'ef_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const codigoFinal = codigo && String(codigo).trim() ? String(codigo).trim().toUpperCase() : `EFEC-${Math.floor(10 + Math.random() * 90)}`;
      const tipoFinal = tipo || 'UNIDAD_SANITARIA';

      database.run(
        `INSERT INTO efectores (id, nombre, codigo, tipo, direccion, telefono, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [id, nombreClean, codigoFinal, tipoFinal, direccion || '', telefono || '', observaciones || '']
      );

      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Efector "${nombreClean}" creado exitosamente.`,
        efector: {
          id,
          nombre: nombreClean,
          codigo: codigoFinal,
          tipo: tipoFinal,
          direccion: direccion || '',
          telefono: telefono || '',
          observaciones: observaciones || ''
        }
      });
    } catch (err: any) {
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error al crear efector' });
    }
  });

  // EDITAR EFECTOR DE CARGA
  app.put('/api/efectores/:id', (req, res) => {
    try {
      const { id } = req.params;
      let { nombre, codigo, tipo, direccion, telefono, observaciones } = req.body;

      if (!nombre || !String(nombre).trim()) {
        return res.status(400).json({ exito: false, mensaje: 'El nombre del efector es obligatorio.' });
      }

      const nombreClean = String(nombre).trim();

      // Find current efector
      const stmtOld = database.prepare(`SELECT id, nombre FROM efectores WHERE id = ?;`);
      stmtOld.bind([id]);
      let oldName = '';
      if (stmtOld.step()) {
        oldName = String(stmtOld.getAsObject().nombre);
      }
      stmtOld.free();

      if (!oldName) {
        return res.status(404).json({ exito: false, mensaje: 'Efector no encontrado.' });
      }

      // Check name uniqueness if changed
      if (oldName.toLowerCase() !== nombreClean.toLowerCase()) {
        const stmtCheck = database.prepare(`SELECT id FROM efectores WHERE LOWER(nombre) = LOWER(?) AND id != ?;`);
        stmtCheck.bind([nombreClean, id]);
        let exists = false;
        if (stmtCheck.step()) {
          exists = true;
        }
        stmtCheck.free();

        if (exists) {
          return res.status(400).json({ exito: false, mensaje: 'Ya existe otro efector con ese nombre.' });
        }
      }

      database.exec('BEGIN TRANSACTION;');

      // Update efector record
      database.run(
        `UPDATE efectores 
         SET nombre = ?, codigo = ?, tipo = ?, direccion = ?, telefono = ?, observaciones = ? 
         WHERE id = ?;`,
        [nombreClean, codigo || '', tipo || 'UNIDAD_SANITARIA', direccion || '', telefono || '', observaciones || '', id]
      );

      // If name changed, migrate references in pacientes and prescripciones
      if (oldName !== nombreClean) {
        database.run(`UPDATE pacientes SET efector_carga = ? WHERE efector_carga = ?;`, [nombreClean, oldName]);
        database.run(`UPDATE prescripciones SET efector_carga = ? WHERE efector_carga = ?;`, [nombreClean, oldName]);
      }

      database.exec('COMMIT;');
      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Efector "${nombreClean}" actualizado correctamente.`
      });
    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error al actualizar efector' });
    }
  });

  // ELIMINAR EFECTOR DE CARGA
  app.delete('/api/efectores/:id', (req, res) => {
    try {
      const { id } = req.params;

      const stmtFind = database.prepare(`SELECT id, nombre FROM efectores WHERE id = ?;`);
      stmtFind.bind([id]);
      let efName = '';
      if (stmtFind.step()) {
        efName = String(stmtFind.getAsObject().nombre);
      }
      stmtFind.free();

      if (!efName) {
        return res.status(404).json({ exito: false, mensaje: 'Efector no encontrado.' });
      }

      if (isNombreSabatto(efName)) {
        return res.status(400).json({ exito: false, mensaje: 'No se puede eliminar la Sede Central (CAPS N1 Dr Sabatto).' });
      }

      // Check if there are active patients or pending prescriptions
      const stmtPac = database.prepare(`SELECT COUNT(*) as count FROM pacientes WHERE efector_carga = ?;`);
      stmtPac.bind([efName]);
      let pacCount = 0;
      if (stmtPac.step()) {
        pacCount = (stmtPac.getAsObject().count as number) || 0;
      }
      stmtPac.free();

      const stmtPr = database.prepare(`SELECT COUNT(*) as count FROM prescripciones WHERE efector_carga = ?;`);
      stmtPr.bind([efName]);
      let prCount = 0;
      if (stmtPr.step()) {
        prCount = (stmtPr.getAsObject().count as number) || 0;
      }
      stmtPr.free();

      if (pacCount > 0 || prCount > 0) {
        return res.status(400).json({
          exito: false,
          mensaje: `No se puede eliminar "${efName}" porque posee ${pacCount} paciente(s) y ${prCount} receta(s) vinculada(s). Debe reasignar o limpiar los datos previamente.`
        });
      }

      database.run(`DELETE FROM efectores WHERE id = ?;`, [id]);
      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Efector "${efName}" eliminado correctamente.`
      });
    } catch (err: any) {
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error al eliminar efector' });
    }
  });

  // PLANILLA DE ENVÍO E HISTORIAL FOR AN EFECTOR
  app.get('/api/efectores/:nombre/planilla', (req, res) => {
    try {
      const { nombre } = req.params;
      const normNombre = normalizarNombreEfector(nombre);

      // 1. Fetch pending items
      const stmtPend = database.prepare(`
        SELECT pr.id, pr.dni, pr.paciente_nombre as pacienteNombre, pr.efector_carga as efectorCarga,
               pr.generico, pr.presentacion, pr.cantidad_total as cantidadTotal,
               pr.cantidad_entregada as cantidadEntregada,
               (pr.cantidad_total - pr.cantidad_entregada) as saldoPendiente,
               pr.periodo, pr.fecha_prescripcion as fechaPrescripcion, pr.fecha_vencimiento as fechaVencimiento,
               pr.nro_receta as nroReceta, pr.medico, pr.estado,
               pr.operador_despacho as operadorDespacho, pr.fecha_despacho as fechaDespacho
        FROM prescripciones pr
        WHERE (pr.efector_carga = ? OR pr.efector_carga = ?) AND (pr.cantidad_total - pr.cantidad_entregada) > 0
        ORDER BY pr.paciente_nombre ASC, pr.generico ASC;
      `);
      stmtPend.bind([nombre, normNombre]);

      const itemsPendientes: any[] = [];
      const pacientesPendMap = new Set<string>();

      while (stmtPend.step()) {
        const row = stmtPend.getAsObject();
        itemsPendientes.push(row);
        pacientesPendMap.add(String(row.dni));
      }
      stmtPend.free();

      // 2. Fetch delivered items (History ordered chronologically for stock audit)
      const stmtEnt = database.prepare(`
        SELECT pr.id, pr.dni, pr.paciente_nombre as pacienteNombre, pr.efector_carga as efectorCarga,
               pr.generico, pr.presentacion, pr.cantidad_total as cantidadTotal,
               pr.cantidad_entregada as cantidadEntregada,
               pr.periodo, pr.fecha_prescripcion as fechaPrescripcion, pr.fecha_vencimiento as fechaVencimiento,
               pr.nro_receta as nroReceta, pr.medico, pr.estado, pr.observaciones,
               COALESCE(e.fecha_hora, pr.fecha_despacho, pr.fecha_carga) as fechaEntrega,
               COALESCE(e.operador, pr.operador_despacho, 'Farmacia Central Sabatto') as operadorDespacho,
               COALESCE(e.retirante_nombre, '') as retiranteNombre,
               COALESCE(e.retirante_dni, '') as retiranteDni
        FROM prescripciones pr
        LEFT JOIN entregas e ON e.prescripcion_id = pr.id
        WHERE (pr.efector_carga = ? OR pr.efector_carga = ?) AND pr.cantidad_entregada > 0
        ORDER BY COALESCE(e.fecha_hora, pr.fecha_despacho, pr.fecha_carga) DESC, pr.paciente_nombre ASC;
      `);
      stmtEnt.bind([nombre, normNombre]);

      const itemsEntregados: any[] = [];
      const pacientesEntMap = new Set<string>();

      while (stmtEnt.step()) {
        const row = stmtEnt.getAsObject();
        itemsEntregados.push(row);
        pacientesEntMap.add(String(row.dni));
      }
      stmtEnt.free();

      // Consolidated summary helper
      const buildSummary = (itemList: any[], qtyKey: string) => {
        const medMap: Record<string, { generico: string; presentacion: string; totalUnidades: number; dnis: Set<string> }> = {};
        let totalSum = 0;

        for (const row of itemList) {
          const genKey = String(row.generico).toUpperCase().trim();
          const cant = Number(row[qtyKey]) || 0;
          totalSum += cant;

          if (!medMap[genKey]) {
            medMap[genKey] = {
              generico: row.generico,
              presentacion: row.presentacion || '',
              totalUnidades: 0,
              dnis: new Set<string>(),
            };
          }
          medMap[genKey].totalUnidades += cant;
          medMap[genKey].dnis.add(String(row.dni));
        }

        const list = Object.values(medMap)
          .map(m => ({
            generico: m.generico,
            presentacion: m.presentacion,
            totalUnidades: m.totalUnidades,
            totalPacientes: m.dnis.size,
          }))
          .sort((a, b) => a.generico.localeCompare(b.generico));

        return { list, totalSum };
      };

      const summaryPend = buildSummary(itemsPendientes, 'saldoPendiente');
      const summaryEnt = buildSummary(itemsEntregados, 'cantidadEntregada');

      let preparadosCount = itemsPendientes.filter(i => i.estado === 'PREPARADO').length;
      let estadoGral: 'PENDIENTE' | 'PREPARADO' | 'ENTREGADO' | 'SIN_MOVIMIENTOS' = 'PENDIENTE';

      if (itemsPendientes.length > 0) {
        if (preparadosCount > 0 && preparadosCount === itemsPendientes.length) {
          estadoGral = 'PREPARADO';
        } else {
          estadoGral = 'PENDIENTE';
        }
      } else if (itemsEntregados.length > 0) {
        estadoGral = 'ENTREGADO';
      } else {
        estadoGral = 'SIN_MOVIMIENTOS';
      }

      // Default active items list: if pending exists, return pending; otherwise return delivered history
      const activeItems = itemsPendientes.length > 0 ? itemsPendientes : itemsEntregados;
      const activeSummary = itemsPendientes.length > 0 ? summaryPend.list : summaryEnt.list;
      const activePacientes = itemsPendientes.length > 0 ? pacientesPendMap.size : pacientesEntMap.size;
      const activeUnidades = itemsPendientes.length > 0 ? summaryPend.totalSum : summaryEnt.totalSum;

      res.json({
        efectorNombre: normNombre || nombre,
        fechaEmision: getFechaEmisionArgentina(),
        totalPacientes: activePacientes,
        totalItems: activeItems.length,
        totalUnidades: activeUnidades,
        estadoGral,
        items: activeItems,
        resumenMedicamentos: activeSummary,
        // Specific detailed sets
        itemsPendientes,
        itemsEntregados,
        resumenPendientes: summaryPend.list,
        resumenEntregados: summaryEnt.list,
        totalPacientesPendientes: pacientesPendMap.size,
        totalUnidadesPendientes: summaryPend.totalSum,
        totalPacientesEntregados: pacientesEntMap.size,
        totalUnidadesEntregadas: summaryEnt.totalSum
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error generando planilla' });
    }
  });

  // DESPACHAR / MARCAR COMO ENTREGADO A EFECTOR (SOPORTA ENTREGAS PARCIALES)
  app.post('/api/efectores/:nombre/despachar', (req, res) => {
    try {
      const { nombre } = req.params;
      const normNombre = normalizarNombreEfector(nombre);
      const { usuario, operador, prescripcionIds } = req.body;
      const opFinal = operador || usuario || 'Farmacia Central Sabatto';

      const stmt = database.prepare(`
        SELECT pr.id, pr.dni, pr.paciente_nombre, pr.generico, pr.presentacion,
               (pr.cantidad_total - pr.cantidad_entregada) as aEntregar
        FROM prescripciones pr
        WHERE (pr.efector_carga = ? OR pr.efector_carga = ?) AND (pr.cantidad_total - pr.cantidad_entregada) > 0;
      `);
      stmt.bind([nombre, normNombre]);

      let aDespachar: any[] = [];
      while (stmt.step()) {
        aDespachar.push(stmt.getAsObject());
      }
      stmt.free();

      // Filter by prescripcionIds if provided for partial dispatch
      if (Array.isArray(prescripcionIds) && prescripcionIds.length > 0) {
        const idsSet = new Set(prescripcionIds.map(id => String(id)));
        aDespachar = aDespachar.filter(item => idsSet.has(String(item.id)));
      }

      if (aDespachar.length === 0) {
        return res.json({ exito: true, mensaje: 'No hay entregas seleccionadas o pendientes para despachar.' });
      }

      const fechaHora = getFechaHoraArgentina();
      database.exec('BEGIN TRANSACTION;');

      for (const item of aDespachar) {
        // 1. Update prescription cantidad_entregada, estado, fecha_despacho, operador_despacho
        database.run(
          `UPDATE prescripciones 
           SET cantidad_entregada = cantidad_total, estado = 'ENTREGADO', 
               fecha_despacho = ?, operador_despacho = ? 
           WHERE id = ?;`,
          [fechaHora, opFinal, item.id]
        );

        // 2. Insert record into entregas
        database.run(
          `INSERT INTO entregas (prescripcion_id, dni, paciente_nombre, generico, fecha_hora, cantidad_entregada, retirante_nombre, retirante_dni, retirante_parentesco, observaciones, operador)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            item.id,
            item.dni,
            item.paciente_nombre,
            item.generico,
            fechaHora,
            item.aEntregar,
            opFinal,
            'EFECTOR',
            'DESPACHO GENERAL',
            `Despacho a ${normNombre || nombre}`,
            opFinal
          ]
        );
      }

      database.exec('COMMIT;');
      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Se despacharon exitosamente ${aDespachar.length} ítems a ${normNombre || nombre}.`
      });
    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error al despachar envíos' });
    }
  });

  // MARCAR ESTADO GENERAL DE UN EFECTOR (PENDIENTE / PREPARADO / ENTREGADO)
  app.post('/api/efectores/:nombre/estado', (req, res) => {
    try {
      const { nombre } = req.params;
      const normNombre = normalizarNombreEfector(nombre);
      const { nuevoEstado, usuario, operador, prescripcionIds } = req.body;
      const opFinal = operador || usuario || 'Farmacia Central Sabatto';
      const fechaHora = getFechaHoraArgentina();

      if (!['PENDIENTE', 'PREPARADO', 'ENTREGADO'].includes(nuevoEstado)) {
        return res.status(400).json({ exito: false, mensaje: 'Estado inválido' });
      }

      if (nuevoEstado === 'ENTREGADO') {
        const stmt = database.prepare(`
          SELECT pr.id, pr.dni, pr.paciente_nombre, pr.generico, pr.presentacion,
                 (pr.cantidad_total - pr.cantidad_entregada) as aEntregar
          FROM prescripciones pr
          WHERE (pr.efector_carga = ? OR pr.efector_carga = ?) AND (pr.cantidad_total - pr.cantidad_entregada) > 0;
        `);
        stmt.bind([nombre, normNombre]);

        const aDespachar: any[] = [];
        while (stmt.step()) {
          aDespachar.push(stmt.getAsObject());
        }
        stmt.free();

        if (aDespachar.length > 0) {
          database.exec('BEGIN TRANSACTION;');

          for (const item of aDespachar) {
            database.run(
              `UPDATE prescripciones 
               SET cantidad_entregada = cantidad_total, estado = 'ENTREGADO', 
                   fecha_despacho = ?, operador_despacho = ? 
               WHERE id = ?;`,
              [fechaHora, opFinal, item.id]
            );

            database.run(
              `INSERT INTO entregas (prescripcion_id, dni, paciente_nombre, generico, fecha_hora, cantidad_entregada, retirante_nombre, retirante_dni, retirante_parentesco, observaciones, operador)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                item.id,
                item.dni,
                item.paciente_nombre,
                item.generico,
                fechaHora,
                item.aEntregar,
                opFinal,
                'EFECTOR',
                'DESPACHO GENERAL',
                `Despacho general a ${normNombre || nombre}`,
                opFinal
              ]
            );
          }

          database.exec('COMMIT;');
        }
      } else {
        if (Array.isArray(prescripcionIds) && prescripcionIds.length > 0) {
          const numericIds = prescripcionIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n));
          if (numericIds.length > 0) {
            const placeholders = numericIds.map(() => '?').join(',');
            database.run(
              `UPDATE prescripciones 
               SET estado = ?, fecha_despacho = ?, operador_despacho = ? 
               WHERE (efector_carga = ? OR efector_carga = ?) AND id IN (${placeholders});`,
              [nuevoEstado, fechaHora, opFinal, nombre, normNombre, ...numericIds]
            );
          } else {
            database.run(
              `UPDATE prescripciones 
               SET estado = ?, fecha_despacho = ?, operador_despacho = ? 
               WHERE (efector_carga = ? OR efector_carga = ?) AND (cantidad_total - cantidad_entregada) > 0;`,
              [nuevoEstado, fechaHora, opFinal, nombre, normNombre]
            );
          }
        } else {
          database.run(
            `UPDATE prescripciones 
             SET estado = ?, fecha_despacho = ?, operador_despacho = ? 
             WHERE (efector_carga = ? OR efector_carga = ?) AND (cantidad_total - cantidad_entregada) > 0;`,
            [nuevoEstado, fechaHora, opFinal, nombre, normNombre]
          );
        }
      }

      saveDbToDisk();
      res.json({ exito: true, mensaje: `Estado actualizado a '${nuevoEstado}' para ${normNombre || nombre}.` });
    } catch (err: any) {
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error actualizando estado del efector' });
    }
  });

  // REVERTIR DESPACHO DE UN EFECTOR (VOLVER A PENDIENTE)
  app.post('/api/efectores/:nombre/revertir', (req, res) => {
    try {
      const { nombre } = req.params;
      const normNombre = normalizarNombreEfector(nombre);

      database.exec('BEGIN TRANSACTION;');

      // 1. Delete delivery records associated with prescriptions of this efector
      database.run(
        `DELETE FROM entregas 
         WHERE prescripcion_id IN (
           SELECT id FROM prescripciones WHERE (efector_carga = ? OR efector_carga = ?)
         );`,
        [nombre, normNombre]
      );

      // 2. Reset prescripciones cantidad_entregada = 0, estado = 'PENDIENTE'
      database.run(
        `UPDATE prescripciones 
         SET cantidad_entregada = 0, estado = 'PENDIENTE', fecha_despacho = NULL, operador_despacho = NULL 
         WHERE (efector_carga = ? OR efector_carga = ?);`,
        [nombre, normNombre]
      );

      database.exec('COMMIT;');
      saveDbToDisk();

      res.json({ exito: true, mensaje: `Se revirtió correctamente todo el despacho de ${normNombre || nombre}. Todos los ítems volvieron a estado PENDIENTE.` });
    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error revirtiendo estado del efector' });
    }
  });

  // ANULAR / ELIMINAR ENTREGA INDIVIDUAL
  app.delete('/api/entregas/:id', (req, res) => {
    try {
      const { id } = req.params;

      const stmt = database.prepare(`SELECT id, prescripcion_id, cantidad_entregada, generico, paciente_nombre FROM entregas WHERE id = ?;`);
      stmt.bind([id]);
      if (!stmt.step()) {
        stmt.free();
        return res.status(404).json({ exito: false, mensaje: 'Registro de entrega no encontrado.' });
      }
      const e: any = stmt.getAsObject();
      stmt.free();

      database.exec('BEGIN TRANSACTION;');

      // 1. Delete delivery log
      database.run(`DELETE FROM entregas WHERE id = ?;`, [id]);

      // 2. Reincorporate units to prescription or stock_general
      if (e.prescripcion_id && Number(e.prescripcion_id) !== 0) {
        const stmtP = database.prepare(`SELECT id, cantidad_total, cantidad_entregada FROM prescripciones WHERE id = ?;`);
        stmtP.bind([e.prescripcion_id]);
        if (stmtP.step()) {
          const p: any = stmtP.getAsObject();
          const nuevaCantEnt = Math.max(0, p.cantidad_entregada - e.cantidad_entregada);
          let nuevoEstado = 'PENDIENTE';
          if (nuevaCantEnt >= p.cantidad_total && p.cantidad_total > 0) {
            nuevoEstado = 'ENTREGADO';
          } else if (nuevaCantEnt > 0) {
            nuevoEstado = 'PARCIAL';
          }

          database.run(
            `UPDATE prescripciones SET cantidad_entregada = ?, estado = ? WHERE id = ?;`,
            [nuevaCantEnt, nuevoEstado, e.prescripcion_id]
          );
        }
        stmtP.free();
      } else {
        // Delivery was from Stock General or loose prescription (prescripcion_id = 0)
        const cleanGenerico = e.generico ? e.generico.replace(/\s*\(Stock General CAPS 1\)/i, '').trim() : '';
        if (cleanGenerico) {
          database.run(
            `UPDATE stock_general SET cantidad_disponible = cantidad_disponible + ?, fecha_actualizacion = ? WHERE generico = ?;`,
            [e.cantidad_entregada, getFechaArgentina(), cleanGenerico]
          );
          database.run(
            `INSERT INTO movimientos_stock_general (generico, tipo_movimiento, cantidad, dni_paciente, paciente_nombre, motivo, fecha_hora, usuario)
             VALUES (?, 'ANULACION_DISPENSACION', ?, '', ?, 'Anulación de dispensación por ventanilla', ?, 'Farm. Sabatto (Operador)');`,
            [cleanGenerico, e.cantidad_entregada, e.paciente_nombre || '', getFechaHoraArgentina()]
          );
        }
      }

      database.exec('COMMIT;');
      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Entrega de ${e.cantidad_entregada} un. de ${e.generico} anulada. Se reincorporó el saldo a favor del paciente.`
      });

    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error anulando la entrega.' });
    }
  });

  // MARCAR ESTADO DE UNA PRESCRIPCIÓN INDIVIDUAL
  app.post('/api/prescripciones/:id/estado', (req, res) => {
    try {
      const { id } = req.params;
      const { nuevoEstado } = req.body;

      if (!['PENDIENTE', 'PREPARADO', 'ENTREGADO'].includes(nuevoEstado)) {
        return res.status(400).json({ exito: false, mensaje: 'Estado inválido' });
      }

      database.run(`UPDATE prescripciones SET estado = ? WHERE id = ?;`, [nuevoEstado, id]);
      saveDbToDisk();

      res.json({ exito: true, mensaje: `Estado de la receta actualizado a ${nuevoEstado}` });
    } catch (err: any) {
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error actualizando estado de la receta' });
    }
  });

  // REGISTER DELIVERY
  app.post('/api/entregas', (req, res) => {
    try {
      const { prescripcionId, cantidadEntregada, retiranteNombre, retiranteDni, retiranteParentesco, observaciones, operador } = req.body;
      const opFinal = operador || 'Operador Farmacia Sabatto';

      if (!prescripcionId || !cantidadEntregada || cantidadEntregada <= 0) {
        return res.status(400).json({ exito: false, mensaje: 'Cantidad a entregar inválida' });
      }

      // Read prescripcion
      const stmtP = database.prepare(`SELECT id, dni, paciente_nombre, generico, cantidad_total, cantidad_entregada FROM prescripciones WHERE id = ?;`);
      stmtP.bind([prescripcionId]);
      
      if (!stmtP.step()) {
        stmtP.free();
        return res.status(404).json({ exito: false, mensaje: 'Prescripción no encontrada' });
      }

      const p: any = stmtP.getAsObject();
      stmtP.free();

      const saldoActual = p.cantidad_total - p.cantidad_entregada;
      if (cantidadEntregada > saldoActual) {
        return res.status(400).json({
          exito: false,
          mensaje: `No puede entregar ${cantidadEntregada} unidades. El saldo pendiente actual es de ${saldoActual}.`
        });
      }

      const nuevaCantidadEntregada = p.cantidad_entregada + cantidadEntregada;
      const nuevoEstado = nuevaCantidadEntregada >= p.cantidad_total ? 'ENTREGADO' : 'PARCIAL';
      const fechaHoraActual = getFechaHoraArgentina();

      database.exec('BEGIN TRANSACTION;');

      // Insert Entrega Log
      database.run(
        `INSERT INTO entregas (prescripcion_id, dni, paciente_nombre, generico, fecha_hora, cantidad_entregada, retirante_nombre, retirante_dni, retirante_parentesco, observaciones, operador)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          prescripcionId,
          p.dni,
          p.paciente_nombre,
          p.generico,
          fechaHoraActual,
          cantidadEntregada,
          retiranteNombre || p.paciente_nombre,
          retiranteDni || p.dni,
          retiranteParentesco || 'Titular (Paciente)',
          observaciones || '',
          opFinal
        ]
      );

      // Update Prescripción
      database.run(
        `UPDATE prescripciones 
         SET cantidad_entregada = ?, estado = ?, fecha_despacho = ?, operador_despacho = ? 
         WHERE id = ?;`,
        [nuevaCantidadEntregada, nuevoEstado, fechaHoraActual, opFinal, prescripcionId]
      );

      database.exec('COMMIT;');
      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Entrega de ${cantidadEntregada} unidades de ${p.generico} registrada correctamente por ${opFinal}.`,
        nuevoSaldo: p.cantidad_total - nuevaCantidadEntregada,
        estado: nuevoEstado,
        operador: opFinal,
        fechaHora: fechaHoraActual
      });

    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error registrando entrega' });
    }
  });

  // ADJUST REAL RECEIVED QUANTITY FOR A PRESCRIPTION
  app.post('/api/prescripciones/:id/ajustar-cantidad', (req, res) => {
    try {
      const { id } = req.params;
      const { cantidadReal, motivo, operador } = req.body;
      const opFinal = operador || 'Operador Farmacia Sabatto';

      if (cantidadReal === undefined || cantidadReal === null || isNaN(Number(cantidadReal)) || Number(cantidadReal) < 0) {
        return res.status(400).json({ exito: false, mensaje: 'La cantidad real recibida debe ser un número válido mayor o igual a 0.' });
      }

      const cantRealNum = Math.floor(Number(cantidadReal));

      // Fetch current prescription
      const stmt = database.prepare(`
        SELECT id, dni, paciente_nombre, generico, cantidad_total, cantidad_entregada, estado, observaciones, efector_carga
        FROM prescripciones
        WHERE id = ?;
      `);
      stmt.bind([id]);
      if (!stmt.step()) {
        stmt.free();
        return res.status(404).json({ exito: false, mensaje: 'Prescripción no encontrada.' });
      }

      const p: any = stmt.getAsObject();
      stmt.free();

      const anteriorTotal = p.cantidad_total;
      const entregadaActual = p.cantidad_entregada;

      if (cantRealNum < entregadaActual) {
        return res.status(400).json({
          exito: false,
          mensaje: `No se puede ajustar la cantidad a ${cantRealNum} un. porque ya se han entregado ${entregadaActual} un. de este ítem.`
        });
      }

      let nuevoEstado = 'PENDIENTE';
      if (entregadaActual >= cantRealNum && cantRealNum > 0) {
        nuevoEstado = 'ENTREGADO';
      } else if (entregadaActual > 0) {
        nuevoEstado = 'PARCIAL';
      }

      const hoyHora = getFechaHoraArgentina();
      const notaJustificacion = `[Ajuste de Recibido ${hoyHora}]: De ${anteriorTotal} un. a ${cantRealNum} un. Motivo: ${motivo || 'Ajuste de físico recibido'} (${opFinal})`;
      const obsFinal = p.observaciones ? `${p.observaciones} | ${notaJustificacion}` : notaJustificacion;

      database.exec('BEGIN TRANSACTION;');
      database.run(
        `UPDATE prescripciones
         SET cantidad_total = ?, estado = ?, observaciones = ?
         WHERE id = ?;`,
        [cantRealNum, nuevoEstado, obsFinal, id]
      );
      database.exec('COMMIT;');

      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Cantidad ajustada de ${anteriorTotal} un. a ${cantRealNum} un. para ${p.paciente_nombre} (${p.generico}).`,
        anteriorTotal,
        nuevaCantidadTotal: cantRealNum,
        nuevoSaldoPendiente: cantRealNum - entregadaActual,
        nuevoEstado
      });

    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error ajustando cantidad recibida' });
    }
  });

  // GET DELIVERY HISTORY
  app.get('/api/entregas', (req, res) => {
    try {
      const stmt = database.prepare(`
        SELECT id, prescripcion_id as prescripcionId, dni, paciente_nombre as pacienteNombre,
               generico, fecha_hora as fechaHora, cantidad_entregada as cantidadEntregada,
               retirante_nombre as retiranteNombre, retirante_dni as retiranteDni,
               retirante_parentesco as retiranteParentesco, observaciones,
               COALESCE(operador, 'Farmacia Sabatto') as operador
        FROM entregas
        ORDER BY fecha_hora DESC
        LIMIT 100;
      `);

      const entregas: any[] = [];
      while (stmt.step()) {
        entregas.push(stmt.getAsObject());
      }
      stmt.free();

      res.json(entregas);
    } catch (err: any) {
      res.status(500).json({ error: 'Error obteniendo entregas' });
    }
  });

  // GET ALERTS
  app.get('/api/alertas', (req, res) => {
    try {
      const hoyMs = new Date().getTime();
      const hoyIso = getFechaArgentina();

      const stmt = database.prepare(`
        SELECT id, dni, paciente_nombre as pacienteNombre, efector_carga as efectorCarga,
               generico, cantidad_total as cantidadTotal, cantidad_entregada as cantidadEntregada,
               (cantidad_total - cantidad_entregada) as saldoPendiente,
               fecha_prescripcion as fechaPrescripcion, fecha_vencimiento as fechaVencimiento,
               periodo, nro_receta as nroReceta
        FROM prescripciones
        WHERE (cantidad_total - cantidad_entregada) > 0;
      `);

      const sinRetirar: any[] = [];
      const proximosVencer: any[] = [];
      const vencidos: any[] = [];

      while (stmt.step()) {
        const row: any = stmt.getAsObject();
        const fechaPrescMs = new Date(row.fechaPrescripcion).getTime();
        const diasSinRetirar = Math.floor((hoyMs - fechaPrescMs) / 86400000);

        const fechaVencMs = new Date(row.fechaVencimiento).getTime();
        const diasParaVencer = Math.ceil((fechaVencMs - hoyMs) / 86400000);

        row.diasSinRetirar = diasSinRetirar;
        row.diasParaVencer = diasParaVencer;

        // Condition 1: Sin retirar > 60 días
        if (row.cantidadEntregada === 0 && diasSinRetirar >= 60) {
          sinRetirar.push({
            ...row,
            tipoAlerta: 'SIN_RETIRAR',
            titulo: 'Sin retirar > 60 días',
            detalles: `Pasaron ${diasSinRetirar} días desde la prescripción (${row.fechaPrescripcion}) y no ha retirado.`
          });
        }

        // Condition 2: Vencido
        if (diasParaVencer < 0) {
          vencidos.push({
            ...row,
            tipoAlerta: 'VENCIDO',
            titulo: 'Prescripción Vencida',
            detalles: `Venció el ${row.fechaVencimiento} (hace ${Math.abs(diasParaVencer)} días).`
          });
        }
        // Condition 3: Próximo a vencer (entre 0 y 7 días)
        else if (diasParaVencer >= 0 && diasParaVencer <= 7) {
          proximosVencer.push({
            ...row,
            tipoAlerta: 'PROXIMO_VENCER',
            titulo: 'Próximo a Vencer',
            detalles: `Vence en ${diasParaVencer} día(s) el ${row.fechaVencimiento}.`
          });
        }
      }
      stmt.free();

      res.json({
        total: sinRetirar.length + proximosVencer.length + vencidos.length,
        sinRetirar,
        proximosVencer,
        vencidos
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error obteniendo alertas' });
    }
  });

  // DASHBOARD STATS
  app.get('/api/dashboard/stats', (req, res) => {
    try {
      const stmtP = database.prepare(`SELECT COUNT(*) as cnt FROM pacientes;`);
      stmtP.step();
      const totalPacientes = stmtP.getAsObject().cnt as number;
      stmtP.free();

      const stmtPr = database.prepare(`
        SELECT COUNT(*) as totalPr,
               SUM(CASE WHEN (cantidad_total - cantidad_entregada) > 0 THEN 1 ELSE 0 END) as pendPr,
               COUNT(DISTINCT efector_carga) as efCount
        FROM prescripciones;
      `);
      stmtPr.step();
      const resPr: any = stmtPr.getAsObject();
      stmtPr.free();

      const hoyPrefix = new Date().toISOString().split('T')[0];
      const stmtE = database.prepare(`SELECT COUNT(*) as cnt FROM entregas WHERE fecha_hora LIKE ?;`);
      stmtE.bind([`${hoyPrefix}%`]);
      stmtE.step();
      const entregasHoy = stmtE.getAsObject().cnt as number;
      stmtE.free();

      const stmtSG = database.prepare(`SELECT SUM(cantidad_disponible) as stockGen FROM stock_general;`);
      stmtSG.step();
      const stockGeneralTotalUnidades = (stmtSG.getAsObject().stockGen as number) || 0;
      stmtSG.free();

      res.json({
        totalPacientes,
        totalPrescripciones: resPr.totalPr || 0,
        prescripcionesPendientes: resPr.pendPr || 0,
        efectoresConStock: resPr.efCount || 0,
        entregasHoy,
        stockGeneralTotalUnidades
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error en estadísticas' });
    }
  });

  // UNASSIGN PRESCRIPTION / LIBERATE TO STOCK GENERAL
  app.post('/api/prescripciones/:id/liberar-a-stock', (req, res) => {
    try {
      const { id } = req.params;
      const { cantidad, motivo, operador } = req.body;
      const opFinal = operador || 'Operador Farmacia Sabatto';

      // Read prescription
      const stmt = database.prepare(`
        SELECT id, dni, paciente_nombre, generico, presentacion, cantidad_total, cantidad_entregada, observaciones, estado
        FROM prescripciones
        WHERE id = ?;
      `);
      stmt.bind([id]);
      if (!stmt.step()) {
        stmt.free();
        return res.status(404).json({ exito: false, mensaje: 'Prescripción no encontrada.' });
      }

      const p: any = stmt.getAsObject();
      stmt.free();

      const saldoPendiente = p.cantidad_total - p.cantidad_entregada;
      if (saldoPendiente <= 0) {
        return res.status(400).json({ exito: false, mensaje: 'Esta receta ya no posee saldo pendiente para desasignar.' });
      }

      const cantALiberar = cantidad ? Math.min(Math.floor(Number(cantidad)), saldoPendiente) : saldoPendiente;

      if (cantALiberar <= 0) {
        return res.status(400).json({ exito: false, mensaje: 'La cantidad a desasignar debe ser mayor a 0.' });
      }

      const hoy = getFechaArgentina();
      const fechaHoraActual = getFechaHoraArgentina();

      const nuevoTotal = p.cantidad_total - cantALiberar;
      let nuevoEstado = p.estado;
      if (nuevoTotal <= p.cantidad_entregada) {
        nuevoEstado = 'LIBERADO_STOCK';
      }

      const notaLiberacion = `[Liberado a Stock General ${fechaHoraActual}]: ${cantALiberar} un. desasignadas del paciente. Motivo: ${motivo || 'Desasignación e ingreso a Stock General CAPS 1'} (${opFinal})`;
      const obsFinal = p.observaciones ? `${p.observaciones} | ${notaLiberacion}` : notaLiberacion;

      database.exec('BEGIN TRANSACTION;');

      // 1. Update prescription
      database.run(
        `UPDATE prescripciones
         SET cantidad_total = ?, estado = ?, observaciones = ?
         WHERE id = ?;`,
        [nuevoTotal, nuevoEstado, obsFinal, id]
      );

      // 2. Increment stock_general
      database.run(
        `INSERT INTO stock_general (generico, presentacion, cantidad_disponible, fecha_actualizacion)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(generico) DO UPDATE SET 
           cantidad_disponible = cantidad_disponible + excluded.cantidad_disponible,
           fecha_actualizacion = excluded.fecha_actualizacion;`,
        [p.generico, p.presentacion || '', cantALiberar, hoy]
      );

      // 3. Log in movimientos_stock_general
      database.run(
        `INSERT INTO movimientos_stock_general (generico, tipo_movimiento, cantidad, dni_paciente, paciente_nombre, motivo, fecha_hora, usuario)
         VALUES (?, 'DESASIGNACION_PACIENTE', ?, ?, ?, ?, ?, ?);`,
        [
          p.generico,
          cantALiberar,
          p.dni,
          p.paciente_nombre,
          motivo || `Desasignado de paciente (${cantALiberar} un. ingresadas a Stock General)`,
          fechaHoraActual,
          opFinal
        ]
      );

      database.exec('COMMIT;');
      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Se desasignaron ${cantALiberar} un. de ${p.generico} (${p.paciente_nombre}) y se ingresaron al Stock General de CAPS 1.`,
        cantALiberar,
        nuevoTotal,
        nuevoEstado
      });

    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error liberando a stock general' });
    }
  });

  // PHARMACEUTICAL STATISTICS & ANALYTICAL REPORTS ENDPOINT
  app.get('/api/reportes/estadisticas-farmaceuticas', (req, res) => {
    try {
      const hoyMs = new Date().getTime();
      const hoyIso = getFechaArgentina();

      // 1. ALL DELIVERIES
      const stmtE = database.prepare(`
        SELECT id, prescripcion_id, dni, paciente_nombre, generico, fecha_hora, cantidad_entregada, retirante_nombre, retirante_parentesco
        FROM entregas;
      `);
      const entregas: any[] = [];
      while (stmtE.step()) {
        entregas.push(stmtE.getAsObject());
      }
      stmtE.free();

      // Helper for Therapeutic Category
      function getCategoriaTerapeutica(generico: string): string {
        const g = (generico || '').toUpperCase();
        if (g.includes('METFORMINA') || g.includes('GLIBENCLAMIDA') || g.includes('INSULINA') || g.includes('EMPAGLIFLOZINA')) {
          return 'Diabetes / Hipoglucemiantes';
        }
        if (g.includes('LOSARTAN') || g.includes('LOSARTÁN') || g.includes('ENALAPRIL') || g.includes('ATENOLOL') ||
            g.includes('AMLODIPINA') || g.includes('CARVEDILOL') || g.includes('HIDROCLOROTIAZIDA') || g.includes('FUROSEMIDA') || g.includes('VALSARTAN')) {
          return 'Cardiovascular / Antihipertensivos';
        }
        if (g.includes('AMOXICILINA') || g.includes('CEFALEXINA') || g.includes('AZITROMICINA') || g.includes('CIPROFLOXACINA') || g.includes('TRIMETOPRIDA') || g.includes('MUPIROCINA') || g.includes('PENICILINA')) {
          return 'Antibióticos / Antimicrobianos';
        }
        if (g.includes('IBUPROFENO') || g.includes('PARACETAMOL') || g.includes('DICLOFENAC') || g.includes('DIPIRONA') || g.includes('NAPROXENO') || g.includes('ASPIRINA')) {
          return 'Analgésicos / Antiinflamatorios';
        }
        if (g.includes('SALBUTAMOL') || g.includes('BUDESONIDA') || g.includes('FLUTICASONA') || g.includes('LORATADINA') || g.includes('BETAMETASONA')) {
          return 'Respiratorio / Antialérgicos';
        }
        if (g.includes('CLONAZEPAM') || g.includes('ALPRAZOLAM') || g.includes('DIAZEPAM') || g.includes('SERTRALINA') || g.includes('FLUOXETINA') || g.includes('QUETIAPINA') || g.includes('CARBAMAZEPINA')) {
          return 'Salud Mental / Psicofármacos';
        }
        if (g.includes('LEVOTIROXINA')) {
          return 'Endocrinología / Tiroides';
        }
        if (g.includes('OMEPRAZOL') || g.includes('RANITIDINA') || g.includes('DOMPERIDONA')) {
          return 'Gastrointestinal';
        }
        return 'Otros Medicamentos';
      }

      // 1. DÍAS DE LA SEMANA CON MÁS DISPENSACIONES
      const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diasMap: Record<string, { dia: string; orden: number; entregasCount: number; totalUnidades: number }> = {
        'Lunes': { dia: 'Lunes', orden: 1, entregasCount: 0, totalUnidades: 0 },
        'Martes': { dia: 'Martes', orden: 2, entregasCount: 0, totalUnidades: 0 },
        'Miércoles': { dia: 'Miércoles', orden: 3, entregasCount: 0, totalUnidades: 0 },
        'Jueves': { dia: 'Jueves', orden: 4, entregasCount: 0, totalUnidades: 0 },
        'Viernes': { dia: 'Viernes', orden: 5, entregasCount: 0, totalUnidades: 0 },
        'Sábado': { dia: 'Sábado', orden: 6, entregasCount: 0, totalUnidades: 0 },
        'Domingo': { dia: 'Domingo', orden: 7, entregasCount: 0, totalUnidades: 0 },
      };

      // 2. DISTRIBUCIÓN POR MES Y DÍA
      const mesesMap: Record<string, { mesIso: string; mesNombre: string; entregasCount: number; totalUnidades: number }> = {};
      const diasEvolucionMap: Record<string, { fechaIso: string; entregasCount: number; totalUnidades: number }> = {};

      // 3. TOP MEDICAMENTOS MÁS ENTREGADOS
      const topMedicamentosMap: Record<string, { generico: string; totalUnidades: number; entregasCount: number; dnis: Set<string>; categoria: string }> = {};

      // 4. CONSUMO POR CATEGORÍA TERAPÉUTICA
      const categoriasMap: Record<string, { categoria: string; totalUnidades: number; entregasCount: number; dnis: Set<string>; drogasCount: Record<string, number> }> = {};

      // 5. ESTACIONALIDAD (CATEGORÍA POR MES)
      const estacionalidadMap: Record<string, Record<string, number>> = {}; // mes -> categoria -> unidades

      let totalUnidadesDispensadas = 0;
      const dnisUnicosAtendidos = new Set<string>();

      for (const e of entregas) {
        const cant = e.cantidad_entregada || 0;
        totalUnidadesDispensadas += cant;
        if (e.dni) dnisUnicosAtendidos.add(e.dni);

        const fechaHoraStr = e.fecha_hora || '';
        const [fechaPart] = fechaHoraStr.split(' ');
        if (fechaPart && fechaPart.length >= 10) {
          const [yStr, mStr, dStr] = fechaPart.split('-');
          const y = Number(yStr);
          const m = Number(mStr);
          const d = Number(dStr);

          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            // Day of week
            const dayIndex = new Date(y, m - 1, d).getDay();
            const diaNombre = diasNombres[dayIndex] || 'Lunes';
            if (diasMap[diaNombre]) {
              diasMap[diaNombre].entregasCount += 1;
              diasMap[diaNombre].totalUnidades += cant;
            }

            // Month evolution
            const mesIso = `${yStr}-${mStr}`;
            const dateObj = new Date(y, m - 1, 1);
            const mesNombre = dateObj.toLocaleString('es-AR', { month: 'short', year: 'numeric' });
            if (!mesesMap[mesIso]) {
              mesesMap[mesIso] = { mesIso, mesNombre, entregasCount: 0, totalUnidades: 0 };
            }
            mesesMap[mesIso].entregasCount += 1;
            mesesMap[mesIso].totalUnidades += cant;

            // Daily evolution
            if (!diasEvolucionMap[fechaPart]) {
              diasEvolucionMap[fechaPart] = { fechaIso: fechaPart, entregasCount: 0, totalUnidades: 0 };
            }
            diasEvolucionMap[fechaPart].entregasCount += 1;
            diasEvolucionMap[fechaPart].totalUnidades += cant;

            // Seasonal category
            const cat = getCategoriaTerapeutica(e.generico);
            if (!estacionalidadMap[mesIso]) {
              estacionalidadMap[mesIso] = {};
            }
            estacionalidadMap[mesIso][cat] = (estacionalidadMap[mesIso][cat] || 0) + cant;
          }
        }

        // Top drugs
        const gen = e.generico || 'S/D';
        const cat = getCategoriaTerapeutica(gen);
        if (!topMedicamentosMap[gen]) {
          topMedicamentosMap[gen] = { generico: gen, totalUnidades: 0, entregasCount: 0, dnis: new Set(), categoria: cat };
        }
        topMedicamentosMap[gen].totalUnidades += cant;
        topMedicamentosMap[gen].entregasCount += 1;
        if (e.dni) topMedicamentosMap[gen].dnis.add(e.dni);

        // Categories Map
        if (!categoriasMap[cat]) {
          categoriasMap[cat] = { categoria: cat, totalUnidades: 0, entregasCount: 0, dnis: new Set(), drogasCount: {} };
        }
        categoriasMap[cat].totalUnidades += cant;
        categoriasMap[cat].entregasCount += 1;
        if (e.dni) categoriasMap[cat].dnis.add(e.dni);
        categoriasMap[cat].drogasCount[gen] = (categoriasMap[cat].drogasCount[gen] || 0) + cant;
      }

      const diasSemanaArray = Object.values(diasMap).sort((a, b) => a.orden - b.orden);
      let diaPico = diasSemanaArray[0]?.dia || 'Lunes';
      let maxEntregasDia = 0;
      for (const d of diasSemanaArray) {
        if (d.entregasCount > maxEntregasDia) {
          maxEntregasDia = d.entregasCount;
          diaPico = d.dia;
        }
      }

      const evolucionMensualArray = Object.values(mesesMap).sort((a, b) => a.mesIso.localeCompare(b.mesIso));
      const evolucionDiariaArray = Object.values(diasEvolucionMap)
        .sort((a, b) => b.fechaIso.localeCompare(a.fechaIso))
        .slice(0, 30); // Last 30 active days

      const topMedicamentosArray = Object.values(topMedicamentosMap)
        .map(m => ({
          generico: m.generico,
          totalUnidades: m.totalUnidades,
          entregasCount: m.entregasCount,
          pacientesUnicos: m.dnis.size,
          categoria: m.categoria
        }))
        .sort((a, b) => b.totalUnidades - a.totalUnidades)
        .slice(0, 20);

      const categoriasArray = Object.values(categoriasMap)
        .map(c => {
          let topDroga = '-';
          let maxCant = 0;
          for (const [d, cnt] of Object.entries(c.drogasCount)) {
            if (cnt > maxCant) {
              maxCant = cnt;
              topDroga = d;
            }
          }
          const pct = totalUnidadesDispensadas > 0 ? Number(((c.totalUnidades / totalUnidadesDispensadas) * 100).toFixed(1)) : 0;
          return {
            categoria: c.categoria,
            totalUnidades: c.totalUnidades,
            entregasCount: c.entregasCount,
            pacientesUnicos: c.dnis.size,
            porcentaje: pct,
            topDroga
          };
        })
        .sort((a, b) => b.totalUnidades - a.totalUnidades);

      // ALL PRESCRIPTIONS FOR ADHERENCE & COVERAGE
      const stmtP = database.prepare(`
        SELECT id, dni, paciente_nombre as pacienteNombre, efector_carga as efectorCarga,
               generico, cantidad_total as cantidadTotal, cantidad_entregada as cantidadEntregada,
               (cantidad_total - cantidad_entregada) as saldoPendiente,
               fecha_prescripcion as fechaPrescripcion, fecha_vencimiento as fechaVencimiento,
               periodo, estado
        FROM prescripciones;
      `);
      const prescripciones: any[] = [];
      while (stmtP.step()) {
        prescripciones.push(stmtP.getAsObject());
      }
      stmtP.free();

      // PRESCRIPTION COVERAGE METRICS
      let countEntregadasCompletas = 0;
      let countEntregadasParciales = 0;
      let countPendientes = 0;
      let countLiberadas = 0;

      const pacientesAdherenciaMap: Record<string, {
        dni: string;
        pacienteNombre: string;
        efectorCarga: string;
        totalPrescripciones: number;
        totalEntregadasCompletas: number;
        totalUnidadesEntregadas: number;
        totalUnidadesPrescriptas: number;
        drogas: Set<string>;
      }> = {};

      const pacientesRiesgoList: any[] = [];

      for (const pr of prescripciones) {
        if (pr.estado === 'ENTREGADO' || pr.cantidadEntregada >= pr.cantidadTotal) {
          countEntregadasCompletas++;
        } else if (pr.estado === 'PARCIAL' || (pr.cantidadEntregada > 0 && pr.cantidadEntregada < pr.cantidadTotal)) {
          countEntregadasParciales++;
        } else if (pr.estado === 'LIBERADO_STOCK') {
          countLiberadas++;
        } else {
          countPendientes++;
        }

        // Adherence calculations
        const dni = pr.dni;
        if (dni) {
          if (!pacientesAdherenciaMap[dni]) {
            pacientesAdherenciaMap[dni] = {
              dni,
              pacienteNombre: pr.pacienteNombre || 'S/D',
              efectorCarga: pr.efectorCarga || 'S/D',
              totalPrescripciones: 0,
              totalEntregadasCompletas: 0,
              totalUnidadesEntregadas: 0,
              totalUnidadesPrescriptas: 0,
              drogas: new Set()
            };
          }

          pacientesAdherenciaMap[dni].totalPrescripciones += 1;
          pacientesAdherenciaMap[dni].totalUnidadesPrescriptas += pr.cantidadTotal || 0;
          pacientesAdherenciaMap[dni].totalUnidadesEntregadas += pr.cantidadEntregada || 0;
          if (pr.generico) pacientesAdherenciaMap[dni].drogas.add(pr.generico);

          if (pr.cantidadEntregada >= pr.cantidadTotal && pr.cantidadTotal > 0) {
            pacientesAdherenciaMap[dni].totalEntregadasCompletas += 1;
          }
        }

        // Risk detection (diasSinRetirar >= 45 and saldoPendiente > 0)
        const fechaPrescMs = new Date(pr.fechaPrescripcion).getTime();
        const diasSinRetirar = Math.floor((hoyMs - fechaPrescMs) / 86400000);
        const esCronico = (pr.periodo || '').toLowerCase().includes('mensual') ||
                          ['METFORMINA', 'LOSARTAN', 'ENALAPRIL', 'ATENOLOL', 'LEVOTIROXINA', 'AMLO DIPINA'].some(d => (pr.generico || '').toUpperCase().includes(d));

        if (pr.saldoPendiente > 0 && diasSinRetirar >= 45) {
          pacientesRiesgoList.push({
            id: pr.id,
            dni: pr.dni,
            pacienteNombre: pr.pacienteNombre,
            efectorCarga: pr.efectorCarga,
            generico: pr.generico,
            saldoPendiente: pr.saldoPendiente,
            diasSinRetirar,
            fechaPrescripcion: pr.fechaPrescripcion,
            esCronico
          });
        }
      }

      // Ranking Cumplidores
      const rankingCumplidores = Object.values(pacientesAdherenciaMap)
        .map(p => {
          const tasaCumplimiento = p.totalUnidadesPrescriptas > 0
            ? Math.min(100, Math.round((p.totalUnidadesEntregadas / p.totalUnidadesPrescriptas) * 100))
            : 100;
          return {
            dni: p.dni,
            pacienteNombre: p.pacienteNombre,
            efectorCarga: p.efectorCarga,
            totalPrescripciones: p.totalPrescripciones,
            totalEntregadasCompletas: p.totalEntregadasCompletas,
            totalUnidadesEntregadas: p.totalUnidadesEntregadas,
            tasaCumplimiento,
            drogas: Array.from(p.drogas).join(', ')
          };
        })
        .filter(p => p.totalUnidadesEntregadas > 0)
        .sort((a, b) => b.tasaCumplimiento - a.tasaCumplimiento || b.totalUnidadesEntregadas - a.totalUnidadesEntregadas)
        .slice(0, 25);

      // Ranking Riesgo Discontinuados
      const rankingBajaAdherencia = pacientesRiesgoList
        .sort((a, b) => b.diasSinRetirar - a.diasSinRetirar)
        .slice(0, 30);

      const totalPrescripcionesCount = prescripciones.length;
      const pctCompletas = totalPrescripcionesCount > 0 ? Number(((countEntregadasCompletas / totalPrescripcionesCount) * 100).toFixed(1)) : 0;
      const pctParciales = totalPrescripcionesCount > 0 ? Number(((countEntregadasParciales / totalPrescripcionesCount) * 100).toFixed(1)) : 0;
      const pctPendientes = totalPrescripcionesCount > 0 ? Number(((countPendientes / totalPrescripcionesCount) * 100).toFixed(1)) : 0;

      res.json({
        exito: true,
        kpis: {
          totalEntregas: entregas.length,
          totalUnidadesDispensadas,
          pacientesAtendidosUnicos: dnisUnicosAtendidos.size,
          promedioUnidadesPorEntrega: entregas.length > 0 ? (totalUnidadesDispensadas / entregas.length).toFixed(1) : '0',
          diaPicoDispensacion: diaPico,
          totalPrescripcionesCount,
          countEntregadasCompletas,
          countEntregadasParciales,
          countPendientes,
          countLiberadas,
          pctCompletas,
          pctParciales,
          pctPendientes
        },
        diasSemana: diasSemanaArray,
        evolucionMensual: evolucionMensualArray,
        evolucionDiaria: evolucionDiariaArray,
        topMedicamentos: topMedicamentosArray,
        categoriasTerapeuticas: categoriasArray,
        rankingCumplidores,
        rankingBajaAdherencia,
        estacionalidadMeses: Object.keys(estacionalidadMap).sort()
      });

    } catch (err: any) {
      console.error('Error calculando estadísticas farmacéuticas:', err);
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error generando estadísticas farmacéuticas' });
    }
  });

  // DIRECT STOCK GENERAL INGEST (RECEPCIÓN DIRECTA EN CAPS)
  app.post('/api/stock-general/ingresar', (req, res) => {
    try {
      const { generico, cantidad, presentacion, motivo, operador } = req.body;
      const opFinal = operador || 'Operador Farmacia Sabatto';

      if (!generico || !cantidad || Number(cantidad) <= 0) {
        return res.status(400).json({ exito: false, mensaje: 'Debe especificar medicamento y una cantidad válida mayor a 0.' });
      }

      const cantNum = Math.floor(Number(cantidad));
      const hoy = getFechaArgentina();
      const fechaHoraActual = getFechaHoraArgentina();

      database.exec('BEGIN TRANSACTION;');

      // 1. Upsert stock_general
      database.run(
        `INSERT INTO stock_general (generico, presentacion, cantidad_disponible, fecha_actualizacion)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(generico) DO UPDATE SET 
           cantidad_disponible = cantidad_disponible + excluded.cantidad_disponible,
           fecha_actualizacion = excluded.fecha_actualizacion;`,
        [generico.toUpperCase().trim(), presentacion || '', cantNum, hoy]
      );

      // 2. Log movement
      database.run(
        `INSERT INTO movimientos_stock_general (generico, tipo_movimiento, cantidad, dni_paciente, paciente_nombre, motivo, fecha_hora, usuario)
         VALUES (?, 'INGRESO_DIRECTO_CAPS', ?, '', 'STOCKS / INVENTARIO', ?, ?, ?);`,
        [
          generico.toUpperCase().trim(),
          cantNum,
          motivo || 'Ingreso directo / Recepción física en CAPS',
          fechaHoraActual,
          opFinal
        ]
      );

      database.exec('COMMIT;');
      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Se ingresaron ${cantNum} unidades de ${generico.toUpperCase().trim()} al Stock General de CAPS 1 Sabatto.`,
        operador: opFinal,
        fechaHora: fechaHoraActual
      });

    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error registrando ingreso de stock' });
    }
  });

  // STOCK GENERAL API ENDPOINTS
  app.post('/api/stock-general/cerrar-periodo', (req, res) => {
    try {
      database.exec('BEGIN TRANSACTION;');
      const resultado = ejecutarCierrePeriodoSabatto(database);
      database.exec('COMMIT;');
      saveDbToDisk();
      res.json(resultado);
    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error al cerrar período y liberar stock.' });
    }
  });

  app.get('/api/stock-general', (req, res) => {
    try {
      const stmt = database.prepare(`
        SELECT id, generico, presentacion, cantidad_disponible as cantidadDisponible, fecha_actualizacion as fechaActualizacion
        FROM stock_general
        WHERE cantidad_disponible > 0
        ORDER BY generico ASC;
      `);

      const items: any[] = [];
      while (stmt.step()) {
        items.push(stmt.getAsObject());
      }
      stmt.free();

      const stmtMov = database.prepare(`
        SELECT id, generico, tipo_movimiento as tipoMovimiento, cantidad, dni_paciente as dniPaciente, paciente_nombre as pacienteNombre, motivo, fecha_hora as fechaHora, usuario
        FROM movimientos_stock_general
        ORDER BY fecha_hora DESC
        LIMIT 100;
      `);

      const movimientos: any[] = [];
      while (stmtMov.step()) {
        movimientos.push(stmtMov.getAsObject());
      }
      stmtMov.free();

      res.json({
        items,
        movimientos
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error consultando stock general' });
    }
  });

  app.post('/api/stock-general/dispensar', (req, res) => {
    try {
      const { generico, cantidad, dniPaciente, pacienteNombre, motivo, retiranteNombre, retiranteDni, retiranteParentesco, observaciones, operador } = req.body;
      const opFinal = operador || 'Operador Farmacia Sabatto';

      if (!generico || !cantidad || cantidad <= 0 || !dniPaciente || !pacienteNombre) {
        return res.status(400).json({ exito: false, mensaje: 'Medicamento, cantidad y paciente son requeridos.' });
      }

      // Check availability
      const stmtCheck = database.prepare(`SELECT id, cantidad_disponible, presentacion FROM stock_general WHERE generico = ?;`);
      stmtCheck.bind([generico]);
      if (!stmtCheck.step()) {
        stmtCheck.free();
        return res.status(404).json({ exito: false, mensaje: `El medicamento ${generico} no se encuentra en el Stock General.` });
      }

      const stockItem: any = stmtCheck.getAsObject();
      stmtCheck.free();

      if (stockItem.cantidad_disponible < cantidad) {
        return res.status(400).json({
          exito: false,
          mensaje: `Stock insuficiente en Stock General. Disponible: ${stockItem.cantidad_disponible} unidades, solicitado: ${cantidad} unidades.`
        });
      }

      const hoy = getFechaArgentina();
      const fechaHoraActual = getFechaHoraArgentina();

      database.exec('BEGIN TRANSACTION;');

      // 1. Ensure patient exists
      database.run(
        `INSERT INTO pacientes (dni, apellido_nombre, efector_carga, fecha_creacion)
         VALUES (?, ?, 'CAPS N1 Dr Sabatto', ?)
         ON CONFLICT(dni) DO UPDATE SET apellido_nombre = excluded.apellido_nombre;`,
        [dniPaciente, pacienteNombre, hoy]
      );

      // 2. Decrement stock_general
      const nuevoStock = stockItem.cantidad_disponible - cantidad;
      database.run(
        `UPDATE stock_general SET cantidad_disponible = ?, fecha_actualizacion = ? WHERE generico = ?;`,
        [nuevoStock, hoy, generico]
      );

      // 3. Log movement in movimientos_stock_general
      const tipoMov = motivo?.toLowerCase().includes('incremento') ? 'INCREMENTO_DOSIS' : 'DISPENSACION_NUEVO_TRATAMIENTO';
      database.run(
        `INSERT INTO movimientos_stock_general (generico, tipo_movimiento, cantidad, dni_paciente, paciente_nombre, motivo, fecha_hora, usuario)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          generico,
          tipoMov,
          cantidad,
          dniPaciente,
          pacienteNombre,
          motivo || 'Dispensación desde Stock General',
          fechaHoraActual,
          opFinal
        ]
      );

      // 4. Record in entregas for patient history
      database.run(
        `INSERT INTO entregas (prescripcion_id, dni, paciente_nombre, generico, fecha_hora, cantidad_entregada, retirante_nombre, retirante_dni, retirante_parentesco, observaciones, operador)
         VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          dniPaciente,
          pacienteNombre,
          `${generico} (Stock General CAPS 1)`,
          fechaHoraActual,
          cantidad,
          retiranteNombre || pacienteNombre,
          retiranteDni || dniPaciente,
          retiranteParentesco || 'Titular (Paciente)',
          `Dispensado de Stock General. Motivo: ${motivo || 'Nuevo Tratamiento/Dosis'}. ${observaciones || ''}`,
          opFinal
        ]
      );

      database.exec('COMMIT;');
      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: `Dispensación de ${cantidad} unidades de ${generico} registrada a favor de ${pacienteNombre} por ${opFinal}.`,
        disponibleRestante: nuevoStock,
        operador: opFinal,
        fechaHora: fechaHoraActual
      });

    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error dispensando de Stock General' });
    }
  });

  // ==========================================
  // USUARIOS & SEGURIDAD ENDPOINTS
  // ==========================================

  // GET LIST OF USERS
  app.get('/api/usuarios', (req, res) => {
    try {
      const stmt = database.prepare(`
        SELECT id, username, nombre, rol, activo, fecha_creacion as fechaCreacion
        FROM usuarios
        ORDER BY id ASC;
      `);
      const usuarios: any[] = [];
      while (stmt.step()) {
        usuarios.push(stmt.getAsObject());
      }
      stmt.free();
      res.json(usuarios);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error consultando usuarios' });
    }
  });

  // CREATE NEW USER
  app.post('/api/usuarios', (req, res) => {
    try {
      const { username, password, nombre, rol } = req.body;
      if (!username || !password || !nombre) {
        return res.status(400).json({ exito: false, mensaje: 'Usuario, contraseña y nombre son obligatorios.' });
      }

      // Check if username exists
      const stmtCheck = database.prepare(`SELECT id FROM usuarios WHERE LOWER(username) = LOWER(?);`);
      stmtCheck.bind([username.trim()]);
      if (stmtCheck.step()) {
        stmtCheck.free();
        return res.status(400).json({ exito: false, mensaje: `El usuario '${username}' ya existe.` });
      }
      stmtCheck.free();

      const hoy = new Date().toISOString().split('T')[0];
      database.run(
        `INSERT INTO usuarios (username, password, nombre, rol, activo, fecha_creacion)
         VALUES (?, ?, ?, ?, 1, ?);`,
        [username.trim(), password.trim(), nombre.trim(), rol || 'OPERADOR', hoy]
      );
      saveDbToDisk();

      res.json({ exito: true, mensaje: `Usuario '${username}' creado con éxito.` });
    } catch (err: any) {
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error creando usuario' });
    }
  });

  // UPDATE USER
  app.put('/api/usuarios/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, nombre, rol, activo } = req.body;

      if (!username || !nombre) {
        return res.status(400).json({ exito: false, mensaje: 'Usuario y nombre son obligatorios.' });
      }

      if (password && password.trim().length > 0) {
        database.run(
          `UPDATE usuarios 
           SET username = ?, password = ?, nombre = ?, rol = ?, activo = ?
           WHERE id = ?;`,
          [username.trim(), password.trim(), nombre.trim(), rol || 'OPERADOR', activo !== undefined ? (activo ? 1 : 0) : 1, id]
        );
      } else {
        database.run(
          `UPDATE usuarios 
           SET username = ?, nombre = ?, rol = ?, activo = ?
           WHERE id = ?;`,
          [username.trim(), nombre.trim(), rol || 'OPERADOR', activo !== undefined ? (activo ? 1 : 0) : 1, id]
        );
      }

      saveDbToDisk();
      res.json({ exito: true, mensaje: `Usuario '${username}' actualizado correctamente.` });
    } catch (err: any) {
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error actualizando usuario' });
    }
  });

  // DELETE USER
  app.delete('/api/usuarios/:id', (req, res) => {
    try {
      const { id } = req.params;

      // Don't delete if it's the only admin
      const stmtAdmin = database.prepare(`SELECT COUNT(*) as count FROM usuarios WHERE rol = 'ADMIN' AND activo = 1;`);
      let adminCount = 0;
      if (stmtAdmin.step()) {
        adminCount = (stmtAdmin.getAsObject().count as number) || 0;
      }
      stmtAdmin.free();

      const stmtThis = database.prepare(`SELECT rol FROM usuarios WHERE id = ?;`);
      stmtThis.bind([id]);
      let isThisAdmin = false;
      if (stmtThis.step()) {
        isThisAdmin = stmtThis.getAsObject().rol === 'ADMIN';
      }
      stmtThis.free();

      if (isThisAdmin && adminCount <= 1) {
        return res.status(400).json({ exito: false, mensaje: 'No se puede eliminar el único usuario Administrador del sistema.' });
      }

      database.run(`DELETE FROM usuarios WHERE id = ?;`, [id]);
      saveDbToDisk();

      res.json({ exito: true, mensaje: 'Usuario eliminado del sistema.' });
    } catch (err: any) {
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error eliminando usuario' });
    }
  });

  // VERIFY PASSWORD
  app.post('/api/auth/verify', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.json({ valido: false, mensaje: 'Usuario y contraseña son requeridos' });
      }

      const stmt = database.prepare(`SELECT id, username, nombre, rol FROM usuarios WHERE LOWER(username) = LOWER(?) AND password = ? AND activo = 1;`);
      stmt.bind([username.trim(), password.trim()]);
      
      if (stmt.step()) {
        const userObj = stmt.getAsObject();
        stmt.free();
        return res.json({ valido: true, usuario: userObj });
      }
      stmt.free();
      return res.json({ valido: false, mensaje: 'Contraseña o usuario incorrecto.' });
    } catch (err: any) {
      res.status(500).json({ valido: false, mensaje: err?.message || 'Error verificando contraseña' });
    }
  });

  // ADMIN: VACIAR BASE DE DATOS (PURGE ALL TEST DATA)
  app.post('/api/admin/vaciar-base', (req, res) => {
    try {
      const { password, confirmacion } = req.body;

      if (!password) {
        return res.status(400).json({ exito: false, mensaje: 'Debe ingresar la clave de Administrador para confirmar la eliminación.' });
      }

      const confUpper = (confirmacion || '').trim().toUpperCase();
      if (confUpper !== 'BORRAR' && confUpper !== 'VACIAR') {
        return res.status(400).json({ exito: false, mensaje: 'Debe escribir "BORRAR" o "VACIAR" para confirmar la acción.' });
      }

      // Validate admin password against any active ADMIN user
      const stmtAdmin = database.prepare(`SELECT id, username FROM usuarios WHERE rol = 'ADMIN' AND password = ? AND activo = 1;`);
      stmtAdmin.bind([password.trim()]);
      
      if (!stmtAdmin.step()) {
        stmtAdmin.free();
        return res.status(401).json({ exito: false, mensaje: 'Clave de Administrador incorrecta. Operación cancelada por seguridad.' });
      }
      stmtAdmin.free();

      // EXECUTE FULL PURGE OF OPERATIONAL DATA
      database.exec('BEGIN TRANSACTION;');
      database.run(`DELETE FROM entregas;`);
      database.run(`DELETE FROM prescripciones;`);
      database.run(`DELETE FROM pacientes;`);
      database.run(`DELETE FROM archivos_cargados;`);
      database.run(`DELETE FROM stock_general;`);
      database.run(`DELETE FROM movimientos_stock_general;`);
      try {
        database.run(`DELETE FROM sqlite_sequence WHERE name != 'usuarios';`);
      } catch (e) {}
      database.exec('COMMIT;');

      saveDbToDisk();

      res.json({
        exito: true,
        mensaje: 'La base de datos ha sido vaciada completamente. Se han eliminado todos los registros de prueba de pacientes, recetas, entregas y stock libre.'
      });
    } catch (err: any) {
      database.exec('ROLLBACK;');
      res.status(500).json({ exito: false, mensaje: err?.message || 'Error vaciando la base de datos' });
    }
  });

  // BACKUP EXPORT & IMPORT
  app.get('/api/backup/export', (req, res) => {
    try {
      saveDbToDisk();
      const data = database.export();
      const buffer = Buffer.from(data);
      const filename = `backup_farmacia_caps_${new Date().toISOString().split('T')[0]}.db`;
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Error exportando base de datos' });
    }
  });

  // Unhandled API route catch-all (Guarantees JSON 404 instead of HTML)
  app.use('/api/*', (req: express.Request, res: express.Response) => {
    res.status(404).json({
      exito: false,
      mensaje: `Ruta API no encontrada: ${req.method} ${req.originalUrl}`
    });
  });

  // Global API Error Handler (Guarantees JSON responses instead of HTML error pages)
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error Middleware caught:', err);
    res.status(err?.status || 500).json({
      exito: false,
      mensaje: err?.message || 'Error interno del servidor en la API.'
    });
  });

// SERVE FRONTEND (Vite in Dev or Static in Production outside Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  if (process.env.NODE_ENV !== 'production') {
    initApp().then(async () => {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`====================================================`);
        console.log(`💊 Servidor CAPS Sabatto iniciado en http://0.0.0.0:${PORT}`);
        console.log(`====================================================`);
      });
    });
  } else if (!process.env.VERCEL) {
    initApp().then(() => {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`====================================================`);
        console.log(`💊 Servidor CAPS Sabatto iniciado en http://0.0.0.0:${PORT}`);
        console.log(`====================================================`);
      });
    });
  }
}

export default app;
