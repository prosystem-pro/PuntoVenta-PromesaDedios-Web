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

    // Filtros
    fechaInicio = signal('2025-11-25');
    fechaFinal = signal('2025-11-25');
    busqueda = signal('');

    // Modales
    mostrarModalCompra = signal(false);
    mostrarModalPago = signal(false);
    compraSeleccionadaId = signal<number | null>(null);

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

    // Listado filtrado globalmente
    listadoFiltrado = computed(() => {
        const text = this.busqueda().toLowerCase();
        return this.compras().filter(c =>
            c.NombreProveedor.toLowerCase().includes(text) ||
            c.CodigoCompra.toString().includes(text)
        );
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

    abrirNuevaCompra() {
        this.mostrarModalCompra.set(true);
    }

    abrirPagos(id: number) {
        this.compraSeleccionadaId.set(id);
        this.mostrarModalPago.set(true);
    }

    eliminarCompra(id: number) {
        // Mockup delete
        console.log('Eliminar compra:', id);
    }

    exportarExcel() {
        const dataParaExportar = this.listadoFiltrado().map(c => ({
            'No. Compra': c.CodigoCompra,
            'Proveedor': c.NombreProveedor,
            'Fecha': c.FechaCompra,
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
