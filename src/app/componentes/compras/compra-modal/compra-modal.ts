import { Component, Input, Output, EventEmitter, inject, signal, OnInit, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';
import { CompraServicio } from '../../../Servicios/compra.service';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { ServicioProveedor } from '../../../Servicios/proveedor.service';
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

    @Input() visible = false;
    @Output() cerrar = new EventEmitter<void>();
    @Output() guardado = new EventEmitter<any>();

    colorSistema = Entorno.ColorSistema;
    form: FormGroup;
    itemForm: FormGroup; // Formulario para la fila superior de "edición"
    cargando = signal(false);

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
        const busqueda = this.textoBusquedaProveedor().toLowerCase();
        return this.listadoProveedores().filter(p =>
            (p.NombreProveedor?.toLowerCase() || '').includes(busqueda) ||
            (p.NIT?.toLowerCase() || '').includes(busqueda)
        );
    });

    productosFiltrados = computed(() => {
        const busqueda = this.textoBusquedaProducto().toLowerCase();
        return this.listadoProductos().filter(p =>
            (p.NombreProducto?.toLowerCase() || p.Producto?.toLowerCase() || '').includes(busqueda) ||
            (p.NombreCategoriaProducto?.toLowerCase() || '').includes(busqueda)
        );
    });

    constructor() {
        this.form = this.fb.group({
            CodigoProveedor: ['', Validators.required],
            Items: this.fb.array([], Validators.required),
            MedioPago: ['Efectivo'],
            MetodoPago: ['Contado'],
            FechaVencimiento: [new Date().toISOString().split('T')[0]]
        });

        // Formulario para capturar el item antes de añadirlo a la lista
        this.itemForm = this.fb.group({
            CodigoProducto: ['', Validators.required],
            NombreProducto: [{ value: '', disabled: true }],
            NombreCategoria: [{ value: '', disabled: true }],
            NombrePresentacion: [{ value: '', disabled: true }],
            Precio: [0, [Validators.required, Validators.min(0.01)]],
            Cantidad: [1, [Validators.required, Validators.min(0.01)]],
            CodigoUnidadMedida: [''],
            CodigoCategoriaProducto: ['']
        });
    }

    async ngOnInit() {
        await this.cargarCatalogos();
    }

    async cargarCatalogos() {
        try {
            const [resProv, resCat, resUni, resProd] = await Promise.all([
                this.servicioProveedor.obtenerProveedores(),
                this.servicioProducto.ListarCategorias(),
                this.servicioProducto.ListarUnidades(),
                this.servicioProducto.ListarInsumos()
            ]);

            if (resProv.success) {
                const data = resProv.data;
                this.listadoProveedores.set(Array.isArray(data) ? data : (data ? [data] : []));
            }
            if (resCat.success) this.listadoCategorias.set(resCat.data || []);
            if (resUni.success) this.listadoUnidades.set(resUni.data || []);
            if (resProd.success) this.listadoProductos.set(resProd.data || []);
        } catch (error) {
            console.error('Error cargando catálogos de compra:', error);
        }
    }

    get items() {
        return this.form.get('Items') as FormArray;
    }

    // Al seleccionar un producto en la búsqueda superior
    seleccionarProducto(p: any) {
        const nombreProd = p.NombreProducto || p.Producto || 'N/A';
        this.itemForm.patchValue({
            CodigoProducto: p.CodigoProducto,
            NombreProducto: nombreProd,
            NombreCategoria: p.NombreCategoriaProducto || 'N/A',
            NombrePresentacion: p.NombreUnidad || 'Unidad',
            Precio: p.PrecioVenta || 0,
            CodigoUnidadMedida: p.CodigoUnidadMedida,
            CodigoCategoriaProducto: p.CodigoCategoriaProducto
        });
        this.textoBusquedaProducto.set(nombreProd);
    }

    seleccionarProveedor(p: any) {
        this.form.patchValue({ CodigoProveedor: p.CodigoProveedor });
        this.textoBusquedaProveedor.set(p.NombreProveedor);
    }

    agregarItemALista() {
        if (this.itemForm.invalid) {
            this.servicioAlerta.MostrarAlerta('Por favor complete los datos del producto');
            return;
        }

        const values = this.itemForm.getRawValue();

        this.items.push(this.fb.group({
            CodigoCategoriaProducto: [values.CodigoCategoriaProducto],
            CodigoProducto: [values.CodigoProducto, Validators.required],
            CodigoUnidadMedida: [values.CodigoUnidadMedida],
            Precio: [values.Precio, [Validators.required, Validators.min(0.01)]],
            Cantidad: [values.Cantidad, [Validators.required, Validators.min(0.01)]],
            // Campos solo para visualización en la tabla
            NombreProducto: [values.NombreProducto],
            NombreCategoria: [values.NombreCategoria],
            NombrePresentacion: [values.NombrePresentacion]
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

            // Map MedioPago string to Numeric ID as expected by API
            const medioPagoMap: any = {
                'Efectivo': 1,
                'Tarjeta de Crédito': 2,
                'Transferencia': 3,
                'Cheque': 4
            };

            const payload: any = {
                CodigoProveedor: Number(val.CodigoProveedor),
                TipoCompra: val.MetodoPago === 'Crédito' ? 'Credito' : val.MetodoPago, // API expects 'Contado' | 'Credito' (Unaccented for backend logic usually)
                MetodoPago: medioPagoMap[val.MedioPago] || 1, // API expects numeric ID
                CodigoAperturaCaja: 1, // Hardcoded for now
                Productos: this.items.getRawValue().map(i => ({
                    CodigoProducto: i.CodigoProducto,
                    CodigoCategoriaProducto: i.CodigoCategoriaProducto,
                    CodigoUnidadMedida: i.CodigoUnidadMedida,
                    Cantidad: i.Cantidad,
                    Precio: i.Precio
                }))
            };

            // Only send FechaVencimiento if it's a Credit purchase
            if (val.MetodoPago === 'Credito') {
                payload.FechaVencimiento = val.FechaVencimiento;
            }

            const res = await this.servicioCompra.guardar(payload);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.guardado.emit();
                this.onCerrar();
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al guardar la compra' } });
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
            this.cerrarModalProveedor();
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al guardar proveedor');
        }
    }
}
