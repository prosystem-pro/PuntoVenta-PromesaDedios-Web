export interface Proveedor {
  CodigoProveedor: number;
  NombreProveedor: string;
  Telefono: string;
  NIT: string;
  Direccion: string;
  Correo: string;
  Estatus: number;
}

export interface RespuestaProveedor {
  success: boolean;
  message: string;
  data: Proveedor | Proveedor[];
}
