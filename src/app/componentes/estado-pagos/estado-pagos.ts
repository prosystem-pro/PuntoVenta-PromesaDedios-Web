import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { Entorno } from '../../Entorno/Entorno';
import { AbonoPedidoModal, PedidoAbono } from '../estado-pedidos/abono-pedido-modal/abono-pedido-modal';
import { EstadoPedidoServicio } from '../../Servicios/estado-pedido.service';
import { EstadoPagoCliente } from '../../Modelos/estado-pedido.modelo';
import { AlertaServicio } from '../../Servicios/alerta.service';

// Fila de la pantalla "Pagos de clientes" (GET /estadopedido/listado-estado-pago-cliente)
interface PagoCliente {
    CodigoPedidoProduccion: number | null;
    Pedido: string;
    Nombre: string;
    Pagos: string;        // cantidad de abonos realizados (texto del API)
    Pendiente: number;    // saldo pendiente (parseado de "Q0.00")
    Vencimiento: string | null;  // "dd/MM/yyyy HH:mm"
    FechaCreacion: string | null;
    Estatus: 'PAGADO' | 'PENDIENTE'; // derivado del Estado de la venta
}

@Component({
    selector: 'app-estado-pagos',
    standalone: true,
    imports: [CommonModule, FormsModule, AbonoPedidoModal],
    templateUrl: './estado-pagos.html',
    styleUrl: './estado-pagos.css'
})
export class EstadoPagos implements OnInit {
    private location = inject(Location);
    private servicio = inject(EstadoPedidoServicio);
    private servicioAlerta = inject(AlertaServicio);

    colorSistema = Entorno.ColorSistema;

    clientes = signal<PagoCliente[]>([]);
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

    // Modal de Pagos realizados
    mostrarAbono = signal(false);
    pedidoAbono = signal<PedidoAbono | null>(null);
    codigoAbono = signal<number | null>(null);
    // TODO: debe venir del rol del usuario logueado cuando se integre
    esSuperAdmin = true;

    async ngOnInit() {
        // Por defecto: del día 1 del mes actual a hoy (regla 02 del PO)
        const { inicio, fin } = this.rangoMesActual();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        await this.cargar();
    }

    // Muestra dd/MM/yyyy a partir de "dd/MM/yyyy HH:mm" (o lo que llegue).
    fechaCorta(fecha: string | null): string {
        if (!fecha) return '—';
        return fecha.trim().substring(0, 10);
    }

    // El API formatea el saldo como "Q3000.00"; extraemos el número para la columna.
    private parsearMonto(valor: string | null): number {
        if (!valor) return 0;
        const n = Number(String(valor).replace(/[^0-9.-]/g, ''));
        return isNaN(n) ? 0 : n;
    }

    // Fecha en formato YYYY-MM-DD
    private fmt(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // Rango del primer día del mes en curso a hoy
    private rangoMesActual(): { inicio: string; fin: string } {
        const hoy = new Date();
        const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        return { inicio: this.fmt(primero), fin: this.fmt(hoy) };
    }

    // Listado real de pagos de clientes. El API filtra por FechaCreacion y exige el rango.
    async cargar() {
        this.cargando.set(true);
        try {
            const { inicio, fin } = this.filtrosAplicados();
            const res = await this.servicio.listarPagosCliente(inicio, fin);
            const lista: EstadoPagoCliente[] = res.success ? (res.data || []) : [];
            this.clientes.set(lista.map(c => ({
                CodigoPedidoProduccion: c.CodigoPedidoProduccion,
                Pedido: c.Pedido,
                Nombre: c.Nombre || '—',
                Pagos: c.Pagos,
                Pendiente: this.parsearMonto(c.Pendiente),
                Vencimiento: c.Vencimiento,
                FechaCreacion: c.FechaCreacion,
                Estatus: c.Estado === 'PENDIENTE' ? 'PENDIENTE' : 'PAGADO'
            })));
        } catch (error: any) {
            // El API responde 404 cuando no hay registros: lista vacía.
            if (error?.response?.status === 404) {
                this.clientes.set([]);
            } else {
                this.servicioAlerta.MostrarError(error, 'No se pudo cargar el listado de pagos');
                this.clientes.set([]);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    regresar() {
        this.location.back();
    }

    async aplicarFiltros() {
        this.filtrosAplicados.set({ inicio: this.fechaInicioInput(), fin: this.fechaFinalInput() });
        this.paginaActual.set(1);
        await this.cargar();
    }

    async limpiarFiltros() {
        const { inicio, fin } = this.rangoMesActual();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        this.busqueda.set('');
        this.paginaActual.set(1);
        await this.cargar();
    }

    estaFiltrado = computed(() => {
        const { inicio, fin } = this.filtrosAplicados();
        if (!inicio || !fin) return false;
        const mes = this.rangoMesActual();
        return !(inicio === mes.inicio && fin === mes.fin);
    });
    haCambiadoFiltro = computed(() => {
        const { inicio, fin } = this.filtrosAplicados();
        return this.fechaInicioInput() !== inicio || this.fechaFinalInput() !== fin;
    });

    // Estatus de pago (badge)
    claseEstatus(e: string): string {
        return e === 'PAGADO' ? 'estado-pagado' : 'estado-pendiente';
    }
    etiquetaEstatus(e: string): string {
        return e === 'PAGADO' ? 'Pagado' : 'Pendiente';
    }

    ordenarPor(columna: string) {
        if (this.columnaActiva() === columna) {
            this.ordenAscendente.update(v => !v);
        } else {
            this.columnaActiva.set(columna);
            this.ordenAscendente.set(true);
        }
    }

    listadoFiltrado = computed(() => {
        const texto = this.busqueda().toLowerCase().trim();
        const col = this.columnaActiva();
        const asc = this.ordenAscendente();

        // El rango de fechas (por FechaCreacion) ya lo aplica el API. Aquí solo texto.
        let lista = this.clientes().filter(c =>
            !texto
            || c.Nombre.toLowerCase().includes(texto)
            || c.Pedido.toLowerCase().includes(texto)
        );

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

    clientesPaginados = computed(() => {
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

    // Abre el modal de Pagos realizados del cliente seleccionado.
    // El saldo, teléfono y abonos se cargan dentro del modal vía CodigoPedidoProduccion.
    abrirAbono(cliente: PagoCliente) {
        this.pedidoAbono.set({
            Fecha: this.fechaCorta(cliente.FechaCreacion),
            Documento: cliente.Pedido,
            Cliente: cliente.Nombre,
            SaldoPendiente: cliente.Pendiente
        });
        this.codigoAbono.set(cliente.CodigoPedidoProduccion);
        this.mostrarAbono.set(true);
    }

    cerrarAbono() {
        this.mostrarAbono.set(false);
        this.pedidoAbono.set(null);
        this.codigoAbono.set(null);
    }
}
