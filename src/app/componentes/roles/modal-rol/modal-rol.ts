import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Rol } from '../../../Modelos/rol.modelo';

@Component({
    selector: 'app-modal-rol',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-rol.html',
    styleUrl: './modal-rol.css'
})
export class ModalRol implements OnChanges {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() rolAEditar: Rol | null = null;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    modoEdicion = signal(false);

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
            Estatus: [true],
            permisos: this.fb.group(permissionsGroup)
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['rolAEditar'] && this.rolAEditar) {
            this.modoEdicion.set(true);
            this.rolForm.patchValue({
                nombreRol: this.rolAEditar.NombreRol,
                Estatus: this.rolAEditar.Estatus === 1
            });
            // Si hubiera permisos persistidos en el backend, se cargarían aquí
        } else if (changes['visible'] && this.visible && !this.rolAEditar) {
            this.modoEdicion.set(false);
            this.rolForm.reset({ Estatus: true });
        }
    }

    cerrar() {
        this.alCerrar.emit();
        this.rolForm.reset();
    }

    guardar() {
        if (this.rolForm.valid) {
            const formValue = this.rolForm.value;
            const datosParaGuardar = {
                ...formValue,
                Estatus: formValue.Estatus ? 1 : 0
            };
            this.alGuardar.emit(datosParaGuardar);
        } else {
            this.rolForm.markAllAsTouched();
        }
    }
}
