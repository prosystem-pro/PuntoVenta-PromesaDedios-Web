import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Entorno } from '../../Entorno/Entorno';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { CajaAdminServicio } from '../../Servicios/caja-admin.service';
import { CajaAdmin, GuardarCajaPayload } from '../../Modelos/caja-admin.modelo';
import { ModalCaja } from './modal-caja/modal-caja';

@Component({
    selector: 'app-cajas',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalCaja],
    templateUrl: './cajas.html',
    styleUrl: './cajas.css'
})
export class Cajas implements OnInit {
    private servicio = inject(CajaAdminServicio);
    private servicioAlerta = inject(AlertaServicio);

    colorSistema = Entorno.ColorSistema;

    cajas = signal<CajaAdmin[]>([]);
    cargando = signal(false);
    busqueda = signal('');

    // Modal
    mostrarModal = signal(false);
    cajaSeleccionada = signal<CajaAdmin | null>(null);

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = 7;

    cajasFiltradas = computed(() => {
        const t = this.busqueda().toLowerCase().trim();
        return t ? this.cajas().filter(c => c.Nombre.toLowerCase().includes(t)) : this.cajas();
    });

    totalRegistros = computed(() => this.cajasFiltradas().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));
    cajasPaginadas = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        return this.cajasFiltradas().slice(inicio, inicio + this.itemsPorPagina);
    });
    rangoInicio = computed(() => this.totalRegistros() === 0 ? 0 : (this.paginaActual() - 1) * this.itemsPorPagina + 1);
    rangoFin = computed(() => Math.min(this.paginaActual() * this.itemsPorPagina, this.totalRegistros()));

    async ngOnInit() {
        await this.cargar();
    }

    async cargar() {
        this.cargando.set(true);
        try {
            const res = await this.servicio.listar();
            this.cajas.set(res.success ? (res.data || []) : []);
            this.paginaActual.set(1);
        } catch (e: any) {
            this.servicioAlerta.MostrarError(e, 'No se pudieron cargar las cajas');
            this.cajas.set([]);
        } finally {
            this.cargando.set(false);
        }
    }

    alCambiarBusqueda(ev: Event) {
        this.busqueda.set((ev.target as HTMLInputElement).value);
        this.paginaActual.set(1);
    }

    // Paginación
    irAPagina(p: number) { if (p >= 1 && p <= this.totalPaginas()) this.paginaActual.set(p); }
    paginaAnterior() { this.irAPagina(this.paginaActual() - 1); }
    paginaSiguiente() { this.irAPagina(this.paginaActual() + 1); }

    // Acciones
    crearCaja() {
        this.cajaSeleccionada.set(null);
        this.mostrarModal.set(true);
    }

    editarCaja(caja: CajaAdmin) {
        this.cajaSeleccionada.set(caja);
        this.mostrarModal.set(true);
    }

    cerrarModal() {
        this.mostrarModal.set(false);
        this.cajaSeleccionada.set(null);
    }

    async guardarCaja(ev: { codigoCaja: number | null; payload: GuardarCajaPayload }) {
        try {
            const res = ev.codigoCaja
                ? await this.servicio.editar(ev.codigoCaja, ev.payload)
                : await this.servicio.crear(ev.payload);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Caja guardada');
                this.cerrarModal();
                await this.cargar();
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo guardar la caja');
            }
        } catch (e: any) {
            this.servicioAlerta.MostrarError(e, 'No se pudo guardar la caja');
        }
    }

    async inactivarCaja(caja: CajaAdmin) {
        if (caja.Estatus === 0) {
            this.servicioAlerta.MostrarAlerta('La caja ya está desactivada');
            return;
        }
        const confirmado = await this.servicioAlerta.Confirmacion(
            `¿Desactivar la caja "${caja.Nombre}"?`,
            'No se elimina (se conserva el histórico), solo queda inactiva.',
            'Sí, desactivar',
            'Cancelar'
        );
        if (!confirmado) return;
        try {
            const res = await this.servicio.inactivar(caja.CodigoCaja);
            if (res.success) {
                this.servicioAlerta.MostrarExito('Caja desactivada');
                await this.cargar();
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo desactivar');
            }
        } catch (e: any) {
            this.servicioAlerta.MostrarError(e, 'No se pudo desactivar');
        }
    }
}
