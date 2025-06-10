/**
 * Script de Configuración y Gestión ASISPLUS-ONCOPLUS (Consolidado)
 * ---------------------------------------------------
 * Este script crea y gestiona la estructura completa del sistema,
 * incluyendo la configuración del entorno, menús personalizados,
 * y un sistema de seguridad de protección global para todas las hojas.
 *
 * Versión con nuevo sistema de seguridad (Junio 2025)
 */

const NOMBRE_PROPIEDAD_CONTRASENA = 'editorPropietarioPassword';

/**
 * Se ejecuta cuando se abre la hoja de cálculo.
 * Bloquea automáticamente todo el libro y crea el menú personalizado "ASISPLUS".
 */
function onOpen() {
  // Tarea 3: Bloqueo Automático de Seguridad al abrir el archivo.
  // Se invoca con 'false' para que no muestre la notificación "Libro bloqueado" cada vez.
  bloquearLibroEntero(false); 

  const ui = SpreadsheetApp.getUi();
  const ownerEmail = SpreadsheetApp.getActiveSpreadsheet().getOwner().getEmail();
  const currentUserEmail = Session.getEffectiveUser().getEmail();

  // El menú completo solo es visible para el propietario
  if (currentUserEmail === ownerEmail) {
    // Tarea 4: Actualizar el Menú de Usuario
    ui.createMenu('ASISPLUS')
      .addItem('Configurar Sistema', 'configurarEntornoCompleto')
      .addSeparator()
      .addItem('Administrar Credenciales MP', 'mostrarAdminCredenciales')
      .addSeparator()
      .addItem('1. Configurar Contraseña para Edición', 'configurarContrasenaEdicion')
      .addItem('2. Desbloquear Libro para Edición', 'desbloquearLibroEntero')
      .addItem('3. Bloquear Libro', 'bloquearLibroEntero')
      .addToUi();
  }
}

/**
 * Tarea 2 (NUEVA): Bloquea todas las hojas del libro usando protección nativa.
 * @param {boolean} [invocadoManualmente=true] - Para controlar si se muestra la notificación.
 */
function bloquearLibroEntero(invocadoManualmente = true) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = ss.getSheets();
  const yo = Session.getEffectiveUser();

  hojas.forEach(hoja => {
    try {
      const proteccion = hoja.protect().setDescription('Protección del sistema ASISPLUS');
      // Asegura que solo el propietario pueda editar la hoja mientras está protegida.
      // Esto es crucial para que los scripts puedan seguir funcionando.
      proteccion.removeEditors(proteccion.getEditors());
      // Línea eliminada: proteccion.addEditor(yo);
    } catch (e) {
      Logger.log(`No se pudo proteger la hoja '${hoja.getName()}'. Es posible que ya tenga una protección incompatible. Error: ${e.message}`);
    }
  });

  if (invocadoManualmente) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Todas las hojas han sido bloqueadas.', 'Sistema Seguro', 5);
  }
  Logger.log('Sistema bloqueado. Todas las hojas protegidas.');
}

/**
 * Tarea 2 (NUEVA): Desbloquea todas las hojas del libro pidiendo una contraseña.
 */
function desbloquearLibroEntero() {
  const ui = SpreadsheetApp.getUi();
  const storedPassword = PropertiesService.getScriptProperties().getProperty(NOMBRE_PROPIEDAD_CONTRASENA);

  if (!storedPassword) {
    ui.alert('Error', 'Primero debe configurar una contraseña desde el menú ASISPLUS.', ui.ButtonSet.OK);
    return;
  }

  const result = ui.prompt(
    'Desbloquear Libro Completo',
    'Por favor, ingrese la contraseña para habilitar la edición en todas las hojas:',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() === ui.Button.OK) {
    const password = result.getResponseText().trim();
    if (password === storedPassword) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const hojas = ss.getSheets();

      hojas.forEach(hoja => {
        try {
          const proteccion = hoja.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];
          if (proteccion && proteccion.canEdit()) {
            proteccion.remove();
          }
        } catch (e) {
          Logger.log(`No se pudo desproteger la hoja '${hoja.getName()}'. Error: ${e.message}`);
        }
      });
      ui.alert('Éxito', 'Todas las hojas han sido desbloqueadas para edición.', ui.ButtonSet.OK);
      Logger.log('Sistema desbloqueado. Todas las hojas desprotegidas.');
    } else {
      ui.alert('Error', 'Contraseña incorrecta.', ui.ButtonSet.OK);
    }
  }
}

/**
 * Función principal para configurar el entorno completo
 */
