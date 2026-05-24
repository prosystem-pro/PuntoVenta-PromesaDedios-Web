import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Proveedor } from '../../../Modelos/proveedor.modelo';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import {
    normalizarTitleCase,
    normalizarNIT,
    normalizarTelefono,
    normalizarTextoLimpio
} from '../../../Utils/normalizador';

@Component({
    selector: 'app-modal-proveedor',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-proveedor.html',
    styleUrl: './modal-proveedor.css',
    host: {
        'style': 'display: block; position: relative; z-index: 5000;'
    }
})
export class ModalProveedor implements OnChanges {
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() proveedorAEditar: Proveedor | null = null;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    proveedorForm: FormGroup;
    modoEdicion = signal(false);

    constructor(private fb: FormBuilder) {
        this.proveedorForm = this.fb.group({
            NombreProveedor: ['', [Validators.required, Validators.pattern(/^[a-zA-ZöüÖÜ'][a-zA-ZöüÖÜ' ]*$/)]],
            NIT: [''],
            Telefono: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
            Direccion: ['', [Validators.required, Validators.pattern(/^\S.*$/)]],
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
                    Estatus: this.proveedorAEditar.Estatus === 1
                });
            } else {
                this.modoEdicion.set(false);
                this.proveedorForm.reset({ Estatus: true });
            }
        }
    }

    private tieneInformacionPendiente(): boolean {
        if (this.modoEdicion()) return this.proveedorForm.dirty;
        const v = this.proveedorForm.getRawValue();
        return !!(
            (v.NombreProveedor || '').trim() ||
            (v.NIT || '').trim() ||
            (v.Telefono || '').trim() ||
            (v.Direccion || '').trim()
        );
    }

    async cerrar() {
        if (this.tieneInformacionPendiente()) {
            const continuar = await this.servicioAlerta.Confirmacion(
                '¿Cerrar sin guardar?',
                'Si cierra esta ventana, la información ingresada se perderá. ¿Desea continuar?',
                'Cerrar',
                'Cancelar'
            );
            if (!continuar) return;
        }
        this.alCerrar.emit();
        this.proveedorForm.reset({ Estatus: true });
    }

    normalizarCampo(campo: 'NombreProveedor' | 'NIT' | 'Telefono' | 'Direccion') {
        const ctrl = this.proveedorForm.get(campo);
        if (!ctrl) return;
        const valor = ctrl.value;
        let normalizado = valor;
        switch (campo) {
            case 'NombreProveedor': normalizado = normalizarTitleCase(valor); break;
            case 'NIT': normalizado = normalizarNIT(valor); break;
            case 'Telefono': normalizado = normalizarTelefono(valor); break;
            case 'Direccion': normalizado = normalizarTextoLimpio(valor); break;
        }
        if (normalizado !== valor) ctrl.setValue(normalizado, { emitEvent: false });
    }

    private normalizarFormulario() {
        (['NombreProveedor', 'NIT', 'Telefono', 'Direccion'] as const)
            .forEach(c => this.normalizarCampo(c));
    }

    guardar() {
        this.normalizarFormulario();
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
