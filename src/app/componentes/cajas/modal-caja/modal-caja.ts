import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajaAdmin, UsuarioAsignable, GuardarCajaPayload } from '../../../Modelos/caja-admin.modelo';
import { CajaAdminServicio } from '../../../Servicios/caja-admin.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';

@Component({
    selector: 'app-modal-caja',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './modal-caja.html',
    styleUrl: './modal-caja.css'
})
export class ModalCaja implements OnChanges, OnInit {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() cajaAEditar: CajaAdmin | null = null;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<{ codigoCaja: number | null; payload: GuardarCajaPayload }>();

    private servicio = inject(CajaAdminServicio);
    private servicioAlerta = inject(AlertaServicio);

    nombre = signal<string>('');
    busqueda = signal<string>('');
    usuarios = signal<UsuarioAsignable[]>([]);
    seleccionados = signal<Set<number>>(new Set());
    guardando = signal(false);

    modoEdicion = computed(() => !!this.cajaAEditar);

    usuariosFiltrados = computed(() => {
        const t = this.busqueda().toLowerCase().trim();
        const lista = this.usuarios();
        return t ? lista.filter(u => u.Nombre.toLowerCase().includes(t)) : lista;
    });

    async ngOnInit() {
        const res = await this.servicio.obtenerUsuariosAsignables();
        if (res.success) this.usuarios.set(res.data || []);
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Al abrir, precargar (editar) o limpiar (crear).
        if (changes['visible'] && this.visible) {
            if (this.cajaAEditar) {
                this.nombre.set(this.cajaAEditar.Nombre);
                this.seleccionados.set(new Set(this.cajaAEditar.Usuarios || []));
            } else {
                this.nombre.set('');
                this.seleccionados.set(new Set());
            }
            this.busqueda.set('');
        }
    }

    estaSeleccionado(codigo: number): boolean {
        return this.seleccionados().has(codigo);
    }

    alternarUsuario(codigo: number): void {
        this.seleccionados.update(set => {
            const nuevo = new Set(set);
            nuevo.has(codigo) ? nuevo.delete(codigo) : nuevo.add(codigo);
            return nuevo;
        });
    }

    cerrar(): void {
        this.alCerrar.emit();
    }

    guardar(): void {
        const nombre = this.nombre().trim();
        if (!nombre) {
            this.servicioAlerta.MostrarError('Ingrese el nombre de la caja');
            return;
        }
        if (this.seleccionados().size === 0) {
            this.servicioAlerta.MostrarError('Seleccione al menos un usuario para esta caja');
            return;
        }
        const payload: GuardarCajaPayload = {
            Nombre: nombre,
            Usuarios: [...this.seleccionados()],
            ...(this.cajaAEditar ? { Estatus: this.cajaAEditar.Estatus } : {})
        };
        this.alGuardar.emit({ codigoCaja: this.cajaAEditar?.CodigoCaja ?? null, payload });
    }
}
