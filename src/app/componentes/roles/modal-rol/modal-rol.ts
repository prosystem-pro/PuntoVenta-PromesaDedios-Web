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
    // Recursos asignados al rol que se edita (nombres del back, ej: ['Caja','Producto','Administrativo'])
    @Input() recursosAsignados: string[] = [];
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    modoEdicion = signal(false);
    // Se muestra si intentan guardar sin marcar ningún módulo (el API exige al menos uno)
    sinPermisos = signal(false);

    rolForm: FormGroup;

    // Cada checkbox del front mapea a un NombreRecurso del back (los que Roberto tiene quemados).
    // Usuarios + Roles y permisos + Configuración son un solo paquete: 'Administrativo'.
    modulos = [
        { id: 'caja', label: 'Caja', recurso: 'Caja' },
        { id: 'productos', label: 'Productos', recurso: 'Producto' },
        { id: 'usuarios', label: 'Usuarios', recurso: 'Administrativo' },
        { id: 'venta_mesa', label: 'Venta en mesa', recurso: 'VentaMesa' },
        { id: 'produccion', label: 'Producción', recurso: 'Produccion' },
        { id: 'roles_permisos', label: 'Roles y permisos', recurso: 'Administrativo' },
        { id: 'facturar', label: 'Facturar', recurso: 'Facturar' },
        { id: 'historial_ventas', label: 'Historial de ventas', recurso: 'HistorialVenta' },
        { id: 'cocina', label: 'Cocina', recurso: 'Cocina' },
        { id: 'estado_pedido', label: 'Estado pedido', recurso: 'EstadoPedido' },
        { id: 'clientes', label: 'Clientes', recurso: 'Cliente' },
        { id: 'configuracion', label: 'Configuración', recurso: 'Administrativo' },
        { id: 'compras', label: 'Compras', recurso: 'Compra' },
        { id: 'proveedores', label: 'Proveedores', recurso: 'Proveedor' },
        { id: 'materia_prima', label: 'Materia prima', recurso: 'MateriaPrima' },
        { id: 'reportes', label: 'Reportes', recurso: 'Reporte' }
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
            this.sinPermisos.set(false);
            this.rolForm.reset({ Estatus: true });
            this.rolForm.patchValue({
                nombreRol: this.rolAEditar.NombreRol,
                Estatus: this.rolAEditar.Estatus === 1
            });
            this.marcarModulosDesdeRecursos(this.recursosAsignados);
        } else if (changes['visible'] && this.visible && !this.rolAEditar) {
            this.modoEdicion.set(false);
            this.sinPermisos.set(false);
            this.rolForm.reset({ Estatus: true });
        }
    }

    // Marca los checkboxes cuyo recurso esté en la lista asignada (un recurso puede activar varios checks, ej: Administrativo)
    private marcarModulosDesdeRecursos(recursos: string[]): void {
        const asignados = new Set(recursos || []);
        const grupo = this.rolForm.get('permisos') as FormGroup;
        this.modulos.forEach(m => {
            grupo.get(m.id)?.setValue(asignados.has(m.recurso));
        });
    }

    cerrar() {
        this.alCerrar.emit();
        this.rolForm.reset();
    }

    guardar() {
        if (!this.rolForm.valid) {
            this.rolForm.markAllAsTouched();
            return;
        }

        const permisos = this.rolForm.get('permisos')?.value || {};
        // NombresRecurso únicos a partir de los módulos marcados (dedupe por el paquete Administrativo)
        const nombresRecurso = [...new Set(
            this.modulos.filter(m => permisos[m.id]).map(m => m.recurso)
        )];

        if (nombresRecurso.length === 0) {
            this.sinPermisos.set(true);
            return;
        }

        this.sinPermisos.set(false);
        this.alGuardar.emit({
            nombreRol: this.rolForm.get('nombreRol')?.value,
            nombresRecurso
        });
    }
}
