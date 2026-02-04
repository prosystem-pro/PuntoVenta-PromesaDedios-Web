import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-modal-proveedor',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-proveedor.html',
    styleUrl: './modal-proveedor.css'
})
export class ModalProveedor {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500'; // Valor por defecto
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    proveedorForm: FormGroup;

    constructor(private fb: FormBuilder) {
        this.proveedorForm = this.fb.group({
            nombre: ['', [Validators.required]],
            telefono: ['', [Validators.required]],
            nit: ['', [Validators.required]],
            direccion: ['', [Validators.required]],
            correo: ['', [Validators.required, Validators.email]],
            activo: [true]
        });
    }

    cerrar() {
        this.alCerrar.emit();
        this.proveedorForm.reset({ activo: true });
    }

    guardar() {
        if (this.proveedorForm.valid) {
            this.alGuardar.emit(this.proveedorForm.value);
            this.cerrar();
        } else {
            this.proveedorForm.markAllAsTouched();
        }
    }
}
