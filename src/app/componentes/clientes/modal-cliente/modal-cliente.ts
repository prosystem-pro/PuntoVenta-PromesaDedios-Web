import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-modal-cliente',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-cliente.html',
    styleUrl: './modal-cliente.css'
})
export class ModalCliente {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500'; // Valor por defecto
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    clienteForm: FormGroup;

    constructor(private fb: FormBuilder) {
        this.clienteForm = this.fb.group({
            nombre: ['', [Validators.required]],
            nit: ['', [Validators.required]],
            direccion: ['', [Validators.required]],
            telefono: ['', [Validators.required]],
            activo: [true]
        });
    }

    cerrar() {
        this.alCerrar.emit();
        this.clienteForm.reset({ activo: true });
    }

    guardar() {
        if (this.clienteForm.valid) {
            this.alGuardar.emit(this.clienteForm.value);
            this.cerrar();
        } else {
            this.clienteForm.markAllAsTouched();
        }
    }
}
