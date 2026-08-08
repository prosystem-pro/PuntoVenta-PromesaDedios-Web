export interface Rol {
    CodigoRol: number;
    NombreRol: string;
    CantidadUsuarios: number;
    CantidadPermisos: number;
    Estatus: number;
}

// Detalle que devuelve administrativo/rol-completo/:Codigo (para precargar los módulos al editar)
export interface RolDetalleCompleto {
    CodigoRol: number;
    NombreRol: string;
    Estatus: number;
    TotalRecursos: number;
    Recursos: string[];
}
