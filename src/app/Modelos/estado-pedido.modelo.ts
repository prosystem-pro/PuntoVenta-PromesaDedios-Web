// Listado de Estado de Pedidos (GET /estadopedido/listado)
// El API mezcla dos tipos de fila (Tipo): pedidos con venta y pedidos solo de producción.
export interface EstadoPedido {
    CodigoVenta: number | null;      // Solo en filas CON_VENTA; necesario para anular la venta
    CodigoPedidoProduccion: number | null; // Necesario para detalle/abono/eliminar del pedido
    NumeroDocumento: string;         // NumeroVenta o NumeroPedido (según el tipo)
    Nombre: string | null;           // Nombre del cliente (o 'GERENCIA' en solo producción)
    Estado: string | null;           // Estado de la VENTA: ANULADO | PENDIENTE | PAGADO | ... ('NO APLICA' en solo producción)
    Produccion: string | null;       // Estado de PRODUCCIÓN: PENDIENTE | EN_PROCESO | PENDIENTE_AUTORIZACION | FINALIZADO
    FechaEntrega: string | null;     // Fecha de entrega del pedido
    FechaCreacion: string | null;    // Fecha de creación del pedido
    Tipo: 'CON_VENTA' | 'SOLO_PRODUCCION'; // Decide qué acción aplica (anular vs eliminar)
}

// Detalle de productos de un pedido de producción (GET /estadopedido/detalle-productos/:CodigoPedidoProduccion)
export interface DetalleProductoPedido {
    CodigoDetalle: number;
    CodigoPedidoProduccion: number;
    CodigoProducto: number;
    NombreProducto: string;
    CodigoUnidadMedida: number;
    NombreUnidadMedida: string;
    AbreviaturaUnidad: string | null;
    CantidadSolicitada: number;
    StockActual: number;
    StockSugerido: number;
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
    CodigoPagoVenta: number;        // Necesario para anular / imprimir el comprobante del pago
    NumeroPago: string;
    FechaPago: string;
    MetodoPago: string;             // EFECTIVO | TARJETA | TRANSFERENCIA | CHEQUE
    Monto: number;
    Estatus: string;                // 'ACTIVO' | 'ANULADO'
}

// Fila del listado "Pagos de clientes" (GET /estadopedido/listado-estado-pago-cliente)
export interface EstadoPagoCliente {
    CodigoPedidoProduccion: number | null;
    Pedido: string;
    Nombre: string | null;
    Pagos: string;                  // cantidad de abonos (texto)
    Pendiente: string;              // saldo formateado por el API: "Q3000.00"
    Vencimiento: string | null;     // "dd/MM/yyyy HH:mm"
    FechaCreacion: string | null;
    Estado: string | null;          // PENDIENTE | CANCELADO | FACTURADO | CERRADO
}

// Comprobante de un abono/pago (GET /estadopedido/impresion-pago/:CodigoPagoVenta)
export interface ComprobantePago {
    Empresa: {
        Nombre?: string | null;
        Nit?: string | null;
        Direccion?: string | null;
        Telefono?: string | null;
    };
    DatosComprobante: {
        FechaPago?: string | null;
        DocumentoPago?: string | null;
        DocumentoVenta?: string | null;
        Cliente?: string | null;
        Direccion?: string | null;
        Nit?: string | null;
        Celular?: string | null;
    };
    DetalleMovimiento: {
        SaldoAnterior?: number | null;
        MontoAbonado?: number | null;
        SaldoPendiente?: number | null;
    };
    FormaPago: {
        MetodoPago?: string | null;
        Monto?: number | null;
        MontoRecibido?: number | null;
        Cambio?: number | null;
        Referencia?: string | null;
    };
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
