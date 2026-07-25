import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Entorno } from '../../Entorno/Entorno';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { HistorialVentaServicio } from '../../Servicios/historial-venta.service';
import { VentaHistorial } from '../../Modelos/historial-venta.modelo';
import { ComprobanteVenta } from '../../Modelos/venta.modelo';
import { ComprobanteVentaModal } from '../facturar/comprobante-venta-modal/comprobante-venta-modal';
import { MotivoModal } from '../compartidos/motivo-modal/motivo-modal';

@Component({
    selector: 'app-historial-ventas',
    standalone: true,
    imports: [CommonModule, FormsModule, ComprobanteVentaModal, MotivoModal],
    templateUrl: './historial-ventas.html',
    styleUrl: './historial-ventas.css'
})
export class HistorialVentas implements OnInit {
    private servicio = inject(HistorialVentaServicio);
    private servicioAlerta = inject(AlertaServicio);

    colorSistema = Entorno.ColorSistema;

    ventas = signal<VentaHistorial[]>([]);
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

    // Modal comprobante (lupa)
    mostrarFactura = signal(false);
    facturaData = signal<ComprobanteVenta | null>(null);
    cargandoFactura = signal<number | null>(null); // CodigoVenta en carga

    // Modal anular (motivo)
    mostrarAnular = signal(false);
    anularCodigoVenta = signal<number | null>(null);
    anulando = signal(false);

    async ngOnInit() {
        const { inicio, fin } = this.rangoDefecto();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        await this.cargar();
    }

    // Rango por defecto: mes actual completo (del día 1 al último). El API exige ambas fechas.
    private rangoDefecto(): { inicio: string; fin: string } {
        const d = new Date();
        const primero = new Date(d.getFullYear(), d.getMonth(), 1);
        const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const fmt = (x: Date) =>
            `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { inicio: fmt(primero), fin: fmt(ultimo) };
    }

    fechaCorta(fecha: string | null): string {
        if (!fecha) return '—';
        const f = fecha.trim();
        const fechaParte = f.substring(0, 10);
        const horaParte = f.substring(11, 16);
        if (horaParte && horaParte !== '00:00') return `${fechaParte} ${horaParte}`;
        return fechaParte;
    }

    async cargar() {
        this.cargando.set(true);
        try {
            const { inicio, fin } = this.filtrosAplicados();
            const res = await this.servicio.listar(inicio, fin);
            this.ventas.set(res.success ? (res.data || []) : []);
        } catch (error: any) {
            // El API responde 404 cuando no hay ventas: lo tratamos como lista vacía.
            if (error?.response?.status === 404) {
                this.ventas.set([]);
            } else {
                this.servicioAlerta.MostrarError(error, 'No se pudo cargar el historial de ventas');
                this.ventas.set([]);
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

    estaFiltrado = computed(() => {
        const { inicio, fin } = this.filtrosAplicados();
        const def = this.rangoDefecto();
        return !(inicio === def.inicio && fin === def.fin);
    });
    haCambiadoFiltro = computed(() => {
        const { inicio, fin } = this.filtrosAplicados();
        return this.fechaInicioInput() !== inicio || this.fechaFinalInput() !== fin;
    });

    // Estatus: CANCELADO (verde), ANULADO (rojo), resto neutro.
    etiquetaEstatus(e: string | null): string {
        switch (e) {
            case 'CANCELADO': return 'Cancelado';
            case 'ANULADO': return 'Anulado';
            case 'PENDIENTE': return 'Pendiente';
            case 'FACTURADO': return 'Facturado';
            case 'CERRADO': return 'Cerrado';
            default: return e || '—';
        }
    }
    claseEstatus(e: string | null): string {
        switch (e) {
            case 'CANCELADO': return 'estatus-cancelado';
            case 'ANULADO': return 'estatus-anulado';
            default: return 'estatus-neutro';
        }
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

        let lista = this.ventas().filter(v => {
            return !texto
                || (v.Documento?.toLowerCase() || '').includes(texto)
                || (v.Nombre?.toLowerCase() || '').includes(texto)
                || String(v.Monto).includes(texto);
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

    ventasPaginadas = computed(() => {
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

    // El anular no aplica a ventas ya anuladas.
    puedeAnular(v: VentaHistorial): boolean {
        return v.Estatus !== 'ANULADO';
    }

    // ----- Ver comprobante (lupa) -----
    async verFactura(v: VentaHistorial) {
        if (!v.CodigoVenta || this.cargandoFactura() !== null) {
            if (!v.CodigoVenta) this.servicioAlerta.MostrarAlerta('El listado aún no envía el código de la venta.');
            return;
        }
        this.cargandoFactura.set(v.CodigoVenta);
        try {
            const res = await this.servicio.obtenerFactura(v.CodigoVenta);
            if (res.success && res.data) {
                this.facturaData.set(res.data);
                this.mostrarFactura.set(true);
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo obtener el comprobante');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo obtener el comprobante');
        } finally {
            this.cargandoFactura.set(null);
        }
    }

    cerrarFactura() {
        this.mostrarFactura.set(false);
        this.facturaData.set(null);
    }

    // ----- Anular venta -----
    abrirAnular(v: VentaHistorial) {
        if (!v.CodigoVenta) {
            this.servicioAlerta.MostrarAlerta('El listado aún no envía el código de la venta.');
            return;
        }
        this.anularCodigoVenta.set(v.CodigoVenta);
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
            const res = await this.servicio.anularVenta(codigo, motivo);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Venta anulada correctamente.');
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
}
