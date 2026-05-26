import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Producto, CategoriaProducto, UnidadMedida } from '../../Modelos/producto.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ProductoServicio } from '../../Servicios/producto.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { manejarErrorApi } from '../../Utils/error-parser';
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

    // Modos de edicion de stock
    modoEdicion = signal<'lectura' | 'ajustar' | 'abastecer'>('lectura');
    // Coleccion de cambios: { CodigoProducto: ValorDigitado }
    cambiosPendientes = signal<Record<number, number>>({});
    // Productos con valor invalido en el input de stock
    productosConError = signal<Record<number, boolean>>({});

    // Busqueda
    textoBusqueda = signal('');
    codigoBarrasBusqueda = signal('');

    // Paginacion
    paginaActual = signal(1);
    itemsPorPagina = 6;

    // Ordenamiento
    columnaOrden = signal<string>('');
    ordenAscendente = signal<boolean>(true);

    // Productos filtrados
    productosFiltrados = computed(() => {
        // Solo mostrar productos que NO sean Insumos
        let filtrados = this.productos().filter(p => {
            const tipo = (p.TipoProducto || '').toLowerCase();
            return tipo !== 'insumo';
        });

        // En modo Abastecer, solo mostrar productos con produccion pendiente
        if (this.modoEdicion() === 'abastecer') {
            filtrados = filtrados.filter(p => (p.CantidadProducida || 0) > 0);
        }

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

        // Ordenamiento
        const columna = this.columnaOrden();
        if (columna) {
            filtrados = [...filtrados].sort((a: any, b: any) => {
                let valA = a[columna];
                let valB = b[columna];

                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = (valB || '').toLowerCase();
                }

                if (valA == null) return this.ordenAscendente() ? -1 : 1;
                if (valB == null) return this.ordenAscendente() ? 1 : -1;
                if (valA < valB) return this.ordenAscendente() ? -1 : 1;
                if (valA > valB) return this.ordenAscendente() ? 1 : -1;
                return 0;
            });
        }

        return filtrados;
    });

    ordenar(columna: string) {
        if (this.columnaOrden() === columna) {
            this.ordenAscendente.set(!this.ordenAscendente());
        } else {
            this.columnaOrden.set(columna);
            this.ordenAscendente.set(true);
        }
        this.paginaActual.set(1);
    }

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
                CantidadProducida: Number(p.CantidadProducida) || 0,
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
        if (this.modoEdicion() !== 'lectura') return;
        this.router.navigate(['/productos/nuevo']);
    }

    editarProducto(producto: Producto) {
        if (this.modoEdicion() !== 'lectura') return;
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
                    this.servicioAlerta.MostrarError({ message: manejarErrorApi(res) });
                }
            } catch (error) {
                this.servicioAlerta.MostrarError({ message: manejarErrorApi(error) });
            }
        }
    }

    // Stock Actions
    ajustarStock() {
        if (this.modoEdicion() === 'ajustar') {
            this.cancelarEdicion();
        } else {
            this.modoEdicion.set('ajustar');
            this.cambiosPendientes.set({});
            // Inicializar con valores actuales para facilitar edicion
            const inicial: Record<number, number> = {};
            this.productos().forEach(p => {
                if (p.CodigoProducto) inicial[p.CodigoProducto] = p.Stock || 0;
            });
            this.cambiosPendientes.set(inicial);
        }
    }

    abastecerStock() {
        if (this.modoEdicion() === 'abastecer') {
            this.cancelarEdicion();
        } else {
            this.modoEdicion.set('abastecer');
            // Prellenar con las cantidades efectivamente producidas (no editables manualmente)
            const inicial: Record<number, number> = {};
            this.productos().forEach(p => {
                if (p.CodigoProducto && (p.CantidadProducida || 0) > 0) {
                    inicial[p.CodigoProducto] = p.CantidadProducida || 0;
                }
            });
            this.cambiosPendientes.set(inicial);
            this.paginaActual.set(1);
        }
    }

    hayCambiosPendientes(): boolean {
        const cambios = this.cambiosPendientes();
        const modo = this.modoEdicion();
        if (modo === 'lectura') return false;
        // Cualquier valor invalido cuenta como cambio pendiente
        if (Object.keys(this.productosConError()).length > 0) return true;
        return Object.entries(cambios).some(([id, valor]) => {
            const producto = this.productos().find(p => p.CodigoProducto === Number(id));
            if (!producto) return false;
            const referencia = modo === 'ajustar' ? (producto.Stock || 0) : (producto.CantidadProducida || 0);
            return Number(valor) !== Number(referencia);
        });
    }

    async cancelarEdicion() {
        if (this.hayCambiosPendientes()) {
            const confirmado = await this.servicioAlerta.Confirmacion(
                '¿Desea salir sin guardar?',
                'Se perderán los cambios realizados en el stock.',
                'Sí, descartar cambios',
                'Continuar editando'
            );
            if (!confirmado) return;
        }
        this.reiniciarEdicion();
    }

    private reiniciarEdicion() {
        this.modoEdicion.set('lectura');
        this.cambiosPendientes.set({});
        this.productosConError.set({});
    }

    alCambiarValorStock(codigo: number | undefined, valor: string) {
        if (!codigo) return;
        const limpio = (valor ?? '').toString().trim();
        const num = limpio === '' ? 0 : parseFloat(limpio);
        const esValido = Number.isFinite(num) && num >= 0;
        this.cambiosPendientes.update(c => ({ ...c, [codigo]: esValido ? num : num }));
        this.productosConError.update(e => {
            const copia = { ...e };
            if (esValido) delete copia[codigo];
            else copia[codigo] = true;
            return copia;
        });
    }

    tieneError(codigo: number | undefined): boolean {
        if (!codigo) return false;
        return !!this.productosConError()[codigo];
    }

    hayProductosConError = computed(() => Object.keys(this.productosConError()).length > 0);

    async guardarCambiosStock() {
        const cambios = this.cambiosPendientes();
        const listaCodigos = Object.keys(cambios).map(Number);

        // Validar valores invalidos antes de cualquier llamada al API
        const codigosConError = Object.keys(this.productosConError()).map(Number);
        if (codigosConError.length > 0) {
            const nombres = codigosConError
                .map(id => this.productos().find(p => p.CodigoProducto === id)?.NombreProducto)
                .filter(Boolean)
                .join(', ');
            this.servicioAlerta.MostrarAlerta(
                `Existen valores inválidos en: ${nombres}. Solo se permiten números mayores o iguales a 0.`,
                'Valores inválidos'
            );
            return;
        }

        if (this.modoEdicion() === 'abastecer' && listaCodigos.length === 0) {
            this.servicioAlerta.MostrarAlerta(
                'No hay productos con producción pendiente para abastecer.',
                'Sin productos para abastecer'
            );
            return;
        }

        if (listaCodigos.length === 0) {
            this.cancelarEdicion();
            return;
        }

        // Confirmacion antes de abastecer
        if (this.modoEdicion() === 'abastecer') {
            const totalProductos = listaCodigos.length;
            const totalUnidades = listaCodigos.reduce((acc, id) => acc + (cambios[id] || 0), 0);
            const confirmado = await this.servicioAlerta.Confirmacion(
                '¿Confirmar abastecimiento?',
                `Se abastecerán ${totalProductos} producto(s) con un total de ${totalUnidades} unidad(es). Esta acción incrementará el stock y marcará las producciones como abastecidas.`,
                'Sí, abastecer',
                'Cancelar'
            );
            if (!confirmado) return;
        }

        this.cargando.set(true);
        try {
            if (this.modoEdicion() === 'ajustar') {
                // El API sobreescribe StockActual con el valor enviado
                const productosCambiados = listaCodigos
                    .map(id => {
                        const productoReal = this.productos().find(p => p.CodigoProducto === id);
                        const stockActual = productoReal?.Stock || 0;
                        const nuevoStock = cambios[id];
                        return { CodigoProducto: id, StockActual: nuevoStock, _anterior: stockActual };
                    })
                    .filter(p => p.StockActual !== p._anterior);

                if (productosCambiados.length === 0) {
                    this.servicioAlerta.MostrarAlerta(
                        'No se detectaron cambios en el stock de los productos.',
                        'Sin cambios para guardar'
                    );
                    this.cargando.set(false);
                    return;
                }

                const payload = {
                    Productos: productosCambiados.map(({ CodigoProducto, StockActual }) => ({ CodigoProducto, StockActual }))
                };
                const res = await this.servicioProducto.ActualizarStockProducto(payload);
                if (res.success) this.servicioAlerta.MostrarExito(res.message);
                else this.servicioAlerta.MostrarError(res);
            } else if (this.modoEdicion() === 'abastecer') {
                const payload = {
                    Productos: listaCodigos.map(id => ({
                        CodigoProducto: id,
                        CantidadProducida: cambios[id]
                    })).filter(p => p.CantidadProducida > 0)
                };

                if (payload.Productos.length > 0) {
                    const res = await this.servicioProducto.AbastecerInventario(payload);
                    if (res.success) this.servicioAlerta.MostrarExito(res.message);
                    else this.servicioAlerta.MostrarError(res);
                }
            }

            await this.cargarProductos();
            this.reiniciarEdicion();
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al procesar cambios de stock' } });
        } finally {
            this.cargando.set(false);
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
