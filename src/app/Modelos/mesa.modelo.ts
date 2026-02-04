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
}
