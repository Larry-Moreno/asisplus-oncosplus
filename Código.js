/**
 * Author: Larry Moreno | CEO NODIKA Systems
 * Date: 2025-01-17
 * Updated: 2025-11-08 - Restored complete webhook functionality
 */

/**
 * Obtiene el HTML para un paso específico del wizard
 * @param {number} stepNumber - Número del paso a cargar
 * @return {string} HTML del paso solicitado
 */
function getStepHTML(stepNumber) {
  // Cargar plantilla del paso correspondiente
  let template;

  switch (stepNumber) {
    case 1:
      template = HtmlService.createTemplateFromFile('Paso1');
      break;
    case 2:
      template = HtmlService.createTemplateFromFile('Paso2');
      break;
    case 3:
      template = HtmlService.createTemplateFromFile('Paso3');
      break;
    case 4:
      template = HtmlService.createTemplateFromFile('Paso4');
      break;
    default:
      return '<div>Error: Paso no encontrado</div>';
  }

  // Evaluar y retornar el HTML
  return template.evaluate().getContent();
}

/**
 * Función para incluir archivos externos
 * @param {string} filename - Nombre del archivo a incluir
 * @return {string} Contenido del archivo
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Verifica que el entorno esté preparado para el formulario
 * Debe ejecutarse antes de cualquier operación
 * @return {boolean} True si el entorno está listo, false en caso contrario
 */
function verificarEntorno() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Verificar hojas necesarias con nomenclatura correcta
    const hojasRequeridas = ["TITULAR", "DEPENDIENTES", "COSTOS", "INFORMACIÓN", "MERCADO_PAGO_TRANSACCIONES", "LOGS"];
    let entornoOk = true;

    // Verificar cada hoja
    hojasRequeridas.forEach(nombreHoja => {
      const hoja = ss.getSheetByName(nombreHoja);
      if (!hoja) {
        Logger.log(`ERROR: La hoja "${nombreHoja}" no existe. Por favor, ejecuta la función de configuración en app.gs primero.`);
        entornoOk = false;
      }
    });

    return entornoOk;
  } catch (error) {
    Logger.log(`ERROR en verificación de entorno: ${error.message}`);
    return false;
  }
}

/**
 * Punto de entrada para mostrar el formulario
 * @return {HtmlOutput} Formulario HTML renderizado
 */
function doGet() {
  // Verificar entorno antes de mostrar el formulario
  if (!verificarEntorno()) {
    // Si falta configuración, mostrar mensaje de error
    const htmlOutput = HtmlService.createHtmlOutput(`
      <div style="font-family: Arial; padding: 20px; text-align: center;">
        <h2 style="color: #d9534f;">Error de configuración</h2>
        <p>La estructura necesaria para el formulario no está correctamente configurada.</p>
        <p>Por favor, ejecute la función 'configurarEntornoCompleto' del archivo app.gs primero.</p>
      </div>
    `)
      .setTitle('Error de configuración - ASISPLUS-ONCOPLUS');

    return htmlOutput;
  }

  // Si todo está bien, mostrar el formulario normal
  const template = HtmlService.createTemplateFromFile('Formulario');

  // Evaluar el template y configurar propiedades
  const htmlOutput = template.evaluate()
    .setTitle('Programa ONCOPLUS - Formulario de Afiliación')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  return htmlOutput;
}

/**
 * Obtiene las tarifas Oncosalud y ASISPLUS correspondientes según la edad.
 * @param {number} edad - Edad del titular o dependiente.
 * @return {Object} Objeto con las tarifas (ej. { oncosalud: 46.21, asisplus: 55.00 }) o tarifas de fallback si hay error/edad NaN.
 */
function obtenerTarifasPorEdad(edad) {
  var edadRecibida = edad;
  Logger.log('BACKEND: obtenerTarifasPorEdad RECIBIÓ EDAD: ' + edadRecibida);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCostos = ss.getSheetByName('COSTOS');
    if (!sheetCostos) {
      Logger.log('BACKEND: Hoja COSTOS no encontrada. Devolviendo tarifas 0.');
      registrarLog("ERROR", "BACKEND_COSTOS", "Hoja COSTOS no encontrada en obtenerTarifasPorEdad.", { edad: edadRecibida });
      return { oncosalud: 0, asisplus: 0 }; // Devolver ambas como 0
    }

    const lastRowWithData = sheetCostos.getLastRow();
    if (lastRowWithData < 2) {
      Logger.log('BACKEND: No hay datos de rangos en la hoja COSTOS. Devolviendo tarifas 0.');
      registrarLog("ERROR", "BACKEND_COSTOS", "Hoja COSTOS no contiene datos de rangos.", { edad: edadRecibida });
      return { oncosalud: 0, asisplus: 0 }; // Devolver ambas como 0
    }
    const rangos = sheetCostos.getRange(2, 1, lastRowWithData - 1, 4).getValues();
    Logger.log('BACKEND: Rangos obtenidos de la hoja COSTOS (' + rangos.length + ' filas): ' + JSON.stringify(rangos));

    for (var i = 0; i < rangos.length; i++) {
      var rango = rangos[i];
      var edadInicial = parseInt(rango[0]);
      var edadFinal = rango[1] ? parseInt(rango[1]) : Number.MAX_SAFE_INTEGER;
      var tarifaOncosalud = parseFloat(rango[2]); // Columna C para Oncosalud
      var tarifaAsisplus = parseFloat(rango[3]);  // Columna D para ASISPLUS

      Logger.log('BACKEND: Comparando EDAD ' + edadRecibida + ' con RANGO [' + (i + 1) + ']: ' + edadInicial + ' - ' + (edadFinal === Number.MAX_SAFE_INTEGER ? "INF" : edadFinal) + ', Tarifa Oncosalud: ' + tarifaOncosalud + ', Tarifa ASISPLUS: ' + tarifaAsisplus);

      // Manejar el caso de edadRecibida siendo NaN o no siendo un número
      if (isNaN(edadRecibida) || typeof edadRecibida !== 'number') {
        // Si la edad no es válida, no se puede encontrar un rango específico. Se pasará al fallback.
        Logger.log('BACKEND: Edad recibida es NaN o no es un número. Saltando comparación de rango.');
        break; // Salir del bucle for, se usará el fallback.
      }

      if (edadRecibida >= edadInicial && edadRecibida <= edadFinal) {
        Logger.log('BACKEND: COINCIDENCIA ENCONTRADA para EDAD ' + edadRecibida + '. Tarifas seleccionadas: Oncosalud=' + tarifaOncosalud + ', Asisplus=' + tarifaAsisplus);
        if (isNaN(tarifaOncosalud) || isNaN(tarifaAsisplus)) {
          Logger.log('BACKEND: ERROR - Tarifas encontradas en la hoja son NaN. Usando fallback.');
          // Romper para ir al fallback si las tarifas leídas son NaN
          break;
        }
        return { oncosalud: tarifaOncosalud, asisplus: tarifaAsisplus };
      }
    }

    Logger.log('BACKEND: No se encontró coincidencia directa para EDAD ' + edadRecibida + ' o edad era NaN. Verificando fallback.');
    if (rangos.length > 0) {
      const ultimoRango = rangos[rangos.length - 1];
      const tarifaOncosaludFallback = parseFloat(ultimoRango[2]);
      const tarifaAsisplusFallback = parseFloat(ultimoRango[3]);
      if (!isNaN(tarifaOncosaludFallback) && !isNaN(tarifaAsisplusFallback)) {
        Logger.log('BACKEND: Usando TARIFAS FALLBACK del último rango para EDAD ' + edadRecibida + ': Oncosalud=' + tarifaOncosaludFallback + ', Asisplus=' + tarifaAsisplusFallback);
        return { oncosalud: tarifaOncosaludFallback, asisplus: tarifaAsisplusFallback };
      }
    }

    Logger.log('BACKEND: FALLO TOTAL en búsqueda de tarifa para EDAD ' + edadRecibida + '. Devolviendo tarifas 0.');
    registrarLog("ERROR", "BACKEND_COSTOS", `No se encontró tarifa para la edad: ${edadRecibida} tras fallback. Verifique la hoja COSTOS.`, { edad: edadRecibida });
    return { oncosalud: 0, asisplus: 0 };

  } catch (error) {
    Logger.log('BACKEND: ERROR GRAVE en obtenerTarifasPorEdad para EDAD ' + edadRecibida + ': ' + error.message + ' Stack: ' + error.stack);
    registrarLog("ERROR", "BACKEND_COSTOS", `Error en obtenerTarifasPorEdad: ${error.message}`, { edad: edadRecibida, stack: error.stack });
    return { oncosalud: 0, asisplus: 0 };
  }
}

/**
 * Obtiene el contenido de una declaración
 * @param {string} type - Tipo de declaración (salud, jurada, privacidad)
 * @return {string} Contenido HTML de la declaración
 */
