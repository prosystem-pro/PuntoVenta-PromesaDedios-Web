/**
 * Utilidad compartida para procesar y mapear errores del API a mensajes amigables para el usuario.
 */
export function manejarErrorApi(error: any): string {
    let mensaje = 'Ocurrió un error inesperado al procesar la solicitud.';

    // Extraer datos de la respuesta (Axios o respuesta directa)
    const responseData = error.response?.data || error;

    if (responseData && typeof responseData === 'object') {
        const apiError = responseData.error || responseData;

        const textoError = `${apiError.message || ''} ${responseData.message || ''}`;
        const esDuplicado = apiError.type === 'SequelizeUniqueConstraintError' || /validation error/i.test(textoError);
        const mencionaCodigoBarra = /codigo\s*barra|c[oó]digo\s*de\s*barra|codigobarra|barcode/i.test(textoError);

        // Mapeo selectivo de errores técnicos a mensajes legibles
        if (apiError.type === 'SequelizeForeignKeyConstraintError') {
            mensaje = 'No se puede eliminar este registro porque tiene información relacionada en otros módulos';
        } else if (esDuplicado && mencionaCodigoBarra) {
            mensaje = 'Ya existe un producto registrado con este código de barras.';
        } else if (esDuplicado) {
            mensaje = 'Ya existe un registro con estos datos únicos (nombre duplicado, NIT, etc.).';
        } else {
            // Priorizar el mensaje detallado del error interno sobre el mensaje general del API
            mensaje = apiError.message || responseData.message || mensaje;
        }
    } else if (typeof error === 'string') {
        mensaje = error;
    }

    return mensaje;
}
