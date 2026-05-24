import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Cliente } from '../../../Modelos/cliente.modelo';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import {
    normalizarTitleCase,
    normalizarNIT,
    normalizarTelefono,
    normalizarTextoLimpio,
    esNITValido
} from '../../../Utils/normalizador';

function validadorNIT(control: AbstractControl): ValidationErrors | null {
    const valor = (control.value || '').toString().trim();
    if (!valor) return null;
    return esNITValido(valor) ? null : { nitInvalido: true };
}

@Component({
    selector: 'app-modal-cliente',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-cliente.html',
    styleUrl: './modal-cliente.css',
    host: {
        'style': 'display: block; position: relative; z-index: 5000;'
    }
})
export class ModalCliente implements OnChanges {
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() clienteAEditar: Cliente | null = null;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    clienteForm: FormGroup;
    modoEdicion = signal(false);

    constructor(private fb: FormBuilder) {
        this.clienteForm = this.fb.group({
            NombreCliente: ['', [Validators.required, Validators.pattern(/^[a-zA-ZñÑöüÖÜ'][a-zA-ZñÑöüÖÜ' ]*$/)]],
            NIT: ['', [Validators.maxLength(13), validadorNIT]],
            Telefono: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
            Direccion: ['', [Validators.required, Validators.pattern(/^\S.*$/)]],
            Estatus: [true]
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            if (this.clienteAEditar) {
                this.modoEdicion.set(true);
                this.clienteForm.patchValue({
                    NombreCliente: this.clienteAEditar.NombreCliente,
                    NIT: this.clienteAEditar.NIT,
                    Telefono: this.clienteAEditar.Telefono,
                    Direccion: this.clienteAEditar.Direccion,
                    Estatus: this.clienteAEditar.Estatus === 1
                });
                this.normalizarFormulario();
            } else {
                this.modoEdicion.set(false);
                this.clienteForm.reset({ Estatus: true });
            }
        }
    }

    private tieneInformacionPendiente(): boolean {
        if (this.modoEdicion()) return this.clienteForm.dirty;
        const v = this.clienteForm.getRawValue();
        return !!(
            (v.NombreCliente || '').trim() ||
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
        this.clienteForm.reset({ Estatus: true });
    }

    normalizarCampo(campo: 'NombreCliente' | 'NIT' | 'Telefono' | 'Direccion') {
        const ctrl = this.clienteForm.get(campo);
        if (!ctrl) return;
        const valor = ctrl.value;
        let normalizado = valor;
        switch (campo) {
            case 'NombreCliente': normalizado = normalizarTitleCase(valor); break;
            case 'NIT': normalizado = normalizarNIT(valor).slice(0, 13); break;
            case 'Telefono': normalizado = normalizarTelefono(valor); break;
            case 'Direccion': normalizado = normalizarTextoLimpio(valor); break;
        }
        if (normalizado !== valor) ctrl.setValue(normalizado, { emitEvent: false });
    }

    /**
     * Saneamiento en vivo: descarta caracteres no permitidos a medida que el usuario escribe,
     * sin aplicar Title Case (eso queda para el blur).
     */
    sanearEnVivo(campo: 'NombreCliente' | 'NIT' | 'Telefono' | 'Direccion') {
        const ctrl = this.clienteForm.get(campo);
        if (!ctrl) return;
        const valor = ctrl.value;
        if (valor == null) return;
        let saneado = valor.toString();
        switch (campo) {
            case 'NombreCliente': saneado = saneado.replace(/[^a-zA-ZñÑöüÖÜ' ]/g, '').replace(/^ +/, ''); break;
            case 'NIT': saneado = normalizarNIT(saneado).slice(0, 13); break;
            case 'Telefono': saneado = normalizarTelefono(saneado); break;
            case 'Direccion': saneado = saneado.replace(/^ +/, ''); break;
        }
        if (saneado !== valor) ctrl.setValue(saneado, { emitEvent: false });
    }

    private normalizarFormulario() {
        (['NombreCliente', 'NIT', 'Telefono', 'Direccion'] as const)
            .forEach(c => this.normalizarCampo(c));
    }

    guardar() {
        this.normalizarFormulario();
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
