import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Usuario } from '../../../Modelos/usuario.modelo';
import { Rol } from '../../../Modelos/rol.modelo';
import { ServicioUsuario } from '../../../Servicios/usuario.service';

@Component({
    selector: 'app-modal-usuario',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-usuario.html',
    styleUrl: './modal-usuario.css'
})
export class ModalUsuario implements OnChanges, OnInit {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() usuarioAEditar: Usuario | null = null;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    private servicioUsuario = inject(ServicioUsuario);
    private fb = inject(FormBuilder);

    usuarioForm: FormGroup;
    mostrarPassword = signal(false);
    modoEdicion = signal(false);
    roles = signal<Rol[]>([]);

    constructor() {
        this.usuarioForm = this.fb.group({
            NombreCompleto: ['', [Validators.required]],
            Telefono: ['', [Validators.required]],
            Direccion: ['', [Validators.required]],
            Correo: ['', [Validators.required, Validators.email]],
            CodigoRol: [null, [Validators.required]],
            NombreUsuario: ['', [Validators.required]],
            Clave: ['', [Validators.required]],
            Estatus: [true]
        });
    }

    ngOnInit() {
        this.cargarRoles();
    }

    async cargarRoles() {
        const res = await this.servicioUsuario.obtenerRoles();
        if (res.success) {
            this.roles.set(res.data as Rol[]);
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['usuarioAEditar'] && this.usuarioAEditar) {
            this.modoEdicion.set(true);
            this.usuarioForm.patchValue({
                NombreCompleto: this.usuarioAEditar.NombreCompleto,
                Telefono: this.usuarioAEditar.Telefono,
                Direccion: this.usuarioAEditar.Direccion,
                Correo: this.usuarioAEditar.Correo,
                CodigoRol: this.usuarioAEditar.CodigoRol,
                NombreUsuario: this.usuarioAEditar.NombreUsuario,
                Clave: '', // No se carga la clave por seguridad
                Estatus: this.usuarioAEditar.Estatus === 1
            });
            // La clave no es obligatoria al editar
            this.usuarioForm.get('Clave')?.clearValidators();
            this.usuarioForm.get('Clave')?.updateValueAndValidity();
        } else if (changes['visible'] && this.visible && !this.usuarioAEditar) {
            this.modoEdicion.set(false);
            this.usuarioForm.reset({ CodigoRol: null, Estatus: true });
            this.usuarioForm.get('Clave')?.setValidators([Validators.required]);
            this.usuarioForm.get('Clave')?.updateValueAndValidity();
        }
    }

    cerrar() {
        this.alCerrar.emit();
        this.usuarioForm.reset({ CodigoRol: null, Estatus: true });
    }

    guardar() {
        if (this.usuarioForm.valid) {
            const formValue = this.usuarioForm.value;
            const datosParaGuardar = {
                ...formValue,
                Correo: formValue.Correo?.trim() === '' ? null : formValue.Correo,
                Estatus: formValue.Estatus ? 1 : 0
            };

            // Si estamos editando y no se puso clave, eliminamos el campo para no sobreescribir con vacio
            if (this.modoEdicion() && !datosParaGuardar.Clave) {
                delete datosParaGuardar.Clave;
            }

            this.alGuardar.emit(datosParaGuardar);
        } else {
            this.usuarioForm.markAllAsTouched();
            // Feedback visual para el usuario
            console.warn('Formulario inválido:', this.usuarioForm.errors);
            // Identificar qué campos fallan
            Object.keys(this.usuarioForm.controls).forEach(key => {
                const control = this.usuarioForm.get(key);
                if (control?.invalid) {
                    console.warn(`Campo inválido: ${key}`, control.errors);
                }
            });
        }
    }

    togglePassword() {
        this.mostrarPassword.update(v => !v);
    }
}
