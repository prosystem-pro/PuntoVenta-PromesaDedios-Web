import { RespuestaAPI } from "./producto.modelo";

export interface PagoVenta {
    MetodoPago: number | string;
    MontoRecibido: number;
    Monto: number;
    Cambio: number;
    Referencia: string | null;
}

export interface GuardarProductosMesaRequest {
    CodigoMesa: number;
    TipoAtencion: 'MESA' | 'VENTANILLA' | 'DOMICILIO';
    Productos: {
        CodigoProducto: number;
        Cantidad: number;
        PrecioUnitario: number;
        Nota?: string;
    }[];
}

export interface FacturarMesaRequest {
    CodigoMesa: number;
    Propina: number;
    Pagos: PagoVenta[];
}
