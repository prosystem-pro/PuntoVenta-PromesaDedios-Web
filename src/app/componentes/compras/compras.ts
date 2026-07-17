import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Compra } from '../../Modelos/compra.modelo';
import { CompraServicio } from '../../Servicios/compra.service';
import { Entorno } from '../../Entorno/Entorno';
import { CompraModal } from './compra-modal/compra-modal';
import { PagoModal } from './pago-modal/pago-modal';
import { MotivoModal } from '../compartidos/motivo-modal/motivo-modal';
import { AlertaServicio } from '../../Servicios/alerta.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-compras',
    standalone: true,
    imports: [CommonModule, FormsModule, CompraModal, PagoModal, MotivoModal],
    templateUrl: './compras.html',
    styleUrl: './compras.css'
})
export class Compras implements OnInit {
    private servicioCompra = inject(CompraServicio);
    private servicioAlerta = inject(AlertaServicio);

    colorSistema = Entorno.ColorSistema;

    compras = signal<Compra[]>([]);
    cargando = signal(false);

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = signal(6);

    // Filtros inputs
    fechaInicioInput = signal('');
    fechaFinalInput = signal('');
    busqueda = signal('');

    // Filtros aplicados (cuando el usuario da click en Buscar)
    filtrosAplicados = signal({ inicio: '', fin: '' });

    // Estado del botón dinámico
    // Solo se considera "filtrado" (botón Cancelar) cuando el rango aplicado es personalizado,
    // es decir, distinto al mes actual que se carga por defecto.
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

    // Modales
    mostrarModalCompra = signal(false);
    mostrarModalPago = signal(false);
    compraSeleccionadaId = signal<number | null>(null);

    // Anular compra (motivo)
    mostrarAnular = signal(false);
    compraAnularId = signal<number | null>(null);
    anulando = signal(false);

    // Ordenamiento
    columnaActiva = signal<string | null>(null);
    ordenAscendente = signal(true);

    constructor() { }

    async ngOnInit() {
        // Por defecto se muestran las compras del mes actual (regla de negocio del QA)
        const { inicio, fin } = this.rangoMesActual();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        await this.cargarCompras();
    }

    // Rango (YYYY-MM-DD) del primer al último día del mes en curso
    private rangoMesActual(): { inicio: string; fin: string } {
        const hoy = new Date();
        const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        const fmt = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { inicio: fmt(primero), fin: fmt(ultimo) };
    }

    async cargarCompras() {
        this.cargando.set(true);
        try {
            // El API filtra por FechaCompra; si por alguna razón falta el rango, usamos el mes actual
            const { inicio, fin } = this.filtrosAplicados();
            const rango = (inicio && fin) ? { inicio, fin } : this.rangoMesActual();
            const res = await this.servicioCompra.listar(rango.inicio, rango.fin);
            if (res.success) {
                this.compras.set(res.data || []);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    async aplicarFiltros() {
        this.filtrosAplicados.set({
            inicio: this.fechaInicioInput(),
            fin: this.fechaFinalInput()
        });
        this.paginaActual.set(1);
        await this.cargarCompras();
    }

    async limpiarFiltros() {
        // "Limpiar" regresa al rango por defecto (mes actual), no a "todas"
        const { inicio, fin } = this.rangoMesActual();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        this.paginaActual.set(1);
        await this.cargarCompras();
    }

    ordenarPor(columna: string) {
        if (this.columnaActiva() === columna) {
            this.ordenAscendente.update(v => !v);
        } else {
            this.columnaActiva.set(columna);
            this.ordenAscendente.set(true);
        }
    }

    // Listado filtrado y ordenado localmente
    listadoFiltrado = computed(() => {
        const text = this.busqueda().toLowerCase();
        const col = this.columnaActiva();
        const asc = this.ordenAscendente();

        // El filtro por fecha lo aplica el API (por FechaCompra); aquí solo texto y orden
        let filtrados = this.compras().filter(c => {
            const coincideTexto =
                (c.Nombre?.toLowerCase() || '').includes(text) ||
                c.No.toString().includes(text) ||
                c.Pagos.toString().includes(text) ||
                c.Pendiente.toString().includes(text) ||
                (c.Estatus?.toLowerCase() || '').includes(text);

            return coincideTexto;
        });

        // 3. Ordenamiento
        if (col) {
            filtrados.sort((a: any, b: any) => {
                let valA = a[col];
                let valB = b[col];

                // Manejo de nulos (null/undefined siempre al final)
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return asc ? -1 : 1;
                if (valA > valB) return asc ? 1 : -1;
                return 0;
            });
        }

        return filtrados;
    });

    // Listado paginado
    comprasPaginadas = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
        const fin = inicio + this.itemsPorPagina();
        return this.listadoFiltrado().slice(inicio, fin);
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
        if (p > 0 && p <= this.totalPaginas()) {
            this.paginaActual.set(p);
        }
    }

    paginaAnterior() {
        if (this.paginaActual() > 1) {
            this.paginaActual.update(p => p - 1);
        }
    }

    paginaSiguiente() {
        if (this.paginaActual() < this.totalPaginas()) {
            this.paginaActual.update(p => p + 1);
        }
    }

    async abrirNuevaCompra() {
        this.mostrarModalCompra.set(true);
    }

    async alCerrarModalCompra() {
        this.mostrarModalCompra.set(false);
        await this.cargarCompras();
    }

    abrirPagos(id: number) {
        this.compraSeleccionadaId.set(id);
        this.mostrarModalPago.set(true);
    }

    async alCerrarModalPago() {
        this.mostrarModalPago.set(false);
        this.compraSeleccionadaId.set(null);
        await this.cargarCompras();
    }

    abrirAnular(id: number) {
        this.compraAnularId.set(id);
        this.mostrarAnular.set(true);
    }

    cerrarAnular() {
        if (this.anulando()) return;
        this.mostrarAnular.set(false);
        this.compraAnularId.set(null);
    }

    async confirmarAnular(motivo: string) {
        const id = this.compraAnularId();
        if (!id) return;
        this.anulando.set(true);
        try {
            const res = await this.servicioCompra.anularCompra(id, motivo);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Compra anulada correctamente.');
                this.mostrarAnular.set(false);
                this.compraAnularId.set(null);
                await this.cargarCompras();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError(error);
        } finally {
            this.anulando.set(false);
        }
    }

    exportarExcel() {
        const dataParaExportar = this.listadoFiltrado().map(c => ({
            'No. Compra': c.No,
            'Proveedor': c.Nombre,
            'Pagos Realizados': c.Pagos,
            'Saldo Pendiente': c.Pendiente,
            'Vencimiento': c.Vencimiento,
            'Estatus': c.Estatus
        }));

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataParaExportar);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Compras');

        XLSX.writeFile(wb, `Listado_Compras_${new Date().getTime()}.xlsx`);
    }
}
