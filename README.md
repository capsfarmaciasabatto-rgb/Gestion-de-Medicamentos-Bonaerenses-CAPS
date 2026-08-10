# 💊 Sistema de Gestión de Medicamentos para CAPS

Sistema web integral desarrollado para la gestión, recepción, separación por efectores y entrega de medicamentos a pacientes en centros de atención primaria de la salud (CAPS) y Unidades Sanitarias.

---

## 📋 Características Principales

1. **Carga de Archivos Excel (`efectores.xls`)**:
   - Procesa archivos Excel de 21 columnas fijas con múltiples efectores de carga mezclados.
   - Prevención de registros duplicados por DNI + Período + Medicamento + Fecha.
   - Generación automática de plantilla Excel de ejemplo en 1 clic.

2. **Estructura de Pacientes y Medicamentos**:
   - Búsqueda veloz por DNI, Nombre o Apellido con autocompletado.
   - Control en cantidad total de unidades (comprimidos).
   - Cálculo automático de vencimiento (Trimestral = 90 días, Mensual = 30 días).

3. **Separación por Efectores de Carga (17 Unidades Sanitarias)**:
   - Armado de paquetes por efector para las 17 Unidades de la red.
   - Generación e impresión de **Planillas de Envío y Manifiestos de Reparto** en formato A4 con espacio para firmas.

4. **Despacho y Entregas Parciales**:
   - Gestión de entregas mensuales sobre recetas trimestrales (ej. entrega 30 de 90).
   - Control continuo de: *Cuánto vino* vs *Cuánto lleva entregado* vs *Saldo pendiente*.
   - Registro de datos del retirante (DNI, Nombre, Parentesco).
   - Generación de **Comprobantes de Entrega en PDF/Impresión**.

5. **Alertas Críticas**:
   - Pacientes sin retirar medicación después de 30 días.
   - Recetas próximas a vencer (7 días) y vencidas.

6. **Despliegue Multi-PC en Tiempo Real (Vercel + Supabase)**:
   - Funciona como aplicación web accesible desde cualquier PC de la farmacia en simultáneo.
   - Base de datos relacional PostgreSQL / Supabase sincronizada en tiempo real.

---

## ☁️ Guía de Despliegue en la Nube (GitHub + Vercel + Supabase)

Para que la app funcione simultáneamente en varias PCs de la farmacia sin depender de una PC servidora local:

### 1. Subir el Código a GitHub
1. Crea un nuevo repositorio en GitHub (ej. `Gestion-de-Medicamentos-Bonaerenses-CAPS`).
2. En GitHub, ve a **Add file -> Upload files**.
3. Arrastra todas las carpetas y archivos descomprimidos del proyecto.
4. Presiona **Commit changes**.

### 2. Conectar con Vercel
1. Inicia sesión en [Vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. Haz clic en **Add New -> Project** e importa tu repositorio de GitHub.

### 3. Configurar Variables de Entorno en Vercel
En la sección **Environment Variables** añade las siguientes claves obtenidas de tu panel de Supabase:
- `SUPABASE_URL`: Tu URL del proyecto Supabase (ej: `https://xxxx.supabase.co`)
- `SUPABASE_KEY`: Tu API Key / Publishable Key de Supabase
- `DATABASE_URL`: La URL de conexión de base de datos PostgreSQL de Supabase

### 4. Desplegar
Haz clic en **Deploy**. Vercel te entregará una URL pública (ejemplo: `https://farmacia-caps.vercel.app`) a la que podrás ingresar desde cualquier PC o navegador.

---

## 🖥️ Opción Alternativa: Despliegue en Red Local (Servidor Físico)

Si prefieres ejecutar el servidor en una PC fija dentro de la red local sin conexión a Internet:
1. Instala Node.js v20+.
2. Ejecuta `npm install` y `npm run build`.
3. Inicia la app con `npm start` (escucha en puerto 3000).
4. Accede desde las demás PCs a `http://IP-DE-LA-PC-SERVIDOR:3000`.

