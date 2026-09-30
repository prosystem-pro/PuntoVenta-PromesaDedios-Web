// Fila del listado de Historial de Ventas (GET historialventa/listado-ventas-contado).
export interface VentaHistorial {
    // El API ya envía CodigoVenta (necesario para la lupa y el anular).
    CodigoVenta?: number | null;
    Documento: string;
    Nombre: string | null;
    Monto: number;
    Estatus: string;        // ANULADO | PENDIENTE | CANCELADO | FACTURADO | CERRADO
    FechaVenta: string | null;
    // El API ya envía el motivo en ventas anuladas (TC-763): activa el ícono "ver motivo".
    MotivoAnulacion?: string | null;
    // TC-763 (ampliado por QA): quién anuló y cuándo. PENDIENTE de API — el modelo Venta
    // solo tiene MotivoAnulacion; cuando Roberto agregue FechaAnulacion + UsuarioAnulacion
    // (nombre) al listado, el popup de motivo los muestra solo (degradación grácil).
    FechaAnulacion?: string | null;
    UsuarioAnulacion?: string | null;
}
