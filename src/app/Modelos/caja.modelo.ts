// Modelos del módulo de Caja (apertura / estado).

export interface DenominacionCaja {
    CodigoDenominacion: number;
    Valor: number;
}

export interface DatosInicialesCaja {
    CodigoUsuario: number;
    NombreUsuario: string;
    Caja: {
        CodigoCaja: number;
        NumeroCaja: number | string | null;
        Descripcion: string | null;
    };
    Turno: string;
    Denominaciones: DenominacionCaja[];
}

export interface CajaAbierta {
    CodigoAperturaCaja: number;
    CodigoCaja: number | null;
    NumeroCaja: number | string | null;
    DescripcionCaja: string | null;
    FechaApertura: string;
}

export interface EstadoCaja {
    CodigoUsuario: number;
    NombreUsuario: string;
    CajaAbierta: CajaAbierta | null;
}

// Una línea del desglose que se envía al abrir la caja.
export interface DesgloseEfectivoItem {
    CodigoDenominacion: number;
    Cantidad: number;
}

export interface AperturaCajaPayload {
    CodigoCaja: number;
    MontoInicial: number;
    DesgloseEfectivo: DesgloseEfectivoItem[];
}

// Fila de la tabla "Movimientos de caja" (pendiente de endpoint en el API).
export interface MovimientoCaja {
    Documento: string;
    TipoOperacion: string;
    MetodoPago: number;      // 1 Efectivo, 2 Tarjeta, 3 Transferencia, 4 Cheque
    Nombre: string;
    Monto: number;
    Anulado?: boolean;
}

export interface AperturaCajaResultado {
    CodigoAperturaCaja: number;
    CodigoUsuario: number;
    NombreUsuario: string;
    CodigoCaja: number;
    NumeroCaja: number | string;
    FechaHoraApertura: string;
    MontoInicial: number;
    TotalCalculadoDesglose: number;
    Estatus: string;
}
