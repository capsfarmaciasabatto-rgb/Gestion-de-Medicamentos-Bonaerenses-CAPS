# 💊 Sistema de Gestión de Medicamentos para CAPS

Sistema web integral desarrollado para la gestión, recepción, separación por efectores y entrega de medicamentos a pacientes en centros de atención primaria de la salud (CAPS) y Unidades Sanitarias en Argentina.

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

6. **Respaldos y Red Local (4 PCs)**:
   - Funcionamiento cliente-servidor 100% en red local (VPN o LAN sin Internet).
   - Exportación e importación manual de la base de datos SQLite (`.db`).
   - Respaldo automático diario en disco local.

---

## 🛠️ Requisitos de Instalación en la PC Principal (SERVIDOR)

1. **Sistema Operativo**: Windows 10 / 11 (64-bit).
2. **Node.js**: Versión LTS (v20 o superior). [Descargar Node.js](https://nodejs.org/)

---

## 🚀 Guía Paso a Paso para Despliegue en Red Local

### Paso 1: Clonar e Instalar Dependencias en la PC Principal
En la PC del farmacéutico (Servidor):
```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/farmacia-caps.git
cd farmacia-caps

# 2. Instalar dependencias
npm install

# 3. Compilar la aplicación para producción
npm run build
```

### Paso 2: Configurar el Firewall de Windows (Permitir Puerto 3000)
Abre la consola de Windows (CMD) como **Administrador** y ejecuta:
```cmd
netsh advfirewall firewall add rule name="Farmacia CAPS" dir=in action=allow protocol=TCP localport=3000
```

### Paso 3: Iniciar el Servidor Principal
```bash
npm start
```
El servidor se ejecutará en: `http://0.0.0.0:3000`.

---

## 💻 Conexión desde las otras 3 PCs (CLIENTES)

No se requiere instalar nada en las otras PCs. Simplemente abra Google Chrome o Edge en cualquiera de las 3 PCs conectadas a la red local/VPN e ingrese a:

- Por nombre de PC: `http://NOMBRE-PC-FARMACIA:3000`
- Por IP local: `http://192.168.1.50:3000`

---

## ⚡ Autostart en Windows (Script `.bat`)

Cree un archivo llamado `iniciar_farmacia.bat` dentro de la carpeta de Inicio de Windows (`shell:startup`) con el siguiente contenido:

```bat
@echo off
title Servidor Farmacia CAPS Sabatto
echo ========================================================
echo   INICIANDO SERVIDOR PRINCIPAL DE FARMACIA CAPS SABATTO
echo ========================================================
cd /d "C:\farmacia-caps"
node dist/server.cjs
pause
```

---

## 💾 Respaldos de Base de Datos

La base de datos SQLite se encuentra en: `C:\farmacia-caps\data\farmacia_caps.db`.
También puede descargarse directamente desde la pestaña **Respaldos y Red** de la interfaz web.
