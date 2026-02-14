export interface UnidadMedida {
    CodigoUnidadMedida?: number;
    NombreUnidad: string;
    Abreviatura: string;
    Estatus: number;
}

export interface CategoriaProducto {
    CodigoCategoriaProducto?: number;
    NombreCategoriaProducto: string;
    Estatus: number;
}

export interface Ingrediente {
    CodigoProducto: number;
    CodigoUnidadMedida: number;
    Cantidad: number;
    // Campos extra para UI
    NombreProducto?: string;
    NombreUnidad?: string;
}

export interface Producto {
    CodigoProducto?: number;
    CodigoCategoriaProducto: number;
    CodigoUnidadMedida: number;
    NombreProducto: string;
    TipoProducto: string; // 'VENTANILLA' | 'INSUMO' | 'AMBOS'
    CodigoBarra?: string;
    Iva: number; // Porcentaje decimal (e.g., 12.50)
    PrecioVenta: number;
    TieneReceta: boolean;
    Estatus: number;
    ImagenUrl?: string;

    // Campos de stock incluidos en el payload de creación/edición
    Stock?: number;
    StockMinimo?: number;
    StockSugerido?: number;
    PrecioCompra?: number;

    // Detalle de receta
    Ingredientes?: Ingrediente[];

    // Campos adicionales para visualización en tablas
    NombreCategoria?: string;
    NombreUnidad?: string;
}

export interface Inventario {
    CodigoInventario?: number;
    CodigoProducto: number;
    StockActual: number;
    StockMinimo: number;
    StockSugerido: number;
    PrecioCompra: number;
}

export interface RespuestaAPI<T> {
    success: boolean;
    tipo: 'Éxito' | 'Error' | 'Alerta';
    message: string;
    data?: T | any; // Permissive for backward compatibility with Listado wrapper
    error?: {
        message: string;
    };
}