function configurarEntornoCompleto() {
  const ui = SpreadsheetApp.getUi();
  
  // Confirmación antes de iniciar
  const respuesta = ui.alert(
    'Configuración del Sistema ASISPLUS-ONCOPLUS',
    'Este proceso configurará la estructura completa del sistema. Se crearán hojas nuevas y se insertarán datos iniciales. ¿Deseas continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (respuesta !== ui.Button.YES) {
    ui.alert('Operación cancelada', 'No se realizó ningún cambio.', ui.ButtonSet.OK);
    return;
  }
  
  try {
    // 1. Configurar estructura base
    configurarEntornoBase();
    
    // 2. Configurar validaciones en las hojas
    configurarValidaciones();
    
    // 3. Configurar formatos avanzados
    aplicarFormatosAvanzados();
    
    // 4. Configurar elementos de seguridad básicos
    configurarSeguridadBasica();

    // 5. Crear la hoja de TRAMA GRUPALES (MODIFICACIÓN ACORDADA)
    _crearHojaTramaGrupales();
    
    ui.alert(
      'Configuración Completada', 
      'El sistema ASISPLUS-ONCOPLUS ha sido configurado exitosamente. Ya puedes comenzar a utilizarlo.', 
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log(`ERROR CRÍTICO en configurarEntornoCompleto: ${error.toString()}\nStack: ${error.stack}`);
    ui.alert(
      'Error en la Configuración', 
      `Ocurrió un error durante el proceso: ${error.message}\n\nPor favor, contacta al administrador del sistema.`, 
      ui.ButtonSet.OK
    );
  }
}

/**
 * Configurar el entorno base de la hoja de cálculo
 */
function configurarEntornoBase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Renombrar la hoja de cálculo si tiene nombre por defecto
  if (ss.getName() === "Hoja de cálculo sin título" || ss.getName() === "Untitled spreadsheet") {
    ss.setName("ASISPLUS-ONCOPLUS Sistema");
    Logger.log("Hoja de cálculo renombrada a: ASISPLUS-ONCOPLUS Sistema");
  }

  // 1. Definición de la estructura de hojas y columnas (manteniendo estructura original)
  const estructuraHojas = {
    // Estructura original de TITULAR (anteriormente REGISTROS)
    TITULAR: [
      "REGISTRO", "PAIS", "TIPO DE TRAMA", "GF SAP", "CERTFICADO", 
      "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRE 1", "NOMBRE 2", "SEXO", 
      "FECHA DE NACIMIENTO DD/MM/AAAA", "PARENTESCO", "TIPO DE DOCUMENTO", "NUMERO DE DOCUMENTO", 
      "DIRECCION DE EMPRESA", "CORREO DE CONTACTO DE LA EMPRESA", "PROGRAMA", 
      "INICIO/FIN VIGENCIA", "PAIS DE NACIMIENTO", "EMAIL", "TELEFONO", "WHATSAPP", 
      "PERIODO DE PAGO", "PAGO RECURRENTE", "DEPENDIENTES", "DECLARACIÓN DE SALUD", 
      "DECLARACIÓN JURADA", "DECLARACIÓN DE PRIVACIDAD", "TIPO DE CLIENTE", 
      "EDAD", "COSTO INDIVIDUAL ONCOSALUD", "COSTO INDIVIDUAL ASISPLUS",
      "TOTAL MENSUAL ONCOSALUD", "TOTAL MENSUAL ASISPLUS (A COBRAR)",
      "ID_REGISTRO"
    ],
    
    // Estructura original de COSTOS
    COSTOS: ["Edad inicial", "Edad Final", "Tarifa Oncosalud", "Tarifa Asisplus"],
    
    // Estructura original de INFORMACIÓN
    INFORMACIÓN: ["ENCABEZADO", "INFORMACIÓN"],
    
    // Nueva hoja DEPENDIENTES (necesaria para gestionar múltiples dependientes)
    DEPENDIENTES: [
      "ID_DEPENDIENTE", "ID_TITULAR", "APELLIDO PATERNO", "APELLIDO MATERNO", 
      "NOMBRE 1", "NOMBRE 2", "SEXO", "FECHA DE NACIMIENTO DD/MM/AAAA", 
      "PARENTESCO", "TIPO DE DOCUMENTO", "NUMERO DE DOCUMENTO", 
      "PAIS DE NACIMIENTO", "EDAD", "COSTO INDIVIDUAL ONCOSALUD", "COSTO INDIVIDUAL ASISPLUS"
    ],
    
    // Nueva hoja para transacciones de Mercado Pago 
    MERCADO_PAGO_TRANSACCIONES: [
      "ID_TRANSACCION", "ID_REGISTRO", "ID_SUSCRIPCION_MP", "ID_PAGO_MP", 
      "MONTO", "MONEDA", "ESTADO", "FECHA_TRANSACCION", "FECHA_PROXIMO_COBRO"
    ],
    
    // Nueva hoja para registro de eventos
    LOGS: [
      "ID_LOG", "TIMESTAMP", "NIVEL", "CATEGORIA", "MENSAJE", "DATOS", "ORIGEN", "USUARIO"
    ]
  };

  // 2. Comprobar y eliminar las hojas por defecto
  const hojasDefault = ['Hoja1', 'Hoja 1', 'Sheet1', 'Sheet 1'];
  
  hojasDefault.forEach(nombreHojaDefault => {
    const hojaDefault = ss.getSheetByName(nombreHojaDefault);
    if (hojaDefault && !estructuraHojas.hasOwnProperty(nombreHojaDefault)) {
      ss.deleteSheet(hojaDefault);
      Logger.log(`Hoja por defecto "${nombreHojaDefault}" eliminada.`);
    }
  });

  // 3. Crear hojas, encabezados y aplicar formato
  for (const [nombreHoja, columnas] of Object.entries(estructuraHojas)) {
    Logger.log(`Procesando hoja: ${nombreHoja}`);
    let hoja = ss.getSheetByName(nombreHoja);

    // Comprobar si existe una versión anterior llamada "REGISTROS" para migrarla
    if (nombreHoja === "TITULAR" && !hoja) {
      const hojaAntigua = ss.getSheetByName("REGISTROS");
      if (hojaAntigua) {
        // Renombrar la hoja antigua por el nuevo nombre
        hojaAntigua.setName("TITULAR");
        Logger.log(`Hoja "REGISTROS" renombrada a "TITULAR" para mantener consistencia con la arquitectura actual.`);
        hoja = ss.getSheetByName("TITULAR");
     }
    }

    if (!hoja) {
      // Si la hoja no existe, la creamos
      hoja = ss.insertSheet(nombreHoja);
      Logger.log(`Hoja "${nombreHoja}" creada.`);
      
      // Añadir encabezados
      hoja.appendRow(columnas);
      Logger.log(`Encabezados añadidos a "${nombreHoja}".`);
      
      // Formatear encabezados
      formatearEncabezados(hoja, columnas.length);
      
      // Establecer ancho de columnas automático
      for (let i = 1; i <= columnas.length; i++) {
        hoja.autoResizeColumn(i);
      }
    } else {
      // Si la hoja ya existe y es COSTOS, no tocar sus datos
      if (nombreHoja === "COSTOS") {
        Logger.log(`Hoja "${nombreHoja}" ya existe. Se conservan sus datos actuales.`);
        
        // Solo formatear encabezados si es necesario
        const primeraFila = hoja.getRange(1, 1, 1, columnas.length).getValues()[0];
        const primeraFilaVacia = primeraFila.every(cell => cell === "");
        
        if (primeraFilaVacia) {
          hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]);
          formatearEncabezados(hoja, columnas.length);
        }
      } else {
        // Si la hoja ya existe, verificar si está vacía
        const primeraFila = hoja.getRange(1, 1, 1, columnas.length).getValues()[0];
        const primeraFilaVacia = primeraFila.every(cell => cell === "");
        
        if (primeraFilaVacia) {
          // Si la primera fila está vacía, añadir encabezados
          hoja.clearContents();
          hoja.appendRow(columnas);
          Logger.log(`Encabezados añadidos a hoja existente vacía "${nombreHoja}".`);
          formatearEncabezados(hoja, columnas.length);
          
          // Establecer ancho de columnas automático
          for (let i = 1; i <= columnas.length; i++) {
            hoja.autoResizeColumn(i);
          }
        } else {
          // Si la hoja ya tiene contenido, verificar si los encabezados coinciden
          let encabezadosCoinciden = true;
          for (let i = 0; i < columnas.length; i++) {
            if (i < primeraFila.length && primeraFila[i] !== columnas[i]) {
              encabezadosCoinciden = false;
              break;
            }
          }
          
          if (!encabezadosCoinciden) {
            // Si los encabezados no coinciden, crear una nueva hoja con el nombre correcto
            const nuevoNombre = `${nombreHoja}_NUEVO`;
            const nuevaHoja = ss.insertSheet(nuevoNombre);
            nuevaHoja.appendRow(columnas);
            formatearEncabezados(nuevaHoja, columnas.length);
            
            // Establecer ancho de columnas automático
            for (let i = 1; i <= columnas.length; i++) {
              nuevaHoja.autoResizeColumn(i);
            }
            
            Logger.log(`Hoja existente "${nombreHoja}" tiene estructura diferente. Se creó una nueva hoja "${nuevoNombre}" con la estructura correcta.`);
          } else {
            // Si los encabezados coinciden, asegurarse de que estén formateados
            formatearEncabezados(hoja, columnas.length);
            Logger.log(`Hoja "${nombreHoja}" ya existe con la estructura correcta.`);
          }
        }
      }
    }

    // Tarea 1: Aplicar protección a cada hoja creada o verificada.
    try {
      const proteccion = hoja.protect().setDescription('Protección del sistema ASISPLUS');
      proteccion.removeEditors(proteccion.getEditors());
      // Línea eliminada: proteccion.addEditor(Session.getEffectiveUser());
      Logger.log(`Hoja "${nombreHoja}" protegida automáticamente.`);
    } catch (e) {
      Logger.log(`No se pudo proteger automáticamente la hoja '${nombreHoja}'. Error: ${e.message}`);
    }
  }

  // 4. Insertar datos iniciales
  insertarDatosIniciales(ss);
}