function obtenerDeclaracion(type) {
  // Implementar lógica para obtener el contenido de las declaraciones
  // Puede ser desde hojas específicas o desde archivos HTML

  const contenido = {
    'salud': `<h3>Declaración de Salud</h3>
              <p>Declaro bajo juramento que ni yo ni mis dependientes registrados padecemos actualmente ninguna enfermedad oncológica diagnosticada, ni nos encontramos en proceso de estudios por sospecha de cáncer.</p>
              <p>Entiendo que cualquier declaración falsa, inexacta u omisión de información relevante podría resultar en la anulación del contrato y la pérdida de cobertura.</p>
              <p>Esta declaración de salud forma parte integral del contrato de afiliación al programa ONCOPLUS.</p>`,

    'jurada': `<h3>Declaración Jurada</h3>
              <p>Declaro bajo juramento que la información proporcionada en este formulario es verdadera, exacta y completa. Entiendo que cualquier omisión, inexactitud o falsedad en la declaración de los hechos consignados podrá generar la resolución del contrato de afiliación.</p>
              <p>Autorizo expresamente a ONCOSALUD y a sus médicos a acceder a mi historia clínica y a cualquier información complementaria que se encuentre en poder de clínicas, hospitales, consultorios y/o centros de salud privados o públicos, a fin de evaluar y determinar la procedencia de alguna solicitud de cobertura.</p>
              <p>Esta autorización se extiende a todos los dependientes incluidos en este formulario de afiliación.</p>`,

    'privacidad': `<h3>Declaración de Privacidad y Tratamiento de Datos Personales</h3>
                  <p>De conformidad con la Ley N° 29733 - Ley de Protección de Datos Personales y su Reglamento, declaro estar informado y doy mi consentimiento libre, previo, expreso, inequívoco e informado, para el tratamiento y transferencia, nacional e internacional de mis datos personales y datos sensibles, así como de mis dependientes registrados, al banco de datos de titularidad de ONCOSALUD S.A.C., que estará ubicado en sus oficinas a nivel nacional.</p>
                  <p>ONCOSALUD utilizará estos datos, conjuntamente con otros que se pongan a disposición durante la relación jurídica y aquellos obtenidos en fuentes accesibles al público, con la finalidad de analizar y manejar los riesgos materia de cobertura del contrato, gestionar la contratación y seguimiento de productos de seguros y evaluar la calidad del servicio.</p>
                  <p>Asimismo, ONCOSALUD podrá usar información para ofrecerme sus productos y/o servicios o los de sus socios comerciales, a través de cualquier medio de comunicación. Los datos suministrados son esenciales para las finalidades indicadas. Las bases de datos donde se almacena la información cuentan con estrictas medidas de seguridad.</p>
                  <p>Declaro haber sido informado que conforme a la Ley de Protección de Datos Personales, puedo ejercer los derechos de información, acceso, actualización, inclusión, rectificación, supresión y oposición sobre mis datos personales, enviando una comunicación a cualquiera de las oficinas de ONCOSALUD.</p>`
  };

  return contenido[type] || '<p>Declaración no encontrada</p>';
}

/**
 * Registra un evento en la hoja de LOGS
 * @param {string} nivel - Nivel del log (INFO, WARNING, ERROR)
 * @param {string} categoria - Categoría del log
 * @param {string} mensaje - Mensaje descriptivo
 * @param {Object} datos - Datos adicionales en formato JSON
 * @param {string} origen - Origen del log
 */
function registrarLog(nivel, categoria, mensaje, datos = {}, origen = "Formulario") {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaLogs = ss.getSheetByName("LOGS");

    if (!hojaLogs) return;

    // Generar ID único para el log
    const idLog = `LOG${new Date().getTime().toString().substring(5)}`;

    // Crear fila de log según estructura
    const fila = [
      idLog,                         // ID_LOG
      new Date().toISOString(),      // TIMESTAMP
      nivel.toUpperCase(),           // NIVEL (INFO, WARNING, ERROR)
      categoria,                     // CATEGORIA
      mensaje,                       // MENSAJE
      JSON.stringify(datos),         // DATOS (como JSON)
      origen,                        // ORIGEN
      Session.getActiveUser().getEmail() || "Sistema" // USUARIO (Añadido para mejor auditoría)
    ];

    // Agregar fila a la hoja
    hojaLogs.appendRow(fila);
  } catch (error) {
    // Si falla el registro, al menos dejamos constancia en Console.log
    Logger.log(`Error al registrar log: ${error.message}`);
  }
}

/**
 * Procesa el formulario completo
 * @param {Object} formData - Datos del formulario
 * @return {Object} Resultado del procesamiento (siempre un objeto con 'success' y 'data' o 'error')
 */
function procesarFormulario(formData) {
  // Log inicial mejorado para verificar si formData llega bien
  Logger.log('BACKEND: procesarFormulario INICIADO. formData recibido: ' + (formData ? 'Sí, con email: ' + formData.email : 'NO (formData es nulo o undefined)'));

  try {
    // Verificación inicial de formData
    if (!formData) {
      Logger.log('BACKEND: ERROR FATAL - formData es nulo o undefined al inicio de procesarFormulario.');
      registrarLog("ERROR", "PROCESO_BACKEND_PRE", "formData no fue recibido por procesarFormulario", { detalle: "formData era nulo o undefined." });
      return { success: false, error: 'Error interno del servidor: No se recibieron datos del formulario.' };
    }

    Logger.log('BACKEND: Contenido inicial de formData.numeroDependientes: ' + formData.numeroDependientes);
    Logger.log('BACKEND: Contenido inicial de formData (primeros campos para titular): primerNombre=' + formData.primerNombre + ', apellidoPaterno=' + formData.apellidoPaterno);
    if (formData.numeroDependientes && parseInt(formData.numeroDependientes) > 0) {
      Logger.log('BACKEND: Contenido inicial de formData (primer dependiente, si existe): primerNombre-1=' + formData['primerNombre-1'] + ', apellidoPaterno-1=' + formData['apellidoPaterno-1']);
    }

    // 1. Validar datos recibidos
    Logger.log('BACKEND: Llamando a validarDatosFormulario...');
    const resultadoValidacion = validarDatosFormulario(formData);
    Logger.log('BACKEND: Resultado de validarDatosFormulario: ' + JSON.stringify(resultadoValidacion));

    if (!resultadoValidacion || typeof resultadoValidacion.valido === 'undefined') {
      Logger.log('BACKEND: ERROR FATAL - resultadoValidacion de validarDatosFormulario es inválido o no tiene propiedad "valido". Valor: ' + JSON.stringify(resultadoValidacion));
      registrarLog("ERROR", "VALIDACION_BACKEND_ESTRUCTURA", "Resultado de validarDatosFormulario tiene estructura incorrecta", {
        resultadoObtenido: JSON.stringify(resultadoValidacion)
      });
      return {
        success: false,
        error: 'Error interno del servidor: Problema con la estructura del resultado de validación interna.'
      };
    }

    if (!resultadoValidacion.valido) {
      Logger.log('BACKEND: Validación de datos fallida. Errores: ' + resultadoValidacion.errores.join('; '));
      registrarLog("ERROR", "VALIDACION_BACKEND", "Datos de formulario inválidos detectados por validarDatosFormulario", {
        email: formData.email,
        errores: resultadoValidacion.errores
      });
      return {
        success: false,
        error: `Datos de formulario inválidos: ${resultadoValidacion.errores.join('; ')}`
      };
    }

    Logger.log('BACKEND: Validación de datos exitosa. Procediendo con el registro.');
    registrarLog("INFO", "PROCESO_BACKEND", "Iniciando procesamiento de formulario (post-validación)",
      { email: formData.email, numeroDependientes: formData.numeroDependientes });

    Logger.log('BACKEND: Llamando a guardarDatosTitular...');
    const idRegistro = guardarDatosTitular(formData);
    Logger.log('BACKEND: Titular guardado con idRegistro: ' + idRegistro);

    const numDependientes = parseInt(formData.numeroDependientes || 0);
    if (numDependientes > 0) {
      Logger.log('BACKEND: Procesando ' + numDependientes + ' dependientes para idRegistro: ' + idRegistro);
      guardarDatosDependientes(formData, idRegistro, numDependientes);
      Logger.log('BACKEND: guardarDatosDependientes completado.');
    }
    // *** NUEVA LÍNEA AGREGADA: GENERAR REGISTRO EN TRAMA GRUPALES ***
    Logger.log('BACKEND: Llamando a generarRegistroTrama...');
    generarRegistroTrama(formData);
    Logger.log('BACKEND: generarRegistroTrama completado.');


    Logger.log('BACKEND: Llamando a calcularMontoTotal...');
    // Dentro de tu función procesarFormulario(formData) en Código.gs

    // ... (código existente de validación, guardarDatosTitular, guardarDatosDependientes) ...

    const montoTotal = calcularMontoTotal(formData);
    Logger.log('BACKEND (procesarFormulario): Monto total calculado: ' + montoTotal);

    if (isNaN(montoTotal)) {
      Logger.log('BACKEND (procesarFormulario): ERROR - MontoTotal calculado es NaN. Retornando error al frontend.');
      registrarLog("ERROR", "CALCULO_MONTO_FINAL", "MontoTotal final en procesarFormulario resultó en NaN", { idRegistro: idRegistro, formDataEmail: formData.email }, "procesarFormulario");
      return {
        success: false,
        error: "Error interno al calcular el monto total final. Verifique los datos, especialmente las fechas de nacimiento."
      };
    }

    let resultadoFinal = {}; // Para la respuesta al frontend

    // Solo intentar crear suscripción si el pago recurrente está activo.
    // Asegúrate que formData.pagoRecurrente es un booleano true o un string "SI"
    const esPagoRecurrente = formData.pagoRecurrente === true || String(formData.pagoRecurrente).toUpperCase() === "SI";

    if (esPagoRecurrente) {
      Logger.log(`BACKEND (procesarFormulario): Es pago recurrente. Llamando a crearSuscripcionEnMercadoPagoYRegistrar.`);
      const resultadoMP = crearSuscripcionEnMercadoPagoYRegistrar(formData, idRegistro, montoTotal);

      if (resultadoMP.success) {
        Logger.log('BACKEND (procesarFormulario): Suscripción MP iniciada. init_point: ' + resultadoMP.init_point);
        resultadoFinal = {
          success: true,
          registroId: idRegistro,
          montoTotal: montoTotal,
          init_point: resultadoMP.init_point, // ESTE ES EL IMPORTANTE PARA REDIRIGIR
          subscription_id_mp: resultadoMP.subscription_id_mp,
          internal_transaction_id: resultadoMP.internal_transaction_id,
          message: "Suscripción iniciada. Redirigiendo a Mercado Pago."
        };
      } else {
        Logger.log('BACKEND (procesarFormulario): Fallo al iniciar suscripción en MP. Error: ' + resultadoMP.error);
        // Los datos del titular/deps ya se guardaron. Se notifica el error de MP.
        // enviarNotificacionBasica(formData, idRegistro); // Enviar notificación de registro, pero MP falló.
        resultadoFinal = {
          success: false,
          registroId: idRegistro, // Devolvemos el idRegistro por si se quiere mostrar/usar
          montoTotal: montoTotal,
          error: resultadoMP.error || "No se pudo iniciar el proceso de pago con Mercado Pago."
        };
      }
    } else {
      registrarLog("INFO", "PROCESO_FORMULARIO", "Pago no recurrente NO seleccionado. No se crea suscripción en MP.", { idRegistro: idRegistro }, "procesarFormulario");
      // enviarNotificacionBasica(formData, idRegistro); // Solo se guardó el registro, no hubo intento de pago MP
      resultadoFinal = {
        success: true, // El registro en NUESTRO sistema fue exitoso
        registroId: idRegistro,
        montoTotal: montoTotal,
        init_point: null, // No hay redirección a MP
        message: "Solicitud de afiliación registrada. El tipo de pago seleccionado no inicia un proceso automático en Mercado Pago."
      };
    }

    Logger.log('BACKEND (procesarFormulario): Enviando respuesta final al frontend: ' + JSON.stringify(resultadoFinal));
    return resultadoFinal;

  } catch (error) { // Este catch es del try principal de procesarFormulario
    Logger.log(`BACKEND: ERROR CRÍTICO CAPTURADO en procesarFormulario: ${error.message}. Stack: ${error.stack}`);
    registrarLog("ERROR", "PROCESO_FORMULARIO_CATCH", `Error al procesar formulario: ${error.message}`,
      { stack: error.stack, message: error.message, emailUsuario: (formData ? formData.email : 'N/A') }, "procesarFormulario");
    return {
      success: false,
      error: `Ocurrió un error interno en el servidor durante el procesamiento del formulario. (Detalle: ${error.message})`
    };
  }
} // Fin de procesarFormulario

