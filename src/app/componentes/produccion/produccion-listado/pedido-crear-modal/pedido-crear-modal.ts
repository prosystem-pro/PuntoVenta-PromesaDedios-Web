import { Component, OnInit, signal, inject, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProduccionServicio } from '../../../../Servicios/produccion.service';
import { AlertaServicio } from '../../../../Servicios/alerta.service';
import { Entorno } from '../../../../Entorno/Entorno';

@Component({
    selector: 'app-pedido-crear-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './pedido-crear-modal.html',
    styleUrl: './pedido-crear-modal.css'
})
export class PedidoCrearModal implements OnInit {
    private servicioProduccion = inject(ProduccionServicio);
    private servicioAlerta = inject(AlertaServicio);

    @Output() cerrado = new EventEmitter<boolean>();

    productos = signal<any[]>([]);
    catalogoProductos = signal<any[]>([]);
    colorSistema = Entorno.ColorSistema;

    fechaEntrega = signal<string>(new Date().toISOString().split('T')[0]);
    observaciones = signal<string>('');
    mostrarConfirmacion = signal(false);

    busqueda = signal<string>('');
    busquedaProducto = signal<string>('');
    cargando = signal(false);
    guardando = signal(false);

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = 10;

    ngOnInit() {
        this.cargarProductos();
    }

    async cargarProductos() {
        this.cargando.set(true);
        try {
            const [resProduccion, resGlobal] = await Promise.all([
                this.servicioProduccion.listarProductosProduccion(),
                this.servicioProduccion.listarProductosProduccionGlobal()
            ]);

            if (resGlobal.success && resGlobal.data) {
                const globalMapped = resGlobal.data.map((p: any) => ({
                    ...p,
                    Producto: p.Producto || p.NombreProducto, // Salvaguarda hibrida por si acaso
                    Visible: true,
                    CantidadSolicitada: 1
                }));
                this.catalogoProductos.set(globalMapped);
            }

            if (resProduccion.success) {
                const listado = (resProduccion.data || []).map((p: any) => {
                    const diferencia = p.StockSugerido - p.StockActual;
                    return {
                        ...p,
                        CantidadSolicitada: diferencia > 0 ? diferencia : 0,
                        Visible: true // Todos los productos del API son visibles por defecto
                    };
                });
                this.productos.set(listado);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    productosFiltrados = computed(() => {
        const query = this.busqueda().toLowerCase().trim();
        // Mostramos si es visible y coincide con la búsqueda
        return this.productos().filter(p =>
            p.Visible && (
                p.Producto?.toLowerCase().includes(query) ||
                p.NombreCategoriaProducto?.toLowerCase().includes(query)
            )
        );
    });

    sugerenciasBusqueda = computed(() => {
        const query = this.busquedaProducto().toLowerCase().trim();
        if (query.length < 2) return [];

        return this.catalogoProductos().filter(p =>
            p.Producto?.toLowerCase().includes(query) ||
            p.NombreCategoriaProducto?.toLowerCase().includes(query) ||
            p.CodigoProducto?.toString() === query
        ).slice(0, 10); // Limitamos a 10 sugerencias
    });

    totalRegistros = computed(() => this.productosFiltrados().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));
    productosPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.productosFiltrados().slice(inicio, fin);
    });

    rangoInicio = computed(() => this.totalRegistros() === 0 ? 0 : (this.paginaActual() - 1) * this.itemsPorPagina + 1);
    rangoFin = computed(() => Math.min(this.paginaActual() * this.itemsPorPagina, this.totalRegistros()));

    paginasVisibles = computed(() => {
        const actual = this.paginaActual();
        const total = this.totalPaginas();

        if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

        if (actual <= 3) return [1, 2, 3, 4, '...', total];
        if (actual >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];

        return [1, '...', actual - 1, actual, actual + 1, '...', total];
    });

