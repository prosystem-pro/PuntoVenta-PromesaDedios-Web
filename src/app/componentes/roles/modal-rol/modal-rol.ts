import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';

@Component({
    selector: 'app-modal-rol',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-rol.html',
    styleUrl: './modal-rol.css'
})
export class ModalRol {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    rolForm: FormGroup;

    modulos = [
        { id: 'caja', label: 'Caja' },
        { id: 'productos', label: 'Productos' },
        { id: 'usuarios', label: 'Usuarios' },
        { id: 'venta_mesa', label: 'Venta en mesa' },
        { id: 'produccion', label: 'Producción' },
        { id: 'roles_permisos', label: 'Roles y permisos' },
        { id: 'facturar', label: 'Facturar' },
        { id: 'cocina', label: 'Cocina' },
        { id: 'terminales', label: 'Terminales' },
        { id: 'estado_pedido', label: 'Estado pedido' },
        { id: 'clientes', label: 'Clientes' },
        { id: 'configuracion', label: 'Configuración' },
        { id: 'compras', label: 'Compras' },
        { id: 'proveedores', label: 'Proveedores' },
        { id: 'materia_prima', label: 'Materia prima' },
        { id: 'reportes', label: 'Reportes' }
    ];

    constructor(private fb: FormBuilder) {
        const permissionsGroup: any = {};
        this.modulos.forEach(m => {
            permissionsGroup[m.id] = new FormControl(false);
        });

        this.rolForm = this.fb.group({
            nombreRol: ['', [Validators.required]],
            permisos: this.fb.group(permissionsGroup)
        });
    }

    cerrar() {
        this.alCerrar.emit();
        this.rolForm.reset();
    }

    guardar() {
        if (this.rolForm.valid) {
            this.alGuardar.emit(this.rolForm.value);
            this.cerrar();
        } else {
            this.rolForm.markAllAsTouched();
        }
    }
}
