import { Injectable } from '@angular/core';
// import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { CajaAdmin, UsuarioAsignable, GuardarCajaPayload } from '../Modelos/caja-admin.modelo';

/**
 * Administración de cajas (pedido de Walter) — crear cajas y asignar usuarios.
 *
 * ⚠️ MOCK: el API todavía NO expone estos endpoints (Roberto los tiene en análisis;
 * ver ANALISIS-API-Caja-Turnos.md §3.3). Cuando estén, se reemplaza el cuerpo de cada
 * método por la llamada axios comentada. Las firmas ya quedan como se van a consumir.
 *
 * Contrato esperado (paths finales los define Roberto):
 *  - Listar:      GET  caja/admin/listar                 -> RespuestaAPI<CajaAdmin[]>
 *  - Usuarios:    GET  caja/admin/usuarios-asignables    -> RespuestaAPI<UsuarioAsignable[]>
 *  - Detalle:     GET  caja/admin/:CodigoCaja            -> RespuestaAPI<CajaAdmin> (con Usuarios[])
 *  - Crear:       POST caja/admin                        body GuardarCajaPayload
 *  - Editar:      PUT  caja/admin/:CodigoCaja            body GuardarCajaPayload
 *  - Inactivar:   PUT  caja/admin/inactivar/:CodigoCaja  (Estatus -> 0; no se borra)
 */
@Injectable({ providedIn: 'root' })
export class CajaAdminServicio {

    // En memoria solo para la maqueta (simula persistencia mientras no hay API).
    private mock: CajaAdmin[] = [
        { CodigoCaja: 1, Nombre: 'Caja principal', NoUsuarios: 5, Estatus: 0, Usuarios: [1, 2, 3, 4, 5], TieneTurnoAbierto: false },
        { CodigoCaja: 2, Nombre: 'Caja secundaria', NoUsuarios: 2, Estatus: 1, Usuarios: [6, 7], TieneTurnoAbierto: true },
    ];
    private secuencia = 3;

    // GET caja/admin/listar
    async listar(): Promise<RespuestaAPI<CajaAdmin[]>> {
        // const res = await axiosInstance.get('caja/admin/listar'); return res.data;
        await this.latencia();
        const data = this.mock.map(c => ({ ...c, NoUsuarios: c.Usuarios?.length ?? c.NoUsuarios }));
        return { success: true, tipo: 'Éxito', message: 'Cajas obtenidas (MOCK).', data };
    }

    // GET caja/admin/usuarios-asignables
    async obtenerUsuariosAsignables(): Promise<RespuestaAPI<UsuarioAsignable[]>> {
        // const res = await axiosInstance.get('caja/admin/usuarios-asignables'); return res.data;
        await this.latencia();
        return { success: true, tipo: 'Éxito', message: 'Usuarios (MOCK).', data: this.usuariosMock() };
    }

    // GET caja/admin/:CodigoCaja
    async obtener(codigoCaja: number): Promise<RespuestaAPI<CajaAdmin>> {
        // const res = await axiosInstance.get(`caja/admin/${codigoCaja}`); return res.data;
        await this.latencia();
        const caja = this.mock.find(c => c.CodigoCaja === codigoCaja);
        return caja
            ? { success: true, tipo: 'Éxito', message: 'Caja (MOCK).', data: { ...caja } }
            : { success: false, tipo: 'Error', message: 'Caja no encontrada', data: null as any };
    }

    // POST caja/admin
    async crear(payload: GuardarCajaPayload): Promise<RespuestaAPI<CajaAdmin>> {
        // const res = await axiosInstance.post('caja/admin', payload); return res.data;
        await this.latencia();
        const nueva: CajaAdmin = {
            CodigoCaja: this.secuencia++,
            Nombre: payload.Nombre,
            Usuarios: [...payload.Usuarios],
            NoUsuarios: payload.Usuarios.length,
            Estatus: 1,
        };
        this.mock.push(nueva);
        return { success: true, tipo: 'Éxito', message: 'Caja creada (MOCK).', data: nueva };
    }

    // PUT caja/admin/:CodigoCaja
    async editar(codigoCaja: number, payload: GuardarCajaPayload): Promise<RespuestaAPI<CajaAdmin>> {
        // const res = await axiosInstance.put(`caja/admin/${codigoCaja}`, payload); return res.data;
        await this.latencia();
        const caja = this.mock.find(c => c.CodigoCaja === codigoCaja);
        if (!caja) return { success: false, tipo: 'Error', message: 'Caja no encontrada', data: null as any };
        caja.Nombre = payload.Nombre;
        caja.Usuarios = [...payload.Usuarios];
        caja.NoUsuarios = payload.Usuarios.length;
        if (payload.Estatus !== undefined) caja.Estatus = payload.Estatus;
        return { success: true, tipo: 'Éxito', message: 'Caja actualizada (MOCK).', data: { ...caja } };
    }

    // PUT caja/admin/inactivar/:CodigoCaja  (inactivar, no borrar; conserva histórico)
    async inactivar(codigoCaja: number): Promise<RespuestaAPI<null>> {
        // const res = await axiosInstance.put(`caja/admin/inactivar/${codigoCaja}`); return res.data;
        await this.latencia();
        const caja = this.mock.find(c => c.CodigoCaja === codigoCaja);
        if (caja) caja.Estatus = 0;
        return { success: true, tipo: 'Éxito', message: 'Caja inactivada (MOCK).', data: null };
    }

    // ---------------------------------------------------------------------------
    private latencia(ms = 250): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private usuariosMock(): UsuarioAsignable[] {
        return [
            { CodigoUsuario: 1, Nombre: 'Jhon R' },
            { CodigoUsuario: 2, Nombre: 'Oscar Test' },
            { CodigoUsuario: 3, Nombre: 'Paty Forero' },
            { CodigoUsuario: 4, Nombre: 'Jose Ramirez' },
            { CodigoUsuario: 5, Nombre: 'Cajero1' },
            { CodigoUsuario: 6, Nombre: 'Hamburguesas Ptt' },
            { CodigoUsuario: 7, Nombre: 'Juan Perez' },
            { CodigoUsuario: 8, Nombre: 'Prueba_1' },
            { CodigoUsuario: 9, Nombre: 'Jhoan Villazar' },
            { CodigoUsuario: 10, Nombre: 'Walter' },
        ];
    }
}
