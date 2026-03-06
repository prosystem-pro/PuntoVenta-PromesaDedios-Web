import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ProduccionServicio } from '../../../Servicios/produccion.service';
import { PedidoProduccion, PedidoProduccionDetalle, ProduccionInsumo } from '../../../Modelos/produccion.modelo';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';

@Component({
    selector: 'app-produccion-ingresar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './produccion-ingresar.html',
    styleUrl: './produccion-ingresar.css'
})
export class ProduccionIngresar implements OnInit {
    private servicioProduccion = inject(ProduccionServicio);
    private servicioAlerta = inject(AlertaServicio);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    colorSistema = Entorno.ColorSistema;
    codigoPedido = signal<number>(0);
    vistaActiva = signal<'productos' | 'insumos'>('productos');
    busqueda = signal<string>('');

    // Observaciones popover
    itemConObservacion = signal<any | null>(null);

    detalles = signal<(PedidoProduccionDetalle & { CantidadProducida: number })[]>([]);
    insumos = signal<(ProduccionInsumo & { ConsumoReal: number })[]>([]);

    cargando = signal(false);
    guardando = signal(false);

    // Datos del pedido para el header
    datosPedido = signal<any>({
        Nombre: 'Cargando...',
        FechaEntrega: ''
    });

    async ngOnInit() {
        const id = this.route.snapshot.params['id'];
        if (id) {
            this.codigoPedido.set(+id);
            await this.cargarDatos();
        }
    }

    async cargarDatos() {
        this.cargando.set(true);
        try {
            const [resListado, resDetalle, resInsumos] = await Promise.all([
                this.servicioProduccion.listarPedidos(), // Para sacar nombre y fecha
                this.servicioProduccion.obtenerDetallePedido(this.codigoPedido()),
                this.servicioProduccion.listarInsumosProduccion(this.codigoPedido())
            ]);

            if (resListado.success) {
                const p = resListado.data?.find((x: PedidoProduccion) => x.CodigoPedidoProduccion === this.codigoPedido());
                if (p) {
                    this.datosPedido.set({
                        Nombre: p.Nombre || 'Consumidor Final',
                        FechaEntrega: p.FechaEntrega
                    });
                }
            }

            if (resDetalle.success) {
                this.detalles.set(resDetalle.data?.map((d: PedidoProduccionDetalle) => ({
                    ...d,
                    CantidadProducida: d.CantidadSolicitada
                })) || []);
            }

            if (resInsumos.success) {
                this.insumos.set(resInsumos.data?.map((i: ProduccionInsumo) => ({
                    ...i,
                    ConsumoReal: i.CantidadSolicitada
                })) || []);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    detallesFiltrados = computed(() => {
        const query = this.busqueda().toLowerCase().trim();
        return this.detalles().filter(d =>
            d.Producto?.toLowerCase().includes(query) ||
            d.NombreCategoriaProducto?.toLowerCase().includes(query)
        );
    });

    insumosFiltrados = computed(() => {
        const query = this.busqueda().toLowerCase().trim();
        return this.insumos().filter(i =>
            i.Producto?.toLowerCase().includes(query) ||
            i.NombreCategoriaProducto?.toLowerCase().includes(query)
        );
    });

    cambiarVista(vista: 'productos' | 'insumos') {
        this.vistaActiva.set(vista);
        this.busqueda.set('');
    }

    mostrarObservaciones(item: any, event: Event) {
        event.stopPropagation();
        this.itemConObservacion.set(item === this.itemConObservacion() ? null : item);
    }

    async guardar() {
        this.guardando.set(true);
        try {
            const datosAbastecer = {
                CodigoPedidoProduccion: this.codigoPedido(),
                Detalle: this.detalles().map((d: PedidoProduccionDetalle & { CantidadProducida: number }) => ({
                    CodigoProducto: d.CodigoProducto,
                    CantidadProducida: d.CantidadProducida
                })),
                Estatus: true
            };

            const resA = await this.servicioProduccion.abastecerPedido(datosAbastecer);

            if (resA.success) {
                const codigoProduccion = resA.data?.CodigoProduccion || resA.data?.codigoProduccion || 0;

                if (this.insumos().length > 0) {
                    if (codigoProduccion > 0) {
                        const datosConsumo = {
                            CodigoProduccion: codigoProduccion,
                            Insumos: this.insumos().map((i: ProduccionInsumo & { ConsumoReal: number }) => ({
                                CodigoProducto: i.CodigoProducto,
                                CantidadConsumida: i.ConsumoReal
                            }))
                        };
                        await this.servicioProduccion.registrarConsumoInsumos(datosConsumo);
                    } else {
                        console.warn('No se obtuvo CodigoProduccion para registrar insumos');
                        this.servicioAlerta.MostrarError('No se pudo obtener el código de producción para registrar insumos');
                    }
                }

                this.servicioAlerta.MostrarExito('Producción registrada correctamente');
                this.router.navigate(['/produccion']);
            } else {
                this.servicioAlerta.MostrarError(resA.message);
            }
        } catch (e: any) {
            this.servicioAlerta.MostrarError('Error al guardar: ' + e.message);
        } finally {
            this.guardando.set(false);
        }
    }

    cancelar() {
        this.router.navigate(['/produccion']);
    }
}