//==================================================================
//          SECCIÓN COMPLETA DE INTEGRACIÓN CON MERCADO PAGO
//==================================================================

/**
 * Crea una suscripción en Mercado Pago y registra la transacción inicial en la hoja.
 * @param {Object} formData - Datos completos del formulario (incluyendo formData.email).
 * @param {string} idRegistro - ID único del registro del titular en nuestro sistema.
 * @param {number} montoTotal - Monto total a cobrar para la suscripción.
 * @return {Object} Objeto con el resultado: { success: boolean, init_point: string, subscription_id_mp: string, internal_transaction_id: string, error: string }
 */
function crearSuscripcionEnMercadoPagoYRegistrar(formData, idRegistro, montoTotal) {
  const FUNCION_NOMBRE = "crearSuscripcionEnMercadoPagoYRegistrar";
  Logger.log(`BACKEND (${FUNCION_NOMBRE}): Iniciando para idRegistro: ${idRegistro}, monto: ${montoTotal}, email: ${formData.email}`);

  try {
    // 1. Recuperar Access Token de MP
    const accessToken = recuperarCredencialSegura('Access Token');

    if (!accessToken) {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): Access Token de Mercado Pago no configurado o no recuperable.`);
      registrarLog("ERROR", "MERCADOPAGO_CREDS", "Access Token no disponible para crear suscripción.", { idRegistro: idRegistro }, FUNCION_NOMBRE);
      return { success: false, error: "Error crítico: Credenciales de Mercado Pago no configuradas en el sistema." };
    }
    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Access Token recuperado.`);

    // 2. Definir back_url (STRING ÚNICO, no objeto)
    const webAppUrl = ScriptApp.getService().getUrl();
    if (!webAppUrl) {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): No se pudo obtener la URL de la WebApp para la back_url.`);
      registrarLog("ERROR", "MERCADOPAGO_CONFIG", "No se pudo obtener ScriptApp.getService().getUrl().", { idRegistro: idRegistro }, FUNCION_NOMBRE);
      return { success: false, error: "Error de configuración interna del servidor (URL de WebApp no obtenida)." };
    }

    const backUrl = `${webAppUrl}?external_reference=${idRegistro}&source=mp_callback_preapproval_v1`;
    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Back URL configurada: ${backUrl}`);

    // 3. Calcular start_date para que sea unos minutos en el futuro
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() + 5); // Adelantar 5 minutos
    const startDateISO = ahora.toISOString(); // Convertir a ISO 8601 UTC
    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Start date calculado: ${startDateISO}`);

    // 4. Construir el Payload para la API /preapproval de MP
    const payload = {
      reason: `Suscripción ASISPLUS ONCOPLUS - ${idRegistro}`,
      external_reference: idRegistro,
      payer_email: formData.email,  // ← ESTA LÍNEA ES LA NUEVA
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: parseFloat(montoTotal.toFixed(2)),
        currency_id: "PEN",
        start_date: startDateISO // Usar la variable calculada
      },
      back_url: backUrl,
      status: "pending" // Para cobros automáticos
    };
    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Payload para MP (/preapproval): ${JSON.stringify(payload)}`);

    // 5. Realizar la Llamada a la API de MP
    const options = {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        "X-Idempotency-Key": Utilities.getUuid() // Previene la creación de suscripciones duplicadas por reintentos de red
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true // Para manejar errores de API manualmente
    };

    const response = UrlFetchApp.fetch("https://api.mercadopago.com/preapproval", options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Respuesta de MP API. Código: ${responseCode}. Cuerpo: ${responseBody}`);

    // 6. Manejar la Respuesta de MP
    if (responseCode === 200 || responseCode === 201) {
      const subscriptionData = JSON.parse(responseBody);
      const initPoint = subscriptionData.init_point;
      const subscriptionIdMP = subscriptionData.id;

      if (!initPoint || !subscriptionIdMP) {
        Logger.log(`ERROR (${FUNCION_NOMBRE}): Respuesta de MP exitosa pero faltan init_point o ID de suscripción. Respuesta: ${responseBody}`);
        registrarLog("ERROR", "MERCADOPAGO_RESPUESTA", "Respuesta exitosa de MP pero faltan datos clave (init_point/id).", { idRegistro: idRegistro, responseBody: responseBody }, FUNCION_NOMBRE);
        return { success: false, error: "Respuesta inesperada de Mercado Pago tras crear suscripción." };
      }

      // 7. Registrar en la hoja MERCADO_PAGO_TRANSACCIONES
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheetTransacciones = ss.getSheetByName("MERCADO_PAGO_TRANSACCIONES");
      const idTransaccionInterna = `TRANS-${new Date().getTime().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const fechaProximoCobroMP = subscriptionData.next_charge_date ? new Date(subscriptionData.next_charge_date) : calcularFechaProximoCobro(formData.periodicidadPago);

      const filaTransaccion = [
        idTransaccionInterna,
        idRegistro,
        subscriptionIdMP,
        null, // ID_PAGO_MP (se obtendrá del webhook del primer pago exitoso)
        parseFloat(montoTotal.toFixed(2)),
        "PEN",
        subscriptionData.status || "pending", // Estado inicial de la suscripción en MP
        new Date(), // Fecha de esta operación de creación
        fechaProximoCobroMP
      ];
      sheetTransacciones.appendRow(filaTransaccion);
      Logger.log(`BACKEND (${FUNCION_NOMBRE}): Transacción interna ${idTransaccionInterna} registrada para suscripción MP ${subscriptionIdMP}.`);
      registrarLog("INFO", "MERCADOPAGO_SUB_OK", `Suscripción creada en MP y registrada localmente (estado MP: ${subscriptionData.status}).`,
        { idRegistro: idRegistro, subscriptionIdMP: subscriptionIdMP, internalTxId: idTransaccionInterna, monto: montoTotal }, FUNCION_NOMBRE);

      return {
        success: true,
        init_point: initPoint,
        subscription_id_mp: subscriptionIdMP,
        internal_transaction_id: idTransaccionInterna
      };

    } else { // Error de la API de Mercado Pago
      let errorDetail = `Error ${responseCode}`;
      try {
        const errorJson = JSON.parse(responseBody);
        errorDetail = errorJson.message || JSON.stringify(errorJson.cause) || responseBody;
      } catch (e) {
        errorDetail += ` - ${responseBody}`;
      }
      Logger.log(`ERROR (${FUNCION_NOMBRE}): Fallo al crear suscripción en MP. Detalle: ${errorDetail}`);
      registrarLog("ERROR", "MERCADOPAGO_SUB_FAIL", `Fallo al crear suscripción en MP: ${errorDetail}`,
        { idRegistro: idRegistro, responseCode: responseCode, responseBody: responseBody }, FUNCION_NOMBRE);
      return { success: false, error: `Error al procesar con Mercado Pago: ${errorDetail}` };
    }

  } catch (error) { // Error general en la función
    Logger.log(`ERROR CRÍTICO en ${FUNCION_NOMBRE}: ${error.message}. Stack: ${error.stack}`);
    registrarLog("ERROR", "BACKEND_PAGO_EXCEPTION", `Excepción en ${FUNCION_NOMBRE}: ${error.message}`,
      { idRegistro: idRegistro, stack: error.stack }, FUNCION_NOMBRE);
    return { success: false, error: `Error interno del servidor al iniciar el pago: ${error.message}` };
  }
}

