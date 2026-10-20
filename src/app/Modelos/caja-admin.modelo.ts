// Administración de cajas (pedido de Walter): crear cajas y asignar los usuarios
// autorizados a operar en cada una. Ver ANALISIS-API-Caja-Turnos.md (§3.3).

export interface CajaAdmin {
    CodigoCaja: number;
    NumeroCaja?: number;         // número correlativo de la caja (API: NumeroCaja)
    Nombre: string;              // nombre/descripción de la caja (API: Descripcion)
    NoUsuarios: number;          // cantidad de usuarios asignados (API: CantidadUsuarios)
    Estatus: number;             // 1 = Activo, 0 = Desactivado (inactivar, no borrar)
    Usuarios?: number[];         // CodigoUsuario asignados (API: CodigosUsuarios; se usa al editar)
    TieneTurnoAbierto?: boolean; // el API lo informa; bloquea inactivar si hay turno abierto
}

// Usuario mostrado en la lista de checkboxes del modal "Nueva/Editar caja".
export interface UsuarioAsignable {
    CodigoUsuario: number;
    Nombre: string;
}

// Payload para crear/editar una caja con sus usuarios asignados.
// NumeroCaja lo autogenera el API, no se envía desde el front.
export interface GuardarCajaPayload {
    Nombre: string;        // -> Descripcion
    Usuarios: number[];    // -> CodigosUsuarios
    Estatus?: number;      // al editar
}
