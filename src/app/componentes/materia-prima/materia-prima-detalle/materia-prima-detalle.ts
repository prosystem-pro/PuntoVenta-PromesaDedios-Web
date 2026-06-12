import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Producto, CategoriaProducto, UnidadMedida } from '../../../Modelos/producto.modelo';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';
import { ServicioAutenticacion } from '../../../Servicios/auth.service';
import { CategoriaModal } from '../../productos/modales/categoria-modal/categoria-modal';
import { PresentacionModal } from '../../productos/modales/presentacion-modal/presentacion-modal';
import { manejarErrorApi } from '../../../Utils/error-parser';

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
    private servicioAuth = inject(ServicioAutenticacion);
    private route = inject(ActivatedRoute);

    colorSistema = Entorno.ColorSistema;
    form: FormGroup;
    cargando = signal(false);
    // Bloquea el botón mientras se guarda/actualiza (evita doble envío por doble clic)
    guardando = signal(false);

    // Catalogos
    categorias = signal<CategoriaProducto[]>([]);
    unidades = signal<UnidadMedida[]>([]);
    insumosExistentes = signal<Producto[]>([]);

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

    // Seguridad
    esSuperAdmin = computed(() => this.servicioAuth.usuarioActual()?.SuperAdmin === 1);

    constructor() {
        this.form = this.fb.group({
            CodigoProducto: [null],
            CodigoCategoriaProducto: [null, [Validators.required]],
            NombreProducto: ['', [Validators.required]],
            CodigoUnidadMedida: [null, [Validators.required]],
            Stock: [null, [Validators.required]],
            StockMinimo: [0],
            StockSugerido: [0],
            PrecioCompra: [null, [Validators.required]],
            CodigoBarra: [''],
            Iva: [0],
            Estatus: [1]
        });
    }

    async ngOnInit() {
        await this.cargarCatalogos();
        await this.cargarInsumosExistentes();

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
                const inv = p.Inventario || {};
                this.form.patchValue({
                    CodigoProducto: p.CodigoProducto,
                    CodigoCategoriaProducto: p.CodigoCategoriaProducto || p.Categoria?.CodigoCategoriaProducto,
                    NombreProducto: p.NombreProducto,
                    CodigoUnidadMedida: p.CodigoUnidadMedida || p.UnidadMedida?.CodigoUnidadMedida,
                    Stock: inv.StockActual !== undefined ? inv.StockActual : (p.Stock || 0),
                    StockMinimo: inv.StockMinimo !== undefined ? inv.StockMinimo : (p.StockMinimo || 0),
                    StockSugerido: inv.StockSugerido !== undefined ? inv.StockSugerido : (p.StockSugerido || 0),
                    PrecioCompra: inv.PrecioCompra !== undefined ? inv.PrecioCompra : (p.PrecioCompra || 0),
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
                this.servicioProducto.ListarCategorias('INSUMO'),
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

    async cargarInsumosExistentes() {
        try {
            const res = await this.servicioProducto.ListarInsumos();
            const listadoRaw = Array.isArray(res.data) ? res.data : (res.data?.Listado || []);
            const insumosMapeados = listadoRaw.map((p: any) => ({
                ...p,
                NombreProducto: p.Producto || p.NombreProducto
            }));
            this.insumosExistentes.set(insumosMapeados);
        } catch (error) {
            console.error('Error al cargar insumos existentes:', error);
        }
    }

    normalizarTexto(texto: string): string {
        if (!texto) return '';
        return texto
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remover tildes
            .replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiales (dejar solo letras, números y espacios)
            .replace(/\s+/g, ' ') // Colapsar espacios múltiples en uno solo
            .trim();
    }

    existeNombreDuplicado(nombre: string, idAExcluir: number | null = null): boolean {
        const nombreNormalizado = this.normalizarTexto(nombre);
        if (!nombreNormalizado) return false;

        // 1. Verificar contra insumos existentes en base de datos
        const duplicadoEnDb = this.insumosExistentes().some(i => {
            if (idAExcluir !== null && i.CodigoProducto === idAExcluir) {
                return false;
            }
            return this.normalizarTexto(i.NombreProducto) === nombreNormalizado;
        });

        if (duplicadoEnDb) return true;

        // 2. Verificar contra lista de carga temporal (solo si no es modo edicion)
        if (!this.modoEdicion()) {
            const duplicadoEnLista = this.listaCarga().some(item => {
                return this.normalizarTexto(item.NombreProducto) === nombreNormalizado;
            });
            if (duplicadoEnLista) return true;
        }

        return false;
    }

    tieneMasDeDosDecimales(valor: any): boolean {
        if (valor === null || valor === undefined || valor === '') return false;
        const stringVal = valor.toString();
        if (stringVal.includes('.')) {
            const decimales = stringVal.split('.')[1];
            return decimales.length > 2;
        }
        return false;
    }

    validarCamposFormulario(val: any): string | null {
        // Stock
        if (val.Stock < 0) {
            return 'El Stock no puede ser menor a cero.';
        }
        if (this.tieneMasDeDosDecimales(val.Stock)) {
            return 'El Stock no puede tener más de dos decimales.';
        }

        // Stock Minimo
        if (val.StockMinimo < 0) {
            return 'El Stock Mínimo no puede ser menor a cero.';
        }
        if (this.tieneMasDeDosDecimales(val.StockMinimo)) {
            return 'El Stock Mínimo no puede tener más de dos decimales.';
        }

        // Stock Sugerido
        if (val.StockSugerido < 0) {
            return 'El Stock Sugerido no puede ser menor a cero.';
        }
        if (this.tieneMasDeDosDecimales(val.StockSugerido)) {
            return 'El Stock Sugerido no puede tener más de dos decimales.';
        }

        // Precio Compra
        if (val.PrecioCompra < 0) {
            return 'El Precio de Compra no puede ser menor a cero.';
        }
        if (this.tieneMasDeDosDecimales(val.PrecioCompra)) {
            return 'El Precio de Compra no puede tener más de dos decimales.';
        }

        // IVA
        if (val.Iva !== null && val.Iva !== undefined && val.Iva !== '') {
            const ivaNum = Number(val.Iva);
            if (ivaNum < 0 || ivaNum > 100) {
                return 'El porcentaje de IVA debe estar entre 0% y 100%.';
            }
        }

        return null;
    }

    // Gestion de Lista Temporal
    agregarALista() {
        const formVal = this.form.value;

        // 1. Validaciones numéricas de rango y decimales primero
        const errorCampos = this.validarCamposFormulario(formVal);
        if (errorCampos) {
            this.servicioAlerta.MostrarAlerta(errorCampos);
            return;
        }

        // 2. Validaciones de campos obligatorios vacíos
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.servicioAlerta.MostrarAlerta('Por favor, complete todos los campos obligatorios (*) de forma correcta.');
            return;
        }

        // Validar duplicado antes de agregar a la lista
        if (this.existeNombreDuplicado(formVal.NombreProducto)) {
            this.servicioAlerta.MostrarAlerta(
                `El producto "${formVal.NombreProducto}" ya existe o está duplicado (coincidencia lógica detectada).`
            );
            return;
        }

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

        // Reset form e imagen (Estatus vuelve a su valor predeterminado "Activo";
        // Stock y Precio compra quedan vacios para forzar nueva captura)
        this.form.reset({ Iva: 0, Estatus: 1 });
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
            // Validar límite de tamaño (1 MB = 1024 * 1024 bytes)
            const limiteBytes = 1 * 1024 * 1024;
            if (file.size > limiteBytes) {
                this.servicioAlerta.MostrarAlerta('El tamaño máximo permitido para la imagen es de 1 MB.');
                event.target.value = ''; // Limpiar el input para permitir re-selección
                return;
            }

            this.archivoImagen = file;
            const reader = new FileReader();
            reader.onload = () => this.imagenPreview.set(reader.result as string);
            reader.readAsDataURL(file);
        }
    }

    async guardarTodo() {
        // Evita doble envío (doble clic), incluso durante el diálogo de confirmación
        if (this.guardando()) return;

        if (this.listaCarga().length === 0) {
            this.servicioAlerta.MostrarAlerta('No hay productos en la lista de carga');
            return;
        }

        this.guardando.set(true);
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Desea guardar todos estos productos?',
            `Se registrarán ${this.listaCarga().length} productos de materia prima.`
        );

        if (!confirmado) {
            this.guardando.set(false);
            return;
        }

        this.cargando.set(true);
        let exitos = 0;
        let errores = 0;
        const mensajesError: string[] = [];

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
                    mensajesError.push(manejarErrorApi(res));
                }
            } catch (e) {
                errores++;
                mensajesError.push(manejarErrorApi(e));
            }
        }

        this.cargando.set(false);
        this.guardando.set(false);
        if (errores === 0) {
            this.servicioAlerta.MostrarExito(`Se guardaron ${exitos} productos correctamente`);
            this.router.navigate(['/materia-prima']);
        } else if (exitos === 0 && errores === 1) {
            // Un solo producto y falló: mostrar el mensaje real del API
            // (p. ej. "El código de barra ingresado ya se encuentra registrado.")
            this.servicioAlerta.MostrarError(mensajesError[0]);
        } else {
            // Lote con resultados mixtos: resumen + detalle de los errores
            const detalle = [...new Set(mensajesError)].join(' · ');
            this.servicioAlerta.MostrarAlerta(
                `Éxitos: ${exitos}, Errores: ${errores}. ${detalle}`
            );
        }
    }

    async actualizar() {
        // Evita doble envío por doble clic
        if (this.guardando()) return;

        const val = this.form.value;

        // 1. Validaciones numéricas de rango y decimales primero
        const errorCampos = this.validarCamposFormulario(val);
        if (errorCampos) {
            this.servicioAlerta.MostrarAlerta(errorCampos);
            return;
        }

        // 2. Validaciones de campos obligatorios vacíos
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.servicioAlerta.MostrarAlerta('Por favor, complete todos los campos obligatorios (*) de forma correcta.');
            return;
        }

        // Validar duplicado antes de actualizar
        if (this.existeNombreDuplicado(val.NombreProducto, this.insumoId())) {
            this.servicioAlerta.MostrarAlerta(
                `No se puede actualizar. El producto "${val.NombreProducto}" ya existe o coincide con otro registro.`
            );
            return;
        }

        this.guardando.set(true);
        this.cargando.set(true);
        try {
            const payload: Partial<Producto> = {
                ...val,
                // Stock Minimo y Sugerido no son obligatorios: si quedan vacios se guardan como 0
                StockMinimo: Number(val.StockMinimo || 0),
                StockSugerido: Number(val.StockSugerido || 0),
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
                this.servicioAlerta.MostrarError(manejarErrorApi(res));
            }
        } catch (error) {
            // Muestra el mensaje real del API
            // (p. ej. "El código de barra ingresado ya se encuentra registrado.")
            this.servicioAlerta.MostrarError(manejarErrorApi(error));
        } finally {
            this.cargando.set(false);
            this.guardando.set(false);
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
