import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Producto, CategoriaProducto, UnidadMedida, Ingrediente } from '../../../Modelos/producto.modelo';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';
import { ServicioAutenticacion } from '../../../Servicios/auth.service';
import { CategoriaModal } from '../modales/categoria-modal/categoria-modal';
import { PresentacionModal } from '../modales/presentacion-modal/presentacion-modal';
import { manejarErrorApi } from '../../../Utils/error-parser';

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
    private servicioAuth = inject(ServicioAutenticacion);
    private destroyRef = inject(DestroyRef);

    colorSistema = Entorno.ColorSistema;
    productoForm: FormGroup;

    // Catalogos
    categorias = signal<CategoriaProducto[]>([]);
    unidades = signal<UnidadMedida[]>([]);
    todosLosProductos = signal<Producto[]>([]); // Para el buscador de ingredientes
    productosVentanillaCocina = signal<Producto[]>([]); // Para validar codigo de barra unico

    // Modales
    mostrarCategoriaModal = signal(false);
    mostrarPresentacionModal = signal(false);

    // Estado
    modoEdicion = signal(false);
    cargando = signal(false);
    imagenPreview = signal<string | null>(null);
    archivoImagen: File | null = null;
    triggerRecargaIngredientes = signal(0); // Para forzar actualizacion de computed

    // Seguridad
    esSuperAdmin = computed(() => this.servicioAuth.usuarioActual()?.SuperAdmin === 1);

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
        // Validadores de formato
        const dosDecimales = Validators.pattern(/^\d+(\.\d{1,2})?$/);
        const soloDigitos8 = Validators.pattern(/^\d{0,8}$/);

        this.productoForm = this.fb.group({
            NombreProducto: ['', [Validators.required]],
            CodigoCategoriaProducto: [null, [Validators.required]],
            CodigoUnidadMedida: [null, [Validators.required]],
            TipoProducto: [null, [Validators.required]],
            CodigoBarra: ['', [soloDigitos8]],
            Iva: [0, [Validators.min(0), Validators.max(100), dosDecimales]],
            PrecioVenta: [0, [Validators.required, Validators.min(0.01), dosDecimales]],
            TieneReceta: [false],
            Estatus: [1],
            Stock: [null, [Validators.required, Validators.min(0), dosDecimales]],
            StockMinimo: [0, [Validators.min(0), dosDecimales]],
            StockSugerido: [0, [Validators.min(0), dosDecimales]],
            PrecioCompra: [0, [Validators.min(0), dosDecimales]],
            Ingredientes: this.fb.array([])
        });
    }

    get ingredientes() {
        return this.productoForm.get('Ingredientes') as FormArray;
    }

    esInvalido(nombreControl: string): boolean {
        const c = this.productoForm.get(nombreControl);
        return !!c && c.invalid && (c.touched || c.dirty);
    }

    filtrarSoloDigitos(nombreControl: string, input: HTMLInputElement) {
        const limpio = (input.value || '').replace(/\D+/g, '').slice(0, 8);
        if (limpio !== input.value) {
            input.value = limpio;
        }
        this.productoForm.get(nombreControl)?.setValue(limpio, { emitEvent: false });
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
            const [resCat, resUni, resProd, resProdAll] = await Promise.all([
                this.servicioProducto.ListarCategorias(),
                this.servicioProducto.ListarUnidades(),
                this.servicioProducto.ListarInsumos(),
                this.servicioProducto.Listar()
            ]);
            if (resProdAll.success) {
                const listado = Array.isArray(resProdAll.data) ? resProdAll.data : (resProdAll.data?.Listado || []);
                this.productosVentanillaCocina.set(listado);
            }
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
                    PrecioCompra: p.PrecioCompra !== undefined ? p.PrecioCompra : (p.Inventario?.PrecioCompra || 0),
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
                    TipoProducto: pData.TipoProducto?.toUpperCase() || 'VENTANILLA',
                    Stock: inv.StockActual !== undefined ? inv.StockActual : (pData.Stock || 0),
                    StockMinimo: inv.StockMinimo !== undefined ? inv.StockMinimo : (pData.StockMinimo || 0),
                    StockSugerido: inv.StockSugerido !== undefined ? inv.StockSugerido : (pData.StockSugerido || 0),
                    PrecioCompra: inv.PrecioCompra !== undefined ? inv.PrecioCompra : (pData.PrecioCompra || 0)
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
                    const promesasCostos = detalles.map(async (det: any) => {
                        const prodIng = det.ProductoIngrediente || {};
                        const unidad = det.UnidadMedida || {};
                        const unidadObj = this.unidades().find(u => u.CodigoUnidadMedida === det.CodigoUnidadMedida) || unidad;

                        let precioProporcional = det.PrecioProporcional || 0;

                        try {
                            const resCosto = await this.servicioProducto.CalcularCostoIngrediente({
                                CodigoProducto: Number(det.CodigoProducto),
                                NombreUnidadDestino: unidadObj.NombreUnidad,
                                Cantidad: Number(det.Cantidad)
                            });
                            if (resCosto.success) {
                                precioProporcional = resCosto.data.PrecioProporcional;
                            }
                        } catch (e) {
                            console.error('Error calculando costo para ingrediente cargado:', e);
                        }

                        let precioCompra = det.PrecioCompra;
                        if (precioCompra === undefined || precioCompra === 0) {
                            const catalogado = this.todosLosProductos().find(p => p.CodigoProducto === det.CodigoProducto);
                            precioCompra = catalogado?.PrecioCompra || prodIng.PrecioCompra || 0;
                        }

                        return {
                            CodigoProducto: det.CodigoProducto,
                            NombreProducto: prodIng.NombreProducto || det.NombreProducto || 'Sin nombre',
                            CodigoUnidadMedida: det.CodigoUnidadMedida,
                            NombreUnidad: unidadObj.NombreUnidad || 'No def.',
                            Cantidad: det.Cantidad,
                            PrecioUnitario: precioCompra,
                            PrecioProporcional: precioProporcional
                        };
                    });

                    const ingredientesConCostos = await Promise.all(promesasCostos);
                    ingredientesConCostos.forEach(ing => this.agregarIngredienteExistente(ing));
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

    async agregarIngrediente() {
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

        if (!unidadObj) {
            this.servicioAlerta.MostrarAlerta('Unidad de medida no válida');
            return;
        }

        const cantidad = Number(this.cantidadIngrediente());
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            this.servicioAlerta.MostrarAlerta('La cantidad debe ser mayor a 0.', 'Cantidad inválida');
            return;
        }

        try {
            this.cargando.set(true);
            const resCosto = await this.servicioProducto.CalcularCostoIngrediente({
                CodigoProducto: Number(prod!.CodigoProducto),
                NombreUnidadDestino: unidadObj.NombreUnidad,
                Cantidad: Number(this.cantidadIngrediente())
            });

            const precioProporcional = resCosto.success ? resCosto.data.PrecioProporcional : 0;

            const nuevoIngrediente = this.fb.group({
                CodigoProducto: [prod!.CodigoProducto, Validators.required],
                NombreProducto: [prod!.NombreProducto],
                CodigoUnidadMedida: [unidadId, Validators.required],
                NombreUnidad: [unidadObj.NombreUnidad],
                Cantidad: [this.cantidadIngrediente(), [Validators.required, Validators.min(0.0001)]],
                PrecioUnitario: [prod!.PrecioCompra || 0],
                PrecioProporcional: [precioProporcional]
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
        } catch (error: any) {
            const mensajeApi = error?.response?.data?.error?.message
                || error?.response?.data?.message
                || '';
            const esConversion = /No existe.*conversi[oó]n/i.test(mensajeApi);
            this.servicioAlerta.MostrarAlerta(
                esConversion
                    ? 'La presentación seleccionada no corresponde al insumo configurado.'
                    : (mensajeApi || 'Error al calcular el costo del ingrediente.'),
                esConversion ? 'Presentación inválida' : 'Error'
            );
        } finally {
            this.cargando.set(false);
        }
    }

    editarIngrediente(index: number) {
        this.indiceEdicionIngrediente.set(index);
    }

    async confirmarEdicion(index: number) {
        const grupo = this.ingredientes.at(index) as FormGroup;
        const unidadId = grupo.get('CodigoUnidadMedida')?.value;
        const unidadObj = this.unidades().find(u => u.CodigoUnidadMedida == unidadId);

        if (!unidadObj) {
            this.servicioAlerta.MostrarAlerta(
                'La presentación seleccionada no corresponde al insumo configurado.',
                'Presentación inválida'
            );
            return;
        }

        const codigoProducto = Number(grupo.get('CodigoProducto')?.value);
        const cantidad = Number(grupo.get('Cantidad')?.value);

        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            this.servicioAlerta.MostrarAlerta('La cantidad debe ser mayor a 0.', 'Cantidad inválida');
            return;
        }

        try {
            this.cargando.set(true);
            const resCosto = await this.servicioProducto.CalcularCostoIngrediente({
                CodigoProducto: codigoProducto,
                NombreUnidadDestino: unidadObj.NombreUnidad,
                Cantidad: cantidad
            });

            if (!resCosto.success) {
                this.servicioAlerta.MostrarAlerta(
                    'La presentación seleccionada no corresponde al insumo configurado.',
                    'Presentación inválida'
                );
                return;
            }

            // Actualizar precio (proporcional y unitario desde catalogo) y presentacion
            const insumo = this.todosLosProductos().find(p => p.CodigoProducto === codigoProducto);
            grupo.patchValue({
                NombreUnidad: unidadObj.NombreUnidad,
                PrecioUnitario: insumo?.PrecioCompra ?? grupo.get('PrecioUnitario')?.value,
                PrecioProporcional: resCosto.data.PrecioProporcional
            });
            this.indiceEdicionIngrediente.set(null);
        } catch (error: any) {
            const mensajeApi = error?.response?.data?.error?.message
                || error?.response?.data?.message
                || '';
            const esConversion = /No existe.*conversi[oó]n/i.test(mensajeApi);
            this.servicioAlerta.MostrarAlerta(
                esConversion
                    ? 'La presentación seleccionada no corresponde al insumo configurado.'
                    : (mensajeApi || 'Error al recalcular el costo del ingrediente.'),
                esConversion ? 'Presentación inválida' : 'Error'
            );
        } finally {
            this.cargando.set(false);
        }
    }

    cancelarEdicion() {
        this.indiceEdicionIngrediente.set(null);
    }

    private agregarIngredienteExistente(ing: Ingrediente & { PrecioUnitario?: number, PrecioProporcional?: number }) {
        this.ingredientes.push(this.fb.group({
            CodigoProducto: [ing.CodigoProducto, Validators.required],
            NombreProducto: [ing.NombreProducto],
            CodigoUnidadMedida: [ing.CodigoUnidadMedida, Validators.required],
            NombreUnidad: [ing.NombreUnidad],
            Cantidad: [ing.Cantidad, [Validators.required, Validators.min(0.0001)]],
            PrecioUnitario: [ing.PrecioUnitario || 0],
            PrecioProporcional: [ing.PrecioProporcional || 0]
        }));
    }

    eliminarIngrediente(index: number) {
        this.ingredientes.removeAt(index);
        this.triggerRecargaIngredientes.update(v => v + 1);
    }

    calcularCostoTotal(): number {
        return this.ingredientes.value.reduce((acc: number, ing: any) => acc + (Number(ing.PrecioProporcional) || 0), 0);
    }

    // Imagen
    alSeleccionarImagen(event: any) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const formatosPermitidos = ['image/jpeg', 'image/png'];
        const tamanoMaximo = 1024 * 1024; // 1 MB
        const formatoValido = formatosPermitidos.includes(file.type);
        const tamanoValido = file.size <= tamanoMaximo;

        if (!formatoValido || !tamanoValido) {
            this.servicioAlerta.MostrarAlerta(
                'La imagen seleccionada supera el tamaño permitido o el formato no es válido. Solo se permiten archivos PNG y JPG de hasta 1 MB.',
                'Imagen no válida'
            );
            input.value = '';
            return;
        }

        this.archivoImagen = file;
        const reader = new FileReader();
        reader.onload = () => this.imagenPreview.set(reader.result as string);
        reader.readAsDataURL(file);
    }

    async guardar() {
        if (this.productoForm.invalid) {
            this.productoForm.markAllAsTouched();
            this.servicioAlerta.MostrarAlerta(
                'Complete los campos obligatorios resaltados en rojo antes de continuar.',
                'Campos obligatorios'
            );
            return;
        }

        // Codigo de barra unico (cuando no esta vacio)
        const codigoBarra = (this.productoForm.value.CodigoBarra || '').toString().trim();
        if (codigoBarra) {
            const duplicado = [
                ...this.productosVentanillaCocina(),
                ...this.todosLosProductos()
            ].some((p: any) =>
                p.CodigoBarra && p.CodigoBarra.toString().trim() === codigoBarra
                && p.CodigoProducto !== this.productoId
            );
            if (duplicado) {
                this.productoForm.get('CodigoBarra')?.markAsTouched();
                this.servicioAlerta.MostrarAlerta(
                    'El código de barra ingresado ya se encuentra registrado.',
                    'Código de barra duplicado'
                );
                return;
            }
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
            // Ingredientes:
            // - Con receta activa: enviamos la lista actual (el API reemplaza los detalles).
            // - Sin receta activa: enviamos undefined para que el API conserve los detalles existentes
            //   (soft-disable) y no los pisemos al reactivar.
            Ingredientes: formValue.TieneReceta
                ? formValue.Ingredientes.map((ing: any) => ({
                    CodigoProducto: Number(ing.CodigoProducto),
                    CodigoUnidadMedida: Number(ing.CodigoUnidadMedida),
                    Cantidad: Number(ing.Cantidad)
                }))
                : undefined
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
                this.servicioAlerta.MostrarError({ message: manejarErrorApi(res) });
            }
        } catch (error) {
            console.error('Error guardando:', error);
            this.servicioAlerta.MostrarError({ message: 'Error durante la operación' });
        } finally {
            this.cargando.set(false);
        }
    }

    private async subirImagen(codigo: number) {
        try {
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
        } catch (error) {
            console.error('Error subiendo imagen:', error);
        }
    }

    cancelar() {
        this.router.navigate(['/productos']);
    }
}
