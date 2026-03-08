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
    colorSistema = Entorno.ColorSistema;

    fechaEntrega = signal<string>(new Date().toISOString().split('T')[0]);
    observaciones = signal<string>('');

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
            const res = await this.servicioProduccion.listarProductosProduccion();
            if (res.success) {
                // El comentario del diseñador dice que inicialmente aparecen los que tienen menos del stock mínimo
                // pero por ahora cargaremos todos y el usuario podrá buscar/agregar
                const listado = (res.data || []).map((p: any) => ({
                    ...p,
                    CantidadSolicitada: p.StockActual < p.StockSugerido ? (p.StockSugerido - p.StockActual) : 0
                }));
                this.productos.set(listado);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    productosFiltrados = computed(() => {
        const query = this.busqueda().toLowerCase().trim();
        // Solo mostramos en la tabla los que tengan CantidadSolicitada > 0 (seleccionados)
        // O si hay una búsqueda activa en el buscador de la tabla
        return this.productos().filter(p => {
            const coincideBusqueda = p.Producto?.toLowerCase().includes(query) ||
                p.NombreCategoriaProducto?.toLowerCase().includes(query);
            return (p.CantidadSolicitada > 0 || query !== '') && coincideBusqueda;
        });
    });

    sugerenciasBusqueda = computed(() => {
        const query = this.busquedaProducto().toLowerCase().trim();
        if (query.length < 2) return [];

        return this.productos().filter(p =>
            p.Producto?.toLowerCase().includes(query) ||
            p.NombreCategoriaProducto?.toLowerCase().includes(query)
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
    paginasArray = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));

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

        const index = this.productos().findIndex(p => p.Producto?.toLowerCase().includes(query));
        if (index !== -1) {
            this.productos.update(list => {
                const newList = [...list];
                if (newList[index].CantidadSolicitada === 0) {
                    newList[index].CantidadSolicitada = 1; // Valor por defecto al agregar
                }
                return newList;
            });
            this.busquedaProducto.set('');
            this.servicioAlerta.MostrarExito('Producto agregado al pedido');
        } else {
            this.servicioAlerta.MostrarError('No se encontró el producto');
        }
    }

    eliminarFila(prod: any) {
        this.productos.update(list => list.map(p =>
            p.CodigoProducto === prod.CodigoProducto ? { ...p, CantidadSolicitada: 0 } : p
        ));
    }

    async guardar() {
        const seleccionados = this.productos().filter(p => p.CantidadSolicitada > 0);

        if (seleccionados.length === 0) {
            this.servicioAlerta.MostrarError('Debe ingresar cantidad a producir para al menos un producto');
            return;
        }

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
