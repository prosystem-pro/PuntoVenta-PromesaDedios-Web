// Listado de Estado de Pedidos (GET /estadopedido/listado)
// El API devuelve el estado de la venta y de producción como texto.
export interface EstadoPedido {
    CodigoPedidoProduccion: number | null; // Necesario para el detalle/abono del pedido
    Pedido: string;                 // NumeroVenta del pedido (ej. "P-1781137594596")
    Nombre: string | null;          // Nombre del cliente
    Estado: string | null;          // Estado de la VENTA: PENDIENTE | EN_PROCESO | FINALIZADO
    Produccion: string | null;      // Estado de PRODUCCIÓN: PENDIENTE | EN_PROCESO | PENDIENTE_AUTORIZACION | FINALIZADO
    FechaEntrega: string | null;    // Fecha de entrega del pedido
}

// Detalle de un pedido para el modal de abono (GET /estadopedido/detallepedido/:CodigoPedidoProduccion)
export interface DetallePedido {
    FechaCreacion: string | null;
    NumeroPedido: string | null;
    CodigoVenta: number | null;
    NombreCliente: string | null;
    Telefono: string | null;
    SaldoPendiente: number;
}

// Un abono ya registrado (GET /estadopedido/listar-pagos-por-ventas/:CodigoVenta)
export interface PagoPedido {
    NumeroPago: string;
    FechaPago: string;
    MetodoPago: string;             // EFECTIVO | TARJETA | TRANSFERENCIA | CHEQUE
    Monto: number;
}

// Registrar abono (POST /estadopedido/registrar-abono)
export interface AbonoRequest {
    CodigoVenta: number;
    Monto: number;
    MetodoPago: number;             // 1=Efectivo, 2=Tarjeta, 3=Transferencia, 4=Cheque
    Referencia?: string | null;
}

export interface AbonoResponse {
    NumeroPago: string;
    MetodoPago: string;
    MontoAbonado: number;
    SaldoRestante: number;
    EstadoVenta: string;
    Cambio: number;
    Referencia: string | null;
}
