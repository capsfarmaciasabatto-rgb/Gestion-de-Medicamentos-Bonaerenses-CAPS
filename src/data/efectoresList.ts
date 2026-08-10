import { Efector } from '../types';

export const LISTA_EFECTORES: Efector[] = [
  {
    id: 'sabatto',
    nombre: 'CAPS N1 Dr Sabatto',
    codigo: 'EFEC-01',
    tipo: 'CAPS',
    direccion: 'Sede Central - Farmacia Principal',
  },
  {
    id: 'us2',
    nombre: 'UNIDAD SANITARIA N° 2',
    codigo: 'EFEC-02',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us3',
    nombre: 'UNIDAD SANITARIA N° 3',
    codigo: 'EFEC-03',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us5',
    nombre: 'UNIDAD SANITARIA N° 5',
    codigo: 'EFEC-05',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us6',
    nombre: 'UNIDAD SANITARIA N° 6',
    codigo: 'EFEC-06',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us9',
    nombre: 'UNIDAD SANITARIA N° 9',
    codigo: 'EFEC-09',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us11',
    nombre: 'UNIDAD SANITARIA N° 11',
    codigo: 'EFEC-11',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us13',
    nombre: 'UNIDAD SANITARIA N° 13',
    codigo: 'EFEC-13',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us15',
    nombre: 'UNIDAD SANITARIA N° 15',
    codigo: 'EFEC-15',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us17',
    nombre: 'UNIDAD SANITARIA N° 17',
    codigo: 'EFEC-17',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us18',
    nombre: 'UNIDAD SANITARIA N° 18',
    codigo: 'EFEC-18',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us19',
    nombre: 'UNIDAD SANITARIA N° 19',
    codigo: 'EFEC-19',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us23',
    nombre: 'UNIDAD SANITARIA N° 23',
    codigo: 'EFEC-23',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us27',
    nombre: 'UNIDAD SANITARIA N° 27',
    codigo: 'EFEC-27',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'us31',
    nombre: 'UNIDAD SANITARIA N° 31',
    codigo: 'EFEC-31',
    tipo: 'UNIDAD_SANITARIA',
  },
  {
    id: 'usm1a',
    nombre: 'UNIDAD SANITARIA MOVIL N° 1 a',
    codigo: 'EFEC-M1A',
    tipo: 'UNIDAD_MOVIL',
  },
  {
    id: 'usm1bcd',
    nombre: 'UNIDAD SANITARIA MOVIL N° 1 b, 1 c, 1 d',
    codigo: 'EFEC-M1BCD',
    tipo: 'UNIDAD_MOVIL',
  },
];

export function normalizarNombreEfector(rawName: string): string {
  if (!rawName) return 'CAPS N1 Dr Sabatto';
  const clean = rawName.toUpperCase().trim();

  // Sabatto / Sabato / CDT 1 / CAPS 1 / Sede Central
  if (
    clean.includes('SABATO') ||
    clean.includes('SABATTO') ||
    clean.includes('CENTRO DE DIAGNOSTICO Y TRATAMIENTO N° 1') ||
    clean.includes('CENTRO DE DIAGNOSTICO Y TRATAMIENTO N1') ||
    clean.includes('CDT 1') ||
    clean.includes('CDT N° 1') ||
    clean.includes('CAPS N1') ||
    clean.includes('CAPS 1') ||
    clean.includes('CAPS N° 1') ||
    clean.includes('SEDE CENTRAL') ||
    clean.includes('CENTRO N° 1') ||
    clean.includes('CENTRO 1')
  ) {
    return 'CAPS N1 Dr Sabatto';
  }

  // Check numeric US / Centros
  const matchNum = clean.match(/(?:UNIDAD\s+SANITARIA|CENTRO|US|U\.S\.)\s*(?:N[°º]?|\#)?\s*(\d+)/i);
  if (matchNum && matchNum[1]) {
    const num = parseInt(matchNum[1], 10);
    const target = LISTA_EFECTORES.find(e => {
      const eMatch = e.nombre.match(/N[°º]?\s*(\d+)/i);
      return eMatch && parseInt(eMatch[1], 10) === num;
    });
    if (target) return target.nombre;
    return `UNIDAD SANITARIA N° ${num}`;
  }

  // Unidades Móviles
  if (clean.includes('MOVIL') || clean.includes('MÓVIL')) {
    if (clean.includes('1 A') || clean.includes('1A') || clean.includes('M1A')) {
      return 'UNIDAD SANITARIA MOVIL N° 1 a';
    }
    if (clean.includes('B') || clean.includes('C') || clean.includes('D') || clean.includes('M1BCD')) {
      return 'UNIDAD SANITARIA MOVIL N° 1 b, 1 c, 1 d';
    }
    return 'UNIDAD SANITARIA MOVIL N° 1 a';
  }

  // Exact match search
  const exact = LISTA_EFECTORES.find(e => e.nombre.toUpperCase() === clean);
  if (exact) return exact.nombre;

  return rawName.trim();
}

export function isNombreSabatto(efectorCarga?: string): boolean {
  if (!efectorCarga) return false;
  const norm = normalizarNombreEfector(efectorCarga);
  return norm === 'CAPS N1 Dr Sabatto';
}

