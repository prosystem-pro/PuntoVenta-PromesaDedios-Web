import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-modal-usuario',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-usuario.html',
    styleUrl: './modal-usuario.css'
})
export class ModalUsuario {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500'; // Valor por defecto
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    usuarioForm: FormGroup;
    mostrarPassword = signal(false);

    constructor(private fb: FormBuilder) {
        this.usuarioForm = this.fb.group({
            nombre: ['', [Validators.required]],
            celular: ['', [Validators.required]],
            direccion: ['', [Validators.required]],
            rol: ['', [Validators.required]],
            usuario: ['', [Validators.required]],
            contrasena: ['', [Validators.required]],
            activo: [true]
        });
    }

    cerrar() {
        this.alCerrar.emit();
        this.usuarioForm.reset({ activo: true });
    }

    guardar() {
        if (this.usuarioForm.valid) {
            this.alGuardar.emit(this.usuarioForm.value);
            this.cerrar();
        } else {
            this.usuarioForm.markAllAsTouched();
        }
    }

    togglePassword() {
        this.mostrarPassword.update(v => !v);
    }
}
