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

// Fila de la tabla "Movimientos de caja" (tal como la devuelve el API en la caja abierta).
export interface MovimientoCaja {
    CodigoMovimiento: number;
    FechaPago: string;
    ConceptoOriginal: string;
    TipoMovimiento: string;      // INGRESO | EGRESO
    TipoOperacion: string;       // VENTA | ABONO_PEDIDO | COMPRA_CONTADO | ...
    Documento: string | null;
    MetodoPago: string;          // EFECTIVO | TARJETA | TRANSFERENCIA | CHEQUE (ya en texto)
    Entidad: string | null;      // cliente / proveedor
    NombreUsuario: string | null;
    MontoTotal: number;
    Estatus: string;             // ACTIVO | ANULADO
    MotivoAnulacion: string | null;
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

// --- Resumen de la caja abierta (obtener-datos-iniciales con tieneCajaAbierta:true) ---
export interface ResumenIngresosCaja {
    MontoApertura: string;
    Ventas: string;
    Propinas: string;
    Abonos_Pedidos: string;
    Compras_Anuladas: string;
    Abonos_Proveedores_Anulados: string;
    Total: string;
}

export interface ResumenEgresosCaja {
    Compras: string;
    Pago_Proveedores: string;
    Ventas_Anuladas: string;
    Abonos_Anulados: string;
    Total: string;
}

export interface ResumenFormasPagoCaja {
    Efectivo: string;
    Tarjeta: string;
    Transferencia: string;
    Cheque: string;
    TotalGeneral: string;
}

// Respuesta unificada de obtener-datos-iniciales. tieneCajaAbierta discrimina el estado:
// false -> hay Caja + Turno + Denominaciones (para el formulario de apertura);
// true  -> hay Apertura + resúmenes + movimientos (para la vista de caja abierta).
export interface DatosCaja {
    tieneCajaAbierta: boolean;
    CodigoUsuario: number;
    NombreUsuario: string;
    Caja: {
        CodigoCaja: number;
        NumeroCaja: number | string | null;
        Descripcion: string | null;
    };
    // Estado cerrado
    Turno?: string;
    Denominaciones?: DenominacionCaja[];
    // Estado abierto
    Apertura?: {
        CodigoAperturaCaja: number;
        FechaApertura: string;
        MontoInicial: number;
    };
    TotalPropinas?: string;
    ResumenTipoMovimiento?: {
        Ingresos: ResumenIngresosCaja;
        Egresos: ResumenEgresosCaja;
        TotalGeneral: string;
    };
    ResumenFormasPago?: ResumenFormasPagoCaja;
    ResumenMovimientos?: {
        TotalRegistros: number;
        Lista: MovimientoCaja[];
    };
}

// --- Cierre de caja ---
export interface CierreCajaPayload {
    CodigoAperturaCaja: number;
    MontoFinalDeclarado: number;
    DesgloseEfectivoFinal: DesgloseEfectivoItem[];
}

export interface CierreCajaResultado {
    CodigoAperturaCaja: number;
    CodigoUsuario: number;
    NombreUsuario: string;
    CodigoCaja: number;
    FechaHoraApertura: string;
    FechaHoraCierre: string;
    MontoInicial: number;
    MontoFinalDeclarado: number;
    TotalCalculadoDesgloseFinal: number;
    Diferencia: number;
    Estatus: string;
}