/**
 * Función principal que se activa cuando Mercado Pago envía una notificación (Webhook).
 * @param {object} e El objeto del evento que contiene los datos del POST.
 */
function doPost(e) {
  const FUNCION_NOMBRE = "doPost";
  Logger.log(`BACKEND (${FUNCION_NOMBRE}): Webhook recibido de Mercado Pago.`);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      Logger.log(`WARNING (${FUNCION_NOMBRE}): Webhook recibido sin datos válidos.`);
      registrarLog("WARNING", "WEBHOOK_MP", "Webhook recibido sin datos válidos.", { postData: "null" }, FUNCION_NOMBRE);
      return HtmlService.createHtmlOutput('<html><body>NO_DATA</body></html>').setTitle('Webhook Response');
    }

    const notificacion = JSON.parse(e.postData.contents);
    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Notificación parseada: ${JSON.stringify(notificacion)}`);

    // 🔍 DIAGNÓSTICO AVANZADO AGREGADO
    console.log("=== WEBHOOK DIAGNÓSTICO COMPLETO ===");
    console.log("Tipo de webhook:", notificacion.type);
    console.log("Live mode:", notificacion.live_mode);
    console.log("Action:", notificacion.action);
    console.log("Payment/Subscription ID:", notificacion.data?.id);
    console.log("User ID:", notificacion.user_id);
    console.log("Fecha creación:", notificacion.date_created);
    console.log("=== FIN DIAGNÓSTICO ===");

    registrarLog("INFO", "WEBHOOK_MP", "Notificación de Mercado Pago recibida.", {
      notificacion: notificacion,
      diagnostico: {
        tipo: notificacion.type,
        liveMode: notificacion.live_mode,
        action: notificacion.action,
        dataId: notificacion.data?.id
      }
    }, FUNCION_NOMBRE);

    // Procesar según el tipo de notificación
    if (notificacion.type === 'payment') {
      // Notificación de pago individual
      const paymentId = notificacion.data.id;
      if (paymentId) {
        Logger.log(`BACKEND (${FUNCION_NOMBRE}): Procesando notificación de pago ID: ${paymentId}`);
        procesarNotificacionDePago(paymentId);
      }
    } else if (notificacion.type === 'subscription_authorized_payment') {
      // ✅ SOLUCIÓN: Notificación de pago autorizado de suscripción
      const paymentId = notificacion.data.id;
      if (paymentId) {
        Logger.log(`BACKEND (${FUNCION_NOMBRE}): Procesando notificación de pago autorizado de suscripción ID: ${paymentId}`);
        console.log("WEBHOOK CRÍTICO: Pago autorizado de suscripción recibido:", paymentId);
        procesarNotificacionDePago(paymentId); // Usar la misma lógica que para pagos normales
      }
    } else if (notificacion.type === 'subscription_preapproval') {
      // Notificación de suscripción
      const subscriptionId = notificacion.data.id;
      if (subscriptionId) {
        Logger.log(`BACKEND (${FUNCION_NOMBRE}): Procesando notificación de suscripción ID: ${subscriptionId}`);
        procesarNotificacionDeSuscripcion(subscriptionId);
      }
    } else {
      Logger.log(`WARNING (${FUNCION_NOMBRE}): Tipo de notificación no procesado: ${notificacion.type}`);
      console.log("WEBHOOK NO PROCESADO:", notificacion.type, "Data:", notificacion.data);
      registrarLog("WARNING", "WEBHOOK_MP", `Tipo de notificación no procesado: ${notificacion.type}`, { notificacion: notificacion }, FUNCION_NOMBRE);
    }

    // ✅ CAMBIO CRÍTICO: HtmlService en lugar de ContentService para evitar 302
    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Webhook procesado exitosamente, enviando respuesta 200 OK.`);
    registrarLog("INFO", "WEBHOOK_MP", "Webhook procesado exitosamente.", { status: "ok" }, FUNCION_NOMBRE);
    return HtmlService.createHtmlOutput('<html><body>OK</body></html>').setTitle('Webhook Response');

  } catch (error) {
    Logger.log(`ERROR CRÍTICO en ${FUNCION_NOMBRE}: ${error.message}. Stack: ${error.stack}`);
    registrarLog("ERROR", "WEBHOOK_MP", `Error crítico en webhook: ${error.message}`, { postData: e ? e.postData.contents : 'N/A', stack: error.stack }, FUNCION_NOMBRE);
    return HtmlService.createHtmlOutput('<html><body>ERROR</body></html>').setTitle('Webhook Error');
  }
}

/**
 * Procesa la notificación de un pago específico, consultando la API de MP y actualizando la hoja.
 * @param {string} paymentId El ID del pago notificado por Mercado Pago.
 */