    actualizarCantidad(prod: any, valor: string) {
        const num = parseFloat(valor) || 0;
        this.productos.update(list => list.map(p =>
            p.CodigoProducto === prod.CodigoProducto ? { ...p, CantidadSolicitada: num } : p
        ));
    }

    seleccionarProducto(prod: any) {
        this.busquedaProducto.set(prod.Producto);
        // Pequeño delay para que el usuario vea que se seleccionó antes de que se limpie por agregarProducto
        // O simplemente lo dejamos listo para el botón Agregar
    }

    agregarProducto() {
        const query = this.busquedaProducto().toLowerCase().trim();
        if (!query) return;

        // 1. Obtener el producto del catalogo general
        const productoCatalogo = this.catalogoProductos().find(p => 
            p.Producto?.toLowerCase() === query || 
            p.CodigoProducto?.toString() === query
        );

        if (!productoCatalogo) {
            this.servicioAlerta.MostrarError('No se encontró el producto en el catálogo general');
            return;
        }

        // VALIDACIÓN: Evitar duplicados si ya está visible en la lista
        const yaEnPedido = this.productos().find(p => p.CodigoProducto === productoCatalogo.CodigoProducto && p.Visible);
        if (yaEnPedido) {
            this.servicioAlerta.MostrarAlerta('El producto ya está en la lista del pedido');
            return;
        }

        // 2. Revisar si ya existe en la lista recomendada de producción (pero oculto)
        const index = this.productos().findIndex(p => p.CodigoProducto === productoCatalogo.CodigoProducto);
        
        if (index !== -1) {
            // Si ya existe, lo marcamos visible y seteamos cantidad si es 0
            this.productos.update(list => {
                const newList = [...list];
                newList[index].Visible = true;
                if (newList[index].CantidadSolicitada === 0) {
                    newList[index].CantidadSolicitada = 1;
                }
                return newList;
            });
            this.servicioAlerta.MostrarExito('Producto agregado al pedido');
        } else {
            // Si NO existe, insertarlo nuevo al inicio
            this.productos.update(list => [{ ...productoCatalogo }, ...list]);
            this.servicioAlerta.MostrarExito('Nuevo producto del catálogo agregado al pedido');
        }
        
        this.busquedaProducto.set('');
    }

    eliminarFila(prod: any) {
        this.productos.update(list => list.map(p =>
            p.CodigoProducto === prod.CodigoProducto ? { ...p, Visible: false, CantidadSolicitada: 0 } : p
        ));
    }

    abrirConfirmacion() {
        const seleccionados = this.productos().filter(p => p.CantidadSolicitada > 0);

        if (seleccionados.length === 0) {
            this.servicioAlerta.MostrarError('Debe ingresar cantidad a producir para al menos un producto');
            return;
        }

        this.mostrarConfirmacion.set(true);
    }

    async guardar() {
        const seleccionados = this.productos().filter(p => p.CantidadSolicitada > 0);

        this.guardando.set(true);
        try {
            const datos = {
                FechaEntrega: this.fechaEntrega(),
                Observaciones: this.observaciones(),
                Productos: seleccionados.map(p => ({
                    CodigoProducto: p.CodigoProducto,
                    CantidadSolicitada: p.CantidadSolicitada
                }))
            };

            const res = await this.servicioProduccion.crearPedido(datos);
            if (res.success) {
                this.servicioAlerta.MostrarExito('Pedido creado correctamente');
                this.mostrarConfirmacion.set(false);
                this.cerrado.emit(true);
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        } catch (e: any) {
            this.servicioAlerta.MostrarError('Error al crear pedido: ' + e.message);
        } finally {
            this.guardando.set(false);
        }
    }

    irAPagina(p: number) { this.paginaActual.set(p); }
    paginaAnterior() { if (this.paginaActual() > 1) this.paginaActual.update(v => v - 1); }
    paginaSiguiente() { if (this.paginaActual() < this.totalPaginas()) this.paginaActual.update(v => v + 1); }

    cerrar() {
        this.cerrado.emit(false);
    }
}
