import { Component, Input, Output, EventEmitter, inject, signal, OnInit, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';
import { CompraServicio } from '../../../Servicios/compra.service';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { ServicioProveedor } from '../../../Servicios/proveedor.service';
import { ServicioConfiguracion } from '../../../Servicios/configuracion.service';
import { ModalProveedor } from '../../proveedores/modal-proveedor/modal-proveedor';

@Component({
    selector: 'app-compra-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalProveedor],
    templateUrl: './compra-modal.html',
    styleUrl: './compra-modal.css'
})
export class CompraModal implements OnInit {
    private fb = inject(FormBuilder);
    private servicioCompra = inject(CompraServicio);
    private servicioProducto = inject(ProductoServicio);
    private servicioAlerta = inject(AlertaServicio);
    private servicioProveedor = inject(ServicioProveedor);
    private servicioConfig = inject(ServicioConfiguracion);

    @Input() visible = false;
    @Output() cerrar = new EventEmitter<void>();
    @Output() guardado = new EventEmitter<any>();

    colorSistema = Entorno.ColorSistema;
    form: FormGroup;
    itemForm: FormGroup; // Formulario para la fila superior de "edición"
    cargando = signal(false);
    nuevoCodigoAperturaCaja = 1;

    // Listados reales
    listadoProveedores = signal<any[]>([]);
    listadoCategorias = signal<any[]>([]);
    listadoUnidades = signal<any[]>([]);
    listadoProductos = signal<any[]>([]);

    // Búsquedas
    textoBusquedaProveedor = signal('');
    textoBusquedaProducto = signal('');

    // Control de modal de proveedores
    // Control de modal de proveedores
    mostrarModalProveedor = signal(false);

    mostrarMetodoPago = signal(false);
    mostrarMedioPago = signal(false);

    @HostListener('document:click', ['$event'])
    handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.custom-dropdown-container')) {
            this.mostrarMetodoPago.set(false);
            this.mostrarMedioPago.set(false);
        }
    }

    mediosPago = ['Efectivo', 'Tarjeta de Crédito', 'Transferencia', 'Cheque'];
    metodosPago = ['Contado', 'Crédito'];

    // Filtros calculados para búsqueda rápida
    proveedoresFiltrados = computed(() => {
        const busqueda = this.textoBusquedaProveedor().trim().toLowerCase();
        if (!busqueda) return [];
        return this.listadoProveedores().filter(p => {
            const nombre = (p.NombreProveedor || p.Nombre || '').toLowerCase();
            const nit = (p.NIT || '').toLowerCase();
            return nombre.includes(busqueda) || nit.includes(busqueda);
        });
    });

    productosFiltrados = computed(() => {
        const busqueda = this.textoBusquedaProducto().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!busqueda) return [];

        const listado = this.listadoProductos();
        const filtrado = listado.filter(p => {
            const nombre = (p.NombreProducto || p.Producto || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cat = (p.NombreCategoriaProducto || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return nombre.includes(busqueda) || cat.includes(busqueda);
        });

        return filtrado;
    });

    constructor() {
        this.form = this.fb.group({
            CodigoProveedor: ['', Validators.required],
            Items: this.fb.array([], Validators.required),
            MedioPago: ['Efectivo'],
            MetodoPago: ['Contado'],
            FechaVencimiento: [new Date().toISOString().split('T')[0]],
            Referencia: ['']
        });

        // Formulario para capturar el item antes de añadirlo a la lista
        this.itemForm = this.fb.group({
            CodigoProducto: ['', Validators.required],
            NombreProducto: [{ value: '', disabled: true }],
            NombreCategoria: [{ value: '', disabled: true }],
            NombrePresentacion: [''], // Se guardará el nombre de la unidad elegida
            Precio: [0, [Validators.required, Validators.min(0.01)]],
            Cantidad: [1, [Validators.required, Validators.min(0.01)]],
            CodigoUnidadMedida: ['', Validators.required],
            CodigoCategoriaProducto: ['']
        });
    }

    async ngOnInit() {
        await this.cargarCatalogos();
    }

    async cargarCatalogos() {
        this.cargando.set(true);
        try {
            // Cargar Proveedores
            this.servicioCompra.listarProveedores().then(res => {
                if (res.success) {
                    const data = res.data;
                    const listado = Array.isArray(data) ? data : (data?.Listado || (data ? [data] : []));
                    this.listadoProveedores.set(listado);
                }
            }).catch(e => console.error('Error cargando proveedores:', e));

            // Cargar Productos para Compra
            this.servicioCompra.listarProductosCompra().then(res => {
                if (res.success) {
                    const data = res.data;
                    const listado = Array.isArray(data) ? data : (data?.Listado || (data ? [data] : []));
                    this.listadoProductos.set(listado);
                }
            }).catch(e => console.error('Error cargando productos:', e));

            // Cargar Categorías y Unidades
            this.servicioProducto.ListarCategorias().then(res => {
                if (res.success) this.listadoCategorias.set(res.data || []);
            }).catch(e => console.error('Error cargando categorías:', e));

            this.servicioProducto.ListarUnidades().then(res => {
                if (res.success) this.listadoUnidades.set(res.data || []);
            }).catch(e => console.error('Error cargando unidades:', e));

            // Cargar Caja Actual
            this.servicioConfig.obtenerCajaActual().then(res => {
                if (res.success && res.data) {
                    this.nuevoCodigoAperturaCaja = res.data.CodigoAperturaCaja || 1;
                }
            }).catch(e => console.error('Error cargando caja actual:', e));

        } finally {
            this.cargando.set(false);
        }
    }

    get items() {
        return this.form.get('Items') as FormArray;
    }

    // Al seleccionar un producto en la búsqueda superior
    seleccionarProducto(p: any) {
        const nombreProd = p.NombreProducto || 'N/A';
        this.itemForm.patchValue({
            CodigoProducto: p.CodigoProducto,
            NombreProducto: nombreProd,
            NombreCategoria: p.NombreCategoriaProducto || 'N/A',
            CodigoCategoriaProducto: p.CodigoCategoriaProducto,
            // Precio y cantidad se ingresan manualmente
            Precio: 0,
            Cantidad: 1,
            CodigoUnidadMedida: '',
            NombrePresentacion: ''
        });
        this.textoBusquedaProducto.set(nombreProd);
    }

    seleccionarProveedor(p: any) {
        this.form.patchValue({ CodigoProveedor: p.CodigoProveedor });
        this.textoBusquedaProveedor.set(p.NombreProveedor);
    }

    onInputProveedor(evento: Event) {
        const val = (evento.target as HTMLInputElement).value;
        this.textoBusquedaProveedor.set(val);
        // Al escribir de nuevo, "desbloqueamos" la selección para que aparezca el dropdown
        this.form.get('CodigoProveedor')?.setValue(null);
    }

    onInputProducto(evento: Event) {
        const val = (evento.target as HTMLInputElement).value;
        this.textoBusquedaProducto.set(val);
        // Al escribir de nuevo, "desbloqueamos" la selección para que aparezca el dropdown
        this.itemForm.get('CodigoProducto')?.setValue(null);
    }

    agregarItemALista() {
        if (this.itemForm.invalid) {
            this.servicioAlerta.MostrarAlerta('Por favor complete los datos del producto y seleccione una unidad');
            return;
        }

        const values = this.itemForm.getRawValue();

        // Buscar el nombre de la unidad para mostrarlo en la tabla
        const unidad = this.listadoUnidades().find(u => u.CodigoUnidadMedida == values.CodigoUnidadMedida);
        const nombreUnidad = unidad ? (unidad.NombreUnidad || unidad.Nombre) : 'N/A';

        this.items.push(this.fb.group({
            CodigoCategoriaProducto: [values.CodigoCategoriaProducto],
            CodigoProducto: [values.CodigoProducto, Validators.required],
            CodigoUnidadMedida: [values.CodigoUnidadMedida],
            Precio: [values.Precio, [Validators.required, Validators.min(0.01)]],
            Cantidad: [values.Cantidad, [Validators.required, Validators.min(0.01)]],
            // Campos solo para visualización en la tabla
            NombreProducto: [values.NombreProducto],
            NombreCategoria: [values.NombreCategoria],
            NombrePresentacion: [nombreUnidad]
        }));

        this.resetItemForm();
    }

    resetItemForm() {
        this.itemForm.reset({
            Precio: 0,
            Cantidad: 1
        });
        this.textoBusquedaProducto.set('');
    }

    eliminarItem(index: number) {
        this.items.removeAt(index);
    }

    editarItem(index: number) {
        const item = this.items.at(index).value;
        this.itemForm.patchValue({
            CodigoProducto: item.CodigoProducto,
            NombreProducto: item.NombreProducto,
            NombreCategoria: item.NombreCategoria,
            NombrePresentacion: item.NombrePresentacion,
            Precio: item.Precio,
            Cantidad: item.Cantidad,
            CodigoUnidadMedida: item.CodigoUnidadMedida,
            CodigoCategoriaProducto: item.CodigoCategoriaProducto
        });
        this.textoBusquedaProducto.set(item.NombreProducto);
        this.items.removeAt(index);
    }

    onCerrar() {
        this.form.reset({
            MedioPago: 'Efectivo',
            MetodoPago: 'Contado',
            FechaVencimiento: new Date().toISOString().split('T')[0]
        });
        this.items.clear();
        this.resetItemForm();
        this.textoBusquedaProveedor.set('');
        this.mostrarMetodoPago.set(false);
        this.mostrarMedioPago.set(false);
        this.cerrar.emit();
    }

    async onGuardar() {
        if (this.form.invalid) {
            if (this.items.length === 0) {
                this.servicioAlerta.MostrarAlerta('Debe agregar al menos un producto a la compra');
            } else if (!this.form.get('CodigoProveedor')?.value) {
                this.servicioAlerta.MostrarAlerta('Por favor seleccione un proveedor');
            } else {
                this.servicioAlerta.MostrarAlerta('Por favor complete todos los campos obligatorios');
                this.form.markAllAsTouched();
            }
            return;
        }

        this.cargando.set(true);
        try {
            const val = this.form.value;

            const medioPagoMap: any = {
                'Efectivo': 1,
                'Tarjeta de Crédito': 2,
                'Transferencia': 3,
                'Cheque': 4
            };

            const payload: any = {
                CodigoProveedor: Number(val.CodigoProveedor),
                TipoCompra: val.MetodoPago === 'Crédito' ? 'CREDITO' : 'CONTADO',
                Productos: this.items.getRawValue().map(i => ({
                    CodigoProducto: Number(i.CodigoProducto),
                    CodigoCategoriaProducto: Number(i.CodigoCategoriaProducto),
                    CodigoUnidadMedida: Number(i.CodigoUnidadMedida),
                    Cantidad: Number(i.Cantidad),
                    Precio: Number(i.Precio)
                }))
            };

            // Lógica unificada según el ejemplo exitoso de Postman
            payload.MetodoPago = medioPagoMap[val.MedioPago] || 1;
            payload.CodigoAperturaCaja = Number(this.nuevoCodigoAperturaCaja);
            payload.Referencia = val.Referencia || 'S/N';

            if (payload.TipoCompra === 'CREDITO') {
                payload.FechaVencimiento = val.FechaVencimiento;
            } else {
                // Al contado se elimina FechaVencimiento según indicación previa
                delete payload.FechaVencimiento;
            }


            const res = await this.servicioCompra.guardar(payload);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.guardado.emit();
                this.onCerrar();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error: any) {
            console.error('Error al guardar compra:', error);
            const errorApi = error.response?.data || { success: false, message: 'Error al procesar la solicitud' };
            this.servicioAlerta.MostrarError(errorApi);
        } finally {
            this.cargando.set(false);
        }
    }

    // Métodos para el modal de proveedores
    abrirModalProveedor() {
        this.mostrarModalProveedor.set(true);
    }

    cerrarModalProveedor() {
        this.mostrarModalProveedor.set(false);
    }

    async manejarGuardarProveedor(datos: any) {
        const res = await this.servicioProveedor.crearProveedor(datos);
        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message || 'Proveedor guardado correctamente');
            await this.cargarCatalogos();
            
            // Intentar seleccionar el proveedor recién creado si el API lo retornó
            if (res.data) {
                // El API suele retornar el objeto creado o al menos { CodigoProveedor, NombreProveedor }
                this.seleccionarProveedor(res.data);
            }

            this.cerrarModalProveedor();
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al guardar proveedor');
        }
    }
}
