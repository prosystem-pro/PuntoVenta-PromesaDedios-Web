import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ProduccionServicio } from '../../../Servicios/produccion.service';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { PedidoProduccion, PedidoProduccionDetalle } from '../../../Modelos/produccion.modelo';
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
    private servicioProducto = inject(ProductoServicio); // Agregamos el servicio de productos
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    colorSistema = Entorno.ColorSistema;
    codigoPedido = signal<number>(0);
    vistaActiva = signal<'productos' | 'insumos'>('productos');
    busqueda = signal<string>('');

    // Observaciones popover
    itemConObservacion = signal<any | null>(null);

    detalles = signal<any[]>([]);
    insumos = signal<any[]>([]);

    cargando = signal(false);
    guardando = signal(false);

    // Datos del pedido para el header
    datosPedido = signal<any>({
        Nombre: '',
        FechaEntrega: ''
    });

    async ngOnInit() {
        this.route.params.subscribe(params => {
            this.codigoPedido.set(+params['id']);
            this.cargarDatos();
        });
    }

    async cargarDatos() {
        this.cargando.set(true);
        try {
            const resDetalle = await this.servicioProduccion.obtenerDetallePedido(this.codigoPedido());

            if (resDetalle.success && resDetalle.data) {
                const { Cabecera, Detalle } = resDetalle.data;

                if (Cabecera) {
                    this.datosPedido.set({
                        Nombre: Cabecera.NombreCliente || 'Consumidor Final',
                        FechaEntrega: Cabecera.FechaEntrega,
                        NumeroVenta: Cabecera.NumeroVenta
                    });
                }

                if (Detalle) {
                    this.detalles.set(Detalle.map((d: any) => ({
                        ...d,
                        CantidadProducida: d.Producido // Inicializamos con lo ya producido
                    })));

                    // Calculamos los insumos dinámicamente desde las recetas
                    await this.calcularInsumosDesdeRecetas(Detalle);
                }
            }
        } finally {
            this.cargando.set(false);
        }
    }

    async calcularInsumosDesdeRecetas(detallesPedido: any[]) {
        const insumosMap = new Map();

        // Buscamos las recetas de todos los productos en paralelo
        const promesas = detallesPedido.map(d => this.servicioProducto.ObtenerCompleto(d.CodigoProducto));
        const resultados = await Promise.all(promesas);

        resultados.forEach((res: any, index: number) => {
            if (res.success && res.data && res.data.Receta) {
                const cantidadPedido = detallesPedido[index].Producir || detallesPedido[index].CantidadSolicitada || 0;
                const receta = res.data.Receta;

                // El backend retorna los detalles de la receta en la propiedad 'RecetaDetalles' (plural del modelo)
                // o segun el include. Vamos a usar una verificación flexible.
                const detallesReceta = receta.RecetaDetalles || receta.Detalles || [];

                detallesReceta.forEach((rd: any) => {
                    const insumo = rd.ProductoIngrediente;
                    if (!insumo) return;

                    const key = insumo.CodigoProducto;
                    const totalNecesario = rd.Cantidad * cantidadPedido;

                    if (insumosMap.has(key)) {
                        insumosMap.get(key).CantidadSolicitada += totalNecesario;
                    } else {
                        insumosMap.set(key, {
                            CodigoProducto: insumo.CodigoProducto,
                            NombreProducto: insumo.NombreProducto, // Para compatibilidad con el template
                            Producto: insumo.NombreProducto,       // Para que el filtro por 'Producto' funcione
                            NombreCategoriaProducto: insumo.CategoriaProducto?.NombreCategoriaProducto || 'Insumo',
                            UnidadMedida: rd.UnidadMedida ? `${rd.UnidadMedida.NombreUnidad} (${rd.UnidadMedida.Abreviatura})` : 'UND',
                            Abreviatura: rd.UnidadMedida?.Abreviatura || 'UND',
                            CantidadSolicitada: totalNecesario,
                            ConsumoReal: totalNecesario
                        });
                    }
                });
            }
        });

        this.insumos.set(Array.from(insumosMap.values()));
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
