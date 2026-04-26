import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Compra } from '../../Modelos/compra.modelo';
import { CompraServicio } from '../../Servicios/compra.service';
import { Entorno } from '../../Entorno/Entorno';
import { CompraModal } from './compra-modal/compra-modal';
import { PagoModal } from './pago-modal/pago-modal';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-compras',
    standalone: true,
    imports: [CommonModule, FormsModule, CompraModal, PagoModal],
    templateUrl: './compras.html',
    styleUrl: './compras.css'
})
export class Compras implements OnInit {
    private servicioCompra = inject(CompraServicio);

    colorSistema = Entorno.ColorSistema;

    compras = signal<Compra[]>([]);
    cargando = signal(false);

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = signal(7);

    // Filtros inputs
    fechaInicioInput = signal('');
    fechaFinalInput = signal('');
    busqueda = signal('');

    // Filtros aplicados (cuando el usuario da click en Buscar)
    filtrosAplicados = signal({ inicio: '', fin: '' });

    // Estado del botón dinámico
    estaFiltrado = computed(() => this.filtrosAplicados().inicio !== '' || this.filtrosAplicados().fin !== '');
    haCambiadoFiltro = computed(() => {
        const { inicio, fin } = this.filtrosAplicados();
        return this.fechaInicioInput() !== inicio || this.fechaFinalInput() !== fin;
    });

    // Modales
    mostrarModalCompra = signal(false);
    mostrarModalPago = signal(false);
    compraSeleccionadaId = signal<number | null>(null);

    // Ordenamiento
    columnaActiva = signal<string | null>(null);
    ordenAscendente = signal(true);

    constructor() { }

    async ngOnInit() {
        await this.cargarCompras();
    }

    async cargarCompras() {
        this.cargando.set(true);
        try {
            const res = await this.servicioCompra.listar();
            if (res.success) {
                this.compras.set(res.data || []);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    aplicarFiltros() {
        this.filtrosAplicados.set({
            inicio: this.fechaInicioInput(),
            fin: this.fechaFinalInput()
        });
        this.paginaActual.set(1);
    }

    limpiarFiltros() {
        this.fechaInicioInput.set('');
        this.fechaFinalInput.set('');
        this.filtrosAplicados.set({ inicio: '', fin: '' });
        this.paginaActual.set(1);
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
        const { inicio, fin } = this.filtrosAplicados();
        const col = this.columnaActiva();
        const asc = this.ordenAscendente();

        let filtrados = this.compras().filter(c => {
            // 1. Filtro por texto extendido (Nombre, No, Pagos, Pendiente, Estatus)
            const coincideTexto =
                (c.Nombre?.toLowerCase() || '').includes(text) ||
                c.No.toString().includes(text) ||
                c.Pagos.toString().includes(text) ||
                c.Pendiente.toString().includes(text) ||
                (c.Estatus?.toLowerCase() || '').includes(text);

            if (!coincideTexto) return false;

            // 2. Filtro por rango de fechas aplicado
            if (inicio || fin) {
                const fechaV = c.Vencimiento;
                if (!fechaV) return false;

                if (inicio && fechaV < inicio) return false;
                if (fin && fechaV > fin) return false;
            }

            return true;
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

    paginasArray = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));

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