/**
 * Aplica formato avanzado a las hojas de encabezados y mejora la visualización
 */
function formatearEncabezados(hoja, numColumnas) {
  if (numColumnas <= 0) return;
  
  // Formato estilo corporativo para encabezados
  hoja.getRange(1, 1, 1, numColumnas)
      .setBackground("#D95B43")  // Terracota ASISPLUS (según la documentación)
      .setFontColor("#FFFFFF")   // Texto blanco
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
      
  // Congelar la fila de encabezados
  hoja.setFrozenRows(1);
  
  // Añadir bordes
  const bordesCelda = SpreadsheetApp.BorderStyle.SOLID;
  hoja.getRange(1, 1, 1, numColumnas)
      .setBorder(true, true, true, true, null, null, "#FFFFFF", bordesCelda);
  
  // Ajustar altura de la fila para mejor visualización
  hoja.setRowHeight(1, 30);
  
  Logger.log(`Encabezados formateados para la hoja "${hoja.getName()}".`);
}

/**
 * Inserta datos iniciales en las hojas que lo requieren, pero respeta los datos
 * existentes en la hoja COSTOS
 */
function insertarDatosIniciales(ss) {
  Logger.log("Insertando datos iniciales...");
  
  // Datos para la hoja INFORMACIÓN (manteniendo estructura original)
  const datosINFORMACION = [
    ["PAIS", "PER"],
    ["TIPO DE TRAMA", "ALTA"],
    ["DIRECCION DE EMPRESA", ""],
    ["CORREO DE CONTACTO DE LA EMPRESA", ""],
    ["PROGRAMA", "ONCOSALUD"]
  ];

  // Insertar los datos en INFORMACIÓN
  insertarDatosEnHoja(ss, "INFORMACIÓN", datosINFORMACION);
  
  // Para COSTOS, solo aplicamos el formato si la hoja existe, pero NO insertar datos
  const hojaCostos = ss.getSheetByName("COSTOS");
  if (hojaCostos) {
    // Verificar que existen datos antes de formatear
    const filasFinal = hojaCostos.getLastRow();
    if (filasFinal > 1) {
      // Aplicar únicamente los formatos de moneda sin alterar el contenido
      hojaCostos.getRange(2, 3, filasFinal - 1, 1).setNumberFormat("$#,##0.00");
      hojaCostos.getRange(2, 4, filasFinal - 1, 1).setNumberFormat("$#,##0.00");
      Logger.log("Formatos de moneda aplicados a la hoja COSTOS (datos existentes conservados).");
    } else {
      Logger.log("La hoja COSTOS está vacía. No se aplicaron formatos.");
    }
  }
  
  // Registrar la primera entrada en LOGS
  const hojaLogs = ss.getSheetByName("LOGS");
  if (hojaLogs) {
    hojaLogs.appendRow([
      "LOG001", 
      new Date().toISOString(), 
      "INFO", 
      "SISTEMA", 
      "Sistema ASISPLUS-ONCOPLUS inicializado correctamente", 
      JSON.stringify({version: "1.0.0"}), 
      "Configuración Inicial"
    ]);
    Logger.log("Registro inicial añadido a LOGS.");
  }
  
  // Crear entrada en PropertiesService para las credenciales de Mercado Pago
  // (En lugar de utilizar la hoja MERCADO_PAGO por razones de seguridad)
  try {
    // Crear referencias seguras a las credenciales
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty("MP_CREDENTIALS_SETUP", "FALSE");
    scriptProperties.setProperty("MP_CREDENTIALS_REFERENCE", "Las credenciales de Mercado Pago deben configurarse desde el panel de administración");
    Logger.log("Referencias seguras para credenciales de Mercado Pago creadas.");
  } catch (error) {
    Logger.log(`Error al configurar referencias de seguridad: ${error.message}`);
  }
}