function procesarNotificacionDePago(paymentId) {
  const FUNCION_NOMBRE = "procesarNotificacionDePago";
  Logger.log(`BACKEND (${FUNCION_NOMBRE}): Iniciando procesamiento para pago ID: ${paymentId}`);

  try {
    // 1. Consultar detalles del pago en MP
    const detallesPago = consultarDetallesDePago(paymentId);
    if (!detallesPago) {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): No se pudieron obtener detalles del pago ${paymentId}`);
      return;
    }

    const externalReference = detallesPago.external_reference;
    const estadoPago = detallesPago.status;
    const montoTotal = detallesPago.transaction_amount;

    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Pago ${paymentId} - Estado: ${estadoPago}, External Reference: ${externalReference}, Monto: ${montoTotal}`);

    if (!externalReference) {
      Logger.log(`WARNING (${FUNCION_NOMBRE}): Pago ${paymentId} no tiene external_reference asociado.`);
      registrarLog("WARNING", "WEBHOOK_MP_PAGO", `Pago sin external_reference: ${paymentId}`, { paymentId: paymentId, detallesPago: detallesPago }, FUNCION_NOMBRE);
      return;
    }

    // 2. Actualizar el registro en MERCADO_PAGO_TRANSACCIONES
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaTransacciones = ss.getSheetByName('MERCADO_PAGO_TRANSACCIONES');
    if (!hojaTransacciones) {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): Hoja MERCADO_PAGO_TRANSACCIONES no encontrada.`);
      registrarLog("ERROR", "WEBHOOK_MP_PAGO", "Hoja MERCADO_PAGO_TRANSACCIONES no existe.", { paymentId: paymentId }, FUNCION_NOMBRE);
      return;
    }

    const datos = hojaTransacciones.getDataRange().getValues();
    let registroActualizado = false;

    for (let i = 1; i < datos.length; i++) { // Empezar desde 1 para saltar encabezados
      const idRegistroEnHoja = datos[i][1]; // Columna B: ID_REGISTRO

      if (idRegistroEnHoja === externalReference) {
        // Actualizar la fila encontrada
        hojaTransacciones.getRange(i + 1, 4).setValue(paymentId); // Columna D: ID_PAGO_MP
        hojaTransacciones.getRange(i + 1, 7).setValue(estadoPago); // Columna G: ESTADO
        hojaTransacciones.getRange(i + 1, 8).setValue(new Date()); // Columna H: FECHA_TRANSACCION (actualizar)

        Logger.log(`BACKEND (${FUNCION_NOMBRE}): Registro actualizado para ${externalReference}. Nuevo estado: ${estadoPago}`);
        registrarLog("INFO", "WEBHOOK_MP_PAGO", `Estado de pago actualizado a '${estadoPago}'`, {
          idRegistro: externalReference,
          paymentId: paymentId,
          estadoAnterior: datos[i][6],
          estadoNuevo: estadoPago
        }, FUNCION_NOMBRE);

        registroActualizado = true;

        // 3. Disparar acciones según el estado del pago (COMENTADO TEMPORALMENTE)
        if (estadoPago === 'approved') {
          Logger.log(`BACKEND (${FUNCION_NOMBRE}): Pago aprobado. Disparando correo de bienvenida para ${externalReference}`);
          // LOGS DE DEBUGGING AGREGADOS
          console.log("Estado recibido:", estadoPago);
          console.log("ID Registro a enviar correo:", externalReference);
          enviarCorreoBienvenidaPostPago(externalReference); // ← CORREGIDO
        } else if (estadoPago === 'rejected') {
          Logger.log(`BACKEND (${FUNCION_NOMBRE}): Pago rechazado. Disparando correo de problema para ${externalReference}`);
          // enviarCorreoProblema(externalReference, 'Pago rechazado'); // COMENTADO TEMPORALMENTE - IMPLEMENTAR DESPUÉS
        } else if (estadoPago === 'cancelled') {
          Logger.log(`BACKEND (${FUNCION_NOMBRE}): Pago cancelado para ${externalReference}`);
          registrarLog("INFO", "PAGO_CANCELADO", `Pago cancelado por el usuario`, { idRegistro: externalReference, paymentId: paymentId }, FUNCION_NOMBRE);
        }

        break; // Salir del bucle una vez encontrado y actualizado
      }
    }

    if (!registroActualizado) {
      Logger.log(`WARNING (${FUNCION_NOMBRE}): No se encontró registro para external_reference: ${externalReference}`);
      registrarLog("WARNING", "WEBHOOK_MP_PAGO", `No se encontró registro local para external_reference: ${externalReference}`, {
        paymentId: paymentId,
        externalReference: externalReference
      }, FUNCION_NOMBRE);
    }

  } catch (error) {
    Logger.log(`ERROR CRÍTICO en ${FUNCION_NOMBRE}: ${error.message}. Stack: ${error.stack}`);
    registrarLog("ERROR", "WEBHOOK_MP_PAGO", `Error al procesar notificación de pago: ${error.message}`, {
      paymentId: paymentId,
      stack: error.stack
    }, FUNCION_NOMBRE);
  }
}

/**
 * Procesa la notificación de una suscripción específica.
 * @param {string} subscriptionId El ID de la suscripción notificada por Mercado Pago.
 */
function procesarNotificacionDeSuscripcion(subscriptionId) {
  const FUNCION_NOMBRE = "procesarNotificacionDeSuscripcion";
  Logger.log(`BACKEND (${FUNCION_NOMBRE}): Iniciando procesamiento para suscripción ID: ${subscriptionId}`);

  try {
    // 1. Consultar detalles de la suscripción en MP
    const detallesSuscripcion = consultarDetallesDeSuscripcion(subscriptionId);
    if (!detallesSuscripcion) {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): No se pudieron obtener detalles de la suscripción ${subscriptionId}`);
      return;
    }

    const externalReference = detallesSuscripcion.external_reference;
    const estadoSuscripcion = detallesSuscripcion.status;

    Logger.log(`BACKEND (${FUNCION_NOMBRE}): Suscripción ${subscriptionId} - Estado: ${estadoSuscripcion}, External Reference: ${externalReference}`);

    if (!externalReference) {
      Logger.log(`WARNING (${FUNCION_NOMBRE}): Suscripción ${subscriptionId} no tiene external_reference asociado.`);
      return;
    }

    // 2. Registrar el cambio de estado de suscripción
    registrarLog("INFO", "WEBHOOK_MP_SUSCRIPCION", `Estado de suscripción actualizado a '${estadoSuscripcion}'`, {
      idRegistro: externalReference,
      subscriptionId: subscriptionId,
      estadoSuscripcion: estadoSuscripcion
    }, FUNCION_NOMBRE);

    // 3. Acciones específicas según el estado de la suscripción (COMENTADO TEMPORALMENTE)
    if (estadoSuscripcion === 'cancelled') {
      Logger.log(`BACKEND (${FUNCION_NOMBRE}): Suscripción cancelada para ${externalReference}`);
      // enviarCorreoProblema(externalReference, 'Suscripción cancelada'); // COMENTADO TEMPORALMENTE - IMPLEMENTAR DESPUÉS
    } else if (estadoSuscripcion === 'paused') {
      Logger.log(`BACKEND (${FUNCION_NOMBRE}): Suscripción pausada para ${externalReference}`);
      registrarLog("INFO", "SUSCRIPCION_PAUSADA", `Suscripción pausada`, { idRegistro: externalReference, subscriptionId: subscriptionId }, FUNCION_NOMBRE);
    }

  } catch (error) {
    Logger.log(`ERROR CRÍTICO en ${FUNCION_NOMBRE}: ${error.message}. Stack: ${error.stack}`);
    registrarLog("ERROR", "WEBHOOK_MP_SUSCRIPCION", `Error al procesar notificación de suscripción: ${error.message}`, {
      subscriptionId: subscriptionId,
      stack: error.stack
    }, FUNCION_NOMBRE);
  }
}

/**
 * Consulta a la API de Mercado Pago para obtener los detalles de un pago.
 * @param {string} paymentId El ID del pago.
 * @returns {object|null} El objeto JSON con los detalles del pago, o null si hay un error.
 */
function consultarDetallesDePago(paymentId) {
  const FUNCION_NOMBRE = "consultarDetallesDePago";

  try {
    const accessToken = recuperarCredencialSegura('Access Token');
    if (!accessToken) {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): No se pudo obtener Access Token para consultar el pago ${paymentId}.`);
      return null;
    }

    const API_URL = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    const options = {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`BACKEND (${FUNCION_NOMBRE}): Detalles del pago ${paymentId} obtenidos exitosamente.`);
      return JSON.parse(responseBody);
    } else {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): Error al consultar pago ${paymentId}. Código: ${responseCode}. Respuesta: ${responseBody}`);
      registrarLog("ERROR", "CONSULTA_MP_PAGO", `Error al consultar detalles del pago: HTTP ${responseCode}`, {
        paymentId: paymentId,
        responseCode: responseCode,
        responseBody: responseBody
      }, FUNCION_NOMBRE);
      return null;
    }
  } catch (error) {
    Logger.log(`ERROR CRÍTICO en ${FUNCION_NOMBRE}: ${error.message}. Stack: ${error.stack}`);
    registrarLog("ERROR", "CONSULTA_MP_PAGO", `Excepción al consultar detalles del pago: ${error.message}`, {
      paymentId: paymentId,
      stack: error.stack
    }, FUNCION_NOMBRE);
    return null;
  }
}

/**
 * Consulta a la API de Mercado Pago para obtener los detalles de una suscripción.
 * @param {string} subscriptionId El ID de la suscripción.
 * @returns {object|null} El objeto JSON con los detalles de la suscripción, o null si hay un error.
 */
function consultarDetallesDeSuscripcion(subscriptionId) {
  const FUNCION_NOMBRE = "consultarDetallesDeSuscripcion";

  try {
    const accessToken = recuperarCredencialSegura('Access Token');
    if (!accessToken) {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): No se pudo obtener Access Token para consultar la suscripción ${subscriptionId}.`);
      return null;
    }

    const API_URL = `https://api.mercadopago.com/preapproval/${subscriptionId}`;
    const options = {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`BACKEND (${FUNCION_NOMBRE}): Detalles de la suscripción ${subscriptionId} obtenidos exitosamente.`);
      return JSON.parse(responseBody);
    } else {
      Logger.log(`ERROR (${FUNCION_NOMBRE}): Error al consultar suscripción ${subscriptionId}. Código: ${responseCode}. Respuesta: ${responseBody}`);
      registrarLog("ERROR", "CONSULTA_MP_SUSCRIPCION", `Error al consultar detalles de la suscripción: HTTP ${responseCode}`, {
        subscriptionId: subscriptionId,
        responseCode: responseCode,
        responseBody: responseBody
      }, FUNCION_NOMBRE);
      return null;
    }
  } catch (error) {
    Logger.log(`ERROR CRÍTICO en ${FUNCION_NOMBRE}: ${error.message}. Stack: ${error.stack}`);
    registrarLog("ERROR", "CONSULTA_MP_SUSCRIPCION", `Excepción al consultar detalles de la suscripción: ${error.message}`, {
      subscriptionId: subscriptionId,
      stack: error.stack
    }, FUNCION_NOMBRE);
    return null;
  }
}

//==================================================================
//          FIN SECCIÓN COMPLETA DE INTEGRACIÓN CON MERCADO PAGO
//==================================================================

/**
 * Valida los datos del formulario con validaciones mejoradas
 * @param {Object} formData - Datos del formulario
 * @return {Object} Resultado de validación con errores si existen
 */
