import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EstadoPedido } from '../../Modelos/estado-pedido.modelo';
import { EstadoPedidoServicio } from '../../Servicios/estado-pedido.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { Entorno } from '../../Entorno/Entorno';
import { AbonoPedidoModal, PedidoAbono } from './abono-pedido-modal/abono-pedido-modal';
import { DetallePedidoModal } from './detalle-pedido-modal/detalle-pedido-modal';
import { MotivoModal } from '../compartidos/motivo-modal/motivo-modal';

@Component({
    selector: 'app-estado-pedidos',
    standalone: true,
    imports: [CommonModule, FormsModule, AbonoPedidoModal, DetallePedidoModal, MotivoModal],
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

    // Modal de abono
    mostrarAbono = signal(false);
    pedidoAbono = signal<PedidoAbono | null>(null);
    codigoAbono = signal<number | null>(null);
    // TODO: debe venir del rol del usuario logueado cuando se integre
    esSuperAdmin = true;

    // Modal de detalle de productos
    mostrarDetalle = signal(false);
    detalleCodigo = signal<number | null>(null);
    detalleDocumento = signal<string | null>(null);

    // Anular venta/pedido (fila CON_VENTA)
    mostrarAnular = signal(false);
    anularCodigoVenta = signal<number | null>(null);
    anulando = signal(false);

    // Eliminar pedido de producción (fila SOLO_PRODUCCION)
    mostrarEliminar = signal(false);
    eliminarCodigoPedido = signal<number | null>(null);
    eliminando = signal(false);

    async ngOnInit() {
        // Por defecto: mes actual (del día 1 a hoy). El API exige ambas fechas.
        const { inicio, fin } = this.rangoDefecto();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        await this.cargar();
    }

    // Muestra la fecha (dd/MM/yyyy) y agrega la hora solo si existe y no es 00:00.
    // El API manda "dd/MM/yyyy HH:mm" (o solo "dd/MM/yyyy" si no se capturó hora).
    fechaCorta(fecha: string | null): string {
        if (!fecha) return '—';
        const f = fecha.trim();
        const fechaParte = f.substring(0, 10);
        const horaParte = f.substring(11, 16); // "HH:mm"
        if (horaParte && horaParte !== '00:00') return `${fechaParte} ${horaParte}`;
        return fechaParte;
    }

    // Rango por defecto: mes actual COMPLETO (del día 1 al último día del mes).
    // Así se incluyen los pedidos con entrega/creación en días futuros del mes.
    // El API exige ambas fechas.
    private rangoDefecto(): { inicio: string; fin: string } {
        const d = new Date();
        const primero = new Date(d.getFullYear(), d.getMonth(), 1);
        const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const fmt = (x: Date) =>
            `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { inicio: fmt(primero), fin: fmt(ultimo) };
    }

    async cargar() {
        this.cargando.set(true);
        try {
            // El API filtra por FechaCreacion y exige el rango aplicado.
            const { inicio, fin } = this.filtrosAplicados();
            const res = await this.servicio.listar(inicio, fin);
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

    async aplicarFiltros() {
        this.filtrosAplicados.set({ inicio: this.fechaInicioInput(), fin: this.fechaFinalInput() });
        this.paginaActual.set(1);
        await this.cargar();
    }

    async limpiarFiltros() {
        const { inicio, fin } = this.rangoDefecto();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        this.busqueda.set('');
        this.paginaActual.set(1);
        await this.cargar();
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

    // Listado filtrado por texto y ordenado. El rango de fechas (por FechaCreacion)
    // ya lo aplica el API del lado del servidor.
    listadoFiltrado = computed(() => {
        const texto = this.busqueda().toLowerCase().trim();
        const col = this.columnaActiva();
        const asc = this.ordenAscendente();

        let lista = this.pedidos().filter(p => {
            return !texto
                || (p.Nombre?.toLowerCase() || '').includes(texto)
                || (p.NumeroDocumento?.toLowerCase() || '').includes(texto);
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

    // Abre el modal de Pagos realizados del pedido. El saldo, teléfono y los abonos
    // se cargan dentro del modal a partir del CodigoPedidoProduccion.
    abrirAbono(pedido: EstadoPedido) {
        this.pedidoAbono.set({
            Fecha: this.fechaCorta(pedido.FechaEntrega),
            Documento: pedido.NumeroDocumento,
            Cliente: pedido.Nombre
        });
        this.codigoAbono.set(pedido.CodigoPedidoProduccion);
        this.mostrarAbono.set(true);
    }

    cerrarAbono() {
        this.mostrarAbono.set(false);
        this.pedidoAbono.set(null);
        this.codigoAbono.set(null);
    }

    // --- Ver detalle de productos ---
    abrirDetalle(pedido: EstadoPedido) {
        this.detalleCodigo.set(pedido.CodigoPedidoProduccion);
        this.detalleDocumento.set(pedido.NumeroDocumento);
        this.mostrarDetalle.set(true);
    }
    cerrarDetalle() {
        this.mostrarDetalle.set(false);
        this.detalleCodigo.set(null);
        this.detalleDocumento.set(null);
    }

    // --- Anular venta/pedido (fila CON_VENTA) ---
    // Se muestra solo en pedidos con venta que no estén ya anulados.
    puedeAnular(pedido: EstadoPedido): boolean {
        return pedido.Tipo === 'CON_VENTA' && !!pedido.CodigoVenta && pedido.Estado !== 'ANULADO';
    }
    abrirAnular(pedido: EstadoPedido) {
        this.anularCodigoVenta.set(pedido.CodigoVenta);
        this.mostrarAnular.set(true);
    }
    cerrarAnular() {
        if (this.anulando()) return;
        this.mostrarAnular.set(false);
        this.anularCodigoVenta.set(null);
    }
    async confirmarAnular(motivo: string) {
        const codigo = this.anularCodigoVenta();
        if (!codigo) return;
        this.anulando.set(true);
        try {
            const res = await this.servicio.anularVentaPedido(codigo, motivo);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Pedido anulado correctamente.');
                this.mostrarAnular.set(false);
                this.anularCodigoVenta.set(null);
                await this.cargar();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError(error);
        } finally {
            this.anulando.set(false);
        }
    }

    // --- Eliminar pedido (fila SOLO_PRODUCCION, solo si está pendiente) ---
    puedeEliminar(pedido: EstadoPedido): boolean {
        return pedido.Tipo === 'SOLO_PRODUCCION' && pedido.Produccion === 'PENDIENTE' && !!pedido.CodigoPedidoProduccion;
    }
    abrirEliminar(pedido: EstadoPedido) {
        this.eliminarCodigoPedido.set(pedido.CodigoPedidoProduccion);
        this.mostrarEliminar.set(true);
    }
    cerrarEliminar() {
        if (this.eliminando()) return;
        this.mostrarEliminar.set(false);
        this.eliminarCodigoPedido.set(null);
    }
    async confirmarEliminar(motivo: string) {
        const codigo = this.eliminarCodigoPedido();
        if (!codigo) return;
        this.eliminando.set(true);
        try {
            const res = await this.servicio.eliminarPedido(codigo, motivo);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Pedido eliminado correctamente.');
                this.mostrarEliminar.set(false);
                this.eliminarCodigoPedido.set(null);
                await this.cargar();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError(error);
        } finally {
            this.eliminando.set(false);
        }
    }
    entregando = signal<number | null>(null); // CodigoPedidoProduccion en proceso

    async entregar(pedido: EstadoPedido) {
        if (!pedido.CodigoPedidoProduccion || this.entregando() !== null) return;

        const confirmado = await this.servicioAlerta.Confirmacion(
            'Entregar pedido',
            `¿Confirma la entrega del pedido ${pedido.NumeroDocumento}? Esta acción lo marca como facturado y no se podrá modificar.`,
            'Entregar'
        );
        if (!confirmado) return;

        this.entregando.set(pedido.CodigoPedidoProduccion);
        try {
            const res = await this.servicio.entregarPedido(pedido.CodigoPedidoProduccion);
            if (res.success) {
                this.servicioAlerta.MostrarToast(res.message || 'Pedido entregado correctamente', 'success');
                await this.cargar();
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo entregar el pedido');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo entregar el pedido');
        } finally {
            this.entregando.set(null);
        }
    }
}
