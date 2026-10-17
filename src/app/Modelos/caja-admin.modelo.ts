// Administración de cajas (pedido de Walter): crear cajas y asignar los usuarios
// autorizados a operar en cada una. Ver ANALISIS-API-Caja-Turnos.md (§3.3).

export interface CajaAdmin {
    CodigoCaja: number;
    Nombre: string;        // nombre/descripción de la caja (ej. "Caja principal")
    NoUsuarios: number;    // cantidad de usuarios asignados
    Estatus: number;       // 1 = Activo, 0 = Desactivado (inactivar, no borrar)
    Usuarios?: number[];   // CodigoUsuario asignados (se usa al editar)
}

// Usuario mostrado en la lista de checkboxes del modal "Nueva/Editar caja".
export interface UsuarioAsignable {
    CodigoUsuario: number;
    Nombre: string;
}

// Payload para crear/editar una caja con sus usuarios asignados.
export interface GuardarCajaPayload {
    Nombre: string;
    Usuarios: number[];    // CodigoUsuario seleccionados
    Estatus?: number;      // al editar
}
