# ASISPLUS-ONCOPLUS - Sistema de Afiliación Médica

**Autor:** Larry Moreno | CEO NODIKA Systems  
**Fecha de creación:** 2025-01-17  
**Última actualización:** 2025-01-29  
**Versión:** 2.0 - ETAPA 2 v4

---

## 📋 DESCRIPCIÓN DEL PROYECTO

Sistema de afiliación médica desarrollado en Google Apps Script que permite a usuarios registrarse al programa ONCOPLUS, gestionar dependientes, calcular costos según edad, procesar pagos recurrentes mediante Mercado Pago y generar tramas de datos para la aseguradora.

### Características principales:
- ✅ Formulario wizard de 4 pasos con validación en tiempo real
- ✅ Cálculo automático de tarifas según edad (Oncosalud + Asisplus)
- ✅ Gestión de dependientes (hasta N dependientes)
- ✅ Integración con Mercado Pago (suscripciones recurrentes)
- ✅ Webhooks para procesamiento automático de pagos
- ✅ Generación automática de TRAMA GRUPALES para exportación
- ✅ Captura de IP del usuario para auditoría
- ✅ Sistema de seguridad con protección de hojas
- ✅ Logs completos de todas las operaciones

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Tecnologías utilizadas:
- **Google Apps Script** (Runtime V8)
- **HTML/CSS/JavaScript** (Frontend)
- **Google Sheets** (Base de datos)
- **Mercado Pago API** (Procesamiento de pagos)
- **ipify.org API** (Captura de IP)

### Estructura de archivos:

```
01_ASISPLUS-ONCOPLUS/
├── .clasp.json                 # Configuración de clasp
├── .claspignore               # Archivos ignorados por clasp
├── appsscript.json            # Manifest de Apps Script
├── app.js                     # Configuración del sistema y TRAMA GRUPALES
├── Código.js                  # Lógica principal del formulario
├── Formulario.html            # Template principal del formulario
├── Paso1.html                 # Paso 1: Datos del titular
├── Paso2.html                 # Paso 2: Contacto y preferencias
├── Paso3.html                 # Paso 3: Dependientes
├── Paso4.html                 # Paso 4: Confirmación
├── PlantillaOncoplus.html     # Template específico Oncoplus
├── css_Estilos.html           # Estilos CSS del formulario
├── js_FormularioWizard.html   # Lógica JavaScript del wizard
├── js_Utilidades.html         # Funciones auxiliares JavaScript
├── README.md                  # Este archivo
└── README_NUEVAS_COLUMNAS_TRAMA_GRUPALES.md  # Documentación de cambios
```

---

## 📊 ESTRUCTURA DE DATOS (GOOGLE SHEETS)

### Hojas del sistema:

#### 1. **TITULAR** (36 columnas)
Almacena los datos principales del titular de la afiliación.

**Columnas principales:**
- `ID_REGISTRO` (PK): Identificador único (formato: REG-xxxxx-XXX)
- `IP_USUARIO`: Dirección IP del usuario al momento del registro
- `NOMBRE 1`, `NOMBRE 2`, `APELLIDO PATERNO`, `APELLIDO MATERNO`
- `TIPO DE DOCUMENTO`, `NUMERO DE DOCUMENTO`
- `FECHA DE NACIMIENTO`, `EDAD`, `SEXO`
- `EMAIL`, `TELEFONO`, `WHATSAPP`
- `PAIS DE NACIMIENTO`
- `PERIODO DE PAGO`, `PAGO RECURRENTE`
- `COSTO INDIVIDUAL ONCOSALUD`, `COSTO INDIVIDUAL ASISPLUS`
- `TOTAL MENSUAL ONCOSALUD`, `TOTAL MENSUAL ASISPLUS (A COBRAR)`
- `DECLARACIÓN DE SALUD`, `DECLARACIÓN JURADA`, `DECLARACIÓN DE PRIVACIDAD`

#### 2. **DEPENDIENTES** (15 columnas)
Almacena los datos de los dependientes del titular.

**Relación:** `ID_TITULAR` → `TITULAR.ID_REGISTRO`

