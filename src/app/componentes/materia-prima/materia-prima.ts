import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Producto, CategoriaProducto, UnidadMedida } from '../../Modelos/producto.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ProductoServicio } from '../../Servicios/producto.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import * as XLSX from 'xlsx';

type ViewMode = 'normal' | 'ajustar' | 'abastecer';

@Component({
    selector: 'app-materia-prima',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './materia-prima.html',
    styleUrl: './materia-prima.css'
})
export class MateriaPrima implements OnInit {
    private servicioProducto = inject(ProductoServicio);
    private servicioAlerta = inject(AlertaServicio);
    private router = inject(Router);

    colorSistema = Entorno.ColorSistema;

    // Datos
    insumos = signal<Producto[]>([]);
    categorias = signal<CategoriaProducto[]>([]);
    unidades = signal<UnidadMedida[]>([]);
    cargando = signal(false);

    // Estado de la Vista
    modo = signal<ViewMode>('normal');

    // Cambios temporales para edición inline
    cambiosAjuste = new Map<number, number>(); // CodigoProducto -> NuevoStock
    cambiosAbastecer = new Map<number, number>(); // CodigoProducto -> CantidadAumentar

    // Busqueda
    textoBusqueda = signal('');
    codigoBarrasBusqueda = signal('');

    // Paginacion
    paginaActual = signal(1);
    itemsPorPagina = 7;

    // Modales (Obsoleto, ahora navegamos)
    mostrarModal = signal(false);
    insumoSeleccionado = signal<Producto | null>(null);

