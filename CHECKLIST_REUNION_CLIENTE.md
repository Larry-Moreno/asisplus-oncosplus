# ✅ CHECKLIST REUNIÓN CLIENTE - LUNES 10:30 AM
**Proyecto:** ASISPLUS-ONCOPLUS - Migración

---

## 📋 ANTES DE LA REUNIÓN (9:00 AM)

- [ ] Abrir carpeta del proyecto: `C:\Users\Larry - Laptop\OneDrive\Escritorio\PROYECTOS_NODIKA\01_ASISPLUS-ONCOPLUS`
- [ ] Verificar que `clasp` esté funcionando: `clasp --version`
- [ ] Verificar login de clasp: `clasp login` (si es necesario)
- [ ] Tener abierto el terminal en la carpeta del proyecto
- [ ] Tener este checklist visible

---

## 📝 DATOS DEL PROYECTO ACTUAL (TU REFERENCIA)

- **Google Sheet Cliente:** https://docs.google.com/spreadsheets/d/1AvY2_dw3nmpx8lsCMI0hsks77OvN-r0ZnwQmLFU0Q74/edit
- **Apps Script corrupto:** (El cliente lo eliminará)
- **Tu Apps Script (referencia):** https://script.google.com/u/0/home/projects/1IWF4aiUBSlfInf0I8evKw5cHd9b7wTgqllNK2kPi0KEy8IJRyRQFEzS1/edit
- **Tu Deployment (referencia):** https://script.google.com/macros/s/AKfycbyjESMxG5Ys78Jpbby00suSurdCUGgEqRtXsgmrk1O6et5UXHePuiI2cUMaY2LXPhRe/exec
- **Tu Google Sheet (referencia):** https://docs.google.com/spreadsheets/d/1LDscvj7Wk1kat8fMPRyUPndYCBIvR4IKrOCxEzx-xx4/edit

---

## 🎯 PASO A PASO EN LA REUNIÓN

### **FASE 1: Cliente elimina Apps Script corrupto (5 min)**
- [ ] Cliente abre: https://docs.google.com/spreadsheets/d/1AvY2_dw3nmpx8lsCMI0hsks77OvN-r0ZnwQmLFU0Q74/edit
- [ ] Cliente va a: Extensiones → Apps Script
- [ ] Cliente click en: ⚙️ Configuración del proyecto
- [ ] Cliente scroll abajo → Click "Eliminar proyecto" 🗑️
- [ ] Cliente confirma eliminación

### **FASE 2: Cliente crea nuevo Apps Script (3 min)**
- [ ] Cliente vuelve al Google Sheet
- [ ] Cliente va a: Extensiones → Apps Script (se crea uno vacío)
- [ ] Cliente copia la URL completa del navegador
- [ ] Cliente te envía la URL (por chat/WhatsApp)

### **FASE 3: TÚ subes el código (2 min)**

Cuando el cliente te envíe la URL, extraer el Script ID:
```
URL: https://script.google.com/u/0/home/projects/XXXXXXXXXXXXX/edit
Script ID: XXXXXXXXXXXXX (la parte entre /projects/ y /edit)
```

**COMANDOS A EJECUTAR:**

```cmd
cd "C:\Users\Larry - Laptop\OneDrive\Escritorio\PROYECTOS_NODIKA\01_ASISPLUS-ONCOPLUS"

REM Actualizar .clasp.json con el Script ID del cliente
echo {> .clasp.json
echo   "scriptId": "SCRIPT_ID_DEL_CLIENTE",>> .clasp.json
echo   "rootDir": "">> .clasp.json
echo }>> .clasp.json

REM Subir el código
clasp push
```

- [ ] Ejecutar comandos de arriba
- [ ] Confirmar que se subieron 12 archivos

### **FASE 4: Cliente configura el sistema (15 min)**

**4.1 Configuración inicial:**
- [ ] Cliente vuelve al Google Sheet
- [ ] Cliente presiona F5 (recargar página)
- [ ] Cliente espera 10-15 segundos
- [ ] Aparece menú "ASISPLUS" en la barra superior
- [ ] Cliente click: ASISPLUS → "Configurar Sistema"
- [ ] Esperar 1-2 minutos (se crean las hojas)

**4.2 Configurar contraseña:**
- [ ] Cliente click: ASISPLUS → "1. Configurar Contraseña para Edición"
- [ ] Cliente ingresa contraseña (mínimo 6 caracteres)
- [ ] Cliente anota la contraseña en lugar seguro

