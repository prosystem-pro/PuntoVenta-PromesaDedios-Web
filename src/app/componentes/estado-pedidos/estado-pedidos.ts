import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EstadoPedido } from '../../Modelos/estado-pedido.modelo';
import { EstadoPedidoServicio } from '../../Servicios/estado-pedido.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { Entorno } from '../../Entorno/Entorno';
import { AbonoPedidoModal, PedidoAbono } from './abono-pedido-modal/abono-pedido-modal';

@Component({
    selector: 'app-estado-pedidos',
    standalone: true,
    imports: [CommonModule, FormsModule, AbonoPedidoModal],
    templateUrl: './estado-pedidos.html',
    styleUrl: './estado-pedidos.css'
})
export class EstadoPedidos implements OnInit {
    private servicio = inject(EstadoPedidoServicio);
    private servicioAlerta = inject(AlertaServicio);
    private router = inject(Router);

    colorSistema = Entorno.ColorSistema;

    pedidos = signal<EstadoPedido[]>([]);
    cargando = signal(false);

    // Filtros
    fechaInicioInput = signal('');
    fechaFinalInput = signal('');
    busqueda = signal('');
    filtrosAplicados = signal({ inicio: '', fin: '' });

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = signal(10);

    // Ordenamiento
    columnaActiva = signal<string | null>(null);
    ordenAscendente = signal(true);

    // Modal de abono (diseño; sin endpoint todavía)
    mostrarAbono = signal(false);
    pedidoAbono = signal<PedidoAbono | null>(null);
    // TODO: debe venir del rol del usuario logueado cuando se integre
    esSuperAdmin = true;

    async ngOnInit() {
        // Por defecto: entregas de hoy en adelante (sin tope superior)
        const { inicio, fin } = this.rangoDefecto();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        await this.cargar();
    }