**Columnas principales:**
- `ID_DEPENDIENTE` (PK): Identificador único (formato: DEP-xxxxx-XXX)
- `ID_TITULAR` (FK): Relación con el titular
- `NOMBRE 1`, `NOMBRE 2`, `APELLIDO PATERNO`, `APELLIDO MATERNO`
- `TIPO DE DOCUMENTO`, `NUMERO DE DOCUMENTO`
- `FECHA DE NACIMIENTO`, `EDAD`, `SEXO`
- `PARENTESCO` (CONYUGE, HIJO/A, PADRE, MADRE, OTRO)
- `COSTO INDIVIDUAL ONCOSALUD`, `COSTO INDIVIDUAL ASISPLUS`

#### 3. **MERCADO_PAGO_TRANSACCIONES** (9 columnas)
Registra todas las transacciones de Mercado Pago.

**Relación:** `ID_REGISTRO` → `TITULAR.ID_REGISTRO`

**Columnas principales:**
- `ID_TRANSACCION` (PK): Identificador interno (formato: TRANS-xxxxx-XXX)
- `ID_REGISTRO` (FK): Relación con el titular
- `ID_SUSCRIPCION_MP`: ID de suscripción en Mercado Pago
- `ID_PAGO_MP`: ID del pago procesado en Mercado Pago
- `MONTO`, `MONEDA`, `ESTADO`
- `FECHA_TRANSACCION`, `FECHA_PROXIMO_COBRO`

#### 4. **TRAMA GRUPALES** (20 columnas)
Hoja de exportación para la aseguradora con formato específico.

**Columnas:**
1. PAIS
2. TIPO DE TRAMA
3. GF SAP
4. CERTFICADO
5. APELLIDO PATERNO
6. APELLIDO MATERNO
7. NOMBRE 1
8. NOMBRE 2
9. SEXO
10. FECHA DE NACIMIENTO DD/MM/AAAA
11. PARENTESCO (códigos: 01=Titular, 02=Cónyuge, 03=Padre/Madre, 04=Hijo/a, 05=Otro)
12. TIPO DE DOCUMENTO
13. NUMERO DE DOCUMENTO
14. DIRECCION DE EMPRESA
15. CORREO DE CONTACTO DE LA EMPRESA
16. PROGRAMA
17. INICIO/FIN VIGENCIA
18. **IP_USUARIO** ← NUEVA (v2.0)
19. **ID_PAGO_MP** ← NUEVA (v2.0)
20. **ID_REGISTRO** ← NUEVA (v2.0)

#### 5. **COSTOS** (4 columnas)
Define las tarifas según rangos de edad.

**Columnas:**
- `Edad inicial`, `Edad Final`
- `Tarifa Oncosalud`, `Tarifa Asisplus`

#### 6. **INFORMACIÓN** (2 columnas)
Configuración general del sistema.

#### 7. **LOGS** (8 columnas)
Registro de eventos del sistema para auditoría.

**Columnas:**
- `ID_LOG`, `TIMESTAMP`, `NIVEL` (INFO/WARNING/ERROR)
- `CATEGORIA`, `MENSAJE`, `DATOS` (JSON)
- `ORIGEN`, `USUARIO`

---

## 🔄 FLUJO COMPLETO DEL SISTEMA

### 1. Registro del usuario

```
Usuario abre formulario
    ↓
JavaScript captura IP silenciosamente (ipify.org)
    ↓
Usuario completa 4 pasos del wizard:
    - Paso 1: Datos del titular
    - Paso 2: Contacto y preferencias
    - Paso 3: Dependientes (opcional)
    - Paso 4: Confirmación y declaraciones
    ↓
Frontend envía datos al backend (Google Apps Script)
    ↓
Backend valida datos
    ↓
Backend guarda en TITULAR (con IP_USUARIO)
    ↓
Backend guarda en DEPENDIENTES (si hay)
    ↓
Backend genera TRAMA GRUPALES (con IP_USUARIO, ID_PAGO_MP="Pendiente", ID_REGISTRO)
    ↓
Backend calcula monto total
    ↓
Backend crea suscripción en Mercado Pago
    ↓
Backend registra en MERCADO_PAGO_TRANSACCIONES
    ↓
Usuario es redirigido a Mercado Pago para pagar
```

### 2. Procesamiento del pago (Webhook)

