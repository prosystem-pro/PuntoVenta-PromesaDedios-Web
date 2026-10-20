import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { CajaAdmin, UsuarioAsignable, GuardarCajaPayload } from '../Modelos/caja-admin.modelo';

/**
 * Administración de cajas (pedido de Walter) — crear cajas y asignar usuarios.
 * Cableado al API real de Roberto (prefijo administrativo/). Ver ANALISIS-API-Caja-Turnos.md §3.3.
 *
 * Endpoints:
 *  - Listar admin:  GET    administrativo/caja-lista-admin
 *                   -> [{ CodigoCaja, NumeroCaja, Descripcion, CantidadUsuarios, TieneTurnoAbierto, Estatus('Activo'|'Desactivado') }]
 *  - Usuarios:      GET    administrativo/usuario-listado
 *  - Detalle:       GET    administrativo/caja-obtener-informacion/:CodigoCaja
 *                   -> { CodigoCaja, NumeroCaja, Descripcion, Estatus, CodigosUsuarios[] }
 *  - Crear:         POST   administrativo/caja-crear-con-usuarios        { NumeroCaja, Descripcion, Estatus, CodigosUsuarios }
 *  - Editar:        PUT    administrativo/:CodigoCaja/caja-editar-con-usuarios  (mismo body)
 *  - Desactivar:    DELETE administrativo/caja-eliminar-con-usuarios/:CodigoCaja  (soft-delete, Estatus->0)
 *
 * PENDIENTE: el API pide `NumeroCaja` obligatorio y no hay endpoint "activar". Mientras:
 *  - NumeroCaja se calcula en el front (correlativo) — se quita cuando Roberto lo autogenere.
 *  - Reactivar se hace vía editar con Estatus=1.
 */
@Injectable({ providedIn: 'root' })
export class CajaAdminServicio {

    private base = 'administrativo/';

    // GET caja-lista-admin
    async listar(): Promise<RespuestaAPI<CajaAdmin[]>> {
        const res = await axiosInstance.get(this.base + 'caja-lista-admin');
        const data: CajaAdmin[] = (res.data?.data || []).map((c: any) => ({
            CodigoCaja: c.CodigoCaja,
            NumeroCaja: c.NumeroCaja,
            Nombre: c.Descripcion,
            NoUsuarios: c.CantidadUsuarios ?? 0,
            Estatus: c.Estatus === 'Activo' || c.Estatus === 1 ? 1 : 0,
            TieneTurnoAbierto: !!c.TieneTurnoAbierto,
        }));
        return { ...res.data, data };
    }

    // GET usuario-listado (para los checkboxes del modal)
    async obtenerUsuariosAsignables(): Promise<RespuestaAPI<UsuarioAsignable[]>> {
        const res = await axiosInstance.get(this.base + 'usuario-listado');
        const data: UsuarioAsignable[] = (res.data?.data || []).map((u: any) => ({
            CodigoUsuario: u.CodigoUsuario,
            Nombre: u.NombreCompleto || u.NombreUsuario || `Usuario ${u.CodigoUsuario}`,
        }));
        return { ...res.data, data };
    }

    // GET caja-obtener-informacion/:CodigoCaja (prefill del modal al editar)
    async obtener(codigoCaja: number): Promise<RespuestaAPI<CajaAdmin>> {
        const res = await axiosInstance.get(this.base + 'caja-obtener-informacion/' + codigoCaja);
        const c = res.data?.data;
        const data: CajaAdmin | null = c ? {
            CodigoCaja: c.CodigoCaja,
            NumeroCaja: c.NumeroCaja,
            Nombre: c.Descripcion,
            Estatus: typeof c.Estatus === 'string' ? (c.Estatus === 'Activo' ? 1 : 0) : c.Estatus,
            Usuarios: c.CodigosUsuarios || [],
            NoUsuarios: (c.CodigosUsuarios || []).length,
        } : null;
        return { ...res.data, data: data as any };
    }

    // POST caja-crear-con-usuarios  (NumeroCaja lo autogenera el API)
    async crear(payload: GuardarCajaPayload): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post(this.base + 'caja-crear-con-usuarios', {
            Descripcion: payload.Nombre,
            Estatus: 1,
            CodigosUsuarios: payload.Usuarios,
        });
        return res.data;
    }

    // PUT :CodigoCaja/caja-editar-con-usuarios
    async editar(codigoCaja: number, payload: GuardarCajaPayload): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put(this.base + codigoCaja + '/caja-editar-con-usuarios', {
            Descripcion: payload.Nombre,
            Estatus: payload.Estatus ?? 1,
            CodigosUsuarios: payload.Usuarios,
        });
        return res.data;
    }

    // DELETE caja-eliminar-con-usuarios/:CodigoCaja (soft-delete -> Estatus 0)
    async inactivar(codigoCaja: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.delete(this.base + 'caja-eliminar-con-usuarios/' + codigoCaja);
        return res.data;
    }

    // No hay endpoint "activar": se reactiva vía editar con Estatus=1 (reusa los datos actuales).
    async activar(codigoCaja: number): Promise<RespuestaAPI<any>> {
        const info = await this.obtener(codigoCaja);
        if (!info.success || !info.data) return info as RespuestaAPI<any>;
        const c = info.data;
        const res = await axiosInstance.put(this.base + codigoCaja + '/caja-editar-con-usuarios', {
            Descripcion: c.Nombre,
            Estatus: 1,
            CodigosUsuarios: c.Usuarios || [],
        });
        return res.data;
    }
}
