-- =========================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE PARA FARMACIA CAPS SATTABO
-- Ejecuta este script en el SQL Editor de tu panel de Supabase
-- =========================================================

-- 1. Tabla de almacenamiento del estado persistente SQLite
CREATE TABLE IF NOT EXISTS public.app_db_store (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tablas relacionales del sistema
CREATE TABLE IF NOT EXISTS public.usuarios (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'OPERADOR',
  activo INTEGER NOT NULL DEFAULT 1,
  fecha_creacion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.efectores (
  id TEXT PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  codigo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'UNIDAD_SANITARIA',
  direccion TEXT,
  telefono TEXT,
  observaciones TEXT
);

CREATE TABLE IF NOT EXISTS public.pacientes (
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

CREATE TABLE IF NOT EXISTS public.prescripciones (
  id SERIAL PRIMARY KEY,
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
  operador_despacho TEXT,
  fecha_despacho TEXT
);

CREATE TABLE IF NOT EXISTS public.entregas (
  id SERIAL PRIMARY KEY,
  prescripcion_id INTEGER NOT NULL,
  dni TEXT NOT NULL,
  paciente_nombre TEXT NOT NULL,
  generico TEXT NOT NULL,
  fecha_hora TEXT NOT NULL,
  cantidad_entregada INTEGER NOT NULL,
  retirante_nombre TEXT NOT NULL,
  retirante_dni TEXT NOT NULL,
  retirante_parentesco TEXT NOT NULL,
  observaciones TEXT,
  operador TEXT
);

CREATE TABLE IF NOT EXISTS public.archivos_cargados (
  id SERIAL PRIMARY KEY,
  nombre_archivo TEXT NOT NULL,
  fecha_carga TEXT NOT NULL,
  registros_procesados INTEGER NOT NULL,
  efectores_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.stock_general (
  id SERIAL PRIMARY KEY,
  generico TEXT UNIQUE NOT NULL,
  presentacion TEXT,
  cantidad_disponible INTEGER NOT NULL DEFAULT 0,
  fecha_actualizacion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.movimientos_stock_general (
  id SERIAL PRIMARY KEY,
  generico TEXT NOT NULL,
  tipo_movimiento TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  dni_paciente TEXT,
  paciente_nombre TEXT,
  motivo TEXT,
  fecha_hora TEXT NOT NULL,
  usuario TEXT
);

-- 3. Deshabilitar Row Level Security (RLS) para permitir lectura/escritura mediante API Backend
ALTER TABLE IF EXISTS public.app_db_store DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.efectores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pacientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescripciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.entregas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.archivos_cargados DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_general DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.movimientos_stock_general DISABLE ROW LEVEL SECURITY;

-- Insertar usuarios por defecto si no existen
INSERT INTO public.usuarios (username, password, nombre, rol, activo, fecha_creacion)
VALUES
 ('admin', 'admin', 'Administrador General', 'ADMIN', 1, CURRENT_DATE::text),
 ('farmacia', 'farmacia', 'Farmacéutico Sabatto', 'FARMACEUTICO', 1, CURRENT_DATE::text),
 ('tecnico', 'tecnico', 'Técnico de Carga / Despacho', 'TECNICO', 1, CURRENT_DATE::text),
 ('direccion', 'direccion', 'Dirección CAPS (Solo Lectura)', 'DIRECCION', 1, CURRENT_DATE::text)
ON CONFLICT (username) DO NOTHING;
