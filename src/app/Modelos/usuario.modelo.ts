export interface Usuario {
  CodigoUsuario: number;
  CodigoRol: number;
  NombreUsuario: string;
  NombreCompleto: string;
  Telefono: string;
  Direccion: string;
  Estatus: number;
  Correo: string;
  Clave?: string; // Para creacion y edicion
  NombreRol?: string;
}

export interface RespuestaUsuario {
  success: boolean;
  message: string;
  data: Usuario | Usuario[];
}