import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Entorno } from '../../Entorno/Entorno';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { HistorialCajaServicio } from '../../Servicios/historial-caja.service';
import { CierreCajaHistorial, DetalleCierreHistorial } from '../../Modelos/historial-caja.modelo';

@Component({
    selector: 'app-historial-caja',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './historial-caja.html',
    styleUrl: './historial-caja.css'
})
export class HistorialCaja implements OnInit {
    private servicio = inject(HistorialCajaServicio);
    private servicioAlerta = inject(AlertaServicio);

    colorSistema = Entorno.ColorSistema;

    // Vista interna: 'listado' (tabla) o 'detalle' (pantalla de cierre, como /caja).
    vista = signal<'listado' | 'detalle'>('listado');

    cierres = signal<CierreCajaHistorial[]>([]);
    cargando = signal(false);

    // Filtros de fecha (se aplican al presionar Buscar).
    fechaInicioInput = signal('');
    fechaFinalInput = signal('');
    filtrosAplicados = signal({ inicio: '', fin: '' });
    busqueda = signal('');

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = signal(10);

    // Ordenamiento
    columnaActiva = signal<string | null>(null);
    ordenAscendente = signal(true);

    // Detalle (lupa)
    detalle = signal<DetalleCierreHistorial | null>(null);
    cargandoDetalle = signal<number | null>(null);

    async ngOnInit() {
        const { inicio, fin } = this.rangoDefecto();
        this.fechaInicioInput.set(inicio);
        this.fechaFinalInput.set(fin);
        this.filtrosAplicados.set({ inicio, fin });
        await this.cargar();
    }

    // Rango por defecto: mes actual (del día 1 a hoy).
    private rangoDefecto(): { inicio: string; fin: string } {
        const d = new Date();
        const primero = new Date(d.getFullYear(), d.getMonth(), 1);
        const fmt = (x: Date) =>
            `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        return { inicio: fmt(primero), fin: fmt(d) };
    }

    async cargar() {
        const { inicio, fin } = this.filtrosAplicados();
        this.cargando.set(true);
        try {
            const res = await this.servicio.listar(inicio, fin);
            this.cierres.set(res.success ? (res.data || []) : []);
            this.paginaActual.set(1);
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo cargar el historial de caja');
            this.cierres.set([]);
        } finally {
            this.cargando.set(false);
        }
    }

    async buscar() {
        const inicio = this.fechaInicioInput();
        const fin = this.fechaFinalInput();
        if (inicio && fin && inicio > fin) {
            this.servicioAlerta.MostrarError('La fecha de inicio no puede ser mayor a la fecha final');
            return;
        }
        this.filtrosAplicados.set({ inicio, fin });
        await this.cargar();
    }

    // Muestra "dd/MM/yyyy HH:mm" tal como viene.
    fechaCorta(fecha: string | null): string {
        if (!fecha) return '—';
        return fecha.trim();
    }

    ordenarPor(columna: string) {
        if (this.columnaActiva() === columna) {
            this.ordenAscendente.update(v => !v);
        } else {
            this.columnaActiva.set(columna);
            this.ordenAscendente.set(true);
        }
        this.paginaActual.set(1);
    }

    listadoFiltrado = computed(() => {
        const texto = this.busqueda().toLowerCase().trim();
        const col = this.columnaActiva();
        const asc = this.ordenAscendente();

        let lista = this.cierres().filter(c =>
            !texto
            || (c.NombreUsuario?.toLowerCase() || '').includes(texto)
            || (c.FechaApertura?.toLowerCase() || '').includes(texto)
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

    cierresPaginados = computed(() => {
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

    // ----- Detalle (lupa) -> abre la vista completa de cierre -----
    async verDetalle(c: CierreCajaHistorial) {
        if (this.cargandoDetalle() !== null) return;
        this.cargandoDetalle.set(c.CodigoAperturaCaja);
        try {
            const res = await this.servicio.obtenerDetalle(c.CodigoAperturaCaja);
            if (res.success && res.data) {
                this.detalle.set(res.data);
                this.vista.set('detalle');
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo obtener el detalle del cierre');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo obtener el detalle del cierre');
        } finally {
            this.cargandoDetalle.set(null);
        }
    }

    volverAlListado() {
        this.vista.set('listado');
        this.detalle.set(null);
    }
}
