export interface Usuario {
  CodigoUsuario: number;
  CodigoRol: number;
  NombreUsuario: string;
  NombreCompleto: string;
  Telefono: string;
  Direccion: string;
  Estatus: number;
  // Campos opcionales del diagrama ER
  Correo?: string;
  ClaveHash?: string;
  ClaveSalt?: string;
  SuperAdmin?: number;
}