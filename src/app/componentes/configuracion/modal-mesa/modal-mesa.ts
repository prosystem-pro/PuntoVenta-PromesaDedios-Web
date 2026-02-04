import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';
import { ModalClasificacion } from '../modal-clasificacion/modal-clasificacion';

@Component({
    selector: 'app-modal-mesa',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalClasificacion],
    templateUrl: './modal-mesa.html',
    styleUrl: './modal-mesa.css'
})
export class ModalMesa {
    @Input() visible = false;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    colorSistema = Entorno.ColorSistema;
    mesaForm: FormGroup;
    mostrarModalClasificacion = signal(false);

    clasificaciones = signal([
        { id: 1, nombre: 'Salon principal' },
        { id: 2, nombre: 'Jardin' },
        { id: 3, nombre: 'Terraza' }
    ]);

    iconos = [
        { id: 1, html: '<i class="bi bi-layout-wtf"></i>' },
        { id: 2, html: '<i class="bi bi-border-all"></i>' }
    ];

    constructor(private fb: FormBuilder) {
        this.mesaForm = this.fb.group({
            clasificacion: ['', [Validators.required]],
            nombre: ['Mesa', [Validators.required]],
            cantidad: [10, [Validators.required, Validators.min(1)]],
            icono: [1, [Validators.required]],
            activo: [true]
        });
    }

    cerrar() {
        this.alCerrar.emit();
        this.mesaForm.reset({ nombre: 'Mesa', cantidad: 10, icono: 1, activo: true });
    }

    guardar() {
        if (this.mesaForm.valid) {
            this.alGuardar.emit(this.mesaForm.value);
            this.cerrar();
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

    manejarNuevaClasificacion(nueva: any) {
        console.log('Nueva clasificacion recibida en ModalMesa:', nueva);
        const id = this.clasificaciones().length + 1;
        this.clasificaciones.update(c => [...c, { id: id, nombre: nueva.nombre }]);
    }
}
