import { Injectable } from '@angular/core';
import axiosInstance from './axios.config';
import {
    Producto,
    CategoriaProducto,
    UnidadMedida,
    Inventario,
    RespuestaAPI
} from '../Modelos/producto.modelo';

// Módulo (= scope de permisos = prefijo de URL) desde donde se llama. La MISMA pantalla
// lógica (productos, materia prima, facturar, venta en mesa, compras, producción) reutiliza
// estos endpoints, pero el API los separó por prefijo para poder dar permisos por módulo.
export type ModuloProducto = 'producto' | 'materiaprima' | 'facturar' | 'ventamesa' | 'compra' | 'produccion';

@Injectable({
    providedIn: 'root'
})
export class ProductoServicio {

    constructor() { }

    // Los endpoints de PRODUCTO tienen shape irregular: el módulo 'producto' usa el segmento
    // "pelado" (producto/crear); los demás módulos lo prefijan (materiaprima/producto-crear).
    private rutaProducto(modulo: ModuloProducto, resto: string): string {
        return modulo === 'producto' ? `/producto/${resto}` : `/${modulo}/producto-${resto}`;
    }

    // --- PRODUCTOS ---
    async Listar(modulo: ModuloProducto = 'producto'): Promise<RespuestaAPI<Producto[]>> {
        const res = await axiosInstance.get(this.rutaProducto(modulo, 'listado'));
        return res.data;
    }

    async ListarInsumos(modulo: ModuloProducto = 'producto'): Promise<RespuestaAPI<Producto[]>> {
        const res = await axiosInstance.get(this.rutaProducto(modulo, 'listado-insumos'));
        return res.data;
    }

    async ObtenerCompleto(modulo: ModuloProducto, id: number): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.get(this.rutaProducto(modulo, `obtenercompleto/${id}`));
        return res.data;
    }

    async Crear(modulo: ModuloProducto, producto: Partial<Producto>): Promise<RespuestaAPI<Producto>> {
        const res = await axiosInstance.post(this.rutaProducto(modulo, 'crear'), producto);
        return res.data;
    }

    async Editar(modulo: ModuloProducto, producto: Partial<Producto>): Promise<RespuestaAPI<Producto>> {
        const res = await axiosInstance.put(this.rutaProducto(modulo, `editar/${producto.CodigoProducto}`), producto);
        return res.data;
    }

    async Eliminar(modulo: ModuloProducto, id: number): Promise<RespuestaAPI<Producto>> {
        const res = await axiosInstance.delete(this.rutaProducto(modulo, `eliminar/${id}`));
        return res.data;
    }

    // --- CATEGORIAS (prefijo uniforme por módulo: <modulo>/categoriaproducto-...) ---
    async ListarCategorias(modulo: ModuloProducto, tipoProducto: 'VENTANILLA' | 'INSUMO'): Promise<RespuestaAPI<CategoriaProducto[]>> {
        const res = await axiosInstance.post(`/${modulo}/categoriaproducto-listado`, { TipoProducto: tipoProducto });
        return res.data;
    }

    async ProductosPorCategoria(modulo: ModuloProducto, codigoCategoria: number): Promise<RespuestaAPI<any[]>> {
        const res = await axiosInstance.get(`/${modulo}/categoriaproducto/${codigoCategoria}`);
        return res.data;
    }

    async CrearCategoria(modulo: ModuloProducto, categoria: Partial<CategoriaProducto>): Promise<RespuestaAPI<CategoriaProducto>> {
        const res = await axiosInstance.post(`/${modulo}/categoriaproducto-crear`, categoria);
        return res.data;
    }

    async EditarCategoria(modulo: ModuloProducto, categoria: Partial<CategoriaProducto>): Promise<RespuestaAPI<CategoriaProducto>> {
        const res = await axiosInstance.put(`/${modulo}/categoriaproducto-editar/${categoria.CodigoCategoriaProducto}`, categoria);
        return res.data;
    }

    async EliminarCategoria(modulo: ModuloProducto, id: number): Promise<RespuestaAPI<CategoriaProducto>> {
        const res = await axiosInstance.delete(`/${modulo}/categoriaproducto-eliminar/${id}`);
        return res.data;
    }

    // --- UNIDADES DE MEDIDA ---
    async ListarUnidades(modulo: ModuloProducto = 'producto'): Promise<RespuestaAPI<UnidadMedida[]>> {
        const res = await axiosInstance.get(`/${modulo}/unidadmedida-listado`);
        return res.data;
    }

    // TODO(API): el API ya no expone crear/editar/eliminar de unidadmedida en ningún módulo
    // (UnidadMedidaRuta quedó comentada). Lo usa presentacion-modal (Productos). Pedir a Roberto
    // las rutas (p.ej. producto/unidadmedida-crear|editar|eliminar) para reactivarlas.
    async CrearUnidad(unidad: Partial<UnidadMedida>): Promise<RespuestaAPI<UnidadMedida>> {
        const res = await axiosInstance.post('/producto/unidadmedida-crear', unidad);
        return res.data;
    }

    async EditarUnidad(unidad: Partial<UnidadMedida>): Promise<RespuestaAPI<UnidadMedida>> {
        const res = await axiosInstance.put(`/producto/unidadmedida-editar/${unidad.CodigoUnidadMedida}`, unidad);
        return res.data;
    }

    async EliminarUnidad(id: number): Promise<RespuestaAPI<UnidadMedida>> {
        const res = await axiosInstance.delete(`/producto/unidadmedida-eliminar/${id}`);
        return res.data;
    }

    // --- INVENTARIO (el front no lo consume; el API no expone estas rutas) ---
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

    async SubirImagen(modulo: ModuloProducto, formData: FormData): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post(`/${modulo}/subir-imagen`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    }

    // --- Endpoints de un solo módulo (prefijo fijo) ---
    async ActualizarStockProducto(payload: { Productos: { CodigoProducto: number, StockActual: number }[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put('/producto/actualizarstockproducto', payload);
        return res.data;
    }

    async ActualizarStockInsumo(payload: { Productos: { CodigoProducto: number, StockActual: number }[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put('/materiaprima/producto-actualizarstockinsumo', payload);
        return res.data;
    }

    async AbastecerInventario(payload: { Productos: { CodigoProducto: number, CantidadProducida: number }[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put('/producto/abastecerinventarioproducto', payload);
        return res.data;
    }

    async ConsumirInsumosProduccion(payload: { Insumos: { CodigoProducto: number }[] }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.put('/materiaprima/producto-consumirinsumosproduccion', payload);
        return res.data;
    }

    async CalcularCostoIngrediente(payload: { CodigoProducto: number, NombreUnidadDestino: string, Cantidad: number }): Promise<RespuestaAPI<any>> {
        const res = await axiosInstance.post('/producto/calcular-costo-ingrediente', payload);
        return res.data;
    }
}
