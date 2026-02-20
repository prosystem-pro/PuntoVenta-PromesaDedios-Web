import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnidadMedida } from '../../../../Modelos/producto.modelo';
import { ProductoServicio } from '../../../../Servicios/producto.service';
import { AlertaServicio } from '../../../../Servicios/alerta.service';

@Component({
    selector: 'app-presentacion-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './presentacion-modal.html',
    styleUrl: '../categoria-modal/categoria-modal.css' // Reutilizamos estilos
})
export class PresentacionModal implements OnInit, OnChanges {
    private servicioProducto = inject(ProductoServicio);
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<void>();

    unidades = signal<UnidadMedida[]>([]);
    nuevaUnidad = {
        NombreUnidad: '',
        Abreviatura: '',
        Estatus: 1
    };

    modoEdicion = signal<number | null>(null);

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = signal(3);

    totalPaginas = computed(() => {
        const total = this.unidades().length;
        return total > 0 ? Math.ceil(total / this.itemsPorPagina()) : 1;
    });

    unidadesPaginadas = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
        const fin = inicio + this.itemsPorPagina();
        return this.unidades().slice(inicio, fin);
    });

    ngOnInit() {
        this.cargarUnidades();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['visible'] && changes['visible'].currentValue === true) {
            this.cargarUnidades();
        }
    }

    async cargarUnidades() {
        const res = await this.servicioProducto.ListarUnidades();
        if (res.success) {
            const listado = Array.isArray(res.data) ? res.data : (res.data?.Listado || []);
            this.unidades.set(listado);
            this.paginaActual.set(1);
        }
    }

    async guardar() {
        if (!this.nuevaUnidad.NombreUnidad || !this.nuevaUnidad.Abreviatura) return;
        try {
            let res;
            if (this.modoEdicion()) {
                res = await this.servicioProducto.EditarUnidad({
                    ...this.nuevaUnidad,
                    CodigoUnidadMedida: this.modoEdicion()!
                });
            } else {
                res = await this.servicioProducto.CrearUnidad(this.nuevaUnidad);
            }

            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.limpiarFormulario();
                this.cargarUnidades();
                this.alGuardar.emit();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ message: 'Error al procesar presentación' });
        }
    }

    editar(uni: UnidadMedida) {
        this.modoEdicion.set(uni.CodigoUnidadMedida!);
        this.nuevaUnidad = {
            NombreUnidad: uni.NombreUnidad,
            Abreviatura: uni.Abreviatura,
            Estatus: uni.Estatus
        };
    }

    async eliminar(id: number) {
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Estás seguro de eliminar esta presentación?',
            'Esta acción no se puede deshacer',
            'Eliminar',
            'Cancelar'
        );

        if (!confirmado) return;

        try {
            const res = await this.servicioProducto.EliminarUnidad(id);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.cargarUnidades();
                this.alGuardar.emit();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ message: 'Error al eliminar presentación' });
        }
    }

    limpiarFormulario() {
        this.modoEdicion.set(null);
        this.nuevaUnidad = {
            NombreUnidad: '',
            Abreviatura: '',
            Estatus: 1
        };
    }

    // Navegación de páginas
    irAPagina(p: number) {
        if (p >= 1 && p <= this.totalPaginas()) {
            this.paginaActual.set(p);
        }
    }

    get paginas() {
        return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
    }

    cerrar() {
        this.limpiarFormulario();
        this.alCerrar.emit();
    }
}
