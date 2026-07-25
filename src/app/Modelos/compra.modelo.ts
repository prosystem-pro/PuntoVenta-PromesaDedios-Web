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
    CodigoPagoProveedor: number;
    FechaPago: string;
    MetodoPago: string;
    Monto: number;
    Estatus: string; // 'ACTIVO' | 'ANULADO'
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

// Comprobante/factura completa de una compra (GET compra/factura/:CodigoCompra).
export interface FacturaCompra {
    Empresa: {
        Nombre?: string | null;
        Nit?: string | null;
        Direccion?: string | null;
        Telefono?: string | null;
    };
    DatosComprobante: {
        Fecha?: string | null;
        Documento?: string | number | null;
        Responsable?: string | null;
        Proveedor?: string | null;
        Direccion?: string | null;
        Nit?: string | null;
        Celular?: string | null;
        FechaVencimiento?: string | null;   // solo compras a crédito
    };
    Productos: {
        Cantidad: number;
        Unidad?: string | number | null;
        Producto?: string | null;
        PrecioUnitario: number;
        Subtotal: number;
    }[];
    Totales: {
        Total: number;
        SaldoPendiente: number;
    };
    FormaPago: {
        NumeroPago?: string | number | null;
        MetodoPago?: string | null;
        MontoPagado: number;
        Referencia?: string | null;
    }[];
}
