export interface Mesa {
    CodigoMesa: number;
    CodigoClasificacionMesa: number;
    NombreMesa: string;
    Descripcion: string;
    ImagenUrl: string;
    Estatus: number;
    // Campos adicionales para la vista
    NombreClasificacion?: string;
    CantidadMesas?: number; // Para el modal de creación masiva

    // Campos operativos
    TotalVenta?: number;
    TiempoOcupada?: string;
    NombreCliente?: string;
    Ocupada?: boolean;
    CodigoCliente?: number;
    Nota?: string;
}
