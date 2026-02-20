import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Producto, CategoriaProducto, UnidadMedida } from '../../../../Modelos/producto.modelo';
import { ProductoServicio } from '../../../../Servicios/producto.service';
import { AlertaServicio } from '../../../../Servicios/alerta.service';
import { Entorno } from '../../../../Entorno/Entorno';
import { CategoriaModal } from '../../../productos/modales/categoria-modal/categoria-modal';
import { PresentacionModal } from '../../../productos/modales/presentacion-modal/presentacion-modal';

@Component({
    selector: 'app-materia-prima-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, CategoriaModal, PresentacionModal],
    templateUrl: './materia-prima-modal.html',
    styleUrl: './materia-prima-modal.css'
})
export class MateriaPrimaModal implements OnChanges {
    private fb = inject(FormBuilder);
    private servicioProducto = inject(ProductoServicio);
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() insumoAEditar: Producto | null = null;
    @Input() categorias: CategoriaProducto[] = [];
    @Input() unidades: UnidadMedida[] = [];

    @Output() cerrar = new EventEmitter<void>();
    @Output() guardado = new EventEmitter<void>();

    colorSistema = Entorno.ColorSistema;
    form: FormGroup;
    cargando = signal(false);
    imagenPreview = signal<string | null>(null);
    archivoImagen: File | null = null;

    // Modales compartidos
    mostrarCategoriaModal = signal(false);
    mostrarPresentacionModal = signal(false);

    constructor() {
        this.form = this.fb.group({
            CodigoCategoriaProducto: [null, [Validators.required]],
            NombreProducto: ['', [Validators.required]],
            CodigoUnidadMedida: [null, [Validators.required]],
            Stock: [0, [Validators.required]],
            StockMinimo: [0],
            StockSugerido: [0],
            PrecioCompra: [0, [Validators.required]],
            CodigoBarra: [''],
            Iva: [0],
            Estatus: [1]
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['visible']?.currentValue) {
            if (this.insumoAEditar) {
                this.form.patchValue({
                    ...this.insumoAEditar,
                    Iva: Number(this.insumoAEditar.Iva || 0)
                });
                this.imagenPreview.set(this.insumoAEditar.ImagenUrl || null);
            } else {
                this.form.reset({ Estatus: 1, Stock: 0, Iva: 0 });
                this.imagenPreview.set(null);
                this.archivoImagen = null;
            }
        }
    }

    onCerrar() {
        this.cerrar.emit();
    }

    alSeleccionarImagen(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.archivoImagen = file;
            const reader = new FileReader();
            reader.onload = () => this.imagenPreview.set(reader.result as string);
            reader.readAsDataURL(file);
        }
    }

    async onGuardar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.cargando.set(true);
        const val = this.form.value;

        const p: Partial<Producto> = {
            ...val,
            TipoProducto: 'INSUMO',
            TieneReceta: false,
            PrecioVenta: 0 // Insumos no se venden directamente por defecto
        };

        try {
            let res;
            if (this.insumoAEditar) {
                res = await this.servicioProducto.Editar({ ...p, CodigoProducto: this.insumoAEditar.CodigoProducto });
            } else {
                res = await this.servicioProducto.Crear(p);
            }

            if (res.success) {
                const codigo = res.data?.Producto?.CodigoProducto || res.data?.CodigoProducto || this.insumoAEditar?.CodigoProducto;
                if (this.archivoImagen && codigo) {
                    await this.subirImagen(codigo);
                }
                this.servicioAlerta.MostrarExito(res.message);
                this.guardado.emit();
                this.onCerrar();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al guardar' } });
        } finally {
            this.cargando.set(false);
        }
    }

    private async subirImagen(codigo: number) {
        const formData = new FormData();
        formData.append('Imagen', this.archivoImagen!);
        formData.append('CarpetaPrincipal', Entorno.NombreEmpresa);
        formData.append('SubCarpeta', 'Producto');
        formData.append('CodigoVinculado', this.form.get('CodigoCategoriaProducto')?.value?.toString() || '0');
        formData.append('CodigoPropio', codigo.toString());
        formData.append('CampoVinculado', 'CodigoCategoriaProducto');
        formData.append('CampoPropio', 'CodigoProducto');
        formData.append('NombreCampoImagen', 'ImagenUrl');

        await this.servicioProducto.SubirImagen(formData);
    }
}
