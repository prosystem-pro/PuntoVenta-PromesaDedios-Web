export interface RespuestaLogin {
  success: boolean; // Debe coincidir con el API
  tipo: string;
  message: string; // Debe coincidir con el API
  data: {
    Token: string;
    usuario: UsuarioSesion;
  };
}

export interface UsuarioSesion {
  CodigoUsuario: number;
  NombreUsuario: string;
  CodigoRol: number | null;
  NombreRol: string | null;
  SuperAdmin: number;
  AccesoCompleto: boolean;
  Permisos: any[];
}
