import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Producto, CategoriaProducto, UnidadMedida } from '../../Modelos/producto.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ProductoServicio } from '../../Servicios/producto.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-productos',
    standalone: true,
    imports: [FormsModule, CommonModule],
    templateUrl: './productos.html',
    styleUrl: './productos.css'
})
export class Productos implements OnInit {
    private servicioProducto = inject(ProductoServicio);
    private servicioAlerta = inject(AlertaServicio);
    private router = inject(Router);

    colorSistema = Entorno.ColorSistema;
    NombreEmpresa = Entorno.NombreEmpresa;

    // Datos
    productos = signal<Producto[]>([]);
    categorias = signal<CategoriaProducto[]>([]);
    unidades = signal<UnidadMedida[]>([]);
    cargando = signal(false);

    // Busqueda
    textoBusqueda = signal('');
    codigoBarrasBusqueda = signal('');

    // Paginacion
    paginaActual = signal(1);
    itemsPorPagina = 10;

    // Productos filtrados
    productosFiltrados = computed(() => {
        // Solo mostrar productos que NO sean Insumos
        let filtrados = this.productos().filter(p => {
            const tipo = (p.TipoProducto || '').toLowerCase();
            return tipo !== 'insumo';
        });

        // Filtro por codigo de barras
        const barra = this.codigoBarrasBusqueda().trim();
        if (barra) {
            filtrados = filtrados.filter(p => p.CodigoBarra === barra);
        }

        // Filtro por texto (Nombre, Categoria, Unidad)
        const busqueda = this.textoBusqueda().toLowerCase().trim();
        if (busqueda) {
            filtrados = filtrados.filter(p =>
                p.NombreProducto.toLowerCase().includes(busqueda) ||
                p.NombreCategoria?.toLowerCase().includes(busqueda) ||
                p.NombreUnidad?.toLowerCase().includes(busqueda)
            );
        }

        return filtrados;
    });

    // Paginacion computada
    totalRegistros = computed(() => this.productosFiltrados().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));
    productosPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.productosFiltrados().slice(inicio, fin);
    });

    rangoInicio = computed(() => this.totalRegistros() === 0 ? 0 : (this.paginaActual() - 1) * this.itemsPorPagina + 1);
    rangoFin = computed(() => Math.min(this.paginaActual() * this.itemsPorPagina, this.totalRegistros()));

    ngOnInit() {
        this.cargarCatalogos();
        this.cargarProductos();
    }

    async cargarCatalogos() {
        try {
            const [resCat, resUni] = await Promise.all([
                this.servicioProducto.ListarCategorias(),
                this.servicioProducto.ListarUnidades()
            ]);
            if (resCat.success) {
                const listado = Array.isArray(resCat.data) ? resCat.data : (resCat.data?.Listado || []);
                this.categorias.set(listado);
            }
            if (resUni.success) {
                const listado = Array.isArray(resUni.data) ? resUni.data : (resUni.data?.Listado || []);
                this.unidades.set(listado);
            }
        } catch (error) {
            console.error('Error cargando catálogos:', error);
        }
    }

    async cargarProductos() {
        this.cargando.set(true);
        try {
            const res = await this.servicioProducto.Listar();
            const listadoRaw = Array.isArray(res.data) ? res.data : (res.data?.Listado || []);

            // Mapeo de datos del API al Modelo Frontend
            const listadoMapeado = listadoRaw.map((p: any) => ({
                ...p,
                CodigoProducto: p.CodigoProducto,
                NombreProducto: p.Producto, // API: Producto -> Front: NombreProducto
                CodigoCategoriaProducto: p.Categoria, // API: Categoria -> Front: CodigoCategoria
                NombreCategoria: p.NombreCategoriaProducto, // API: NombreCategoriaProducto -> Front: NombreCategoria
                Stock: p.StockActual, // API: StockActual -> Front: Stock
                TipoProducto: p.TipoProducto?.toUpperCase(), // Normalizar
                // Otros campos que coinciden: Estatus, NombreUnidad, etc.
            }));

            this.productos.set(listadoMapeado);
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al conectar con el servidor' } });
        } finally {
            this.cargando.set(false);
        }
    }

    // Acciones
    crearProducto() {
        this.router.navigate(['/productos/nuevo']);
    }

    editarProducto(producto: Producto) {
        this.router.navigate(['/productos/editar', producto.CodigoProducto]);
    }

    async eliminarProducto(id: number | undefined) {
        if (!id) return;
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Esta seguro de eliminar este producto?',
            'Esta accion no se puede deshacer'
        );
        if (confirmado) {
            try {
                const res = await this.servicioProducto.Eliminar(id);
                if (res.success) {
                    this.servicioAlerta.MostrarExito(res.message);
                    this.cargarProductos();
                } else {
                    this.servicioAlerta.MostrarError(res);
                }
            } catch (error) {
                this.servicioAlerta.MostrarError({ error: { message: 'Error al eliminar el producto' } });
            }
        }
    }

    // Stock Actions
    ajustarStock() {
        this.servicioAlerta.MostrarInfo('Funcionalidad de Ajustar Stock proximamente');
    }

    abastecerStock() {
        this.servicioAlerta.MostrarInfo('Funcionalidad de Abastecer Stock proximamente');
    }

    // Utils
    alCambiarBusqueda(evento: Event) {
        const input = evento.target as HTMLInputElement;
        this.textoBusqueda.set(input.value);
        this.paginaActual.set(1);
    }

    alCambiarBarras(evento: Event) {
        const input = evento.target as HTMLInputElement;
        this.codigoBarrasBusqueda.set(input.value);
        this.paginaActual.set(1);
    }

    irAPagina(p: number) { this.paginaActual.set(p); }
    paginaAnterior() { if (this.paginaActual() > 1) this.paginaActual.update(v => v - 1); }
    paginaSiguiente() { if (this.paginaActual() < this.totalPaginas()) this.paginaActual.update(v => v + 1); }

    exportarExcel() {
        const datos = this.productosFiltrados().map((p, i) => ({
            'No.': i + 1,
            'Categoria': p.NombreCategoria,
            'Producto': p.NombreProducto,
            'Unidad': p.NombreUnidad,
            'Stock': p.Stock,
            'Estatus': p.Estatus === 1 ? 'Activo' : 'Inactivo'
        }));
        const hoja = XLSX.utils.json_to_sheet(datos);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Productos');
        XLSX.writeFile(libro, `Listado_Productos_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}
