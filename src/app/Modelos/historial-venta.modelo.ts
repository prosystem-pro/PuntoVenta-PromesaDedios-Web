// Fila del listado de Historial de Ventas (GET historialventa/listado-ventas-contado).
export interface VentaHistorial {
    // PENDIENTE de API: el listado aún no devuelve CodigoVenta, pero la factura
    // (factura/:CodigoVenta) y el anular (anular-ventapedido-completa) lo necesitan.
    CodigoVenta?: number | null;
    Documento: string;
    Nombre: string | null;
    Monto: number;
    Estatus: string;        // ANULADO | PENDIENTE | CANCELADO | FACTURADO | CERRADO
    FechaVenta: string | null;
}
