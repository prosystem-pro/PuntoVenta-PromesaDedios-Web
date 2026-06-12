import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { Entorno } from '../../Entorno/Entorno';
import { AbonoPedidoModal, PedidoAbono } from '../estado-pedidos/abono-pedido-modal/abono-pedido-modal';

// Fila de la pantalla "Pagos de clientes" (diseño; vendrá del API cuando exista el endpoint)
interface PagoCliente {
    Pedido: string;
    Nombre: string;
    Telefono: string;
    Documento: string;
    Fecha: string;        // fecha del pedido (ISO)
    Pagos: number;        // cantidad de abonos realizados
    Pendiente: number;    // saldo pendiente
    Vencimiento: string;  // fecha de vencimiento (ISO)
    Estatus: 'PAGADO' | 'PENDIENTE';
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

    // Modal de Pagos realizados (diseño; sin endpoint todavía)
    mostrarAbono = signal(false);
    pedidoAbono = signal<PedidoAbono | null>(null);
    // TODO: debe venir del rol del usuario logueado cuando se integre
    esSuperAdmin = true;

    ngOnInit() {
        // Por defecto: del día 1 del mes actual a hoy (regla 02 del PO)
        const { inicio, fin } = this.rangoMesActual();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        this.cargar();
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

    // Datos de ejemplo (diseño). Con API: GET del listado de pagos de clientes.
    cargar() {
        this.cargando.set(true);
        const hoy = new Date();
        const diaDelMes = (dia: number) =>
            new Date(hoy.getFullYear(), hoy.getMonth(), dia).toISOString();

        const ejemplo: PagoCliente[] = [
            { Pedido: '450923456', Nombre: 'Carlos Merida de Leon', Telefono: '3098-2343', Documento: '9872619211', Fecha: diaDelMes(1), Pagos: 1, Pendiente: 0, Vencimiento: diaDelMes(10), Estatus: 'PAGADO' },
            { Pedido: '450923457', Nombre: 'Maria de Leon', Telefono: '5544-1122', Documento: '9872619212', Fecha: diaDelMes(2), Pagos: 3, Pendiente: 3000, Vencimiento: diaDelMes(10), Estatus: 'PENDIENTE' },
            { Pedido: '450923458', Nombre: 'Karla Maria castro de soto', Telefono: '5544-3344', Documento: '9872619213', Fecha: diaDelMes(3), Pagos: 4, Pendiente: 5000, Vencimiento: diaDelMes(10), Estatus: 'PENDIENTE' },
            { Pedido: '450923459', Nombre: 'Erickson Ricardo de Leon Castro', Telefono: '5544-5566', Documento: '9872619214', Fecha: diaDelMes(4), Pagos: 2, Pendiente: 2000, Vencimiento: diaDelMes(10), Estatus: 'PENDIENTE' },
            { Pedido: '450923460', Nombre: 'Maria Juana Yoxon', Telefono: '5544-7788', Documento: '9872619215', Fecha: diaDelMes(5), Pagos: 3, Pendiente: 1000, Vencimiento: diaDelMes(10), Estatus: 'PENDIENTE' },
            { Pedido: '450923461', Nombre: 'Isabel Castro Soto', Telefono: '5544-9900', Documento: '9872619216', Fecha: diaDelMes(6), Pagos: 2, Pendiente: 0, Vencimiento: diaDelMes(20), Estatus: 'PAGADO' },
            { Pedido: '450923462', Nombre: 'Angel Vicente Mejia Castro', Telefono: '5544-1212', Documento: '9872619217', Fecha: diaDelMes(7), Pagos: 1, Pendiente: 0, Vencimiento: diaDelMes(20), Estatus: 'PAGADO' },
            { Pedido: '450923463', Nombre: 'Karla Soto de Leon', Telefono: '5544-3434', Documento: '9872619218', Fecha: diaDelMes(8), Pagos: 4, Pendiente: 0, Vencimiento: diaDelMes(20), Estatus: 'PAGADO' },
            { Pedido: '450923464', Nombre: 'Douglas Claveri Castro Soto', Telefono: '5544-5656', Documento: '9872619219', Fecha: diaDelMes(9), Pagos: 5, Pendiente: 3000, Vencimiento: diaDelMes(10), Estatus: 'PENDIENTE' },
            { Pedido: '450923465', Nombre: 'Maria Sosa', Telefono: '5544-7878', Documento: '9872619220', Fecha: diaDelMes(10), Pagos: 3, Pendiente: 0, Vencimiento: diaDelMes(20), Estatus: 'PAGADO' }
        ];
        this.clientes.set(ejemplo);
        this.cargando.set(false);
    }

    regresar() {
        this.location.back();
    }

    aplicarFiltros() {
        this.filtrosAplicados.set({ inicio: this.fechaInicioInput(), fin: this.fechaFinalInput() });
        this.paginaActual.set(1);
    }

    limpiarFiltros() {
        const { inicio, fin } = this.rangoMesActual();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        this.busqueda.set('');
        this.paginaActual.set(1);
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
        const { inicio, fin } = this.filtrosAplicados();
        const col = this.columnaActiva();
        const asc = this.ordenAscendente();

        let lista = this.clientes().filter(c => {
            const coincideTexto = !texto
                || c.Nombre.toLowerCase().includes(texto)
                || c.Pedido.toLowerCase().includes(texto);

            // Filtro por fecha de vencimiento dentro del rango
            let coincideFecha = true;
            if (inicio && fin && c.Vencimiento) {
                const fecha = c.Vencimiento.substring(0, 10);
                coincideFecha = fecha >= inicio && fecha <= fin;
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

    // Abre el modal de Pagos realizados del cliente seleccionado
    abrirAbono(cliente: PagoCliente) {
        this.pedidoAbono.set({
            Fecha: cliente.Fecha,
            Documento: cliente.Documento,
            Cliente: cliente.Nombre,
            Telefono: cliente.Telefono,
            SaldoPendiente: cliente.Pendiente
        });
        this.mostrarAbono.set(true);
    }

    cerrarAbono() {
        this.mostrarAbono.set(false);
        this.pedidoAbono.set(null);
    }
}
