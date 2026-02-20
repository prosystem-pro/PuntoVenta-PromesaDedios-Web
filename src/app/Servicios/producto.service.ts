import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import {
    Producto,
    CategoriaProducto,
    UnidadMedida,
    Inventario,
    RespuestaAPI
} from '../Modelos/producto.modelo';

@Injectable({
    providedIn: 'root'
})
export class ProductoServicio {

    constructor() { }

    // --- PRODUCTOS ---
    async Listar(): Promise<RespuestaAPI<Producto[]>> {
        const res = await axiosInstance.get('/producto/listado');
        return res.data;
    }

    async ObtenerCompleto(id: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get(`/producto/obtenercompleto/${id}`);
        return res.data;
    }

    async Crear(producto: Partial<Producto>): Promise<RespuestaAPI<Producto>> {
        const res = await axiosInstance.post('/producto/crear', producto);
        return res.data;
    }

    async Editar(producto: Partial<Producto>): Promise<RespuestaAPI<Producto>> {
        const res = await axiosInstance.put(`/producto/editar/${producto.CodigoProducto}`, producto);
        return res.data;
    }

    async Eliminar(id: number): Promise<RespuestaAPI<Producto>> {
        const res = await axiosInstance.delete(`/producto/eliminar/${id}`);
        return res.data;
    }

    // --- CATEGORIAS ---
    async ListarCategorias(): Promise<RespuestaAPI<CategoriaProducto[]>> {
        const res = await axiosInstance.get('/categoriaproducto/listado');
        return res.data;
    }

    async CrearCategoria(categoria: Partial<CategoriaProducto>): Promise<RespuestaAPI<CategoriaProducto>> {
        const res = await axiosInstance.post('/categoriaproducto/crear', categoria);
        return res.data;
    }

    async EditarCategoria(categoria: Partial<CategoriaProducto>): Promise<RespuestaAPI<CategoriaProducto>> {
        const res = await axiosInstance.put(`/categoriaproducto/editar/${categoria.CodigoCategoriaProducto}`, categoria);
        return res.data;
    }

    async EliminarCategoria(id: number): Promise<RespuestaAPI<CategoriaProducto>> {
        const res = await axiosInstance.delete(`/categoriaproducto/eliminar/${id}`);
        return res.data;
    }

    // --- UNIDADES DE MEDIDA ---
    async ListarUnidades(): Promise<RespuestaAPI<UnidadMedida[]>> {
        const res = await axiosInstance.get('/unidadmedida/listado');
        return res.data;
    }

    async CrearUnidad(unidad: Partial<UnidadMedida>): Promise<RespuestaAPI<UnidadMedida>> {
        const res = await axiosInstance.post('/unidadmedida/crear', unidad);
        return res.data;
    }

    async EditarUnidad(unidad: Partial<UnidadMedida>): Promise<RespuestaAPI<UnidadMedida>> {
        const res = await axiosInstance.put(`/unidadmedida/editar/${unidad.CodigoUnidadMedida}`, unidad);
        return res.data;
    }

    async EliminarUnidad(id: number): Promise<RespuestaAPI<UnidadMedida>> {
        const res = await axiosInstance.delete(`/unidadmedida/eliminar/${id}`);
        return res.data;
    }

    // --- INVENTARIO ---
    async ListarInventario(): Promise<RespuestaAPI<Inventario[]>> {
        const res = await axiosInstance.get('/inventario/listado');
        return res.data;
    }

    async CrearInventario(inventario: Partial<Inventario>): Promise<RespuestaAPI<Inventario>> {
        const res = await axiosInstance.post('/inventario/crear', inventario);
        return res.data;
    }

    async EditarInventario(inventario: Partial<Inventario>): Promise<RespuestaAPI<Inventario>> {
        const res = await axiosInstance.put(`/inventario/editar/${inventario.CodigoInventario}`, inventario);
        return res.data;
    }

    async EliminarInventario(id: number): Promise<RespuestaAPI<Inventario>> {
        const res = await axiosInstance.delete(`/inventario/eliminar/${id}`);
        return res.data;
    }

    async SubirImagen(formData: FormData): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/subir-imagen', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    }

    async ActualizarStock(payload: any): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/producto/actualizarstock', payload);
        return res.data;
    }

    async AbastecerInventario(payload: any): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/producto/abastecerinventarioproducto', payload);
        return res.data;
    }
}