function validarDatosFormulario(formData) {
  const errores = [];

  // Verificar campos obligatorios del titular
  const camposObligatorios = [
    'primerNombre', 'apellidoPaterno', 'apellidoMaterno',
    'tipoDocumento', 'numeroDocumento', 'fechaNacimiento',
    'sexo', 'paisNacimiento', 'email', 'telefono',
    'periodicidadPago', 'numeroDependientes'
  ];

  for (const campo of camposObligatorios) {
    if (!formData[campo]) {
      errores.push(`Campo obligatorio faltante: ${campo}`);
    }
  }

  // Validar formato de correo electrónico
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errores.push("Formato de correo electrónico inválido");
  }

  // Validar formato de teléfono (9 dígitos para Perú)
  if (formData.telefono && !/^\d{9}$/.test(formData.telefono.toString().replace(/\D/g, ''))) {
    errores.push("El teléfono debe tener 9 dígitos numéricos");
  }

  // Validar formato de documento según tipo
  if (formData.tipoDocumento && formData.numeroDocumento) {
    if (formData.tipoDocumento === "DNI" && !/^\d{8}$/.test(formData.numeroDocumento.toString().replace(/\D/g, ''))) {
      errores.push("El DNI debe tener exactamente 8 dígitos numéricos");
    } else if (formData.tipoDocumento === "CE" && (String(formData.numeroDocumento).length < 1 || String(formData.numeroDocumento).length > 12)) { // Convertido a String para .length
      errores.push("El CE debe tener entre 1 y 12 caracteres");
    }
  }

  // Validar periodicidad de pago
  if (formData.periodicidadPago && !["Mensual", "Anual"].includes(formData.periodicidadPago)) {
    errores.push("La periodicidad de pago debe ser 'Mensual' o 'Anual'");
  }

  // Validar fecha de nacimiento (que no sea futura)
  if (formData.fechaNacimiento) {
    const fechaNacimiento = new Date(formData.fechaNacimiento);
    if (fechaNacimiento > new Date()) {
      errores.push("La fecha de nacimiento no puede ser futura");
    }
  }

  // Verificar campos obligatorios de dependientes
  const numDependientes = parseInt(formData.numeroDependientes || 0);
  for (let i = 1; i <= numDependientes; i++) { // 'i' es el índice UI (1-based) que usa el frontend para los sufijos
    // Nombres de campos base (sin prefijo ni sufijo)
    const camposBaseDependiente = [
      'primerNombre', 'apellidoPaterno', 'apellidoMaterno',
      'tipoDocumento', 'numeroDocumento', 'fechaNacimiento',
      'sexo', 'paisNacimiento', 'parentesco'
    ];

    for (const campoBase of camposBaseDependiente) {
      const claveFrontend = `${campoBase}-${i}`; // Construir la clave como la envía el frontend
      if (!formData[claveFrontend]) {
        errores.push(`Campo obligatorio de dependiente ${i} faltante: ${campoBase}`);
      }
    }

    // Validar documento de dependiente según tipo (usando las nuevas claves)
    const tipoDocKey = `tipoDocumento-${i}`;
    const numDocKey = `numeroDocumento-${i}`;
    if (formData[tipoDocKey] && formData[numDocKey]) {
      if (formData[tipoDocKey] === "DNI" &&
        !/^\d{8}$/.test(String(formData[numDocKey]).replace(/\D/g, ''))) { // Convertido a String
        errores.push(`El DNI del dependiente ${i} debe tener exactamente 8 dígitos numéricos`);
      } else if (formData[tipoDocKey] === "CE" &&
        (String(formData[numDocKey]).length < 1 || String(formData[numDocKey]).length > 12)) { // Convertido a String
        errores.push(`El CE del dependiente ${i} debe tener entre 1 y 12 caracteres`);
      }
    }

    // Validar fecha de nacimiento del dependiente (usando la nueva clave)
    const fechaNacKey = `fechaNacimiento-${i}`;
    if (formData[fechaNacKey]) {
      const fechaNacimientoDep = new Date(formData[fechaNacKey]); // Renombrada para evitar conflicto con la del titular
      if (fechaNacimientoDep > new Date()) {
        errores.push(`La fecha de nacimiento del dependiente ${i} no puede ser futura`);
      }
    }
  }

  // Verificar declaraciones obligatorias
  if (formData.declaracionSalud !== true && formData.declaracionSalud !== "SI") {
    errores.push("Debe aceptar la declaración de salud");
  }

  if (formData.declaracionJurada !== true && formData.declaracionJurada !== "SI") {
    errores.push("Debe aceptar la declaración jurada");
  }

  if (formData.declaracionPrivacidad !== true && formData.declaracionPrivacidad !== "SI") {
    errores.push("Debe aceptar la declaración de privacidad");
  }

  return {
    valido: errores.length === 0,
    errores: errores
  };
}

/**
 * Guarda los datos del titular
 * @param {Object} formData - Datos del formulario
 * @return {string} ID único del registro
 */
function guardarDatosTitular(formData) {
  // Obtener hoja de TITULAR (antes REGISTROS)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTitular = ss.getSheetByName("TITULAR");

  // Generar ID único utilizando el patrón existente
  const idRegistro = `REG-${new Date().getTime().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  // Calcular edad
  const partsTitular = formData.fechaNacimiento.split('-'); // Asume formato YYYY-MM-DD
  const fechaNacimiento = new Date(parseInt(partsTitular[0], 10), parseInt(partsTitular[1], 10) - 1, parseInt(partsTitular[2], 10));
  const edad = calcularEdad(fechaNacimiento);

  // Calcular costos utilizando la función mejorada
  const tarifas = obtenerTarifasPorEdad(edad);

  // CALCULAR FECHA DE INICIO DE VIGENCIA (1er día del mes siguiente)
  const hoy = new Date();
  let anio = hoy.getFullYear();
  let mes = hoy.getMonth(); // 0 (Ene) a 11 (Dic)

  if (mes === 11) { // Si es Diciembre
    mes = 0; // El mes será Enero
    anio++; // del próximo año
  } else {
    mes++; // Simplemente el siguiente mes
  }
  const fechaInicioVigencia = new Date(anio, mes, 1); // Solo fecha, sin hora

  // CALCULAR TOTALES MENSUALES (Titular + Dependientes)
  let totalMensualOncosalud = tarifas.oncosalud; // Titular
  let totalMensualAsisplus = tarifas.asisplus; // Titular

  // Sumar dependientes si existen
  const numDependientes = parseInt(formData.numeroDependientes || 0);
  for (let i = 1; i <= numDependientes; i++) {
    const fechaNacimientoDepStr = formData[`fechaNacimiento-${i}`];
    if (fechaNacimientoDepStr) {
      const fechaNacimientoDep = new Date(fechaNacimientoDepStr);
      if (!isNaN(fechaNacimientoDep.getTime())) {
        const edadDep = calcularEdad(fechaNacimientoDep);
        const tarifasDep = obtenerTarifasPorEdad(edadDep);
        totalMensualOncosalud += tarifasDep.oncosalud;
        totalMensualAsisplus += tarifasDep.asisplus;
      }
    }
  }

  // Crear fila de datos según estructura EXACTA de TITULAR
  const fila = [
    new Date(),                     // REGISTRO (fecha/hora actual)
    formData.paisNacimiento,        // PAIS (usar país de nacimiento del formulario)
    "ALTA",                         // TIPO DE TRAMA (siempre ALTA para nuevos registros)
    "",                             // GF SAP (vacío)
    "",                             // CERTFICADO (vacío según instrucción)
    formData.apellidoPaterno,       // APELLIDO PATERNO
    formData.apellidoMaterno,       // APELLIDO MATERNO
    formData.primerNombre,          // NOMBRE 1
    formData.segundoNombre || "",   // NOMBRE 2
    formData.sexo,                  // SEXO
    fechaNacimiento,                // FECHA DE NACIMIENTO DD/MM/AAAA
    "TITULAR",                      // PARENTESCO (siempre TITULAR)
    formData.tipoDocumento,         // TIPO DE DOCUMENTO
    formData.numeroDocumento,       // NUMERO DE DOCUMENTO
    "CALLE ALFREDO SALAZAR 145 MIRAFLORES", // DIRECCION DE EMPRESA (valor fijo)
    "GALVAREZ@ASEGUR.COM.PE",       // CORREO DE CONTACTO DE LA EMPRESA (valor fijo)
    "PLUS",                         // PROGRAMA (valor fijo corregido)
    fechaInicioVigencia,            // INICIO/FIN VIGENCIA (1er día mes siguiente, solo fecha)
    formData.paisNacimiento,        // PAIS DE NACIMIENTO
    formData.email,                 // EMAIL
    formData.telefono,              // TELEFONO
    formData.whatsapp ? formData.telefono : "", // WHATSAPP (usar teléfono si está marcado whatsapp)
    formData.periodicidadPago,      // PERIODO DE PAGO
    formData.pagoRecurrente ? "SI" : "NO", // PAGO RECURRENTE
    formData.numeroDependientes,    // DEPENDIENTES
    formData.declaracionSalud ? "SI" : "NO", // DECLARACIÓN DE SALUD
    formData.declaracionJurada ? "SI" : "NO", // DECLARACIÓN JURADA
    formData.declaracionPrivacidad ? "SI" : "NO", // DECLARACIÓN DE PRIVACIDAD
    "NUEVO",                        // TIPO DE CLIENTE
    edad,                           // EDAD
    tarifas.oncosalud,              // COSTO INDIVIDUAL ONCOSALUD
    tarifas.asisplus,               // COSTO INDIVIDUAL ASISPLUS
    totalMensualOncosalud,          // TOTAL MENSUAL ONCOSALUD (titular + dependientes)
    totalMensualAsisplus,           // TOTAL MENSUAL ASISPLUS (A COBRAR) (titular + dependientes)
    idRegistro                      // ID_REGISTRO (columna AI)
  ];

  // Agregar fila a la hoja
  sheetTitular.appendRow(fila);

  // Registrar en el log
  Logger.log(`Titular registrado con ID: ${idRegistro}`);
  registrarLog("INFO", "DATOS", "Titular registrado correctamente",
    { idRegistro: idRegistro, numeroDocumento: formData.numeroDocumento });

  return idRegistro;
}

/**
 * Guarda los datos de dependientes
 * @param {Object} formData - Datos del formulario
 * @param {string} idTitular - ID del titular asociado
 * @param {number} numDependientes - Número de dependientes a procesar
 */
function guardarDatosDependientes(formData, idTitular, numDependientes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetDependientes = ss.getSheetByName("DEPENDIENTES");
  const dependientesRegistrados = [];

  Logger.log('BACKEND (guardarDatosDependientes): Iniciando guardado para ' + numDependientes + ' dependientes.');

  for (let i = 1; i <= numDependientes; i++) { // 'i' es el índice UI (1-based)
    const idDependiente = `DEP-${new Date().getTime().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Acceder a los datos del formulario usando el formato de clave del frontend (ej. fechaNacimiento-1)
    const fechaNacimientoStr = formData[`fechaNacimiento-${i}`];
    Logger.log(`BACKEND (guardarDatosDependientes): Dependiente ${i}, fechaNacimientoStr leída de formData: ${fechaNacimientoStr}`);
    let fechaNacimientoObj = null;
    if (fechaNacimientoStr) {
      const partsDep = fechaNacimientoStr.split('-'); // Asume formato YYYY-MM-DD
      if (partsDep.length === 3) {
        fechaNacimientoObj = new Date(parseInt(partsDep[0], 10), parseInt(partsDep[1], 10) - 1, parseInt(partsDep[2], 10));
      } else {
        // Fallback o manejo de error si el formato no es el esperado
        Logger.log(`BACKEND (guardarDatosDependientes): Formato de fecha inesperado para dependiente ${i}: ${fechaNacimientoStr}`);
        // fechaNacimientoObj permanece null o se puede intentar un new Date(fechaNacimientoStr) como antes
        fechaNacimientoObj = new Date(fechaNacimientoStr); // Manteniendo el fallback anterior si el split falla
      }
    }

    // Validar si la fecha es un objeto Date válido antes de llamar a calcularEdad
    let edad = 0; // Default a 0 si la fecha es inválida
    if (fechaNacimientoObj && !isNaN(fechaNacimientoObj.getTime())) {
      edad = calcularEdad(fechaNacimientoObj);
    } else {
      Logger.log(`BACKEND (guardarDatosDependientes): Fecha de nacimiento inválida o no proporcionada para dependiente ${i}. Edad establecida a 0.`);
      // Considerar registrar un error si la fecha es obligatoria y falta/es inválida,
      // aunque validarDatosFormulario ya debería haberlo atrapado.
    }
    Logger.log(`BACKEND (guardarDatosDependientes): Dependiente ${i}, edad calculada: ${edad}`);

    const tarifas = obtenerTarifasPorEdad(edad); // Ahora devuelve {oncosalud: X, asisplus: Y}
    Logger.log(`BACKEND (guardarDatosDependientes): Dependiente <span class="math-inline">\{i\}, tarifas obtenidas\: Oncosalud\=</span>{tarifas.oncosalud}, Asisplus=${tarifas.asisplus}`);

    const fila = [
      idDependiente,
      idTitular,
      formData[`apellidoPaterno-${i}`],
      formData[`apellidoMaterno-${i}`],
      formData[`primerNombre-${i}`],
      formData[`segundoNombre-${i}`] || "",
      formData[`sexo-${i}`],
      fechaNacimientoObj, // Guardar el objeto Date
      formData[`parentesco-${i}`],
      formData[`tipoDocumento-${i}`],
      formData[`numeroDocumento-${i}`],
      formData[`paisNacimiento-${i}`],
      edad,
      tarifas.oncosalud, // Usar la tarifa Oncosalud del objeto devuelto
      tarifas.asisplus   // Usar la tarifa Asisplus del objeto devuelto
    ];

    sheetDependientes.appendRow(fila);
    dependientesRegistrados.push({
      idDependiente: idDependiente,
      nombre: `${formData[`primerNombre-${i}`] || ''} ${formData[`apellidoPaterno-${i}`] || ''}`.trim(),
      parentesco: formData[`parentesco-${i}`],
      edad: edad
    });
    Logger.log(`Dependiente ${i} registrado con ID: ${idDependiente}`);
  }

  if (dependientesRegistrados.length > 0) {
    registrarLog("INFO", "DATOS_DEPENDIENTES", `Se registraron ${dependientesRegistrados.length} dependientes`,
      { idTitular: idTitular, dependientes: dependientesRegistrados });
  }
  Logger.log('BACKEND (guardarDatosDependientes): Finalizado el guardado de dependientes.');
}

