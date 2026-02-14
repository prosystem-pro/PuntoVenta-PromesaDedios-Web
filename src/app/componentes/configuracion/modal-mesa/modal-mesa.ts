import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';
import { Mesa } from '../../../Modelos/mesa.modelo';
import { ClasificacionMesa } from '../../../Modelos/clasificacion-mesa.modelo';
import { ModalClasificacion } from '../modal-clasificacion/modal-clasificacion';

@Component({
    selector: 'app-modal-mesa',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalClasificacion],
    templateUrl: './modal-mesa.html',
    styleUrl: './modal-mesa.css'
})
export class ModalMesa implements OnChanges {
    @Input() visible = false;
    @Input() mesaAEditar: Mesa | null = null;
    @Input() clasificaciones: ClasificacionMesa[] = [];
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();
    @Output() alRefrescarClasificaciones = new EventEmitter<void>();

    colorSistema = Entorno.ColorSistema;
    mesaForm: FormGroup;
    mostrarModalClasificacion = signal(false);
    modoEdicion = signal(false);

    iconos = [
        { id: 1, html: '<i class="bi bi-grid-3x3-gap"></i>' },
        { id: 2, html: '<i class="bi bi-border-all"></i>' }
    ];

    constructor(private fb: FormBuilder) {
        this.mesaForm = this.fb.group({
            CodigoClasificacionMesa: [null, [Validators.required]],
            NombreMesa: ['Mesa', [Validators.required]],
            CantidadMesas: [1, [Validators.required, Validators.min(1)]],
            Estatus: [true]
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['mesaAEditar'] && this.mesaAEditar) {
            this.modoEdicion.set(true);
            this.mesaForm.patchValue({
                CodigoClasificacionMesa: this.mesaAEditar.CodigoClasificacionMesa,
                NombreMesa: this.mesaAEditar.NombreMesa,
                CantidadMesas: this.mesaAEditar.CantidadMesas || 1,
                Estatus: this.mesaAEditar.Estatus === 1
            });
        } else if (changes['visible'] && this.visible && !this.mesaAEditar) {
            this.modoEdicion.set(false);
            this.mesaForm.reset({ NombreMesa: 'Mesa', CantidadMesas: 1, Estatus: true });
        }
    }

    cerrar() {
        this.alCerrar.emit();
        this.mesaForm.reset({ NombreMesa: 'Mesa', CantidadMesas: 1, Estatus: true });
    }

    guardar() {
        if (this.mesaForm.valid) {
            const formValue = this.mesaForm.value;
            const datosParaGuardar = {
                ...formValue,
                Estatus: formValue.Estatus ? 1 : 0
            };
            this.alGuardar.emit(datosParaGuardar);
        } else {
            this.mesaForm.markAllAsTouched();
        }
    }

    abrirClasificaciones() {
        this.mostrarModalClasificacion.set(true);
    }

    cerrarClasificaciones() {
        this.mostrarModalClasificacion.set(false);
    }

    manejarNuevaClasificacion() {
        this.alRefrescarClasificaciones.emit();
    }
}
