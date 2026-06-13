export interface MesaClienteInfo {
    CodigoCliente: number;
    NombreCliente: string;
}

export interface MesaVentaInfo {
    CodigoVenta: number;
    Total: number;
    SaldoPendiente: number;
    Cliente: MesaClienteInfo | null;
}

export interface Mesa {
    CodigoMesa: number;
    NombreMesa: string;
    ImagenUrl: string;
    // 1 = libre, 2 = ocupada (venta propia), 3 = ocupada secundaria (mesa combinada)
    Estatus: number;
    NombreClasificacion?: string;
    // Solo viene cuando la mesa esta ocupada (Estatus 2)
    Venta?: MesaVentaInfo | null;

    // Campos usados en creacion/edicion masiva (modulo configuracion)
    CodigoClasificacionMesa?: number;
    Descripcion?: string;
    CantidadMesas?: number;
    Nota?: string;
}
