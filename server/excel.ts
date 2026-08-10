import * as XLSX from 'xlsx';
import { ExcelRegistroPreview } from '../src/types';
import { normalizarNombreEfector } from '../src/data/efectoresList';

export function parseExcelBuffer(buffer: Buffer): ExcelRegistroPreview[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  } catch (err) {
    console.error('Error leyendo buffer Excel con XLSX:', err);
    return [];
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rawRows || rawRows.length === 0) return [];

  const registros: ExcelRegistroPreview[] = [];

  const formatValToString = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      const yyyy = val.getFullYear();
      const mm = String(val.getMonth() + 1).padStart(2, '0');
      const dd = String(val.getDate()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy}`;
    }
    return String(val).trim();
  };

  for (const row of rawRows) {
    // Standardize column key lookup (exact key matching priority)
    const getExactVal = (keyCandidates: string[]): string => {
      for (const k of Object.keys(row)) {
        const kClean = k.toUpperCase().trim().replace(/_/g, ' ');
        for (const targetKey of keyCandidates) {
          if (kClean === targetKey.toUpperCase()) {
            const val = row[k];
            if (val !== undefined && val !== null) return formatValToString(val);
          }
        }
      }
      return '';
    };

    const getVal = (keys: string[]): string => {
      // First try exact key match
      const exact = getExactVal(keys);
      if (exact) return exact;

      // Fallback to substring match
      for (const k of Object.keys(row)) {
        const kClean = k.toUpperCase().trim().replace(/_/g, ' ');
        for (const targetKey of keys) {
          if (kClean.includes(targetKey.toUpperCase())) {
            const val = row[k];
            if (val !== undefined && val !== null) return formatValToString(val);
          }
        }
      }
      return '';
    };

    const rawEfector = getVal(['EFECTOR DE CARGA', 'EFECTOR CARGA', 'EFECTOR', 'UNIDAD SANITARIA', 'CAPS']);
    const efectorCarga = normalizarNombreEfector(rawEfector);

    const dniRaw = getVal(['NRO DOCUMENTO', 'DNI', 'DOCUMENTO', 'DOC', 'NUMERO DOC']);
    const dni = dniRaw.replace(/\D/g, ''); // numeric DNI only

    // Extract Apellido & Nombres carefully (check if separate columns exist)
    const apellido = getExactVal(['APELLIDO', 'APELLIDOS']);
    const nombres = getExactVal(['NOMBRES', 'NOMBRE']);
    const apellidoNombreJunto = getVal(['APELLIDO Y NOMBRE', 'PACIENTE', 'APELLIDO_NOMBRE', 'APELLIDO Y NOMBRES']);

    let apellidoNombre = '';
    if (apellido && nombres && !apellidoNombreJunto) {
      apellidoNombre = `${apellido}, ${nombres}`;
    } else if (apellidoNombreJunto) {
      apellidoNombre = apellidoNombreJunto;
    } else if (apellido) {
      apellidoNombre = apellido;
    } else if (nombres) {
      apellidoNombre = nombres;
    }

    const generico = getVal(['GENERICO', 'MEDICAMENTO', 'DROGA', 'DESCRIPCION']);
    const presentacion = getVal(['PRESENTACION', 'ENVASE', 'FORMA']);
    const cantidadStr = getVal(['CANTIDAD', 'CANT', 'UNIDADES']);
    const cantidad = parseInt(cantidadStr, 10) || 0;
    const periodo = getVal(['PERIODO', 'FRECUENCIA', 'COBERTURA']) || 'Mensual';
    const fechaPrescripcionRaw = getVal(['FECHA PRESCRIPCION', 'FECHA RECETA', 'FECHA PRESCRIP', 'FECHA CARGA', 'FECHA']);
    const nroReceta = getVal(['NRO RECETA', 'RECETA', 'NUMERO RECETA']);

    // Clean up fechaPrescripcion (remove time portion if present)
    let fechaPrescripcion = fechaPrescripcionRaw;
    if (fechaPrescripcion && fechaPrescripcion.includes(' ')) {
      fechaPrescripcion = fechaPrescripcion.split(' ')[0];
    }

    if (dni && generico && cantidad > 0) {
      registros.push({
        efectorCarga,
        nroReceta,
        dni,
        apellidoNombre: apellidoNombre || `Paciente DNI ${dni}`,
        generico,
        presentacion,
        cantidad,
        periodo,
        fechaPrescripcion: fechaPrescripcion || new Date().toISOString().split('T')[0],
      });
    }
  }

  return registros;
}

export function generateSampleExcelBuffer(): Buffer {
  const sampleData = [
    {
      'EFECTOR DE CARGA': 'CAPS N1 Dr Sabatto',
      'CODIGO EFECTOR': '01-SABATTO',
      'NRO RECETA': 'REC-2026-101',
      'TIPO DOCUMENTO': 'DNI',
      'NRO DOCUMENTO': '28456123',
      'APELLIDO Y NOMBRE': 'GARCÍA, MARIA ELENA',
      'FECHA NACIMIENTO': '12/05/1981',
      'SEXO': 'F',
      'DOMICILIO': 'Av. San Martín 1450',
      'LOCALIDAD': 'Quilmes',
      'TELEFONO': '1145678912',
      'DIAGNOSTICO': 'I10 - Hipertensión esencial',
      'GENERICO': 'Losartán 50mg',
      'PRESENTACION': 'Comprimidos x 30',
      'CANTIDAD': 90,
      'PERIODO': 'Trimestral',
      'MEDICO': 'Dr. Gómez Carlos',
      'PROGRAMA': 'REMEDIAR',
      'OBSERVACIONES': 'Paciente crónica',
      'FECHA PRESCRIPCION': '15/07/2026',
      'ESTADO': 'ACTIVO',
    },
    {
      'EFECTOR DE CARGA': 'CAPS N1 Dr Sabatto',
      'CODIGO EFECTOR': '01-SABATTO',
      'NRO RECETA': 'REC-2026-101',
      'TIPO DOCUMENTO': 'DNI',
      'NRO DOCUMENTO': '28456123',
      'APELLIDO Y NOMBRE': 'GARCÍA, MARIA ELENA',
      'FECHA NACIMIENTO': '12/05/1981',
      'SEXO': 'F',
      'DOMICILIO': 'Av. San Martín 1450',
      'LOCALIDAD': 'Quilmes',
      'TELEFONO': '1145678912',
      'DIAGNOSTICO': 'I10 - Hipertensión esencial',
      'GENERICO': 'Enalapril 10mg',
      'PRESENTACION': 'Comprimidos x 30',
      'CANTIDAD': 90,
      'PERIODO': 'Trimestral',
      'MEDICO': 'Dr. Gómez Carlos',
      'PROGRAMA': 'REMEDIAR',
      'OBSERVACIONES': 'Paciente crónica',
      'FECHA PRESCRIPCION': '15/07/2026',
      'ESTADO': 'ACTIVO',
    },
    {
      'EFECTOR DE CARGA': 'UNIDAD SANITARIA N° 2',
      'CODIGO EFECTOR': '02-US2',
      'NRO RECETA': 'REC-2026-102',
      'TIPO DOCUMENTO': 'DNI',
      'NRO DOCUMENTO': '32111456',
      'APELLIDO Y NOMBRE': 'FERNÁNDEZ, JUAN CARLOS',
      'FECHA NACIMIENTO': '24/09/1986',
      'SEXO': 'M',
      'DOMICILIO': 'Calle 844 N° 321',
      'LOCALIDAD': 'Solano',
      'TELEFONO': '1198765432',
      'DIAGNOSTICO': 'E11 - Diabetes mellitus tipo 2',
      'GENERICO': 'Metformina 850mg',
      'PRESENTACION': 'Comprimidos x 60',
      'CANTIDAD': 180,
      'PERIODO': 'Trimestral',
      'MEDICO': 'Dra. Rossi Andrea',
      'PROGRAMA': 'PROPADIC',
      'OBSERVACIONES': 'Control glucémico',
      'FECHA PRESCRIPCION': '10/06/2026',
      'ESTADO': 'ACTIVO',
    },
    {
      'EFECTOR DE CARGA': 'UNIDAD SANITARIA N° 5',
      'CODIGO EFECTOR': '05-US5',
      'NRO RECETA': 'REC-2026-103',
      'TIPO DOCUMENTO': 'DNI',
      'NRO DOCUMENTO': '18992341',
      'APELLIDO Y NOMBRE': 'LÓPEZ, ANA MÁXIMA',
      'FECHA NACIMIENTO': '03/11/1968',
      'SEXO': 'F',
      'DOMICILIO': 'Mitre 890',
      'LOCALIDAD': 'Bernal',
      'TELEFONO': '1133221100',
      'DIAGNOSTICO': 'E03 - Hipotiroidismo',
      'GENERICO': 'Levotiroxina 100mcg',
      'PRESENTACION': 'Comprimidos x 30',
      'CANTIDAD': 90,
      'PERIODO': 'Trimestral',
      'MEDICO': 'Dr. Martínez Hugo',
      'PROGRAMA': 'REMEDIAR',
      'OBSERVACIONES': 'Toma en ayunas',
      'FECHA PRESCRIPCION': '20/07/2026',
      'ESTADO': 'ACTIVO',
    },
    {
      'EFECTOR DE CARGA': 'UNIDAD SANITARIA MOVIL N° 1 a',
      'CODIGO EFECTOR': 'M1A-USM',
      'NRO RECETA': 'REC-2026-104',
      'TIPO DOCUMENTO': 'DNI',
      'NRO DOCUMENTO': '25789012',
      'APELLIDO Y NOMBRE': 'RODRÍGUEZ, PEDRO ALBERTO',
      'FECHA NACIMIENTO': '18/02/1977',
      'SEXO': 'M',
      'DOMICILIO': 'Barrio Los Eucaliptus Casa 45',
      'LOCALIDAD': 'Quilmes Oeste',
      'TELEFONO': '1166778899',
      'DIAGNOSTICO': 'I10 - Hipertensión',
      'GENERICO': 'Amlodipina 5mg',
      'PRESENTACION': 'Comprimidos x 30',
      'CANTIDAD': 30,
      'PERIODO': 'Mensual',
      'MEDICO': 'Dra. Benítez Nora',
      'PROGRAMA': 'REMEDIAR',
      'OBSERVACIONES': 'Retiro mensual',
      'FECHA PRESCRIPCION': '25/07/2026',
      'ESTADO': 'ACTIVO',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'efectores');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xls' });
}