/**
 * Calcula el monto total a pagar (SUMANDO SOLO TARIFAS ASISPLUS)
 * @param {Object} formData - Datos del formulario
 * @return {number} Monto total calculado
 */
function calcularMontoTotal(formData) {
  Logger.log('BACKEND (calcularMontoTotal): Iniciando cálculo de monto total (SOLO TARIFAS ASISPLUS).');
  // Calcular costo del titular
  const fechaNacimientoTitularStr = formData.fechaNacimiento;
  const fechaNacimientoTitular = fechaNacimientoTitularStr ? new Date(fechaNacimientoTitularStr) : null;
  let edadTitular = 0;
  if (fechaNacimientoTitular && !isNaN(fechaNacimientoTitular.getTime())) {
    edadTitular = calcularEdad(fechaNacimientoTitular);
  }
  const tarifasTitular = obtenerTarifasPorEdad(edadTitular); // Devuelve {oncosalud: X, asisplus: Y}
  Logger.log(`BACKEND (calcularMontoTotal): Titular - Edad=<span class="math-inline">\{edadTitular\}, TarifaAsisplus\=</span>{tarifasTitular.asisplus}`);

  let montoTotal = (tarifasTitular.asisplus || 0); // Tomar solo la tarifa Asisplus del titular

  // Añadir costo de dependientes si hay
  const numDependientes = parseInt(formData.numeroDependientes || 0);
  for (let i = 1; i <= numDependientes; i++) {
    const fechaNacimientoDepStr = formData[`fechaNacimiento-${i}`];
    const fechaNacimientoDep = fechaNacimientoDepStr ? new Date(fechaNacimientoDepStr) : null;
    let edadDep = 0;
    if (fechaNacimientoDep && !isNaN(fechaNacimientoDep.getTime())) {
      edadDep = calcularEdad(fechaNacimientoDep);
    }
    const tarifasDep = obtenerTarifasPorEdad(edadDep); // Devuelve {oncosalud: X, asisplus: Y}
    Logger.log(`BACKEND (calcularMontoTotal): Dependiente <span class="math-inline">\{i\} \- Edad\=</span>{edadDep}, TarifaAsisplus=${tarifasDep.asisplus}`);

    montoTotal += (tarifasDep.asisplus || 0); // Sumar solo la tarifa Asisplus del dependiente
  }

  // Aplicar descuento según periodo de pago si es anual
  if (formData.periodicidadPago === "Anual") {
    montoTotal = montoTotal * 12 * 0.9; // 10% de descuento en pago anual
    Logger.log('BACKEND (calcularMontoTotal): Aplicado descuento anual. Monto parcial: ' + montoTotal);
  }

  Logger.log('BACKEND (calcularMontoTotal): Monto total final calculado (SOLO ASISPLUS): ' + montoTotal);
  if (isNaN(montoTotal)) {
    Logger.log('BACKEND (calcularMontoTotal): ADVERTENCIA - MontoTotal es NaN. Esto causará problemas.');
  }
  return montoTotal;
}

/**
 * Calcula la edad a partir de una fecha de nacimiento
 * @param {Date} fechaNacimiento - Fecha de nacimiento
 * @return {number} Edad calculada
 */
function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }

  return edad;
}

/**
 * Procesa el pago
 * @param {Object} formData - Datos del formulario
 * @param {string} idRegistro - ID del registro
 * @param {number} montoTotal - Monto total a pagar
 * @return {string} ID de la transacción
 */
