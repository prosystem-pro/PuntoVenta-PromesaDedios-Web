// Listado de Estado de Pedidos (GET /estadopedido/listado)
// El API devuelve el estado de la venta y de producción como texto.
export interface EstadoPedido {
    Pedido: string;                 // NumeroVenta del pedido (ej. "P-1781137594596")
    Nombre: string | null;          // Nombre del cliente
    Estado: string | null;          // Estado de la VENTA: PENDIENTE | EN_PROCESO | FINALIZADO
    Produccion: string | null;      // Estado de PRODUCCIÓN: PENDIENTE | EN_PROCESO | PENDIENTE_AUTORIZACION | FINALIZADO
    FechaEntrega: string | null;    // Fecha de entrega del pedido
}