```
Usuario completa pago en Mercado Pago
    ↓
Mercado Pago envía webhook a Google Apps Script
    ↓
Backend recibe notificación de pago
    ↓
Backend consulta detalles del pago en API de MP
    ↓
Backend actualiza MERCADO_PAGO_TRANSACCIONES (ID_PAGO_MP, ESTADO)
    ↓
Backend actualiza TRAMA GRUPALES (ID_PAGO_MP) ← NUEVO en v2.0
    ↓
Si pago aprobado: Backend envía correo de bienvenida
    ↓
Sistema registra todo en LOGS
```

---

## 🆕 CAMBIOS IMPLEMENTADOS EN VERSIÓN 2.0 (29-01-2025)

### Nuevas funcionalidades:

#### 1. **Captura de IP del usuario**
- **Ubicación:** `js_FormularioWizard.html`
- **Método:** API de ipify.org (https://api.ipify.org?format=json)
- **Comportamiento:** Silencioso, no visible para el usuario
- **Fallback:** Si falla, guarda "No disponible"
- **Almacenamiento:** Columna `IP_USUARIO` en TITULAR (columna 36)

**Código:**
```javascript
async function capturarIPUsuario() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    userIPAddress = data.ip;
  } catch (error) {
    userIPAddress = 'No disponible';
  }
}
```

#### 2. **Nuevas columnas en TRAMA GRUPALES**
- **IP_USUARIO** (columna 18): IP del usuario que realizó el registro
- **ID_PAGO_MP** (columna 19): ID del pago procesado en Mercado Pago
- **ID_REGISTRO** (columna 20): ID único del registro para trazabilidad

#### 3. **Actualización automática de TRAMA GRUPALES**
- **Ubicación:** `Código.js` → función `actualizarIDPagoEnTramaGrupales()`
- **Trigger:** Cuando el webhook de Mercado Pago recibe notificación de pago
- **Acción:** Actualiza la columna `ID_PAGO_MP` de "Pendiente" al ID real del pago
- **Alcance:** Actualiza todas las filas (titular + dependientes) del mismo registro

**Código:**
```javascript
function actualizarIDPagoEnTramaGrupales(idRegistro, idPagoMP) {
  const hojaTrama = ss.getSheetByName("TRAMA GRUPALES");
  const datos = hojaTrama.getDataRange().getValues();
  
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][19] === idRegistro) { // Columna 20 = ID_REGISTRO
      hojaTrama.getRange(i + 1, 19).setValue(idPagoMP); // Columna 19 = ID_PAGO_MP
    }
  }
}
```

#### 4. **Funciones de lookup mejoradas**
- **`_obtenerIPPorIDRegistro(idRegistro)`**: Busca la IP en TITULAR usando ID_REGISTRO
- **`_obtenerIDPagoMPPorIDRegistro(idRegistro)`**: Busca el ID de pago en MERCADO_PAGO_TRANSACCIONES

### Archivos modificados:
- ✅ `app.js`: Estructura de TITULAR, TRAMA_HEADERS, funciones de lookup
- ✅ `Código.js`: Captura de IP, actualización de webhook
- ✅ `js_FormularioWizard.html`: Captura de IP del usuario

---

## 🔐 SISTEMA DE SEGURIDAD

### Protección de hojas:
- Todas las hojas se bloquean automáticamente al abrir el documento
- Solo el propietario puede desbloquear mediante contraseña
- Contraseña almacenada en `PropertiesService` (no visible en el sheet)

### Menú ASISPLUS (solo visible para el propietario):
- **Configurar Sistema**: Crea la estructura completa de hojas
- **Administrar Credenciales MP**: Gestión segura de tokens de Mercado Pago
- **1. Configurar Contraseña para Edición**: Define la contraseña de desbloqueo
- **2. Desbloquear Libro para Edición**: Permite editar las hojas
- **3. Bloquear Libro**: Vuelve a proteger todas las hojas

### Credenciales de Mercado Pago:
- Almacenadas en `PropertiesService` (no en hojas visibles)
- `MP_PUBLIC_KEY`: Clave pública para el frontend
- `MP_ACCESS_TOKEN`: Token de acceso para el backend

---

## 🚀 DEPLOYMENT Y CONFIGURACIÓN

### URLs del Proyecto (Entorno de Pruebas):
- **Formulario Web:** https://script.google.com/macros/s/AKfycbyHtmUM5CD06ER1qOS1TCzS4_hLNBY-5lCHsphv6wlUTs-eob2_A8ax8YHtqnoYMHv4/exec
- **Google Sheet:** https://docs.google.com/spreadsheets/d/1LDscvj7Wk1kat8fMPRyUPndYCBIvR4IKrOCxEzx-xx4/edit
- **Apps Script Editor:** https://script.google.com/u/0/home/projects/1IWF4aiUBSlfInf0I8evKw5cHd9b7wTgqllNK2kPi0KEy8IJRyRQFEzS1/edit

### Requisitos previos:
- Cuenta de Google con acceso a Google Apps Script
- Cuenta de Mercado Pago (Perú) con credenciales de producción
- Node.js y clasp instalados (para desarrollo local)

### Instalación:

#### 1. Clonar el repositorio local
```bash
cd "C:\Users\Larry - Laptop\OneDrive\Escritorio\PROYECTOS_NODIKA\01_ASISPLUS-ONCOPLUS"
```

#### 2. Configurar clasp
```bash
# Verificar que clasp esté instalado
clasp --version

# Login en clasp (si es necesario)
clasp login

# Verificar .clasp.json apunta al Script ID correcto
type .clasp.json
```

#### 3. Subir código a Google Apps Script
```bash
clasp push
```

#### 4. Crear deployment
```bash
# Opción 1: Desde la línea de comandos
clasp deploy --description "Proyecto ASISPLUS - ETAPA 2 v4"

# Opción 2: Desde el editor de Apps Script
# - Ir a: Implementar → Nueva implementación
# - Tipo: Aplicación web
# - Ejecutar como: Yo
# - Quién tiene acceso: Todos
```

#### 5. Configurar el Google Sheet

1. Abrir el Google Sheet vinculado
2. Esperar a que aparezca el menú **ASISPLUS** (10-15 segundos)
3. Click en: **ASISPLUS → Configurar Sistema**
4. Esperar a que se creen todas las hojas (1-2 minutos)
5. Click en: **ASISPLUS → 1. Configurar Contraseña para Edición**
6. Ingresar una contraseña segura (mínimo 6 caracteres)
7. Click en: **ASISPLUS → Administrar Credenciales MP**
8. Ingresar:
   - **Public Key** de Mercado Pago
   - **Access Token** de Mercado Pago

#### 6. Configurar webhook en Mercado Pago

1. Ir a: https://www.mercadopago.com.pe/developers/panel
2. Click en "Webhooks"
3. Click "Crear webhook"
4. Configurar:
   - **URL:** [URL del deployment]/exec
   - **Eventos:**
     - ✅ payment
     - ✅ subscription_authorized_payment
     - ✅ subscription_preapproval
5. Guardar webhook

#### 7. Agregar columnas manualmente (si es necesario)

Si las hojas ya existían antes de la v2.0:

**En TITULAR:**
- Agregar columna `IP_USUARIO` después de `ID_REGISTRO`

**En TRAMA GRUPALES:**
- Agregar columnas al final:
  - `IP_USUARIO`
  - `ID_PAGO_MP`
  - `ID_REGISTRO`

---

## 🧪 TESTING

### Prueba completa del sistema:

1. **Abrir el formulario** (URL del deployment)
2. **Abrir consola del navegador** (F12)
3. **Verificar captura de IP:**
   ```
   Capturando IP del usuario...
   IP capturada exitosamente: XXX.XXX.XXX.XXX
   ```
4. **Llenar el formulario:**
   - Paso 1: Datos del titular
   - Paso 2: Contacto (usar email real para recibir correo)
   - Paso 3: Agregar 1-2 dependientes
   - Paso 4: Aceptar declaraciones
5. **Completar registro**
6. **Verificar en TITULAR:**
   - ✅ Registro creado con ID_REGISTRO
   - ✅ IP_USUARIO tiene la IP capturada
7. **Verificar en DEPENDIENTES:**
   - ✅ Dependientes creados con ID_TITULAR correcto
8. **Verificar en TRAMA GRUPALES:**
   - ✅ Filas creadas (titular + dependientes)
   - ✅ IP_USUARIO tiene la IP
   - ✅ ID_PAGO_MP dice "Pendiente"
   - ✅ ID_REGISTRO tiene el ID correcto
9. **Completar pago en Mercado Pago**
10. **Verificar webhook:**
    - ✅ MERCADO_PAGO_TRANSACCIONES actualizado con ID_PAGO_MP
    - ✅ TRAMA GRUPALES actualizado con ID_PAGO_MP real
    - ✅ Correo de bienvenida recibido
11. **Verificar LOGS:**
    - ✅ Todos los eventos registrados

---

## 📈 MÉTRICAS Y MONITOREO

### Logs del sistema:
- Todos los eventos se registran en la hoja **LOGS**
- Niveles: INFO, WARNING, ERROR
- Categorías: DATOS, VALIDACION, MERCADOPAGO, WEBHOOK, etc.

### Consultas útiles:

**Ver últimos registros:**
```javascript
=QUERY(LOGS!A:H, "SELECT * ORDER BY B DESC LIMIT 50")
```

**Ver errores:**
```javascript
=QUERY(LOGS!A:H, "SELECT * WHERE C='ERROR' ORDER BY B DESC")
```

**Ver pagos procesados:**
```javascript
=QUERY(LOGS!A:H, "SELECT * WHERE D='WEBHOOK_MP_PAGO' ORDER BY B DESC")
```

---

## 🐛 TROUBLESHOOTING

### Problema: El menú ASISPLUS no aparece
**Solución:**
- Cerrar y volver a abrir el Google Sheet
- Esperar 15 segundos
- Presionar F5 para recargar

### Problema: Error al guardar credenciales MP
**Solución:**
- Verificar que el Access Token no tenga espacios al inicio/final
- Verificar que sean las credenciales de PRODUCCIÓN (no test)
- Verificar que el token no haya expirado

### Problema: El correo no llega
**Solución:**
- Verificar en hoja LOGS si hay errores
- Verificar que el email sea correcto
- Revisar carpeta de spam
- Verificar cuota de envío de Gmail (500 emails/día)

### Problema: Webhook no funciona
**Solución:**
- Verificar que la URL del webhook sea correcta (debe terminar en /exec)
- Verificar en LOGS si hay errores de webhook
- Verificar que los eventos estén configurados en Mercado Pago
- Probar con un pago de prueba

### Problema: IP no se captura
**Solución:**
- Verificar en consola del navegador si hay errores
- Verificar que ipify.org esté disponible
- Si falla, el sistema guarda "No disponible" y continúa

### Problema: TRAMA GRUPALES no se actualiza con ID_PAGO_MP
**Solución:**
- Verificar que el webhook esté funcionando
- Verificar en LOGS si hay errores de "TRAMA_ACTUALIZADA"
- Verificar que el ID_REGISTRO coincida entre hojas

---

## 📞 SOPORTE

**Desarrollador:** Larry Moreno  
**Empresa:** NODIKA Systems  
**Email:** [Tu email]  
**Proyecto:** ASISPLUS-ONCOPLUS  

---

## 📝 CHANGELOG

### v2.0 - ETAPA 2 v4 (29-01-2025)
- ✅ Agregada captura de IP del usuario
- ✅ Agregada columna IP_USUARIO en TITULAR
- ✅ Agregadas columnas IP_USUARIO, ID_PAGO_MP, ID_REGISTRO en TRAMA GRUPALES
- ✅ Implementada actualización automática de TRAMA GRUPALES cuando llega el pago
- ✅ Agregadas funciones de lookup por ID_REGISTRO
- ✅ Mejorada trazabilidad del sistema

### v1.0 - ETAPA 2 v3 (Anterior)
- ✅ Sistema base funcional
- ✅ Formulario wizard de 4 pasos
- ✅ Integración con Mercado Pago
- ✅ Generación de TRAMA GRUPALES
- ✅ Sistema de seguridad con protección de hojas

---

## 📄 LICENCIA

Proyecto propietario de NODIKA Systems.  
Todos los derechos reservados © 2025.

---

**Última actualización:** 28 de octubre de 2025  
**Versión del documento:** 2.0