/**
 * Función auxiliar para insertar datos en una hoja específica
 */
function insertarDatosEnHoja(ss, nombreHoja, datos) {
  const hoja = ss.getSheetByName(nombreHoja);
  if (!hoja || datos.length === 0) return;
  
  // Verificar si ya hay datos (excluyendo encabezados)
  const filaFinal = hoja.getLastRow();
  if (filaFinal > 1) {
    // Limpiar datos existentes (excepto encabezados)
    hoja.getRange(2, 1, filaFinal - 1, hoja.getLastColumn()).clearContent();
  }
  
  // Insertar nuevos datos
  hoja.getRange(2, 1, datos.length, datos[0].length).setValues(datos);
  Logger.log(`Datos insertados en hoja ${nombreHoja}: ${datos.length} filas.`);
}

/**
 * Configura validaciones básicas en los campos que lo requieren
 */
function configurarValidaciones() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // 1. Validaciones para TITULAR
    const hojaTitular = ss.getSheetByName("TITULAR");
    if (hojaTitular) {
      hojaTitular.getRange("J2:J").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["M", "F"], true)
          .build()
      );
      hojaTitular.getRange("M2:M").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["DNI", "CE"], true)
          .build()
      );
      hojaTitular.getRange("L2:L").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["TITULAR", "CÓNYUGE", "HIJO/A", "PADRE", "MADRE", "OTRO"], true)
          .build()
      );
      hojaTitular.getRange("X2:X").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["SI", "NO"], true)
          .build()
      );
      hojaTitular.getRange("Z2:AB").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["SI", "NO"], true)
          .build()
      );
      Logger.log("Validaciones configuradas para TITULAR.");
    }
    
    // 2. Validaciones para DEPENDIENTES
    const hojaDependientes = ss.getSheetByName("DEPENDIENTES");
    if (hojaDependientes) {
      hojaDependientes.getRange("G2:G").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["M", "F"], true)
          .build()
      );
      hojaDependientes.getRange("J2:J").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["DNI", "CE"], true)
          .build()
      );
      hojaDependientes.getRange("I2:I").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["CÓNYUGE", "HIJO/A", "PADRE", "MADRE", "OTRO"], true)
          .build()
      );
      Logger.log("Validaciones configuradas para DEPENDIENTES.");
    }
    
    // 3. Validaciones para MERCADO_PAGO_TRANSACCIONES
    const hojaTransacciones = ss.getSheetByName("MERCADO_PAGO_TRANSACCIONES");
    if (hojaTransacciones) {
      hojaTransacciones.getRange("F2:F").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(["PEN"], true)
          .build()
      );
      hojaTransacciones.getRange("G2:G").setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList([
            "pending", "approved", "authorized", "in_process", "in_mediation",
            "rejected", "cancelled", "refunded", "charged_back"
          ], true)
          .build()
      );
      Logger.log("Validaciones configuradas para MERCADO_PAGO_TRANSACCIONES.");
    }
    
  } catch (error) {
    Logger.log(`ERROR en configurarValidaciones: ${error.toString()}\nStack: ${error.stack}`);
  }
}

/**
 * Aplica formatos avanzados a las hojas para mejorar visualización
 */