    // Fecha de hoy en formato YYYY-MM-DD
    private hoyISO(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // Rango por defecto: desde hoy en adelante (fin vacío = sin límite superior)
    private rangoDefecto(): { inicio: string; fin: string } {
        return { inicio: this.hoyISO(), fin: '' };
    }

    async cargar() {
        this.cargando.set(true);
        try {
            const res = await this.servicio.listar();
            this.pedidos.set(res.success ? (res.data || []) : []);
        } catch (error: any) {
            // El API responde 404 cuando no hay pedidos: lo tratamos como lista vacía
            if (error?.response?.status === 404) {
                this.pedidos.set([]);
            } else {
                this.servicioAlerta.MostrarError(error, 'No se pudo cargar el listado de pedidos');
                this.pedidos.set([]);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    aplicarFiltros() {
        this.filtrosAplicados.set({ inicio: this.fechaInicioInput(), fin: this.fechaFinalInput() });
        this.paginaActual.set(1);
    }

    limpiarFiltros() {
        const { inicio, fin } = this.rangoDefecto();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        this.busqueda.set('');
        this.paginaActual.set(1);
    }

    // El botón cambia a "Cancelar" solo cuando el rango aplicado es distinto al de por defecto
    estaFiltrado = computed(() => {
        const { inicio, fin } = this.filtrosAplicados();
        const def = this.rangoDefecto();
        return !(inicio === def.inicio && fin === def.fin);
    });
    haCambiadoFiltro = computed(() => {
        const { inicio, fin } = this.filtrosAplicados();
        return this.fechaInicioInput() !== inicio || this.fechaFinalInput() !== fin;
    });

    // --- Mapeo de estado de producción a etiqueta + color (prototipo) ---
    etiquetaProduccion(p: string | null): string {
        switch (p) {
            case 'PENDIENTE': return 'En espera';
            case 'EN_PROCESO': return 'En proceso';
            case 'PENDIENTE_AUTORIZACION': return 'Pend. autorización';
            case 'FINALIZADO': return 'Finalizado';
            default: return '—';
        }
    }

    claseProduccion(p: string | null): string {
        switch (p) {
            case 'PENDIENTE': return 'prod-espera';
            case 'EN_PROCESO': return 'prod-proceso';
            case 'PENDIENTE_AUTORIZACION': return 'prod-autorizacion';
            case 'FINALIZADO': return 'prod-finalizado';
            default: return 'text-muted';
        }
    }

    // --- Estado de pago: PENDIENTE (por cobrar) / CANCELADO (pagado) ---
    etiquetaEstado(e: string | null): string {
        switch (e) {
            case 'PENDIENTE': return 'Pendiente';
            case 'CANCELADO': return 'Cancelado';
            default: return '—';
        }
    }

    claseEstado(e: string | null): string {
        switch (e) {
            case 'PENDIENTE': return 'estado-pendiente';
            case 'CANCELADO': return 'estado-cancelado';
            default: return 'estado-neutro';
        }
    }

    // Solo se puede entregar cuando el pago está cancelado y la producción finalizada.
    puedeEntregar(pedido: EstadoPedido): boolean {
        return pedido.Estado === 'CANCELADO' && pedido.Produccion === 'FINALIZADO';
    }

    ordenarPor(columna: string) {
        if (this.columnaActiva() === columna) {
            this.ordenAscendente.update(v => !v);
        } else {
            this.columnaActiva.set(columna);
            this.ordenAscendente.set(true);
        }
    }

    // Listado filtrado (texto + rango de fecha de entrega) y ordenado
    listadoFiltrado = computed(() => {
        const texto = this.busqueda().toLowerCase().trim();
        const { inicio, fin } = this.filtrosAplicados();
        const col = this.columnaActiva();
        const asc = this.ordenAscendente();

        let lista = this.pedidos().filter(p => {
            const coincideTexto = !texto
                || (p.Nombre?.toLowerCase() || '').includes(texto)
                || (p.Pedido?.toLowerCase() || '').includes(texto);

            // Filtro por fecha de entrega (el API no filtra). inicio y fin son
            // independientes: con fin vacío no hay tope superior (hoy en adelante).
            let coincideFecha = true;
            if (p.FechaEntrega) {
                const fecha = p.FechaEntrega.substring(0, 10);
                if (inicio && fecha < inicio) coincideFecha = false;
                if (fin && fecha > fin) coincideFecha = false;
            }
            return coincideTexto && coincideFecha;
        });

        if (col) {
            lista = [...lista].sort((a: any, b: any) => {
                let valA = a[col];
                let valB = b[col];
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return asc ? -1 : 1;
                if (valA > valB) return asc ? 1 : -1;
                return 0;
            });
        }
        return lista;
    });

    pedidosPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
        return this.listadoFiltrado().slice(inicio, inicio + this.itemsPorPagina());
    });

    totalRegistros = computed(() => this.listadoFiltrado().length);
    rangoInicio = computed(() => this.totalRegistros() === 0 ? 0 : (this.paginaActual() - 1) * this.itemsPorPagina() + 1);
    rangoFin = computed(() => Math.min(this.paginaActual() * this.itemsPorPagina(), this.totalRegistros()));
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina()));

    paginasVisibles = computed<(number | string)[]>(() => {
        const actual = this.paginaActual();
        const total = this.totalPaginas();
        if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
        if (actual <= 3) return [1, 2, 3, 4, '...', total];
        if (actual >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
        return [1, '...', actual - 1, actual, actual + 1, '...', total];
    });

    irAPagina(p: number) {
        if (p > 0 && p <= this.totalPaginas()) this.paginaActual.set(p);
    }
    paginaAnterior() {
        if (this.paginaActual() > 1) this.paginaActual.update(p => p - 1);
    }
    paginaSiguiente() {
        if (this.paginaActual() < this.totalPaginas()) this.paginaActual.update(p => p + 1);
    }

    // Navega a la pantalla "Estado de pagos / Pagos de clientes"
    abrirEstadoPagos() {
        this.router.navigate(['/estado-pagos']);
    }

    // Doble clic en una fila: abre el modal de Pagos realizados del pedido.
    // (Diseño: el saldo y los pagos vendrán del API cuando exista el endpoint.)
    abrirAbono(pedido: EstadoPedido) {
        this.pedidoAbono.set({
            Fecha: pedido.FechaEntrega,
            Documento: pedido.Pedido,
            Cliente: pedido.Nombre,
            Telefono: '—',
            // Saldo de ejemplo mientras el API no lo devuelva
            SaldoPendiente: 3000
        });
        this.mostrarAbono.set(true);
    }

    cerrarAbono() {
        this.mostrarAbono.set(false);
        this.pedidoAbono.set(null);
    }
    entregar(pedido: EstadoPedido) {
        this.servicioAlerta.MostrarInfo(`La entrega del pedido ${pedido.Pedido} estará disponible cuando el API tenga el endpoint correspondiente.`, 'Pendiente');
    }
}
