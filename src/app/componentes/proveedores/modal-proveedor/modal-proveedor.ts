import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Proveedor } from '../../../Modelos/proveedor.modelo';

@Component({
    selector: 'app-modal-proveedor',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-proveedor.html',
    styleUrl: './modal-proveedor.css'
})
export class ModalProveedor implements OnChanges {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() proveedorAEditar: Proveedor | null = null;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    proveedorForm: FormGroup;
    modoEdicion = signal(false);

    constructor(private fb: FormBuilder) {
        this.proveedorForm = this.fb.group({
            NombreProveedor: ['', [Validators.required]],
            NIT: ['', [Validators.required]],
            Telefono: ['', [Validators.required]],
            Direccion: ['', [Validators.required]],
            Correo: ['', [Validators.required, Validators.email]],
            Estatus: [true]
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            if (this.proveedorAEditar) {
                this.modoEdicion.set(true);
                this.proveedorForm.patchValue({
                    NombreProveedor: this.proveedorAEditar.NombreProveedor,
                    NIT: this.proveedorAEditar.NIT,
                    Telefono: this.proveedorAEditar.Telefono,
                    Direccion: this.proveedorAEditar.Direccion,
                    Correo: this.proveedorAEditar.Correo,
                    Estatus: this.proveedorAEditar.Estatus === 1
                });
            } else {
                this.modoEdicion.set(false);
                this.proveedorForm.reset({ Estatus: true });
            }
        }
    }

    cerrar() {
        this.alCerrar.emit();
        this.proveedorForm.reset({ Estatus: true });
    }

    guardar() {
        if (this.proveedorForm.valid) {
            const formValue = this.proveedorForm.value;
            const datosParaGuardar = {
                ...formValue,
                Estatus: formValue.Estatus ? 1 : 0
            };

            this.alGuardar.emit(datosParaGuardar);
        } else {
            this.proveedorForm.markAllAsTouched();
        }
    }
}
