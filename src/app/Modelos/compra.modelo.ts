export interface Compra {
    CodigoCompra: number;
    NombreProveedor: string;
    FechaCompra: string;
    Pagos: number;
    Pendiente: number;
    Vencimiento: string;
    Estatus: string; // 'Pagado' | 'Pendiente'
}

export interface DetalleCompra {
    No: string;
    Categoria: string;
    Producto: string;
    Presentacion: string;
    Precio: number;
    Cantidad: number;
}

export interface PagoRealizado {
    FechaPago: string;
    MedioPago: string;
    ValorPagado: number;
}

export interface CompraDetalleCompleto {
    Fecha: string;
    NoDocumento: string;
    Proveedor: string;
    Telefono: string;
    SaldoPendiente: number;
    Pagos: PagoRealizado[];
}
