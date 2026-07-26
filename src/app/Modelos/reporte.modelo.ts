// Modelos del módulo de Reportes (consolidado por mes).
// Un único endpoint devuelve todo según el Tipo (VENTA | PEDIDO | COMPRA).

export type TipoReporte = 'VENTA' | 'PEDIDO' | 'COMPRA';

export interface MetodosPagoReporte {
    EFECTIVO: number;
    TARJETA: number;
    TRANSFERENCIA: number;
    CHEQUE: number;
    TOTAL_GENERAL: number;
}

export interface RankingTransaccion {
    No: number;
    Metodo: string;
    Transacciones: number;
    TicketPromedio: number;
}

// El ranking trae Cliente (VENTA/PEDIDO) o Proveedor (COMPRA), nunca ambos.
export interface RankingEntidad {
    No: number;
    Cliente?: string;
    Proveedor?: string;
    Monto: number;
}

export interface PuntoMensual {
    Dia: string;         // '01'..'31'
    Transaccion: number;
}

export interface PuntoAnual {
    Mes: string;         // '01'..'12'
    Transacciones: number;
}

// Respuesta cruda del API. Los bloques mensual/anual cambian de nombre según el Tipo.
export interface ConsolidadoReporte {
    TipoConsulta: string;
    Periodo: string;     // 'YYYY-MM'
    MetodosPago: MetodosPagoReporte;
    RankingTransacciones: RankingTransaccion[];
    RankingClientes: RankingEntidad[];
    VentasMensuales?: PuntoMensual[];
    VentasAnuales?: PuntoAnual[];
    PedidosMensuales?: PuntoMensual[];
    PedidosAnuales?: PuntoAnual[];
    ComprasMensuales?: PuntoMensual[];
    ComprasAnuales?: PuntoAnual[];
}
