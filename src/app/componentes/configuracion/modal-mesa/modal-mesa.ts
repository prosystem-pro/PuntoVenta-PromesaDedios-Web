import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';
import { Mesa } from '../../../Modelos/mesa.modelo';
import { ClasificacionMesa } from '../../../Modelos/clasificacion-mesa.modelo';
import { ModalClasificacion } from '../modal-clasificacion/modal-clasificacion';
import { MesaIconoComponent } from '../../mesa/mesa-icono/mesa-icono';
import { MESA_ICONOS, MESA_ICONO_DEFECTO, buscarMesaIcono, MesaIcono } from '../../mesa/mesa-iconos';

@Component({
    selector: 'app-modal-mesa',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalClasificacion, MesaIconoComponent],
    templateUrl: './modal-mesa.html',
    styleUrl: './modal-mesa.css'
})
export class ModalMesa implements OnChanges {
    @Input() visible = false;
    @Input() mesaAEditar: Mesa | null = null;
    @Input() clasificaciones: ClasificacionMesa[] = [];
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();
    @Output() alRefrescarClasificaciones = new EventEmitter<void>();

    colorSistema = Entorno.ColorSistema;
    mesaForm: FormGroup;
    mostrarModalClasificacion = signal(false);
    modoEdicion = signal(false);

    // 8 iconos quemados; el propietario elige el que mejor se adapte a la clasificacion
    iconos: MesaIcono[] = MESA_ICONOS;
    mostrarIconos = signal(false);

    constructor(private fb: FormBuilder) {
        this.mesaForm = this.fb.group({
            CodigoClasificacionMesa: [null, [Validators.required]],
            NombreMesa: ['Mesa', [Validators.required]],
            CantidadMesas: [1, [Validators.required, Validators.min(1)]],
            IconoUrl: [MESA_ICONO_DEFECTO, [Validators.required]],
            Estatus: [true]
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['mesaAEditar'] && this.mesaAEditar) {
            this.modoEdicion.set(true);
            this.mesaForm.patchValue({
                CodigoClasificacionMesa: this.mesaAEditar.CodigoClasificacionMesa,
                NombreMesa: this.mesaAEditar.NombreMesa,
                CantidadMesas: this.mesaAEditar.CantidadMesas || 1,
                IconoUrl: buscarMesaIcono(this.mesaAEditar.ImagenUrl).id,
                Estatus: this.mesaAEditar.Estatus === 1
            });
        } else if (changes['visible'] && this.visible && !this.mesaAEditar) {
            this.modoEdicion.set(false);
            this.mesaForm.reset({ NombreMesa: 'Mesa', CantidadMesas: 1, IconoUrl: MESA_ICONO_DEFECTO, Estatus: true });
        }
    }

    // Icono actualmente seleccionado (para mostrarlo en el selector)
    get iconoSeleccionado(): string {
        return this.mesaForm.get('IconoUrl')?.value || MESA_ICONO_DEFECTO;
    }

    seleccionarIcono(id: string) {
        this.mesaForm.get('IconoUrl')?.setValue(id);
        this.mostrarIconos.set(false);
    }

    toggleIconos() {
        this.mostrarIconos.update(v => !v);
    }

    cerrar() {
        this.alCerrar.emit();
        this.mostrarIconos.set(false);
        this.mesaForm.reset({ NombreMesa: 'Mesa', CantidadMesas: 1, IconoUrl: MESA_ICONO_DEFECTO, Estatus: true });
    }

    guardar() {
        if (this.mesaForm.valid) {
            const formValue = this.mesaForm.value;
            const datosParaGuardar = {
                ...formValue,
                Estatus: formValue.Estatus ? 1 : 0
            };
            this.alGuardar.emit(datosParaGuardar);
        } else {
            this.mesaForm.markAllAsTouched();
        }
    }

    abrirClasificaciones() {
        this.mostrarModalClasificacion.set(true);
    }

    cerrarClasificaciones() {
        this.mostrarModalClasificacion.set(false);
    }

    manejarNuevaClasificacion() {
        this.alRefrescarClasificaciones.emit();
    }
}