    insumosFiltrados = computed(() => {
        let filtrados = this.insumos();

        // Filtro por codigo de barras
        const barra = this.codigoBarrasBusqueda().trim();
        if (barra) {
            filtrados = filtrados.filter(p => p.CodigoBarra === barra);
        }

        // Filtro por texto
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
    totalRegistros = computed(() => this.insumosFiltrados().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));

    // Generar array de paginas para el @for
    paginas = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));

    insumosPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.insumosFiltrados().slice(inicio, fin);
    });

    rangoInicio = computed(() => this.totalRegistros() === 0 ? 0 : (this.paginaActual() - 1) * this.itemsPorPagina + 1);
    rangoFin = computed(() => Math.min(this.paginaActual() * this.itemsPorPagina, this.totalRegistros()));

    ngOnInit() {
        this.cargarCatalogos();
        this.cargarInsumos();
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

    async cargarInsumos() {
        this.cargando.set(true);
        try {
            const res = await this.servicioProducto.ListarInsumos();
            const listadoRaw = Array.isArray(res.data) ? res.data : (res.data?.Listado || []);
            const insumosMapeados = listadoRaw.map((p: any) => ({
                ...p,
                CodigoProducto: p.CodigoProducto,
                NombreProducto: p.Producto || p.NombreProducto,
                NombreCategoria: p.NombreCategoriaProducto || p.NombreCategoria || (p.CategoriaProducto?.NombreCategoriaProducto),
                NombreUnidad: p.NombreUnidad || p.Abreviatura || (p.UnidadMedida?.NombreUnidad),
                Stock: p.StockActual !== undefined ? p.StockActual : (p.Inventario?.StockActual ?? p.Stock),
                StockMinimo: p.StockMinimo !== undefined ? p.StockMinimo : (p.Inventario?.StockMinimo),
                StockSugerido: p.StockSugerido !== undefined ? p.StockSugerido : (p.Inventario?.StockSugerido),
                PrecioCompra: p.PrecioCompra !== undefined ? p.PrecioCompra : (p.Inventario?.PrecioCompra),
                TipoProducto: 'INSUMO',
                Estatus: p.Estatus
            }));

            this.insumos.set(insumosMapeados);
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al cargar insumos' } });
        } finally {
            this.cargando.set(false);
        }
    }

    // Acciones de Vista
    activarAjuste() {
        this.modo.set('ajustar');
        this.cambiosAjuste.clear();
    }

    activarAbastecer() {
        this.modo.set('abastecer');
        this.cambiosAbastecer.clear();
    }

    regresarNormal() {
        this.modo.set('normal');
        this.cambiosAjuste.clear();
        this.cambiosAbastecer.clear();
    }

    // Handlers de cambios inline
    onCambioAjuste(codigo: number, valor: string) {
        this.cambiosAjuste.set(codigo, Number(valor));
    }

    onCambioAbastecer(codigo: number, valor: string) {
        this.cambiosAbastecer.set(codigo, Number(valor));
    }

    async guardarCambios() {
        if (this.modo() === 'ajustar') {
            await this.guardarAjuste();
        } else if (this.modo() === 'abastecer') {
            await this.guardarAbastecer();
        }
    }

    private async guardarAjuste() {
        if (this.cambiosAjuste.size === 0) {
            this.regresarNormal();
            return;
        }

        this.cargando.set(true);
        try {
            const payload = {
                Productos: Array.from(this.cambiosAjuste.entries()).map(([CodigoProducto, StockActual]) => ({
                    CodigoProducto,
                    StockActual
                }))
            };

            // Usar endpoint de actualizar stock
            const res = await this.servicioProducto.ActualizarStockInsumo(payload);
            if (res.success) {
                this.servicioAlerta.MostrarExito('Stock ajustado correctamente');
                await this.cargarInsumos();
                this.regresarNormal();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al actualizar stock' } });
        } finally {
            this.cargando.set(false);
        }
    }

    private async guardarAbastecer() {
        if (this.cambiosAbastecer.size === 0) {
            this.regresarNormal();
            return;
        }

        this.cargando.set(true);
        try {
            const payload = {
                Productos: Array.from(this.cambiosAbastecer.entries()).map(([CodigoProducto, CantidadProducida]) => ({
                    CodigoProducto,
                    CantidadProducida
                }))
            };

            // Usar endpoint de abastecer
            // @ts-ignore
            const res = await this.servicioProducto.AbastecerInventario(payload);
            if (res.success) {
                this.servicioAlerta.MostrarExito('Materia prima abastecida correctamente');
                await this.cargarInsumos();
                this.regresarNormal();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al abastecer inventario' } });
        } finally {
            this.cargando.set(false);
        }
    }

    // CRUD Insumos
    crearInsumo() {
        this.router.navigate(['/materia-prima/nuevo']);
    }

    editarInsumo(insumo: Producto) {
        this.router.navigate(['/materia-prima/editar', insumo.CodigoProducto]);
    }

    async eliminarInsumo(id: number | undefined) {
        if (!id) return;
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Esta seguro de eliminar esta materia prima?',
            'Esta accion no se puede deshacer'
        );
        if (confirmado) {
            try {
                const res = await this.servicioProducto.Eliminar(id);
                if (res.success) {
                    this.servicioAlerta.MostrarExito(res.message);
                    this.cargarInsumos();
                } else {
                    this.servicioAlerta.MostrarError(res);
                }
            } catch (error) {
                this.servicioAlerta.MostrarError({ error: { message: 'Error al eliminar' } });
            }
        }
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
    paginaAnterior() { if (this.paginaActual() > 1) this.paginaActual.update((v: number) => v - 1); }
    paginaSiguiente() { if (this.paginaActual() < this.totalPaginas()) this.paginaActual.update((v: number) => v + 1); }

    exportarExcel() {
        const datos = this.insumosFiltrados().map((p: Producto, i: number) => ({
            'No.': i + 1,
            'Categoria': p.NombreCategoria,
            'Producto': p.NombreProducto,
            'Unidad': p.NombreUnidad,
            'Stock': p.Stock,
            'Estatus': p.Estatus === 1 ? 'Activo' : 'Inactivo'
        }));
        const hoja = XLSX.utils.json_to_sheet(datos);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Materia Prima');
        XLSX.writeFile(libro, `Materia_Prima_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}
