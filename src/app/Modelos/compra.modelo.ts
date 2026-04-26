import { RespuestaAPI } from './producto.modelo';

export interface Compra {
    No: number;
    CodigoCompra: number;
    Nombre: string;
    Pagos: number;
    Pendiente: number;
    Vencimiento: string;
    Estatus: string;
}

export interface PagoRealizado {
    FechaPago: string;
    MetodoPago: string;
    Monto: number;
}

export interface CompraDetalleCompleto {
    CodigoCompra: number;
    NumeroCompra: number;
    FechaVencimiento: string;
    SaldoPendiente: number;
    Proveedor: {
        NombreProveedor: string;
        Telefono: string;
    };
    Pagos: PagoRealizado[];
}
