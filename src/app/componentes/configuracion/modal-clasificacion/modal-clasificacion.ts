import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';
import { ClasificacionMesa } from '../../../Modelos/clasificacion-mesa.modelo';
import { ServicioConfiguracion } from '../../../Servicios/configuracion.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';

@Component({
    selector: 'app-modal-clasificacion',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-clasificacion.html',
    styleUrl: './modal-clasificacion.css'
})
export class ModalClasificacion implements OnInit {
    private servicioConfig = inject(ServicioConfiguracion);
    private servicioAlerta = inject(AlertaServicio);
    private fb = inject(FormBuilder);

    @Input() visible = false;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<void>(); // Se usará para avisar que refresque el combo

    colorSistema = Entorno.ColorSistema;
    clasifForm: FormGroup;

    registros = signal<ClasificacionMesa[]>([]);

    paginaActual = signal(1);
    itemsPorPagina = 8;
    totalPaginas = computed(() => Math.ceil(this.registros().length / this.itemsPorPagina));

    registrosPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        return this.registros().slice(inicio, inicio + this.itemsPorPagina);
    });

    paginasArray = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));

    constructor() {
        this.clasifForm = this.fb.group({
            NombreClasificacion: ['', [Validators.required]],
            Estatus: [1, [Validators.required]]
        });
    }

    ngOnInit(): void {
        this.cargarDatos();
    }

    async cargarDatos() {
        const res = await this.servicioConfig.obtenerClasificaciones();
        if (res.success) {
            this.registros.set(res.data);
        }
    }

    cerrar() {
        this.alCerrar.emit();
        this.clasifForm.reset({ Estatus: 1 });
    }

    async agregar() {
        if (this.clasifForm.valid) {
            const res = await this.servicioConfig.crearClasificacion(this.clasifForm.value);
            if (res.success) {
                this.servicioAlerta.MostrarToast('Clasificación agregada');
                this.cargarDatos();
                this.clasifForm.reset({ Estatus: 1 });
                this.alGuardar.emit();
            } else {
                this.servicioAlerta.MostrarError(res, 'Error al agregar');
            }
        } else {
            this.clasifForm.markAllAsTouched();
        }
    }

    irAPagina(p: number) {
        if (p >= 1 && p <= this.totalPaginas()) {
            this.paginaActual.set(p);
        }
    }

    async eliminar(id: number) {
        const confirmado = await this.servicioAlerta.Confirmacion('¿Está seguro?', 'Se eliminará esta clasificación');
        if (confirmado) {
            const res = await this.servicioConfig.eliminarClasificacion(id);
            if (res.success) {
                this.servicioAlerta.MostrarToast('Clasificación eliminada');
                this.cargarDatos();
                this.alGuardar.emit();
            } else {
                this.servicioAlerta.MostrarError(res, 'Error al eliminar');
            }
        }
    }
}
