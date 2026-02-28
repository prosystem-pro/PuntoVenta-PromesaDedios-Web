import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Producto, CategoriaProducto, UnidadMedida } from '../../../Modelos/producto.modelo';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';
import { CategoriaModal } from '../../productos/modales/categoria-modal/categoria-modal';
import { PresentacionModal } from '../../productos/modales/presentacion-modal/presentacion-modal';

@Component({
    selector: 'app-materia-prima-detalle',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, CategoriaModal, PresentacionModal],
    templateUrl: './materia-prima-detalle.html',
    styleUrl: './materia-prima-detalle.css'
})
export class MateriaPrimaDetalle implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private servicioProducto = inject(ProductoServicio);
    private servicioAlerta = inject(AlertaServicio);
    private route = inject(ActivatedRoute);

    colorSistema = Entorno.ColorSistema;
    form: FormGroup;
    cargando = signal(false);

    // Catalogos
    categorias = signal<CategoriaProducto[]>([]);
    unidades = signal<UnidadMedida[]>([]);

    // Lista temporal de carga
    listaCarga = signal<any[]>([]);

    // Paginacion de la lista de carga
    paginaCarga = signal(1);
    itemsPorPaginaCarga = 5;

    // Modales Auxiliares
    mostrarCategoriaModal = signal(false);
    mostrarPresentacionModal = signal(false);

    // Modo Edicion
    modoEdicion = signal(this.route.snapshot.paramMap.has('id'));
    insumoId = signal<number | null>(Number(this.route.snapshot.paramMap.get('id')) || null);

    // Imagen
    imagenPreview = signal<string | null>(null);
    archivoImagen: File | null = null;

    constructor() {
        this.form = this.fb.group({
            CodigoProducto: [null],
            CodigoCategoriaProducto: [null, [Validators.required]],
            NombreProducto: ['', [Validators.required]],
            CodigoUnidadMedida: [null, [Validators.required]],
            Stock: [0, [Validators.required, Validators.min(0)]],
            StockMinimo: [0],
            StockSugerido: [0],
            PrecioCompra: [0, [Validators.required]],
            CodigoBarra: [''],
            Iva: [0],
            Estatus: [1]
        });
    }

    async ngOnInit() {
        await this.cargarCatalogos();

        // Si es modo edicion, cargar los datos
        if (this.modoEdicion() && this.insumoId()) {
            await this.cargarInsumo(this.insumoId()!);
        }
    }

    async cargarInsumo(id: number) {
        this.cargando.set(true);
        try {
            const res = await this.servicioProducto.ObtenerCompleto(id);
            if (res.success) {
                const p = res.data;
                this.form.patchValue({
                    CodigoProducto: p.CodigoProducto,
                    CodigoCategoriaProducto: p.CodigoCategoriaProducto || p.Categoria?.CodigoCategoriaProducto,
                    NombreProducto: p.NombreProducto,
                    CodigoUnidadMedida: p.CodigoUnidadMedida || p.UnidadMedida?.CodigoUnidadMedida,
                    Stock: p.Inventario?.StockActual || 0,
                    StockMinimo: p.Inventario?.StockMinimo || 0,
                    StockSugerido: p.Inventario?.StockSugerido || 0,
                    PrecioCompra: p.Inventario?.PrecioCompra || 0,
                    CodigoBarra: p.CodigoBarra || '',
                    Iva: Number(p.Iva || 0),
                    Estatus: p.Estatus
                });
                this.imagenPreview.set(p.ImagenUrl || null);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al cargar los datos de la materia prima' } });
        } finally {
            this.cargando.set(false);
        }
    }

    async cargarCatalogos() {
        try {
            const [resCat, resUni] = await Promise.all([
                this.servicioProducto.ListarCategorias(),
                this.servicioProducto.ListarUnidades()
            ]);
            if (resCat.success) {
                const listado = Array.isArray(resCat.data) ? resCat.data : (resCat.data?.Listado || []);
                this.categorias.set(listado);
            }
            if (resUni.success) {
                const listado = Array.isArray(resUni.data) ? resUni.data : (resUni.data?.Listado || []);
                this.unidades.set(listado);
            }
        } catch (error) {
            console.error('Error cargando catálogos:', error);
        }
    }

    // Gestion de Lista Temporal
    agregarALista() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const formVal = this.form.value;
        const catObj = this.categorias().find(c => c.CodigoCategoriaProducto === formVal.CodigoCategoriaProducto);
        const uniObj = this.unidades().find(u => u.CodigoUnidadMedida === formVal.CodigoUnidadMedida);

        const nuevoItem = {
            ...formVal,
            NombreCategoria: catObj?.NombreCategoriaProducto || 'N/A',
            NombreUnidad: uniObj?.NombreUnidad || 'N/A',
            archivoImagen: this.archivoImagen, // Guardar la imagen asociada si existe
            preview: this.imagenPreview()
        };

        this.listaCarga.update(prev => [...prev, nuevoItem]);

        // Reset form e imagen
        this.form.reset({ Stock: 0, Iva: 0 });
        this.imagenPreview.set(null);
        this.archivoImagen = null;
    }

    eliminarDeLista(index: number) {
        const indexReal = (this.paginaCarga() - 1) * this.itemsPorPaginaCarga + index;
        this.listaCarga.update(prev => prev.filter((_, i) => i !== indexReal));

        // Ajustar pagina si queda vacia
        if (this.listaCargaPaginada().length === 0 && this.paginaCarga() > 1) {
            this.paginaCarga.update(p => p - 1);
        }
    }

    // Paginacion lista temporal
    totalRegistrosCarga = computed(() => this.listaCarga().length);
    totalPaginasCarga = computed(() => Math.ceil(this.totalRegistrosCarga() / this.itemsPorPaginaCarga) || 1);

    listaCargaPaginada = computed(() => {
        const inicio = (this.paginaCarga() - 1) * this.itemsPorPaginaCarga;
        const fin = inicio + this.itemsPorPaginaCarga;
        return this.listaCarga().slice(inicio, fin);
    });

    irAPaginaCarga(p: number) { this.paginaCarga.set(p); }

    // Imagen
    alSeleccionarImagen(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.archivoImagen = file;
            const reader = new FileReader();
            reader.onload = () => this.imagenPreview.set(reader.result as string);
            reader.readAsDataURL(file);
        }
    }

    async guardarTodo() {
        if (this.listaCarga().length === 0) {
            this.servicioAlerta.MostrarAlerta('No hay productos en la lista de carga');
            return;
        }

        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Desea guardar todos estos productos?',
            `Se registrarán ${this.listaCarga().length} productos de materia prima.`
        );

        if (!confirmado) return;

        this.cargando.set(true);
        let exitos = 0;
        let errores = 0;

        for (const item of this.listaCarga()) {
            try {
                // Limpiar el payload para enviar solo lo que el API espera
                const cleanPayload = {
                    CodigoCategoriaProducto: item.CodigoCategoriaProducto,
                    CodigoUnidadMedida: item.CodigoUnidadMedida,
                    NombreProducto: item.NombreProducto,
                    TipoProducto: 'Insumo',
                    CodigoBarra: item.CodigoBarra || '',
                    Iva: item.Iva || 0,
                    PrecioVenta: 0,
                    TieneReceta: false,
                    Estatus: 1,
                    Stock: item.Stock,
                    StockMinimo: item.StockMinimo || 0,
                    StockSugerido: item.StockSugerido || 0,
                    PrecioCompra: item.PrecioCompra || 0,
                    Ingredientes: []
                };

                const res = await this.servicioProducto.Crear(cleanPayload);
                if (res.success) {
                    exitos++;
                    const codigo = res.data?.Producto?.CodigoProducto || res.data?.CodigoProducto;
                    if (item.archivoImagen && codigo) {
                        await this.subirImagen(codigo, item.archivoImagen, item.CodigoCategoriaProducto);
                    }
                } else {
                    errores++;
                }
            } catch (e) {
                errores++;
            }
        }

        this.cargando.set(false);
        if (errores === 0) {
            this.servicioAlerta.MostrarExito(`Se guardaron ${exitos} productos correctamente`);
            this.router.navigate(['/materia-prima']);
        } else {
            this.servicioAlerta.MostrarAlerta(`Proceso terminado. Éxitos: ${exitos}, Errores: ${errores}`);
        }
    }

    async actualizar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.cargando.set(true);
        try {
            const val = this.form.value;
            const payload: Partial<Producto> = {
                ...val,
                TipoProducto: 'Insumo',
                PrecioVenta: 0,
                TieneReceta: false
            };

            const res = await this.servicioProducto.Editar(payload);
            if (res.success) {
                if (this.archivoImagen && this.insumoId()) {
                    await this.subirImagen(this.insumoId()!, this.archivoImagen, val.CodigoCategoriaProducto);
                }
                this.servicioAlerta.MostrarExito('Materia prima actualizada correctamente');
                this.router.navigate(['/materia-prima']);
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al actualizar' } });
        } finally {
            this.cargando.set(false);
        }
    }

    private async subirImagen(codigo: number, archivo: File, categoriaId: number) {
        const formData = new FormData();
        formData.append('Imagen', archivo);
        formData.append('CarpetaPrincipal', Entorno.NombreEmpresa);
        formData.append('SubCarpeta', 'Producto');
        formData.append('CodigoVinculado', categoriaId.toString());
        formData.append('CodigoPropio', codigo.toString());
        formData.append('CampoVinculado', 'CodigoCategoriaProducto');
        formData.append('CampoPropio', 'CodigoProducto');
        formData.append('NombreCampoImagen', 'ImagenUrl');

        await this.servicioProducto.SubirImagen(formData);
    }

    cancelar() {
        this.router.navigate(['/materia-prima']);
    }
}
