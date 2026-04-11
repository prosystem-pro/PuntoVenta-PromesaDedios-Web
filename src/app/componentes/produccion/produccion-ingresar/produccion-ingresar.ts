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
    codigoProduccion = signal<number>(0);
    esMasivo = signal<boolean>(false);
    vistaActiva = signal<'productos' | 'insumos'>('productos');
    busqueda = signal<string>('');

    // Observaciones popover
    itemConObservacion = signal<any | null>(null);

    detalles = signal<any[]>([]);
    insumos = signal<any[]>([]);

    cargando = signal(false);
    guardando = signal(false);
    insumosGuardados = signal(false);

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = 10;

    registrosFiltrados = computed(() => {
        const query = this.busqueda().toLowerCase().trim();
        const info = this.vistaActiva() === 'productos' ? this.detalles() : this.insumos();
        return info.filter((d: any) =>
            (d.Producto || d.NombreProducto || '')?.toLowerCase().includes(query) ||
            (d.NombreCategoriaProducto || d.Categoria || '')?.toString().toLowerCase().includes(query)
        );
    });

    totalRegistros = computed(() => this.registrosFiltrados().length);
    totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalRegistros() / this.itemsPorPagina)));
    registrosPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.registrosFiltrados().slice(inicio, fin);
    });

    paginasVisibles = computed(() => {
        const actual = this.paginaActual();
        const total = this.totalPaginas();

        if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

        if (actual <= 3) return [1, 2, 3, 4, '...', total];
        if (actual >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];

        return [1, '...', actual - 1, actual, actual + 1, '...', total];
    });
    rangoInicio = computed(() => this.totalRegistros() === 0 ? 0 : (this.paginaActual() - 1) * this.itemsPorPagina + 1);
    rangoFin = computed(() => Math.min(this.paginaActual() * this.itemsPorPagina, this.totalRegistros()));


    datosPedido = signal<any>({
        Nombre: '',
        FechaEntrega: ''
    });

    irAPagina(p: number) { this.paginaActual.set(p); }
    paginaAnterior() { if (this.paginaActual() > 1) this.paginaActual.update(v => v - 1); }
    paginaSiguiente() { if (this.paginaActual() < this.totalPaginas()) this.paginaActual.update(v => v + 1); }

    async ngOnInit() {
        this.route.params.subscribe(params => {
            if (params['id'] === 'masivo') {
                this.esMasivo.set(true);
            } else {
                this.codigoPedido.set(+params['id']);
            }
            this.cargarDatos();
        });
    }

    async cargarDatos() {
        this.cargando.set(true);
        try {
            if (this.esMasivo()) {
                const res = await this.servicioProduccion.obtenerListadoPedidosTodos();
                if (res.success && res.data) {
                    this.detalles.set(res.data.map((d: any) => ({
                        ...d,
                        CantidadProducida: d.Producido || d.Producir || 0,
                        NombreCategoriaProducto: d.Categoria,
                        NombreUnidad: d.Unidad,
                        NombreProducto: d.Producto,
                        Comentarios: d.Observaciones || [],
                    })));

                    // Calculamos los insumos dinámicamente desde las recetas
                    await this.calcularInsumosDesdeRecetas(this.detalles());
                }
            } else {
                const resDetalle = await this.servicioProduccion.obtenerDetallePedido(this.codigoPedido());

                if (resDetalle.success && resDetalle.data) {
                    const { Cabecera, Detalle } = resDetalle.data;

                    if (Cabecera) {
                        this.datosPedido.set({
                            Nombre: Cabecera.NombreCliente || 'Consumidor Final',
                            FechaEntrega: Cabecera.FechaEntrega,
                            NumeroVenta: Cabecera.NumeroVenta
                        });
                        this.codigoProduccion.set(Cabecera.CodigoProduccion || 0);
                    }

                    if (Detalle) {
                        this.detalles.set(Detalle.map((d: any) => ({
                            ...d,
                            CantidadProducida: d.Producido || d.Producir || d.CantidadSolicitada || 0,
                            Comentarios: d.Comentarios || [
                                { Cantidad: d.CantidadSolicitada || d.Producir, Producto: d.Producto, Comentario: d.ObservacionesDetalle || d.Observaciones || 'Sin observaciones' }
                            ]
                        })));

                        // Calculamos los insumos dinámicamente desde las recetas
                        await this.calcularInsumosDesdeRecetas(Detalle);
                    }
                }
            }
        } finally {
            this.cargando.set(false);
        }
    }

    async cargarInsumos() {
        this.cargando.set(true);
        try {
            let resInsumos;
            if (this.esMasivo()) {
                resInsumos = await this.servicioProduccion.obtenerListadoInsumosTodos();
            } else {
                resInsumos = await this.servicioProduccion.obtenerInsumosPedido(this.codigoPedido());
            }

            if (resInsumos.success && resInsumos.data) {
                // Verificamos si los datos vienen directamente o dentro de una propiedad 'Detalle'
                const listaRaw = Array.isArray(resInsumos.data) ? resInsumos.data : (resInsumos.data as any).Detalle || [];

                this.insumos.set(listaRaw.map((i: any) => ({
                    ...i,
                    ConsumoReal: i.Utilizada || i.Utilizado || i.Estimado || i.CantidadSolicitada || 0
                })));

                // Punto 1: Auto-detección de insumos guardados
                // Si el API devuelve valores en 'Utilizado' o 'Utilizada', significa que ya se guardó previamente.
                const yaGuardados = listaRaw.some((i: any) => 
                    (i.Utilizado !== null && i.Utilizado !== undefined) || 
                    (i.Utilizada !== null && i.Utilizada !== undefined)
                );
                if (yaGuardados) {
                    this.insumosGuardados.set(true);
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
                            CodigoUnidadMedida: rd.CodigoUnidadMedida,
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

    cambiarVista(vista: 'productos' | 'insumos') {
        this.vistaActiva.set(vista);
        this.busqueda.set('');
        this.paginaActual.set(1);

        if (vista === 'insumos' && this.insumos().length === 0) {
            this.cargarInsumos();
        }
    }

    mostrarObservaciones(item: any, event: Event) {
        event.stopPropagation();
        this.itemConObservacion.set(item === this.itemConObservacion() ? null : item);
    }

    async guardar() {
        if (this.vistaActiva() === 'productos') {
            await this.guardarProduccion(false);
        } else {
            await this.guardarConsumoInsumos();
        }
    }

    async guardarProduccion(finalizar: boolean = false) {
        if (finalizar && !this.insumosGuardados()) {
            this.servicioAlerta.MostrarError('Primero debe ajustar y guardar los insumos utilizados antes de abastecer');
            this.cambiarVista('insumos');
            return;
        }

        if (finalizar) {
            const confirma = await this.servicioAlerta.Confirmacion(
                '¿Confirmar Abastecimiento?',
                'Esta acción descontará el inventario de insumos y cargará los productos terminados. No se podrá revertir.',
                'Si, Abastecer',
                'Cancelar'
            );
            if (!confirma) return;
        }

        this.guardando.set(true);
        try {
            let resA;
            if (this.esMasivo()) {
                const datosAbastecerMasivo = {
                    Detalle: this.detalles().map((d: any) => ({
                        CodigoProducto: d.CodigoProducto,
                        CantidadProducida: Number(d.CantidadProducida) || 0
                    })),
                    Estatus: finalizar
                };
                resA = await this.servicioProduccion.abastecerPedidoMasivo(datosAbastecerMasivo);
            } else {
                const datosAbastecer = {
                    CodigoPedidoProduccion: this.codigoPedido(),
                    Detalle: this.detalles().map((d: any) => ({
                        CodigoProducto: d.CodigoProducto,
                        CantidadProducida: Number(d.CantidadProducida) || 0
                    })),
                    Estatus: finalizar
                };
                resA = await this.servicioProduccion.abastecerPedido(datosAbastecer);
            }

            if (resA.success) {
                if (finalizar) {
                    this.servicioAlerta.MostrarExito('Pedido abastecido y finalizado correctamente');
                    this.router.navigate(['/produccion']);
                } else {
                    this.servicioAlerta.MostrarToast('Progreso guardado correctamente', 'success');
                    // No redirigimos para permitir seguir editando
                }
            } else {
                this.servicioAlerta.MostrarError(resA.message);
            }
        } catch (e: any) {
            this.servicioAlerta.MostrarError('Error al procesar producción: ' + e.message);
        } finally {
            this.guardando.set(false);
        }
    }

    async guardarConsumoInsumos() {
        this.guardando.set(true);
        try {
            const insumosFiltrados = this.insumos()
                .filter(i => Number(i.ConsumoReal) > 0)
                .map((i: any) => ({
                    CodigoProducto: +i.CodigoProducto,
                    CodigoUnidadMedida: +i.CodigoUnidadMedida,
                    Utilizada: +i.ConsumoReal
                }));

            if (!this.esMasivo() && !this.codigoProduccion()) {
                this.servicioAlerta.MostrarError('No se encontró la producción activa asociada a este pedido.');
                this.guardando.set(false);
                return;
            }

            if (insumosFiltrados.length === 0) {
                this.servicioAlerta.MostrarAlerta('Debe ingresar cantidades consumidas mayores a cero.');
                this.guardando.set(false);
                return;
            }

            let resC;
            if (this.esMasivo()) {
                const datosConsumoMasivo = {
                    Detalle: insumosFiltrados.map(i => ({ CodigoProducto: i.CodigoProducto, Utilizada: i.Utilizada }))
                };
                resC = await this.servicioProduccion.abastecerInsumosMasivo(datosConsumoMasivo);
            } else {
                const datosConsumo = {
                    CodigoProduccion: this.codigoProduccion(),
                    Insumos: insumosFiltrados
                };
                resC = await this.servicioProduccion.registrarConsumoInsumos(datosConsumo);
            }

            if (resC.success) {
                this.servicioAlerta.MostrarExito('Consumo de insumos registrado correctamente');
                this.insumosGuardados.set(true);

                // Punto 2: Redirección automática a la vista de productos para facilitar el "Abastecer"
                this.cambiarVista('productos');
            } else {
                this.servicioAlerta.MostrarError(resC.message);
            }
        } catch (e: any) {
            this.servicioAlerta.MostrarError('Error al registrar insumos: ' + e.message);
        } finally {
            this.guardando.set(false);
        }
    }

    cancelar() {
        this.router.navigate(['/produccion']);
    }
}
