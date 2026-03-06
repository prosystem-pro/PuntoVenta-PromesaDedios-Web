import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProduccionServicio } from '../../../Servicios/produccion.service';
import { PedidoProduccion } from '../../../Modelos/produccion.modelo';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { PedidoCrearModal } from './pedido-crear-modal/pedido-crear-modal';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-produccion-listado',
    standalone: true,
    imports: [CommonModule, FormsModule, PedidoCrearModal],
    templateUrl: './produccion-listado.html',
    styleUrl: './produccion-listado.css'
})
export class ProduccionListado implements OnInit {
    private servicioProduccion = inject(ProduccionServicio);
    private servicioAlerta = inject(AlertaServicio);
    private router = inject(Router);

    colorSistema = Entorno.ColorSistema;

    vista = signal<'listado' | 'crear'>('listado');
    pedidos = signal<PedidoProduccion[]>([]);
    cargando = signal(false);

    // Filtros
    fechaInicio = signal('2025-11-25');
    fechaFinal = signal('2025-11-25');
    busqueda = signal('');

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = signal(7);

    constructor() { }

    async ngOnInit() {
        await this.cargarPedidos();
    }

    async cargarPedidos() {
        this.cargando.set(true);
        try {
            // Aquí se podrían pasar las fechas si el endpoint las aceptara
            // const res = await this.servicioProduccion.listarPedidos(this.fechaInicio(), this.fechaFinal());
            const res = await this.servicioProduccion.listarPedidos();
            if (res.success) {
                this.pedidos.set(res.data || []);
                this.paginaActual.set(1);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    listadoFiltrado = computed(() => {
        const text = this.busqueda().toLowerCase().trim();
        return this.pedidos().filter(p =>
            p.CodigoPedidoProduccion?.toString().includes(text) ||
            p.Nombre?.toLowerCase().includes(text) ||
            p.NumeroVenta?.toLowerCase().includes(text) ||
            p.Origen?.toLowerCase().includes(text) ||
            p.Observaciones?.toLowerCase().includes(text)
        );
    });

    // Paginación computada
    rangoInicio = computed(() => {
        if (this.totalRegistros() === 0) return 0;
        return (this.paginaActual() - 1) * this.itemsPorPagina() + 1;
    });

    rangoFin = computed(() => {
        return Math.min(this.paginaActual() * this.itemsPorPagina(), this.totalRegistros());
    });

    pedidosPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
        const fin = inicio + this.itemsPorPagina();
        return this.listadoFiltrado().slice(inicio, fin);
    });

    totalRegistros = computed(() => this.listadoFiltrado().length);
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

    async iniciarPedido(id: number) {
        const res = await this.servicioProduccion.iniciarProduccion(id);
        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message);
            await this.cargarPedidos();
        } else {
            this.servicioAlerta.MostrarError(res.message);
        }
    }

    async trabajarTodo() {
        try {
            const res = await this.servicioProduccion.iniciarProduccionMasiva();
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                await this.cargarPedidos();
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                this.servicioAlerta.MostrarError('No hay pedidos pendientes para iniciar');
            } else {
                this.servicioAlerta.MostrarError(error.response?.data?.message || 'Error al iniciar producciones masivas');
            }
        }
    }

    obtenerClaseEstado(estatus: number): string {
        switch (estatus) {
            case 1: return 'estado-espera';
            case 2: return 'estado-proceso';
            case 3: return 'estado-finalizado';
            default: return '';
        }
    }

    obtenerTextoEstado(estatus: number): string {
        switch (estatus) {
            case 1: return 'En espera';
            case 2: return 'En proceso';
            case 3: return 'Finalizado';
            default: return 'Desconocido';
        }
    }

    exportarExcel() {
        const datos = this.listadoFiltrado().map((p, i) => ({
            'No.': i + 1,
            'Pedido': p.CodigoPedidoProduccion,
            'No. Venta': p.NumeroVenta || 'N/A', // Añadido
            'Cliente': p.Nombre || 'Consumidor Final', // Añadido
            'Origen': p.Origen || 'Tienda',
            'Estado': this.obtenerTextoEstado(p.Estatus),
            'Fecha Entrega': p.FechaEntrega
        }));
        const hoja = XLSX.utils.json_to_sheet(datos);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Pedidos');
        XLSX.writeFile(libro, `Listado_Produccion_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    abrirCrearPedido() {
        this.vista.set('crear');
    }

    ingresarProduccion(id: number) {
        this.router.navigate(['/produccion/ingresar', id]);
    }

    abrirModalPedido() {
        this.vista.set('crear');
    }

    cerrarModalPedido(refrescar: boolean) {
        this.vista.set('listado');
        if (refrescar) {
            this.cargarPedidos();
        }
    }
}