function aplicarFormatosAvanzados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const formatoMonedaPeru = "S/ #,##0.00"; // Formato Soles
  try {
    const hojaTitular = ss.getSheetByName("TITULAR");
    if (hojaTitular) {
      hojaTitular.getRange("A2:A").setNumberFormat("dd/MM/yyyy HH:mm:ss");
      hojaTitular.getRange("K2:K").setNumberFormat("dd/MM/yyyy");
      hojaTitular.getRange("R2:R").setNumberFormat("dd/MM/yyyy");
      
      // Aplicar formato de moneda a columnas de costos y totales
      const colIndexCostoIndOnc = encontrarIndiceColumna(hojaTitular, "COSTO INDIVIDUAL ONCOSALUD");
      const colIndexTotalAsis = encontrarIndiceColumna(hojaTitular, "TOTAL MENSUAL ASISPLUS (A COBRAR)");
      
      if (colIndexCostoIndOnc !== -1 && colIndexTotalAsis !== -1) {
        const startLetter = obtenerLetraColumna(colIndexCostoIndOnc + 1);
        const endLetter = obtenerLetraColumna(colIndexTotalAsis + 1);
        hojaTitular.getRange(`${startLetter}2:${endLetter}`).setNumberFormat(formatoMonedaPeru);
        Logger.log(`Formato moneda ${formatoMonedaPeru} aplicado a TITULAR columnas ${startLetter} a ${endLetter}.`);
      }
    }

    const hojaDependientes = ss.getSheetByName("DEPENDIENTES");
    if (hojaDependientes) {
      hojaDependientes.getRange("H2:H").setNumberFormat("dd/MM/yyyy");
      
      // Aplicar formato de moneda a columnas de costos individuales
      const colIndexCostoIndOncDep = encontrarIndiceColumna(hojaDependientes, "COSTO INDIVIDUAL ONCOSALUD");
      const colIndexCostoIndAsisDep = encontrarIndiceColumna(hojaDependientes, "COSTO INDIVIDUAL ASISPLUS");
      
      if (colIndexCostoIndOncDep !== -1 && colIndexCostoIndAsisDep !== -1) {
        const startLetterDep = obtenerLetraColumna(colIndexCostoIndOncDep + 1);
        const endLetterDep = obtenerLetraColumna(colIndexCostoIndAsisDep + 1);
        hojaDependientes.getRange(`${startLetterDep}2:${endLetterDep}`).setNumberFormat(formatoMonedaPeru);
        Logger.log(`Formato moneda ${formatoMonedaPeru} aplicado a DEPENDIENTES columnas ${startLetterDep} a ${endLetterDep}.`);
      }
    }

    const hojaTransacciones = ss.getSheetByName("MERCADO_PAGO_TRANSACCIONES");
    if (hojaTransacciones) {
      hojaTransacciones.getRange("E2:E").setNumberFormat(formatoMonedaPeru); // Columna MONTO
      hojaTransacciones.getRange("H2:I").setNumberFormat("dd/MM/yyyy HH:mm:ss");
      const rules = hojaTransacciones.getConditionalFormatRules();
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains("cancelled")
        .setBackground("#FFD9D9")
        .setRanges([hojaTransacciones.getRange("G2:G")])
        .build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains("approved")
        .setBackground("#D9FFDA")
        .setRanges([hojaTransacciones.getRange("G2:G")])
        .build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains("pending")
        .setBackground("#FFF2CC")
        .setRanges([hojaTransacciones.getRange("G2:G")])
        .build());
      hojaTransacciones.setConditionalFormatRules(rules);
    }

    const hojaLogs = ss.getSheetByName("LOGS");
    if (hojaLogs) {
      hojaLogs.getRange("B2:B").setNumberFormat("dd/MM/yyyy HH:mm:ss");
      const rules = hojaLogs.getConditionalFormatRules();
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains("ERROR")
        .setBackground("#FFD9D9")
        .setRanges([hojaLogs.getRange("C2:C")])
        .build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains("WARNING")
        .setBackground("#FFF2CC")
        .setRanges([hojaLogs.getRange("C2:C")])
        .build());
      hojaLogs.setConditionalFormatRules(rules);
    }
  } catch (error) {
    Logger.log(`ERROR en aplicarFormatosAvanzados: ${error.toString()}\nStack: ${error.stack}`);
  }
}

/**
 * Función auxiliar para encontrar el índice de una columna por su nombre (0-based)
 */
function encontrarIndiceColumna(hoja, nombreColumna) {
  if (!hoja) return -1;
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  return encabezados.indexOf(nombreColumna);
}

/**
 * Función auxiliar para obtener la letra de una columna a partir de su índice (1-based)
 */
function obtenerLetraColumna(indiceColumna) {
  let letra = '', temp;
  while (indiceColumna > 0) {
    temp = (indiceColumna - 1) % 26;
    letra = String.fromCharCode(temp + 65) + letra;
    indiceColumna = (indiceColumna - temp - 1) / 26;
  }
  return letra;
}

/**
 * Configura elementos básicos de seguridad y protección de datos
 */
function configurarSeguridadBasica() {
  try {
    // Tarea 1 (Limpieza): Se elimina la protección de hojas desde esta función.
    // La protección ahora se maneja globalmente en configurarEntornoBase().
    
    const scriptProperties = PropertiesService.getScriptProperties();
    const funcionGeneracionID = `
    /**
     * Genera un ID único para registros con un prefijo específico
     * @param {string} prefijo - Prefijo para el ID (ej. 'REG-', 'DEP-')
     * @return {string} ID único generado
     */
    function generarIDUnico(prefijo) {
      return prefijo + 
             new Date().getTime().toString(36) + 
             Math.random().toString(36).substring(2, 5).toUpperCase();
    }
    `;
    
    scriptProperties.setProperty("FUNCION_GENERACION_ID", funcionGeneracionID);
    
    // Crear indicador de servicio para credenciales seguras
    // (Este el reemplazo seguro para la hoja MERCADO_PAGO)
    scriptProperties.setProperty("MP_CREDENTIALS_SERVICE_ACTIVE", "TRUE");
    
    Logger.log("Configuración de seguridad básica completada.");
    
  } catch (error) {
    Logger.log(`ERROR en configurarSeguridadBasica: ${error.toString()}\nStack: ${error.stack}`);
  }
}

