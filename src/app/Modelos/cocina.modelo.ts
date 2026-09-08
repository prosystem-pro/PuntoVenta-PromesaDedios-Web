// Pedidos de cocina pendientes (GET /venta/cocinalistado).
// El API solo devuelve los CocinaPedido con Estatus 1 (pendientes) y dentro de cada uno
// los productos cuyo TipoProducto es de cocina.

export interface CocinaProducto {
    CodigoProducto: number;
    NombreProducto: string;
    Cantidad: number;
    Observaciones: string | null;
}

export interface CocinaPedido {
    CodigoCocinaPedido: number;
    CodigoVenta: number;
    NumeroVenta: string;       // Nro. de venta (p.ej. "PPD001-VNT050"); se muestra cuando es SIN MESA
    CodigoMesa: number | null;
    NombreMesa: string;        // "SIN MESA" cuando no proviene de una mesa
    FechaInicio: string;       // ISO; se usa para el cronómetro
    Productos: CocinaProducto[];
}
