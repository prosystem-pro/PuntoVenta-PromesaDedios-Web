import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Producto, CategoriaProducto } from '../../../Modelos/producto.modelo';
import { Mesa } from '../../../Modelos/mesa.modelo';
import { GuardarProductosMesaRequest, FacturarMesaRequest, PagoVenta } from '../../../Modelos/venta.modelo';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { MesaServicio } from '../../../Servicios/mesa.service';
import { VentaServicio } from '../../../Servicios/venta.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';

@Component({
    selector: 'app-venta-mesa',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './venta-mesa.html',
    styleUrl: './venta-mesa.css'
})
export class VentaMesa implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private servicioProducto = inject(ProductoServicio);
    private servicioMesa = inject(MesaServicio);
    private servicioVenta = inject(VentaServicio);
    private servicioAlerta = inject(AlertaServicio);
    private destroyRef = inject(DestroyRef);

    colorSistema = Entorno.ColorSistema;
    mesaId: number | null = null;
    mesa = signal<Mesa | null>(null);

    // Catalogos
    productos = signal<Producto[]>([]);
    categorias = signal<CategoriaProducto[]>([]);

    // Estado Vista
    categoriaSeleccionada = signal<number | null>(null);
    textoFiltro = signal('');
    cargando = signal(false);

    // Carrito / Orden
    carrito = signal<any[]>([]);
    total = computed(() => {
        return this.carrito().reduce((acc, item) => acc + (item.PrecioUnitario * item.Cantidad), 0);
    });

    constructor() { }

    async ngOnInit() {
        this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            if (params['id']) {
                this.mesaId = +params['id'];
                this.cargarDatosMesa();
            }
        });

        await this.cargarCatalogos();
    }

    async cargarDatosMesa() {
        if (!this.mesaId) return;
        // Cargar comanda actual si existe
        const res = await this.servicioMesa.obtenerComanda(this.mesaId);
        if (res.success && res.data) {
            // Mapear comanda al carrito
            const items = res.data.Productos || [];
            this.carrito.set(items.map((it: any) => ({
                CodigoProducto: it.CodigoProducto,
                NombreProducto: it.NombreProducto,
                PrecioUnitario: it.PrecioUnitario,
                Cantidad: it.Cantidad,
                Nota: it.Nota || ''
            })));
        }
    }

    async cargarCatalogos() {
        this.cargando.set(true);
        try {
            const [resP, resC] = await Promise.all([
                this.servicioProducto.Listar(),
                this.servicioProducto.ListarCategorias()
            ]);
            if (resP.success) this.productos.set(resP.data || []);
            if (resC.success) this.categorias.set(resC.data || []);
        } finally {
            this.cargando.set(false);
        }
    }

    productosFiltrados = computed(() => {
        let listado = this.productos();
        const cat = this.categoriaSeleccionada();
        const busqueda = this.textoFiltro().toLowerCase();

        if (cat) {
            listado = listado.filter(p => p.CodigoCategoriaProducto === cat);
        }
        if (busqueda) {
            listado = listado.filter(p => p.NombreProducto?.toLowerCase().includes(busqueda));
        }
        return listado;
    });

    seleccionarCategoria(id: number | null | undefined) {
        this.categoriaSeleccionada.set(id ?? null);
    }

    agregarAlCarrito(producto: Producto) {
        if (!producto.CodigoProducto) return;
        const actual = this.carrito();
        const existe = actual.find(it => it.CodigoProducto === producto.CodigoProducto);

        if (existe) {
            this.actualizarCantidad(producto.CodigoProducto, existe.Cantidad + 1);
        } else {
            this.carrito.set([...actual, {
                CodigoProducto: producto.CodigoProducto,
                NombreProducto: producto.NombreProducto,
                PrecioUnitario: producto.PrecioVenta,
                Cantidad: 1,
                Nota: ''
            }]);
        }
    }

    actualizarCantidad(codigo: number, nuevaCant: number) {
        if (nuevaCant <= 0) {
            this.carrito.update(items => items.filter(it => it.CodigoProducto !== codigo));
            return;
        }
        this.carrito.update(items => items.map(it =>
            it.CodigoProducto === codigo ? { ...it, Cantidad: nuevaCant } : it
        ));
    }

    async guardarOrden() {
        if (!this.mesaId || this.carrito().length === 0) return;

        const request: GuardarProductosMesaRequest = {
            CodigoMesa: this.mesaId,
            TipoAtencion: 'MESA',
            Productos: this.carrito().map(it => ({
                CodigoProducto: it.CodigoProducto,
                Cantidad: it.Cantidad,
                PrecioUnitario: it.PrecioUnitario,
                Nota: it.Nota
            }))
        };

        const res = await this.servicioVenta.guardarProductosMesa(request);
        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message);
            this.router.navigate(['/ventas']);
        } else {
            this.servicioAlerta.MostrarError(res.message);
        }
    }

    async facturar() {
        // Implementar modal de facturación o lógica directa si el usuario prefiere
        // Por ahora, implementaremos el llamado al servicio
        if (!this.mesaId) return;

        // Simulación de datos de pago (esto debería venir de un modal)
        const request: FacturarMesaRequest = {
            CodigoMesa: this.mesaId,
            Propina: 0,
            Pagos: [{
                MetodoPago: 1, // Efectivo por defecto
                MontoRecibido: this.total(),
                Monto: this.total(),
                Cambio: 0,
                Referencia: null
            }]
        };

        const res = await this.servicioVenta.facturarMesa(request);
        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message);
            this.router.navigate(['/ventas']);
        }
    }

    limpiar() {
        this.carrito.set([]);
    }
}
