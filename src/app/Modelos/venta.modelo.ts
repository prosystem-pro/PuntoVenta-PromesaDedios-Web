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
    CodigoCliente?: number | null;
    TipoAtencion: 'MESA' | 'VENTANILLA' | 'DOMICILIO';
    Productos: {
        CodigoProducto: number;
        Cantidad: number;
        PrecioUnitario: number;
        Observaciones?: string | null;
    }[];
}

export interface FacturarMesaRequest {
    CodigoMesa: number;
    Propina: number;
    Pagos: PagoVenta[];
}

export interface ProductoVentaRequest {
    CodigoProducto: number;
    Cantidad: number;
    PrecioUnitario: number;
    Observaciones?: string | null;
}

export interface FacturarVentanillaRequest {
    CodigoCliente: number | null;
    Productos: ProductoVentaRequest[];
    Pagos: PagoVenta[];
    Propina?: number;
}

export interface CrearVentaPedidoRequest {
    CodigoCliente: number | null;
    FechaEntrega: string;
    Observaciones?: string | null;
    Productos: ProductoVentaRequest[];
    Pagos?: PagoVenta[];
    Propina?: number;
}

// Respuesta de facturación (ventanilla) usada para armar el comprobante
export interface ComprobanteVenta {
    Empresa: {
        Nombre?: string | null;
        Nit?: string | null;
        Direccion?: string | null;
        Telefono?: string | null;
    };
    DatosComprobante: {
        FechaFacturacion?: string | null;
        FechaEntrega?: string | null;
        Documento?: string | null;
        Responsable?: string | null;
        Cliente?: string | null;
        Direccion?: string | null;
        Nit?: string | null;
        Celular?: string | null;
    };
    Productos: { Cantidad: number; Producto?: string | null; Total: number }[];
    Totales: { Subtotal: number; Iva: number; Propina: number; Total: number; TotalCobrado: number; Abonado?: number; SaldoPendiente?: number };
    FormaPago: { MetodoPago: string; MontoCobrado: number; MontoRecibido: number; Cambio: number; Referencia?: string | null }[];
}
