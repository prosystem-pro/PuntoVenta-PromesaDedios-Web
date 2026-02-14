import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Cliente } from '../../../Modelos/cliente.modelo';

@Component({
    selector: 'app-modal-cliente',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-cliente.html',
    styleUrl: './modal-cliente.css'
})
export class ModalCliente implements OnChanges {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() clienteAEditar: Cliente | null = null;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    clienteForm: FormGroup;
    modoEdicion = signal(false);

    constructor(private fb: FormBuilder) {
        this.clienteForm = this.fb.group({
            NombreCliente: ['', [Validators.required]],
            NIT: ['', [Validators.required]],
            Direccion: ['', [Validators.required]],
            Telefono: ['', [Validators.required]],
            Estatus: [true]
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['clienteAEditar'] && this.clienteAEditar) {
            this.modoEdicion.set(true);
            this.clienteForm.patchValue({
                NombreCliente: this.clienteAEditar.NombreCliente,
                NIT: this.clienteAEditar.NIT,
                Direccion: this.clienteAEditar.Direccion,
                Telefono: this.clienteAEditar.Telefono,
                Estatus: this.clienteAEditar.Estatus === 1
            });
        } else if (changes['visible'] && this.visible && !this.clienteAEditar) {
            this.modoEdicion.set(false);
            this.clienteForm.reset({ Estatus: true });
        }
    }

    cerrar() {
        this.alCerrar.emit();
        this.clienteForm.reset({ Estatus: true });
    }

    guardar() {
        if (this.clienteForm.valid) {
            const formValue = this.clienteForm.value;
            const datosParaGuardar = {
                ...formValue,
                Estatus: formValue.Estatus ? 1 : 0
            };
            this.alGuardar.emit(datosParaGuardar);
        } else {
            this.clienteForm.markAllAsTouched();
        }
    }
}
