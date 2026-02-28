import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Producto, CategoriaProducto, UnidadMedida, Ingrediente } from '../../../Modelos/producto.modelo';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';
import { CategoriaModal } from '../modales/categoria-modal/categoria-modal';
import { PresentacionModal } from '../modales/presentacion-modal/presentacion-modal';

@Component({
    selector: 'app-producto-detalle',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, CategoriaModal, PresentacionModal],
    templateUrl: './producto-detalle.html',
    styleUrl: './producto-detalle.css'
})
export class ProductoDetalle implements OnInit {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private servicioProducto = inject(ProductoServicio);
    private servicioAlerta = inject(AlertaServicio);
    private destroyRef = inject(DestroyRef);

    colorSistema = Entorno.ColorSistema;
    productoForm: FormGroup;

    // Catalogos
    categorias = signal<CategoriaProducto[]>([]);
    unidades = signal<UnidadMedida[]>([]);
    todosLosProductos = signal<Producto[]>([]); // Para el buscador de ingredientes

    // Modales
    mostrarCategoriaModal = signal(false);
    mostrarPresentacionModal = signal(false);

    // Estado
    modoEdicion = signal(false);
    cargando = signal(false);
    imagenPreview = signal<string | null>(null);
    archivoImagen: File | null = null;
    triggerRecargaIngredientes = signal(0); // Para forzar actualizacion de computed

    // Filtro de ingredientes (Buscador)
    textoFiltroIngrediente = signal('');
    ingredienteSeleccionado = signal<Producto | null>(null);
    unidadIngrediente = signal<number | null>(null);
    cantidadIngrediente = signal<number>(1);
    indiceEdicionIngrediente = signal<number | null>(null); // Indice del ingrediente que se esta editando

    ingredientesDisponibles = computed(() => {
        const texto = this.textoFiltroIngrediente().toLowerCase();
        return this.todosLosProductos().filter(p =>
            p.NombreProducto &&
            p.NombreProducto.toLowerCase().includes(texto) &&
            p.CodigoProducto !== (this.productoId || -1)
        );
    });

    // Paginación de ingredientes
    paginaIngredientes = signal(1);
    itemsPorPaginaIngredientes = signal(5);

    totalPaginasIngredientes = computed(() => {
        const total = this.ingredientes.length;
        return total > 0 ? Math.ceil(total / this.itemsPorPaginaIngredientes()) : 1;
    });

    ingredientesPaginados = computed(() => {
        this.triggerRecargaIngredientes(); // Dependencia para refrescar
        const inicio = (this.paginaIngredientes() - 1) * this.itemsPorPaginaIngredientes();
        const fin = inicio + this.itemsPorPaginaIngredientes();
        return this.ingredientes.controls.slice(inicio, fin);
    });

    paginasNumeros = computed(() => {
        this.triggerRecargaIngredientes();
        return Array.from({ length: this.totalPaginasIngredientes() }, (_, i) => i + 1);
    });

    irAPaginaIngredientes(p: number) {
        if (p >= 1 && p <= this.totalPaginasIngredientes()) {
            this.paginaIngredientes.set(p);
        }
    }

    getIndiceAbsoluto(indexPaginado: number): number {
        return (this.paginaIngredientes() - 1) * this.itemsPorPaginaIngredientes() + indexPaginado;
    }

    productoId: number | null = null;

    constructor() {
        this.productoForm = this.fb.group({
            NombreProducto: ['', [Validators.required]],
            CodigoCategoriaProducto: [null, [Validators.required]],
            CodigoUnidadMedida: [null, [Validators.required]],
            TipoProducto: ['Ventanilla', [Validators.required]],
            CodigoBarra: [''],
            Iva: [0], // Porcentaje
            PrecioVenta: [0, [Validators.required, Validators.min(0.01)]],
            TieneReceta: [false],
            Estatus: [1],
            Stock: [0],
            StockMinimo: [0],
            StockSugerido: [0],
            PrecioCompra: [0],
            Ingredientes: this.fb.array([])
        });
    }

