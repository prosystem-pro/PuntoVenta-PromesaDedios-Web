// Reclasificación de turno (paso final del cierre): corregir el método de pago
// con que quedó registrado el movimiento, por si hubo un cruce. Ver API Roberto
// (GET caja/reclasificacion/:CodigoAperturaCaja, POST caja/guardar-reclasificacion).

export interface MontosPorMetodo {
    Efectivo: string;
    Tarjeta: string;
    Transferencia: string;
    Cheque: string;
    TotalGeneral?: string;
}

// Respuesta del GET. Sistema = neto por método del turno (lo que el sistema tiene;
// Efectivo incluye la apertura). Declarado viene pre-cargado igual a Sistema.
export interface DatosReclasificacion {
    CodigoAperturaCaja: number;
    CodigoCaja: number;
    EtapaCierre?: number;
    Sistema: MontosPorMetodo;
    Declarado: MontosPorMetodo;
}

// Body del POST. CodigoUsuario lo pone el token, NO va acá.
export interface GuardarReclasificacionPayload {
    CodigoAperturaCaja: number;
    TotalEfectivoDeclarado: number;
    TotalTarjetaDeclarado: number;
    TotalTransferenciaDeclarado: number;
    TotalChequeDeclarado: number;
    Observaciones?: string;
}
