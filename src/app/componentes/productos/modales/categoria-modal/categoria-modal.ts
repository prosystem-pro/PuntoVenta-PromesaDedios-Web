import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriaProducto } from '../../../../Modelos/producto.modelo';
import { ProductoServicio } from '../../../../Servicios/producto.service';
import { AlertaServicio } from '../../../../Servicios/alerta.service';

@Component({
    selector: 'app-categoria-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './categoria-modal.html',
    styleUrl: './categoria-modal.css'
})
export class CategoriaModal implements OnInit {
    private servicioProducto = inject(ProductoServicio);
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<void>();

    categorias = signal<CategoriaProducto[]>([]);
    nuevaCategoria = {
        NombreCategoriaProducto: '',
        Estatus: 1
    };
    modoEdicion = signal<number | null>(null);

    // Paginación
    paginaActual = signal(1);
    itemsPorPagina = signal(3);

    totalPaginas = computed(() => {
        const total = this.categorias().length;
        return total > 0 ? Math.ceil(total / this.itemsPorPagina()) : 1;
    });

    categoriasPaginadas = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
        const fin = inicio + this.itemsPorPagina();
        return this.categorias().slice(inicio, fin);
    });

    ngOnInit() {
        this.cargarCategorias();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['visible'] && changes['visible'].currentValue === true) {
            this.cargarCategorias();
        }
    }

    async cargarCategorias() {
        const res = await this.servicioProducto.ListarCategorias();
        if (res.success) {
            const listado = Array.isArray(res.data) ? res.data : (res.data?.Listado || []);
            this.categorias.set(listado);
            this.paginaActual.set(1);
        }
    }

    async guardar() {
        if (!this.nuevaCategoria.NombreCategoriaProducto) return;
        try {
            let res;
            if (this.modoEdicion()) {
                res = await this.servicioProducto.EditarCategoria({
                    ...this.nuevaCategoria,
                    CodigoCategoriaProducto: this.modoEdicion()!
                });
            } else {
                res = await this.servicioProducto.CrearCategoria(this.nuevaCategoria);
            }

            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.limpiarFormulario();
                this.cargarCategorias();
                this.alGuardar.emit();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ message: 'Error al procesar categoría' });
        }
    }

    editar(cat: CategoriaProducto) {
        this.modoEdicion.set(cat.CodigoCategoriaProducto!);
        this.nuevaCategoria.NombreCategoriaProducto = cat.NombreCategoriaProducto;
        this.nuevaCategoria.Estatus = cat.Estatus;
    }

    async eliminar(id: number) {
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Estás seguro de eliminar esta categoría?',
            'Esta acción no se puede deshacer',
            'Eliminar',
            'Cancelar'
        );

        if (!confirmado) return;

        try {
            const res = await this.servicioProducto.EliminarCategoria(id);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.cargarCategorias();
                this.alGuardar.emit();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ message: 'Error al eliminar categoría' });
        }
    }

    limpiarFormulario() {
        this.modoEdicion.set(null);
        this.nuevaCategoria = {
            NombreCategoriaProducto: '',
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