    get ingredientes() {
        return this.productoForm.get('Ingredientes') as FormArray;
    }

    async ngOnInit() {
        await this.cargarCatalogos();

        this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            if (params['id']) {
                this.productoId = +params['id'];
                this.modoEdicion.set(true);
                this.cargarProducto(this.productoId);
            }
        });
    }

    async cargarCatalogos() {
        try {
            const [resCat, resUni, resProd] = await Promise.all([
                this.servicioProducto.ListarCategorias(),
                this.servicioProducto.ListarUnidades(),
                this.servicioProducto.ListarInsumos()
            ]);
            if (resCat.success) {
                const listado = Array.isArray(resCat.data) ? resCat.data : (resCat.data?.Listado || []);
                this.categorias.set(listado);
            }
            if (resUni.success) {
                const listado = Array.isArray(resUni.data) ? resUni.data : (resUni.data?.Listado || []);
                this.unidades.set(listado);
            }
            if (resProd.success) {
                const listado = Array.isArray(resProd.data) ? resProd.data : (resProd.data?.Listado || []);

                const productosNormalizados = listado.map((p: any) => ({
                    ...p,
                    NombreProducto: p.Producto || p.NombreProducto,
                    NombreCategoria: p.NombreCategoriaProducto || p.NombreCategoria,
                    Stock: p.StockActual !== undefined ? p.StockActual : p.Stock,
                    TipoProducto: 'INSUMO'
                }));

                this.todosLosProductos.set(productosNormalizados);
            }
        } catch (error) {
            console.error('Error cargando catálogos:', error);
        }
    }

    async cargarProducto(id: number) {
        this.cargando.set(true);
        try {
            const res = await this.servicioProducto.ObtenerCompleto(id);
            console.log(res.data)
            if (res.success && res.data) {
                const pData = res.data;
                // El API devuelve "Recetum" para la lista de ingredientes (o Receta/Ingredientes)
                const ingredientesData = pData.Recetum || pData.Receta || pData.Ingredientes || [];
                const inv = pData.Inventario || {};

                // Normalizar objeto para el formulario basándonos en la estructura real provista
                const producto: Producto = {
                    ...pData,
                    NombreProducto: pData.NombreProducto || '',
                    CodigoCategoriaProducto: pData.CodigoCategoriaProducto,
                    // Campos que vienen dentro del objeto Inventario
                    Stock: inv.StockActual || 0,
                    StockMinimo: inv.StockMinimo || 0,
                    StockSugerido: inv.StockSugerido || 0,
                    PrecioCompra: inv.PrecioCompra || 0
                };

                this.productoForm.patchValue({
                    ...producto,
                    Iva: Number(producto.Iva || 0),
                    TieneReceta: pData.TieneReceta === true || pData.TieneReceta === 1 || !!pData.Recetum || !!pData.Receta
                });

                this.imagenPreview.set(pData.ImagenUrl || null);

                this.ingredientes.clear();

                // Manejar la estructura de RecetaDetalles dentro de Recetum (según el JSON que pasaste)
                const receta = pData.Recetum || pData.Receta || {};
                const detalles = receta.RecetaDetalles || (Array.isArray(ingredientesData) ? ingredientesData : []);

                if (Array.isArray(detalles)) {
                    detalles.forEach((det: any) => {
                        const prodIng = det.ProductoIngrediente || {};
                        const unidad = det.UnidadMedida || {};

                        let precioCompra = prodIng.PrecioCompra;
                        if (precioCompra === undefined) {
                            const catalogado = this.todosLosProductos().find(p => p.CodigoProducto === det.CodigoProducto);
                            precioCompra = catalogado?.PrecioCompra || 0;
                        }

                        this.agregarIngredienteExistente({
                            CodigoProducto: det.CodigoProducto,
                            NombreProducto: prodIng.NombreProducto || det.NombreProducto || 'Sin nombre',
                            CodigoUnidadMedida: det.CodigoUnidadMedida,
                            NombreUnidad: unidad.NombreUnidad || 'No def.',
                            Cantidad: det.Cantidad,
                            PrecioUnitario: precioCompra
                        });
                    });
                }
                this.triggerRecargaIngredientes.update(v => v + 1);
            } else {
                this.servicioAlerta.MostrarError(res, 'No se pudo cargar la información del producto');
            }
        } catch (error: any) {
            console.error('Error cargando detalle producto:', error);
            this.servicioAlerta.MostrarError({ error: { message: 'Error al conectar con el servidor para cargar el detalle' } });
        } finally {
            this.cargando.set(false);
        }
    }

    // Logica de Receta
    alEscribirIngrediente(val: string) {
        this.textoFiltroIngrediente.set(val);
        this.ingredienteSeleccionado.set(null);
        this.unidadIngrediente.set(null);
    }

    seleccionarIngrediente(prod: Producto) {
        this.ingredienteSeleccionado.set(prod);
        this.textoFiltroIngrediente.set(prod.NombreProducto);
        this.unidadIngrediente.set(prod.CodigoUnidadMedida);
    }

    alCambiarUnidadIngrediente(event: any) {
        const val = event.target.value;
        this.unidadIngrediente.set(val ? +val : null);
    }

    agregarIngrediente() {
        let prod = this.ingredienteSeleccionado();

        if (!prod) {
            const texto = this.textoFiltroIngrediente().trim().toLowerCase();
            if (texto) {
                const coincidencias = this.todosLosProductos().filter(p =>
                    p.NombreProducto &&
                    p.NombreProducto.toLowerCase().includes(texto)
                );

                if (coincidencias.length === 1) {
                    prod = coincidencias[0];
                } else if (coincidencias.length > 1) {
                    this.servicioAlerta.MostrarAlerta('Hay múltiples coincidencias. Por favor selecciona uno de la lista.');
                    return;
                }
            }
        }

        if (!prod) {
            this.servicioAlerta.MostrarAlerta('Debe seleccionar un ingrediente');
            return;
        }

        const unidadId = this.unidadIngrediente() || prod!.CodigoUnidadMedida;
        const unidadObj = this.unidades().find(u => u.CodigoUnidadMedida === unidadId);

        const nuevoIngrediente = this.fb.group({
            CodigoProducto: [prod!.CodigoProducto, Validators.required],
            NombreProducto: [prod!.NombreProducto],
            CodigoUnidadMedida: [unidadId, Validators.required],
            NombreUnidad: [unidadObj?.NombreUnidad || ''],
            Cantidad: [this.cantidadIngrediente(), [Validators.required, Validators.min(0.0001)]],
            PrecioUnitario: [prod!.PrecioCompra || 0]
        });

        const yaExiste = this.ingredientes.value.find((ing: any) => ing.CodigoProducto === prod!.CodigoProducto);
        if (yaExiste) {
            this.servicioAlerta.MostrarAlerta('El ingrediente ya esta en la lista');
            return;
        }
        this.ingredientes.push(nuevoIngrediente);
        this.triggerRecargaIngredientes.update(v => v + 1);

        // Limpiar
        this.ingredienteSeleccionado.set(null);
        this.textoFiltroIngrediente.set('');
        this.cantidadIngrediente.set(1);
        this.unidadIngrediente.set(null);
    }

    editarIngrediente(index: number) {
        this.indiceEdicionIngrediente.set(index);
    }

    confirmarEdicion(index: number) {
        const grupo = this.ingredientes.at(index) as FormGroup;
        const unidadId = grupo.get('CodigoUnidadMedida')?.value;
        const unidadObj = this.unidades().find(u => u.CodigoUnidadMedida == unidadId);

        if (unidadObj) {
            grupo.patchValue({ NombreUnidad: unidadObj.NombreUnidad });
        }

        this.indiceEdicionIngrediente.set(null);
    }

    cancelarEdicion() {
        this.indiceEdicionIngrediente.set(null);
    }

    private agregarIngredienteExistente(ing: Ingrediente & { PrecioUnitario?: number }) {
        this.ingredientes.push(this.fb.group({
            CodigoProducto: [ing.CodigoProducto, Validators.required],
            NombreProducto: [ing.NombreProducto],
            CodigoUnidadMedida: [ing.CodigoUnidadMedida, Validators.required],
            NombreUnidad: [ing.NombreUnidad],
            Cantidad: [ing.Cantidad, [Validators.required, Validators.min(0.0001)]],
            PrecioUnitario: [ing.PrecioUnitario || 0]
        }));
    }

    eliminarIngrediente(index: number) {
        this.ingredientes.removeAt(index);
        this.triggerRecargaIngredientes.update(v => v + 1);
    }

    calcularCostoTotal(): number {
        return this.ingredientes.value.reduce((acc: number, ing: any) => acc + (ing.Cantidad * (ing.PrecioUnitario || 0)), 0);
    }

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

    async guardar() {
        if (this.productoForm.invalid) {
            this.productoForm.markAllAsTouched();
            return;
        }

        this.cargando.set(true);
        const formValue = this.productoForm.value;

        // Construir el objeto unificado según la documentación del dev y el código del backend
        const datos = {
            NombreProducto: formValue.NombreProducto,
            CodigoCategoriaProducto: Number(formValue.CodigoCategoriaProducto),
            CodigoUnidadMedida: Number(formValue.CodigoUnidadMedida),
            TipoProducto: formValue.TipoProducto,
            CodigoBarra: formValue.CodigoBarra || "",
            Iva: Number(formValue.Iva || 0),
            PrecioVenta: Number(formValue.PrecioVenta),
            TieneReceta: formValue.TieneReceta,
            Estatus: Number(formValue.Estatus || 1),
            // Campos de Inventario (el backend los mapea en el Servicio)
            Stock: Number(formValue.Stock || 0),
            StockMinimo: Number(formValue.StockMinimo || 0),
            StockSugerido: Number(formValue.StockSugerido || 0),
            PrecioCompra: Number(formValue.PrecioCompra || 0),
            // Ingredientes
            Ingredientes: formValue.TieneReceta ? formValue.Ingredientes.map((ing: any) => ({
                CodigoProducto: Number(ing.CodigoProducto),
                CodigoUnidadMedida: Number(ing.CodigoUnidadMedida),
                Cantidad: Number(ing.Cantidad)
            })) : []
        };

        try {
            let res;
            if (this.modoEdicion()) {
                // Para editar, el API recibe los mismos campos unificados
                res = await this.servicioProducto.Editar({
                    ...datos,
                    CodigoProducto: this.productoId!
                });
            } else {
                res = await this.servicioProducto.Crear(datos);
            }

            if (res.success) {
                // El backend retorna { success, tipo, message, data }
                // Donde data puede ser { Producto, Receta } en el crear
                const codigo = res.data?.Producto?.CodigoProducto || res.data?.CodigoProducto || this.productoId;

                if (this.archivoImagen && codigo) {
                    await this.subirImagen(codigo);
                }
                this.servicioAlerta.MostrarExito(res.message);
                this.router.navigate(['/productos']);
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            console.error('Error guardando:', error);
            this.servicioAlerta.MostrarError({ message: 'Error durante la operación' });
        } finally {
            this.cargando.set(false);
        }
    }

    private async subirImagen(codigo: number) {
        const formData = new FormData();
        const categoriaId = this.productoForm.get('CodigoCategoriaProducto')?.value;

        formData.append('Imagen', this.archivoImagen!);
        formData.append('CarpetaPrincipal', Entorno.NombreEmpresa);
        formData.append('SubCarpeta', 'Producto');
        formData.append('CodigoVinculado', categoriaId?.toString() || '0');
        formData.append('CodigoPropio', codigo.toString());
        formData.append('CampoVinculado', 'CodigoCategoriaProducto');
        formData.append('CampoPropio', 'CodigoProducto');
        formData.append('NombreCampoImagen', 'ImagenUrl');

        await this.servicioProducto.SubirImagen(formData);
    }

    cancelar() {
        this.router.navigate(['/productos']);
    }
}
