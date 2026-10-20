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

    async editarCaja(caja: CajaAdmin) {
        // La lista no trae los usuarios asignados (solo el conteo): se pide la info completa
        // para precargar los checkboxes del modal.
        try {
            const res = await this.servicio.obtener(caja.CodigoCaja);
            this.cajaSeleccionada.set(res.success && res.data ? res.data : caja);
        } catch {
            this.cajaSeleccionada.set(caja);
        }
        this.mostrarModal.set(true);
    }

    cerrarModal() {
        this.mostrarModal.set(false);
        this.cajaSeleccionada.set(null);
    }

    async guardarCaja(ev: { codigoCaja: number | null; payload: GuardarCajaPayload }) {
        // Validación front: nombre único (el API igual lo valida).
        const nombre = ev.payload.Nombre.trim().toLowerCase();
        const duplicado = this.cajas().some(c =>
            c.Nombre.trim().toLowerCase() === nombre && c.CodigoCaja !== ev.codigoCaja);
        if (duplicado) {
            this.servicioAlerta.MostrarError('Ya existe una caja con ese nombre');
            return;
        }
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

    // Switch de la lista: activa o desactiva la caja según su estado actual.
    async alternarEstado(caja: CajaAdmin, ev: Event) {
        const input = ev.target as HTMLInputElement;
        // El switch vuelve a reflejar el estado real si la acción se bloquea/cancela.
        const resetSwitch = () => { input.checked = caja.Estatus === 1; };

        if (caja.Estatus === 1) {
            // --- Desactivar ---
            // Validación front: no desactivar una caja con turno abierto (el API igual lo valida).
            if (caja.TieneTurnoAbierto) {
                this.servicioAlerta.MostrarAlerta('No se puede desactivar: la caja tiene un turno abierto. Ciérrelo primero.');
                resetSwitch();
                return;
            }
            const confirmado = await this.servicioAlerta.Confirmacion(
                `¿Desactivar la caja "${caja.Nombre}"?`,
                'No se elimina (se conserva el histórico), solo queda inactiva.',
                'Sí, desactivar',
                'Cancelar'
            );
            if (!confirmado) { resetSwitch(); return; }
            try {
                const res = await this.servicio.inactivar(caja.CodigoCaja);
                if (res.success) {
                    this.servicioAlerta.MostrarExito('Caja desactivada');
                    await this.cargar();
                } else {
                    this.servicioAlerta.MostrarError(res.message, 'No se pudo desactivar');
                    resetSwitch();
                }
            } catch (e: any) {
                this.servicioAlerta.MostrarError(e, 'No se pudo desactivar');
                resetSwitch();
            }
        } else {
            // --- Reactivar ---
            try {
                const res = await this.servicio.activar(caja.CodigoCaja);
                if (res.success) {
                    this.servicioAlerta.MostrarExito('Caja activada');
                    await this.cargar();
                } else {
                    this.servicioAlerta.MostrarError(res.message, 'No se pudo activar');
                    resetSwitch();
                }
            } catch (e: any) {
                this.servicioAlerta.MostrarError(e, 'No se pudo activar');
                resetSwitch();
            }
        }
    }
}