**4.3 Configurar credenciales Mercado Pago:**
- [ ] Cliente tiene listas sus credenciales de MP
- [ ] Cliente click: ASISPLUS → "Administrar Credenciales MP"
- [ ] Cliente ingresa **Public Key**
- [ ] Cliente ingresa **Access Token**
- [ ] Cliente confirma que se guardaron

**4.4 Verificar hoja COSTOS:**
- [ ] Cliente abre hoja "COSTOS" en el Sheet
- [ ] Verificar que tiene los rangos de edad correctos
- [ ] Verificar que tiene los precios correctos
- [ ] Si necesita ajustes, cliente pide contraseña de edición primero

### **FASE 5: Crear Deployment (10 min)**

**5.1 Cliente crea deployment:**
- [ ] Cliente va al Apps Script
- [ ] Cliente click: "Implementar" → "Nueva implementación"
- [ ] Cliente click en icono ⚙️ al lado de "Seleccionar tipo"
- [ ] Cliente selecciona: "Aplicación web"
- [ ] Cliente configura:
  - **Descripción:** "Sistema ASISPLUS-ONCOPLUS v1.0"
  - **Ejecutar como:** "Yo (su correo)"
  - **Quién tiene acceso:** "Todos"
- [ ] Cliente click "Implementar"
- [ ] Cliente **copia la URL del deployment** (la que termina en /exec)
- [ ] Cliente te envía esa URL

**5.2 Probar el formulario:**
- [ ] Abrir la URL del deployment en navegador
- [ ] Verificar que se ve el formulario correctamente
- [ ] NO hacer prueba de pago todavía

### **FASE 6: Configurar Webhook en Mercado Pago (5 min)**

- [ ] Cliente va a: https://www.mercadopago.com.pe/developers/panel
- [ ] Cliente click en "Webhooks"
- [ ] Cliente click "Crear webhook"
- [ ] Cliente configura:
  - **URL:** [Pegar URL del deployment]
  - **Eventos:**
    - ✅ payment
    - ✅ subscription_authorized_payment
    - ✅ subscription_preapproval
- [ ] Cliente guarda webhook
- [ ] Mercado Pago confirma webhook creado

### **FASE 7: Prueba completa del sistema (10 min)**

**7.1 Prueba de formulario:**
- [ ] Abrir URL del deployment
- [ ] Llenar formulario con datos de prueba
- [ ] Usar tarjeta de prueba de MP si está en modo sandbox
- [ ] Completar pago

**7.2 Verificar resultados:**
- [ ] Verificar que aparece registro en hoja "TITULAR"
- [ ] Verificar que aparece transacción en "MERCADO_PAGO_TRANSACCIONES"
- [ ] Verificar que llegó correo de bienvenida
- [ ] Verificar logs en hoja "LOGS"

---

## 🆘 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "You do not have permission to call clasp push"
```cmd
clasp login
```

### El menú ASISPLUS no aparece
- Cerrar y volver a abrir el Google Sheet
- Esperar 15 segundos
- Presionar F5

### Error al guardar credenciales MP
- Verificar que el Access Token no tenga espacios al inicio/final
- Verificar que sean las credenciales de PRODUCCIÓN (no test)

### El correo no llega
- Verificar en hoja "LOGS" si hay errores
- Verificar que el email sea correcto
- Revisar carpeta de spam

---

## 📊 DATOS A RECOPILAR DEL CLIENTE

Al finalizar, anotar:

- [ ] **Script ID del cliente:** ___________________________
- [ ] **URL del Deployment:** ___________________________
- [ ] **Email del cliente:** ___________________________
- [ ] **Cuenta MP configurada:** ___________________________

---

## ✅ CHECKLIST FINAL

- [ ] Sistema configurado y probado
- [ ] Webhook de MP funcionando
- [ ] Correo de bienvenida enviado correctamente
- [ ] Cliente sabe cómo acceder a los datos (hojas del Sheet)
- [ ] Cliente sabe cómo desbloquear hojas (con contraseña)
- [ ] Cliente tiene anotada su contraseña de edición
- [ ] URLs importantes compartidas con el cliente

---

## 📝 NOTAS DE LA REUNIÓN

_Espacio para anotar observaciones durante la reunión:_

```
Fecha reunión: Lunes __/__/____  10:30 AM

Notas:
-
-
-

Pendientes post-reunión:
-
-
```

---

**Última actualización:** Preparado el viernes para reunión del lunes 10:30 AM
**Sistema probado y funcionando:** ✅ Pago + Correo + Webhook OK
