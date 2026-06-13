export interface MesaClienteInfo {
    CodigoCliente: number;
    NombreCliente: string;
}

export interface MesaVentaInfo {
    CodigoVenta: number;
    Total: number;
    SaldoPendiente: number;
    Cliente: MesaClienteInfo | null;
    // Fecha de apertura del pedido (para el cronometro de la tarjeta)
    FechaApertura?: string | null;
}

export interface Mesa {
    CodigoMesa: number;
    NombreMesa: string;
    ImagenUrl: string;
    // 1 = libre, 2 = ocupada. Las mesas combinadas tambien quedan en 2 (comparten la
    // misma venta que la mesa origen). El 3 = cerrado lo usa la venta/pedido al facturar,
    // pero la mesa nunca aparece en 3 en el listado (al facturar se libera a 1).
    Estatus: number;
    NombreClasificacion?: string;
    // Solo viene cuando la mesa esta ocupada (Estatus 2)
    Venta?: MesaVentaInfo | null;

    // Campos usados en creacion/edicion masiva (modulo configuracion)
    CodigoClasificacionMesa?: number;
    Descripcion?: string;
    CantidadMesas?: number;
    Nota?: string;
}
