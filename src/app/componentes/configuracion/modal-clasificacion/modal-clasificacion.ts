import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';

@Component({
    selector: 'app-modal-clasificacion',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-clasificacion.html',
    styleUrl: './modal-clasificacion.css'
})
export class ModalClasificacion {
    @Input() visible = false;
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    colorSistema = Entorno.ColorSistema;
    clasifForm: FormGroup;

    // Datos simulados para el listado interno
    registros = signal([
        { id: 1, nombre: 'Salón principal', estado: 'Activo' },
        { id: 2, nombre: 'Jardín', estado: 'Activo' },
        { id: 3, nombre: 'Terraza', estado: 'Activo' },
        { id: 4, nombre: 'Salón 2', estado: 'Activo' },
        { id: 5, nombre: 'Picina', estado: 'Inactivo' },
        { id: 6, nombre: 'Patio', estado: 'Activo' },
        { id: 7, nombre: 'Parqueo', estado: 'Activo' },
        { id: 8, nombre: 'Jardín 2', estado: 'Activo' },
        { id: 9, nombre: 'Salón 2', estado: 'Activo' },
        { id: 10, nombre: 'Planta baja', estado: 'Activo' }
    ]);

    paginaActual = signal(1);
    itemsPorPagina = 8;
    totalPaginas = computed(() => Math.ceil(this.registros().length / this.itemsPorPagina));

    registrosPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        return this.registros().slice(inicio, inicio + this.itemsPorPagina);
    });

    constructor(private fb: FormBuilder) {
        this.clasifForm = this.fb.group({
            nombre: ['', [Validators.required]],
            estado: ['Activo', [Validators.required]]
        });
    }

    cerrar() {
        this.alCerrar.emit();
        this.clasifForm.reset({ estado: 'Activo' });
    }

    agregar() {
        if (this.clasifForm.valid) {
            const nueva = this.clasifForm.value;
            this.alGuardar.emit(nueva);
            // Actualizar listado local
            this.registros.update(r => [{ id: r.length + 1, ...nueva }, ...r]);
            this.clasifForm.reset({ estado: 'Activo' });
        } else {
            this.clasifForm.markAllAsTouched();
        }
    }

    irAPagina(p: number) {
        this.paginaActual.set(p);
    }

    eliminar(id: number) {
        this.registros.update(r => r.filter(item => item.id !== id));
    }
}