/**
 * Funciones auxiliares para gestión segura de credenciales 
 * (Reemplazo seguro para la hoja MERCADO_PAGO)
 */

/**
 * Almacena de forma segura una credencial
 * @param {string} tipo - Tipo de credencial (ej. 'Public Key', 'Access Token')
 * @param {string} valor - Valor de la credencial
 * @returns {boolean} - True si se almacenó correctamente
 */
function almacenarCredencialSegura(tipo, valor) {
  try {
    // Implementar cifrado antes de almacenar
    const valorCifrado = cifrarValor(valor);
    
    // Almacenar en PropertiesService (más seguro que en hojas visibles)
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty(`MP_${tipo.replace(/\s+/g, '_').toUpperCase()}`, valorCifrado);
    
    // Registrar operación en logs (sin mostrar el valor)
    Logger.log(`Credencial de tipo '${tipo}' almacenada correctamente.`);
    
    return true;
  } catch (error) {
    Logger.log(`ERROR al almacenar credencial: ${error.message}`);
    return false;
  }
}

/**
 * Recupera de forma segura una credencial almacenada
 * @param {string} tipo - Tipo de credencial a recuperar
 * @returns {string|null} - Valor descifrado de la credencial o null si no existe
 */
function recuperarCredencialSegura(tipo) {
  try {
    // Obtener valor cifrado desde PropertiesService
    const scriptProperties = PropertiesService.getScriptProperties();
    const valorCifrado = scriptProperties.getProperty(`MP_${tipo.replace(/\s+/g, '_').toUpperCase()}`);
    
    if (!valorCifrado) {
      Logger.log(`Credencial de tipo '${tipo}' no encontrada.`);
      return null;
    }
    
    // Descifrar valor antes de devolverlo
    const valorDescifrado = descifrarValor(valorCifrado);
    
    // Registrar operación en logs (sin mostrar el valor)
    Logger.log(`Credencial de tipo '${tipo}' recuperada correctamente.`);
    
    return valorDescifrado;
  } catch (error) {
    Logger.log(`ERROR al recuperar credencial: ${error.message}`);
    return null;
  }
}

/**
 * Función interna para cifrado (implementación simplificada)
 * En producción, usar una implementación más robusta
 */
function cifrarValor(valor) {
  // Esta es una implementación simulada para desarrollo
  // En producción, implementar cifrado real AES-256
  return `encrypted_${valor}_${Date.now()}`;
}

/**
 * Función interna para descifrado (implementación simplificada)
 * En producción, usar una implementación más robusta
 */
function descifrarValor(valorCifrado) {
  // Esta es una implementación simulada para desarrollo
  // En producción, implementar descifrado real AES-256
  if (!valorCifrado || !valorCifrado.startsWith('encrypted_')) {
    return null;
  }
  
  // Extraer valor original (simulado)
  const match = valorCifrado.match(/encrypted_(.+)_\d+/);
  return match ? match[1] : null;
}

/**
 * Configuración del formulario de administración de credenciales
 * Esta función crea una interfaz de usuario para gestionar credenciales
 * de manera segura, reemplazando la hoja MERCADO_PAGO que exponía tokens
 */
