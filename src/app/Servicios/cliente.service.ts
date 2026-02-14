import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import { Cliente } from '../Modelos/cliente.modelo';

export interface RespuestaCliente {
    success: boolean;
    message: string;
    data?: Cliente | Cliente[];
    error?: any;
}

@Injectable({
    providedIn: 'root'
})
export class ClienteServicio {

    constructor() { }

    async listarClientes(): Promise<RespuestaCliente> {
        try {
            const res = await axiosInstance.get('/cliente/listado');
            return res.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async crearCliente(cliente: Partial<Cliente>): Promise<RespuestaCliente> {
        try {
            const res = await axiosInstance.post('/cliente/crear', cliente);
            return res.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async editarCliente(id: number, cliente: Partial<Cliente>): Promise<RespuestaCliente> {
        try {
            const res = await axiosInstance.put(`/cliente/editar/${id}`, cliente);
            return res.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    async eliminarCliente(id: number): Promise<RespuestaCliente> {
        try {
            const res = await axiosInstance.delete(`/cliente/eliminar/${id}`);
            return res.data;
        } catch (error: any) {
            return this.manejarError(error);
        }
    }

    private manejarError(error: any): RespuestaCliente {
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return {
            success: false,
            message: error.message || 'Error de conexion con el servidor'
        };
    }
}
