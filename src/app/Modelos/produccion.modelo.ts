import { RespuestaAPI } from './producto.modelo';

export interface PedidoProduccion {
    CodigoPedidoProduccion: number;
    CodigoVenta?: number;
    NumeroVenta?: string; // Nuevo
    Nombre?: string;      // Nuevo (Cliente)
    Origen?: string;
    FechaEntrega: string;
    Observaciones?: string;
    Estado?: string; // Nuevo (API retorna texto como PENDIENTE, EN_PROCESO, etc)
    Estatus: number; // 1: Pendiente, 2: Iniciado, 3: Finalizado
}

export interface PedidoProduccionDetalle {
    CodigoPedidoProduccionDetalle: number;
    CodigoPedidoProduccion: number;
    CodigoProducto: number;
    NombreCategoriaProducto?: string;
    Producto?: string;
    NombreProducto?: string;
    CodigoUnidadMedida: number;
    NombreUnidad?: string;
    CantidadSolicitada: number;
    StockActual: number;
    StockSugerido: number;
    ObservacionesDetalle?: string;
}

export interface Produccion {
    CodigoProduccion: number;
    CodigoPedidoProduccion?: number;
    CodigoUsuario: number;
    FechaProduccion: string;
    Estatus: number;
    Observaciones?: string;
}

export interface ProduccionDetalle {
    CodigoProduccionDetalle: number;
    CodigoProduccion: number;
    CodigoProducto: number;
    Cantidad: number;
}

export interface DetalleAbastecimiento {
    CodigoProducto: number;
    CantidadProducida: number;
}