function mostrarAdminCredenciales() {
  const ui = SpreadsheetApp.getUi();
  
  // Crear HTML para el formulario de administración
  const htmlOutput = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
      h2 { color: #D95B43; } /* Terracota ASISPLUS */
      .form-group { margin-bottom: 15px; }
      label { display: block; margin-bottom: 5px; font-weight: bold; }
      input[type="text"] { width: 100%; padding: 8px; box-sizing: border-box; }
      .buttons { margin-top: 20px; }
      .btn { padding: 8px 16px; margin-right: 10px; cursor: pointer; }
      .btn-primary { background-color: #D95B43; color: white; border: none; }
      .alert { padding: 10px; margin-bottom: 15px; border-radius: 4px; }
      .alert-info { background-color: #d9edf7; border: 1px solid #bce8f1; color: #31708f; }
    </style>
    
    <h2>Administración de Credenciales ASISPLUS-ONCOPLUS</h2>
    
    <div class="alert alert-info">
      <strong>Importante:</strong> Las credenciales se almacenarán de forma segura en el sistema.
      No se guardarán en hojas visibles para proteger la información sensible.
    </div>
    
    <form id="credentialsForm">
      <div class="form-group">
        <label for="publicKey">Public Key (Mercado Pago):</label>
        <input type="text" id="publicKey" name="publicKey" placeholder="Ingresa la Public Key">
      </div>
      
      <div class="form-group">
        <label for="accessToken">Access Token (Mercado Pago):</label>
        <input type="text" id="accessToken" name="accessToken" placeholder="Ingresa el Access Token">
      </div>
      
      <div class="buttons">
        <button type="submit" class="btn btn-primary">Guardar</button>
        <button type="button" class="btn" onclick="google.script.host.close()">Cancelar</button>
      </div>
    </form>
    
    <script>
      // Enviar datos al servidor cuando se envía el formulario
      document.getElementById('credentialsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Recopilar datos del formulario
        var publicKey = document.getElementById('publicKey').value.trim();
        var accessToken = document.getElementById('accessToken').value.trim();
        
        // Validar que ambos campos tengan valores
        if (!publicKey || !accessToken) {
          alert('Por favor, completa ambos campos.');
          return;
        }
        
        // Enviar datos al servidor (Apps Script)
        google.script.run
          .withSuccessHandler(function(result) {
            alert('¡Credenciales guardadas correctamente!');
            google.script.host.close();
          })
          .withFailureHandler(function(error) {
            alert('Error al guardar credenciales: ' + error);
          })
          .guardarCredencialesMercadoPago(publicKey, accessToken);
      });
    </script>
  `)
  .setWidth(500)
  .setHeight(400)
  .setTitle('Administración de Credenciales');
  
  // Mostrar el diálogo
  ui.showModalDialog(htmlOutput, 'Credenciales ASISPLUS-ONCOPLUS');
}

/**
 * Función para guardar credenciales desde el formulario de administración
 * Esta función es llamada por el frontend
 */
function guardarCredencialesMercadoPago(publicKey, accessToken) {
  try {
    // Almacenar ambas credenciales de forma segura
    const pk = almacenarCredencialSegura('Public Key', publicKey);
    const at = almacenarCredencialSegura('Access Token', accessToken);
    
    // Actualizar status en las propiedades del script
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty("MP_CREDENTIALS_SETUP", "TRUE");
    scriptProperties.setProperty("MP_CREDENTIALS_LAST_UPDATED", new Date().toISOString());
    
    // Registrar en LOGS
    const hojaLogs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LOGS");
    if (hojaLogs) {
      hojaLogs.appendRow([
        "LOG" + new Date().getTime().toString().substring(5), 
        new Date().toISOString(), 
        "INFO", 
        "SEGURIDAD", 
        "Credenciales de Mercado Pago actualizadas", 
        JSON.stringify({success: true, timestamp: new Date().toISOString()}), 
        "Administración"
      ]);
    }
    
    return true;
  } catch (error) {
    Logger.log(`ERROR en guardarCredencialesMercadoPago: ${error.toString()}`);
    throw new Error(`No se pudieron guardar las credenciales: ${error.message}`);
  }
}

/**
 * Configura la contraseña para edición de hojas
 */
function configurarContrasenaEdicion() {
  const ui = SpreadsheetApp.getUi();
  const ownerEmail = SpreadsheetApp.getActiveSpreadsheet().getOwner().getEmail();
  const currentUserEmail = Session.getEffectiveUser().getEmail();

  if (currentUserEmail !== ownerEmail) {
    ui.alert('Acceso Denegado', 'Solo el propietario puede configurar la contraseña.', ui.ButtonSet.OK);
    return;
  }

  const result = ui.prompt(
    'Configurar Contraseña',
    'Por favor, ingrese la nueva contraseña para desbloquear el libro para edición:',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() === ui.Button.OK) {
    const password = result.getResponseText().trim();
    if (password) {
      PropertiesService.getScriptProperties().setProperty(NOMBRE_PROPIEDAD_CONTRASENA, password);
      ui.alert('Éxito', 'La contraseña ha sido actualizada.', ui.ButtonSet.OK);
    } else {
      ui.alert('Error', 'La contraseña no puede estar vacía.', ui.ButtonSet.OK);
    }
  }
}

/**
 * Constante que define el nombre de la hoja de TRAMA.
 */
const TRAMA_SHEET_NAME = 'TRAMA GRUPALES';

/**
 * Constante que define los 17 encabezados para la hoja de TRAMA GRUPALES.
 * Esta es la estructura final acordada.
 */
const TRAMA_HEADERS = [
  'PAIS', 'TIPO DE TRAMA', 'GF SAP', 'CERTFICADO', 'APELLIDO PATERNO', 'APELLIDO MATERNO',
  'NOMBRE 1', 'NOMBRE 2', 'SEXO', 'FECHA DE NACIMIENTO DD/MM/AAAA', 'PARENTESCO',
  'TIPO DE DOCUMENTO', 'NUMERO DE DOCUMENTO', 'DIRECCION DE EMPRESA',
  'CORREO DE CONTACTO DE LA EMPRESA', 'PROGRAMA', 'INICIO/FIN VIGENCIA'
];

/**
 * Orquesta la creación del registro en la hoja de TRAMA GRUPALES.
 * Esta es la función principal que se llamará después de un registro exitoso.
 * @param {object} datosFormulario El objeto JSON con los datos del titular y dependientes.
 */
function generarRegistroTrama(datosFormulario) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let targetSheet = ss.getSheetByName(TRAMA_SHEET_NAME);

    // Si la hoja no existe, la crea en la primera posición y añade los encabezados.
    if (!targetSheet) {
      targetSheet = ss.insertSheet(TRAMA_SHEET_NAME, 0); // El índice 0 la coloca al principio.
      targetSheet.appendRow(TRAMA_HEADERS);
      targetSheet.setFrozenRows(1);
      console.log(`Hoja '${TRAMA_SHEET_NAME}' creada y configurada.`);
    }

    const newRows = _transformarDatosARows(datosFormulario);

    // Escribir todas las filas en una sola operación para máxima eficiencia.
    if (newRows.length > 0) {
      const lastRow = targetSheet.getLastRow();
      targetSheet.getRange(lastRow + 1, 1, newRows.length, TRAMA_HEADERS.length).setValues(newRows);
      console.log(`Se han añadido ${newRows.length} filas a la hoja '${TRAMA_SHEET_NAME}'.`);
    }

  } catch (error) {
    console.error(`Error en generarRegistroTrama: ${error.toString()}`);
    // Considerar registrar el error en la hoja 'LOGS'.
  }
}

/**
 * Función auxiliar privada para transformar el objeto de datos del formulario a un array de filas para la Trama.
 * @param {object} datosFormulario El objeto de la persona a procesar (puede ser titular o dependiente).
 * @returns {Array<Array<any>>} Un array de arrays, donde cada array interno representa una fila.
 * @private
 */
function _transformarDatosARows(datosFormulario) {
  const rows = [];
  const titular = datosFormulario.titular;
  const dependientes = datosFormulario.dependientes || [];

  // Valores que son comunes a todas las filas de este registro.
  const certificado = titular.numeroDocumento;
  const inicioVigencia = _getInicioVigencia();

  // Mapeo de parentescos de texto a los códigos numéricos requeridos.
  const parentescoMap = {
    'TITULAR': '01',
    'CONYUGE': '02',
    'PADRE': '03', // Asumiendo 'PADRE' como texto de entrada
    'MADRE': '03', // Asumiendo 'MADRE' como texto de entrada
    'HIJO': '04',
    'HIJA': '04'
  };

  // 1. Procesar la fila del Titular
  const titularRow = [
    'PER', // PAIS (Fijo)
    'ALTA', // TIPO DE TRAMA (Fijo)
    '', // GF SAP (Vacío)
    certificado, // CERTFICADO (DNI del titular)
    titular.apellidoPaterno, // APELLIDO PATERNO
    titular.apellidoMaterno, // APELLIDO MATERNO
    titular.nombre1, // NOMBRE 1 (Asume que el formulario envía nombre1 y nombre2)
    titular.nombre2 || '', // NOMBRE 2 (Si no existe, se deja vacío)
    titular.genero, // SEXO
    titular.fechaNacimiento, // FECHA DE NACIMIENTO
    parentescoMap['TITULAR'], // PARENTESCO (Código Fijo para titular)
    '01', // TIPO DE DOCUMENTO (01: DNI, fijo por ahora)
    titular.numeroDocumento, // NUMERO DE DOCUMENTO
    'CALLE ALFREDO SALAZAR 145 MIRAFLORES', // DIRECCION DE EMPRESA (Fijo)
    'GALVAREZ@ASEGUR.COM.PE', // CORREO DE CONTACTO DE LA EMPRESA (Fijo)
    'PLUS', // PROGRAMA (Fijo)
    inicioVigencia // INICIO/FIN VIGENCIA (Calculado)
  ];
  rows.push(titularRow);

  // 2. Procesar las filas de los Dependientes
  dependientes.forEach(dependiente => {
    const dependienteRow = [
      'PER',
      'ALTA',
      '',
      certificado, // CERTFICADO se replica del titular.
      dependiente.apellidoPaterno,
      dependiente.apellidoMaterno,
      dependiente.nombre1,
      dependiente.nombre2 || '',
      dependiente.genero,
      dependiente.fechaNacimiento,
      parentescoMap[dependiente.parentesco.toUpperCase()] || '', // PARENTESCO (Código mapeado)
      '01',
      dependiente.numeroDocumento,
      'CALLE ALFREDO SALAZAR 145 MIRAFLORES',
      'GALVAREZ@ASEGUR.COM.PE',
      'PLUS',
      inicioVigencia // INICIO/FIN VIGENCIA se replica del titular.
    ];
    rows.push(dependienteRow);
  });

  return rows;
}

/**
 * Calcula el inicio de vigencia, que es el primer día del mes siguiente.
 * @returns {Date} Un objeto Date representando el 1ro del próximo mes.
 * @private
 */
function _getInicioVigencia() {
  const hoy = new Date();
  let anio = hoy.getFullYear();
  let mes = hoy.getMonth(); // 0 (Ene) a 11 (Dic)

  if (mes === 11) { // Si es Diciembre
    mes = 0; // El mes será Enero
    anio++; // del próximo año
  } else {
    mes++; // Simplemente el siguiente mes
  }
  return new Date(anio, mes, 1);
}

/**
 * Verifica si la hoja TRAMA GRUPALES existe y, si no, la crea, formatea y protege.
 * @private
 */
function _crearHojaTramaGrupales() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'TRAMA GRUPALES';
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const headers = [
      'PAIS', 'TIPO DE TRAMA', 'GF SAP', 'CERTFICADO', 'APELLIDO PATERNO', 'APELLIDO MATERNO',
      'NOMBRE 1', 'NOMBRE 2', 'SEXO', 'FECHA DE NACIMIENTO DD/MM/AAAA', 'PARENTESCO',
      'TIPO DE DOCUMENTO', 'NUMERO DE DOCUMENTO', 'DIRECCION DE EMPRESA',
      'CORREO DE CONTACTO DE LA EMPRESA', 'PROGRAMA', 'INICIO/FIN VIGENCIA'
    ];
    
    sheet = ss.insertSheet(sheetName, 0); 
    sheet.appendRow(headers);
    formatearEncabezados(sheet, headers.length);
    
    // Tarea 1: Asegurar que esta hoja también se proteja al crearse
    try {
      const proteccion = sheet.protect().setDescription('Protección del sistema ASISPLUS');
      proteccion.removeEditors(proteccion.getEditors());
      proteccion.addEditor(Session.getEffectiveUser());
      Logger.log(`Hoja '${sheetName}' creada y protegida.`);
    } catch (e) {
      Logger.log(`No se pudo proteger automáticamente la hoja '${sheetName}'. Error: ${e.message}`);
    }
  } else {
    Logger.log(`Hoja '${sheetName}' ya existe.`);
  }
}