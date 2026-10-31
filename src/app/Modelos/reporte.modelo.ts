// Modelos del módulo de Reportes (consolidado por mes).
// Un único endpoint devuelve todo según el Tipo (VENTA | PEDIDO | COMPRA).

export type TipoReporte = 'VENTA' | 'PEDIDO' | 'COMPRA';

// Selección de la pastilla superior de /reportes: el día (resumen) o el mensual por tipo.
export type VistaReporte = 'DIA' | TipoReporte;

// Consolidado del día (GET /reporte/consolidado-dia). Sin filtros: usa el día de hoy.
export interface ConsolidadoDia {
    FechaConsulta: string;   // 'YYYY-MM-DD'
    Zona: string;
    TotalVentas: number;
    TotalPedidos: number;
    TotalAbonosClientes: number;
    TotalCompras: number;
    TotalPagoProveedores: number;
    TotalPropinas: number;
    CantidadTransacciones: number;
}

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
// Turno del día para el selector de "Movimientos del día" (GET reporte/listar-turnos).
export interface TurnoReporte {
    CodigoAperturaCaja: number;
    Responsable: string;
    FechaApertura: string;
    FechaCierre: string;   // 'En curso' si sigue abierto
}

export interface ConsolidadoReporte {
    TipoConsulta: string;
    Periodo: string;     // 'YYYY-MM'
    FiltroTurno?: number | null;   // CodigoAperturaCaja aplicado (null = todos)
    ListaTurnos?: number[];        // CodigoAperturaCaja de los turnos del período (para el selector)
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
