/**
 * Utilidad compartida para procesar y mapear errores del API a mensajes amigables para el usuario.
 */
export function manejarErrorApi(error: any): string {
    let mensaje = 'Ocurrió un error inesperado al procesar la solicitud.';

    // Extraer datos de la respuesta (Axios o respuesta directa)
    const responseData = error.response?.data || error;

    if (responseData && typeof responseData === 'object') {
        const apiError = responseData.error || responseData;

        // Mapeo selectivo de errores técnicos a mensajes legibles
        if (apiError.type === 'SequelizeForeignKeyConstraintError') {
            mensaje = 'No se puede eliminar este registro porque tiene información relacionada en otros módulos';
        } else if (apiError.type === 'SequelizeUniqueConstraintError') {
            mensaje = 'Ya existe un registro con estos datos únicos (nombre duplicado, NIT, etc.).';
        } else {
            // Intentar usar el mensaje devuelto por el API
            mensaje = responseData.message || apiError.message || mensaje;
        }
    } else if (typeof error === 'string') {
        mensaje = error;
    }

    return mensaje;
}