function procesarPago(formData, idRegistro, montoTotal) {
  // Obtener hoja de transacciones
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTransacciones = ss.getSheetByName("MERCADO_PAGO_TRANSACCIONES");

  // Generar ID único para la transacción
  const idTransaccion = `TRANS-${new Date().getTime().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  // Crear fila de datos para la transacción según estructura EXACTA
  const fila = [
    idTransaccion,                 // ID_TRANSACCION
    idRegistro,                    // ID_REGISTRO
    "",                            // ID_SUSCRIPCION_MP (pendiente de integración)
    "",                            // ID_PAGO_MP (pendiente de integración)
    montoTotal,                    // MONTO (calculado correctamente)
    "PEN",                         // MONEDA (Sol peruano)
    "PENDIENTE",                   // ESTADO
    new Date(),                    // FECHA_TRANSACCION
    calcularFechaProximoCobro(formData.periodicidadPago) // FECHA_PROXIMO_COBRO
  ];

  // Agregar fila a la hoja
  sheetTransacciones.appendRow(fila);

  // Registrar en el log
  Logger.log(`Transacción registrada con ID: ${idTransaccion}`);
  registrarLog("INFO", "PAGO", "Transacción registrada en sistema",
    { idTransaccion: idTransaccion, idRegistro: idRegistro, monto: montoTotal });

  return idTransaccion;
}

/**
 * Calcula la fecha del próximo cobro según la periodicidad
 * @param {string} periodicidad - Periodicidad de pago (Mensual/Anual)
 * @return {Date} Fecha del próximo cobro
 */
function calcularFechaProximoCobro(periodicidad) {
  const hoy = new Date();
  const fechaProxima = new Date(hoy);

  if (periodicidad === "Mensual") {
    fechaProxima.setMonth(hoy.getMonth() + 1);
  } else if (periodicidad === "Anual") {
    fechaProxima.setFullYear(hoy.getFullYear() + 1);
  }

  return fechaProxima;
}

/**
 * Envía una notificación básica
 * @param {Object} formData - Datos del formulario
 * @param {string} idRegistro - ID del registro
 */
function enviarNotificacionBasica(formData, idRegistro) {
  // NOTA: Esta es una implementación básica para el MVP1
  // El sistema completo de comunicaciones se implementará en MVP2

  try {
    // Preparar correo básico
    const destinatario = formData.email;
    const asunto = "Confirmación de solicitud - Programa ONCOPLUS";

    // Mejorar la plantilla con más información
    const cuerpo = `
      Estimado/a ${formData.primerNombre} ${formData.apellidoPaterno},
      
      Gracias por su solicitud de afiliación al programa ONCOPLUS.
      
      Información de su registro:
      - Número de registro: ${idRegistro}
      - Fecha de solicitud: ${new Date().toLocaleDateString()}
      - Plan: ONCOPLUS
      - Periodicidad de pago: ${formData.periodicidadPago}
      ${parseInt(formData.numeroDependientes) > 0 ? `- Dependientes registrados: ${formData.numeroDependientes}` : ''}
      
      En las próximas 24 horas recibirá un correo con los detalles para completar su proceso de afiliación y realizar el pago correspondiente.
      
      Si tiene alguna duda, puede responder a este correo o comunicarse con nuestro equipo de atención al cliente al 0800-12345.
      
      Saludos cordiales,
      Equipo ONCOPLUS
    `;

    // Enviar correo
    MailApp.sendEmail(destinatario, asunto, cuerpo);

    // Registrar en el log
    Logger.log(`Notificación básica enviada a: ${destinatario}`);
    registrarLog("INFO", "COMUNICACIÓN", "Correo de confirmación enviado",
      { email: destinatario, idRegistro: idRegistro });

  } catch (error) {
    // Solo registrar el error sin interrumpir el flujo
    Logger.log(`Error al enviar notificación: ${error.toString()}`);
    registrarLog("ERROR", "COMUNICACIÓN", "Error al enviar correo de confirmación",
      { email: formData.email, error: error.message });
  }
}

/**
 * Verifica si existe un titular con el mismo documento
 * @param {string} tipoDocumento - Tipo de documento (DNI/CE)
 * @param {string} numeroDocumento - Número de documento
 * @return {Object} Resultado de la verificación
 */
function verificarExistenciaTitular(tipoDocumento, numeroDocumento) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTitular = ss.getSheetByName("TITULAR");

  // Obtener todos los datos
  const datos = sheetTitular.getDataRange().getValues();

  // Buscar coincidencia (considerando las columnas correctas)
  for (let i = 1; i < datos.length; i++) { // Empezar desde 1 para saltar encabezados
    const tipoDoc = datos[i][12]; // Columna N (índice 12): TIPO DE DOCUMENTO
    const numDoc = datos[i][13];  // Columna O (índice 13): NUMERO DE DOCUMENTO

    if (tipoDoc === tipoDocumento && numDoc === numeroDocumento) {
      return {
        existe: true,
        idRegistro: datos[i][datos[i].length - 1], // Última columna: ID_REGISTRO
        nombre: `${datos[i][7]} ${datos[i][5]}`,  // NOMBRE 1 + APELLIDO PATERNO
        email: datos[i][19]  // Columna T (índice 19): EMAIL
      };
    }
  }

  return { existe: false };
}

/**
 * Crea las hojas necesarias si no existen
 * Función para inicializar la estructura de datos
 */
function inicializarHojas() {
  // Esta función se mantiene por compatibilidad, pero ahora verificamos primero si
  // la estructura ya ha sido creada por app.gs antes de crearla nuevamente
  if (verificarEntorno()) {
    Logger.log("Las hojas necesarias ya existen. No es necesario inicializarlas.");
    return "Las hojas necesarias ya existen. No es necesario inicializarlas.";
  }

  // Si llegamos aquí, es porque falta alguna hoja
  Logger.log("Faltan algunas hojas. Por favor, ejecute la función 'configurarEntornoCompleto' en app.gs.");
  return "Faltan algunas hojas. Por favor, ejecute la función 'configurarEntornoCompleto' en app.gs.";
}

/**
 * Función para inicializar el proyecto
 * Se puede ejecutar manualmente una vez para configurar todo
 */
function initializeProject() {
  try {
    // Verificar si la estructura ya ha sido creada por app.gs
    if (verificarEntorno()) {
      Logger.log("El entorno ya está inicializado correctamente.");
      return "El entorno ya está inicializado correctamente.";
    }

    // Si llegamos aquí, es porque falta alguna hoja
    Logger.log("Faltan algunas hojas. Por favor, ejecute la función 'configurarEntornoCompleto' en app.gs.");
    return "Faltan algunas hojas. Por favor, ejecute la función 'configurarEntornoCompleto' en app.gs.";

  } catch (error) {
    Logger.log(`Error al inicializar proyecto: ${error.toString()}`);
    return `Error al inicializar proyecto: ${error.toString()}`;
  }
}

/**
 * Envía correo de bienvenida cuando el pago es aprobado
 * @param {string} idRegistro - ID del registro para buscar datos del titular
 */
function enviarCorreoBienvenidaPostPago(idRegistro) {
  // idRegistro = "REG-mcmbaf2d-VE5"; // ← ESTA LÍNEA ES NUEVA
  const FUNCION_NOMBRE = "enviarCorreoBienvenidaPostPago";
  // LOG DE DEBUGGING AGREGADO
  console.log("Función enviarCorreoBienvenidaPostPago llamada con ID:", idRegistro);
  Logger.log(`${FUNCION_NOMBRE}: Iniciando envío para registro: ${idRegistro}`);

  try {
    // 1. Buscar datos del titular en la hoja TITULAR
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaTitular = ss.getSheetByName("TITULAR");

    if (!hojaTitular) {
      Logger.log(`${FUNCION_NOMBRE}: Hoja TITULAR no encontrada`);
      return false;
    }

    const datos = hojaTitular.getDataRange().getValues();
    let datosTitular = null;

    // Buscar por ID_REGISTRO (última columna)
    for (let i = 1; i < datos.length; i++) {
      const idEnHoja = datos[i][datos[i].length - 1]; // Última columna
      if (idEnHoja === idRegistro) {
        datosTitular = datos[i];
        break;
      }
    }

    if (!datosTitular) {
      Logger.log(`${FUNCION_NOMBRE}: No se encontraron datos para registro: ${idRegistro}`);
      return false;
    }

    // 2. Extraer datos del titular
    const email = datosTitular[19]; // Columna T (EMAIL)
    const nombreCompleto = `${datosTitular[7]} ${datosTitular[5]}`; // NOMBRE + APELLIDO

    // 3. NUEVAS LÍNEAS: Obtener y calcular fechas dinámicas

    //const fechaVigencia = datosTitular[17]; --> Columna R: INICIO/FIN VIGENCIA - se comentó y se reemplaza
    //const fechaCarencia = new Date(fechaVigencia); -->  - se comentó y se reemplaza
    //fechaCarencia.setDate(fechaCarencia.getDate() + 90); --> +90 días para carencia - se comentó y se reemplaza

    // 3. Calcular fechas según reglas de Anahí
    const fechaHoy = new Date();

    // Vigencia: Primer día del mes siguiente
    const fechaVigencia = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth() + 1, 1);

    // Carencia: Vigencia + 3 meses (primer día del 4to mes)
    const fechaCarencia = new Date(fechaVigencia.getFullYear(), fechaVigencia.getMonth() + 3, 1);

    // Formatear fechas para mostrar (dd/mm/yyyy)
    const fechaVigenciaStr = fechaVigencia.toLocaleDateString('es-PE');
    const fechaCarenciaStr = fechaCarencia.toLocaleDateString('es-PE');

    Logger.log(`${FUNCION_NOMBRE}: Fechas calculadas - Vigencia: ${fechaVigenciaStr}, Carencia: ${fechaCarenciaStr}`);

    // 4. Cargar plantilla HTML del cliente y personalizar
    let plantillaHTML = HtmlService.createTemplateFromFile('PlantillaOncoplus').evaluate().getContent();

    // Reemplazar fechas hardcodeadas por fechas reales
    plantillaHTML = plantillaHTML.replace('[PRIMER_NOMBRE]', datosTitular[7]);
    plantillaHTML = plantillaHTML.replace('[APELLIDO_PATERNO]', datosTitular[5]);
    plantillaHTML = plantillaHTML.replace('[FECHA_VIGENCIA]', fechaVigenciaStr);
    plantillaHTML = plantillaHTML.replace('[FECHA_CARENCIA]', fechaCarenciaStr);

    // 5. Enviar correo usando la plantilla personalizada
    const asunto = "¡Bienvenido/a al Programa ONCOPLUS! - Tu cobertura está activada";

    MailApp.sendEmail({
      to: email,
      subject: asunto,
      htmlBody: plantillaHTML
    });

    // 6. Registrar envío exitoso
    Logger.log(`${FUNCION_NOMBRE}: Correo enviado exitosamente a: ${email}`);
    registrarLog("INFO", "CORREO_BIENVENIDA", `Correo de bienvenida enviado post-pago`, {
      idRegistro: idRegistro,
      email: email,
      nombreCompleto: nombreCompleto,
      fechaVigencia: fechaVigenciaStr,
      fechaCarencia: fechaCarenciaStr
    }, FUNCION_NOMBRE);

    return true;

  } catch (error) {
    Logger.log(`${FUNCION_NOMBRE}: ERROR - ${error.message}`);
    registrarLog("ERROR", "CORREO_BIENVENIDA", `Error al enviar correo de bienvenida: ${error.message}`, {
      idRegistro: idRegistro,
      stack: error.stack
    }, FUNCION_NOMBRE);
    return false;
  }
}

// function probarCorreo() {
//  enviarCorreoBienvenidaPostPago("REG-mcmbaf2d-VE5");
//}
