import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Producto, CategoriaProducto } from '../../../Modelos/producto.modelo';
import { GuardarProductosMesaRequest, FacturarMesaRequest, ComprobanteVenta } from '../../../Modelos/venta.modelo';
import { ProductoServicio } from '../../../Servicios/producto.service';
import { MesaServicio } from '../../../Servicios/mesa.service';
import { VentaServicio } from '../../../Servicios/venta.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';
import { MesaCobroModal, ResultadoCobro } from '../mesa-cobro-modal/mesa-cobro-modal';
import { ComprobanteVentaModal } from '../../facturar/comprobante-venta-modal/comprobante-venta-modal';

interface ItemCarrito {
    CodigoProducto: number;
    NombreProducto: string;
    PrecioUnitario: number;
    Cantidad: number;
    Nota: string;
}

// Producto normalizado para la vista (proviene del endpoint por categoría)
interface ProductoVenta {
    CodigoProducto: number;
    NombreProducto: string;
    PrecioUnitario: number; // precio con IVA (lo que se cobra)
    ImagenUrl?: string | null;
    Stock: number | null;
    StockMinimo?: number | null;
    CodigoBarra?: string | null;
}

@Component({
    selector: 'app-venta-mesa',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, MesaCobroModal, ComprobanteVentaModal],
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
    nombreMesa = signal<string>('');
    tieneVentaActiva = signal(false);

    // Texto de la banda del nombre: blanco si el color del sistema es oscuro, negro si es claro
    get colorTextoBanda(): string {
        return this.esColorOscuro(this.colorSistema) ? '#ffffff' : '#212529';
    }

    private esColorOscuro(hex: string): boolean {
        const c = (hex || '').replace('#', '').trim();
        if (c.length < 6) return false;
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        if ([r, g, b].some(n => isNaN(n))) return false;
        const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminancia < 0.6;
    }

    // Catalogos
    categorias = signal<CategoriaProducto[]>([]);
    productos = signal<ProductoVenta[]>([]);          // productos de la categoría activa
    private productosGlobal: Producto[] = [];          // catálogo completo (para código de barras)

    // Estado Vista
    categoriaSeleccionada = signal<number | null>(null);
    textoFiltro = signal('');
    codigoBarra = signal('');
    cargando = signal(false);
    comentarioAbierto = signal<number | null>(null);

    // Carrito / Orden
    carrito = signal<ItemCarrito[]>([]);
    total = computed(() =>
        this.carrito().reduce((acc, item) => acc + (item.PrecioUnitario * item.Cantidad), 0)
    );

    // Cobro / comprobante
    guardando = signal(false);
    mostrarPago = signal(false);
    mostrarComprobante = signal(false);
    comprobante = signal<ComprobanteVenta | null>(null);
    accionComprobante = signal<'imprimir' | 'descargar' | null>(null);

    constructor() { }

    async ngOnInit() {
        this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            if (params['id']) {
                this.mesaId = +params['id'];
                this.cargarDatosMesa();
            }
        });

        await this.cargarCategorias();
        // Catálogo completo en segundo plano (solo para resolver código de barras)
        this.servicioProducto.Listar().then(res => {
            if (res.success) this.productosGlobal = res.data || [];
        });
    }

    async cargarDatosMesa() {
        if (!this.mesaId) return;
        // Cargar comanda actual si la mesa ya tiene un pedido activo.
        // Una mesa libre responde 404 (sin pedido activo) => se arranca con orden vacia.
        try {
            const res = await this.servicioMesa.obtenerComanda(this.mesaId);
            if (res.success && res.data) {
                this.tieneVentaActiva.set(true);
                this.nombreMesa.set(res.data.Mesa || '');
                // La comanda devuelve Productos:[{ CodigoProducto, Producto, Cantidad, PrecioUnitario, Total }]
                const items = res.data.Productos || [];
                this.carrito.set(items.map((it: any) => ({
                    CodigoProducto: it.CodigoProducto,
                    NombreProducto: it.Producto,
                    PrecioUnitario: it.PrecioUnitario,
                    Cantidad: it.Cantidad,
                    Nota: ''
                })));
            }
        } catch {
            // Mesa libre / sin comanda: orden nueva vacia
            this.tieneVentaActiva.set(false);
        }
    }

    async cargarCategorias() {
        this.cargando.set(true);
        try {
            const res = await this.servicioProducto.ListarCategorias('VENTANILLA');
            if (res.success) {
                const cats = res.data || [];
                this.categorias.set(cats);
                // Selecciona la primera categoría por defecto (mismo enfoque que /facturar)
                if (cats.length > 0 && cats[0].CodigoCategoriaProducto) {
                    await this.seleccionarCategoria(cats[0].CodigoCategoriaProducto);
                }
            }
        } finally {
            this.cargando.set(false);
        }
    }

    async seleccionarCategoria(id: number | undefined) {
        if (!id) return;
        this.categoriaSeleccionada.set(id);
        await this.cargarProductosCategoria(id);
    }

    async cargarProductosCategoria(codigoCategoria: number) {
        this.cargando.set(true);
        this.productos.set([]);
        try {
            const res = await this.servicioProducto.ProductosPorCategoria(codigoCategoria);
            if (res.success) {
                const lista = (res.data || []).map((p: any): ProductoVenta => ({
                    CodigoProducto: p.CodigoProducto,
                    NombreProducto: p.Producto,
                    PrecioUnitario: Number(p.PrecioConIva ?? p.PrecioVenta ?? 0),
                    ImagenUrl: p.ImagenUrl,
                    Stock: p.StockActual ?? null,
                    StockMinimo: p.StockMinimo ?? null
                }));
                this.productos.set(lista);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    productosFiltrados = computed(() => {
        const busqueda = this.textoFiltro().toLowerCase().trim();
        if (!busqueda) return this.productos();
        return this.productos().filter(p => p.NombreProducto?.toLowerCase().includes(busqueda));
    });

    // Hay stock bajo cuando el stock actual es menor o igual al stock mínimo del producto.
    esStockBajo(prod: ProductoVenta): boolean {
        return prod.Stock !== null && prod.Stock !== undefined
            && prod.StockMinimo !== null && prod.StockMinimo !== undefined
            && prod.Stock <= prod.StockMinimo;
    }

    cantidadEnCarrito(codigo: number | undefined): number {
        if (!codigo) return 0;
        return this.carrito().find(it => it.CodigoProducto === codigo)?.Cantidad ?? 0;
    }

    agregarAlCarrito(producto: ProductoVenta) {
        if (!producto.CodigoProducto) return;
        const actual = this.carrito();
        const existe = actual.find(it => it.CodigoProducto === producto.CodigoProducto);

        if (existe) {
            this.actualizarCantidad(producto.CodigoProducto, existe.Cantidad + 1);
        } else {
            this.carrito.set([...actual, {
                CodigoProducto: producto.CodigoProducto,
                NombreProducto: producto.NombreProducto,
                PrecioUnitario: producto.PrecioUnitario,
                Cantidad: 1,
                Nota: ''
            }]);
        }
    }

    // Cantidad editada manualmente en el input
    cambiarCantidad(codigo: number, valor: string | number | null) {
        if (valor === '' || valor === null || valor === undefined) return;
        const n = Math.floor(Number(valor));
        if (isNaN(n)) return;
        this.actualizarCantidad(codigo, n);
    }

    actualizarCantidad(codigo: number, nuevaCant: number) {
        if (nuevaCant <= 0) {
            this.carrito.update(items => items.filter(it => it.CodigoProducto !== codigo));
            if (this.comentarioAbierto() === codigo) this.comentarioAbierto.set(null);
            return;
        }
        this.carrito.update(items => items.map(it =>
            it.CodigoProducto === codigo ? { ...it, Cantidad: nuevaCant } : it
        ));
    }

    // Quita por completo un producto de la orden
    eliminarDelCarrito(codigo: number) {
        this.carrito.update(items => items.filter(it => it.CodigoProducto !== codigo));
        if (this.comentarioAbierto() === codigo) this.comentarioAbierto.set(null);
    }

    // Comentario por producto (inline, mismo patron que /facturar)
    toggleComentario(codigo: number) {
        this.comentarioAbierto.update(actual => actual === codigo ? null : codigo);
    }

    cambiarNota(codigo: number, texto: string) {
        this.carrito.update(items => items.map(it =>
            it.CodigoProducto === codigo ? { ...it, Nota: texto } : it
        ));
    }

    // Buscar producto por código de barras (en todo el catálogo) y agregarlo
    buscarPorCodigoBarra() {
        const codigo = this.codigoBarra().trim();
        if (!codigo) return;

        const prod = this.productosGlobal.find(p => p.CodigoBarra === codigo);
        if (prod && prod.CodigoProducto) {
            const precioConIva = Number((prod.PrecioVenta * (1 + (prod.Iva || 0) / 100)).toFixed(2));
            this.agregarAlCarrito({
                CodigoProducto: prod.CodigoProducto,
                NombreProducto: prod.NombreProducto,
                PrecioUnitario: precioConIva,
                ImagenUrl: prod.ImagenUrl,
                Stock: prod.Stock ?? null,
                CodigoBarra: prod.CodigoBarra
            });
            this.codigoBarra.set('');
        } else {
            this.servicioAlerta.MostrarToast('No se encontró un producto con ese código', 'warning');
        }
    }

    async guardarOrden() {
        if (this.guardando()) return;
        if (!this.mesaId || this.carrito().length === 0) {
            this.servicioAlerta.MostrarAlerta('Agregue al menos un producto a la orden');
            return;
        }

        this.guardando.set(true);
        try {
            const request: GuardarProductosMesaRequest = {
                CodigoMesa: this.mesaId,
                TipoAtencion: 'MESA',
                Productos: this.carrito().map(it => ({
                    CodigoProducto: it.CodigoProducto,
                    Cantidad: it.Cantidad,
                    PrecioUnitario: it.PrecioUnitario,
                    Observaciones: it.Nota?.trim() || null
                }))
            };

            const res = await this.servicioVenta.guardarProductosMesa(request);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.router.navigate(['/ventas']);
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo guardar la orden de la mesa');
        } finally {
            this.guardando.set(false);
        }
    }

    // ---- Cobro / Facturacion de la mesa ----
    abrirPago() {
        if (this.carrito().length === 0) {
            this.servicioAlerta.MostrarAlerta('Agregue al menos un producto antes de facturar');
            return;
        }
        if (!this.tieneVentaActiva()) {
            this.servicioAlerta.MostrarAlerta('Guarde la orden antes de facturar la mesa');
            return;
        }
        this.mostrarPago.set(true);
    }

    cerrarPago() {
        if (this.guardando()) return;
        this.mostrarPago.set(false);
    }

    async procesarPago(resultado: ResultadoCobro) {
        if (this.guardando() || !this.mesaId || !resultado.pago) return;

        this.guardando.set(true);
        try {
            const request: FacturarMesaRequest = {
                CodigoMesa: this.mesaId,
                Propina: resultado.propina,
                Pagos: [resultado.pago]
            };

            const res = await this.servicioVenta.facturarMesa(request);
            if (res.success) {
                this.mostrarPago.set(false);
                this.comprobante.set(res.data as ComprobanteVenta);
                this.accionComprobante.set(resultado.accion);
                this.mostrarComprobante.set(true);
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo facturar la mesa');
        } finally {
            this.guardando.set(false);
        }
    }

    cerrarComprobante() {
        this.mostrarComprobante.set(false);
        this.comprobante.set(null);
        this.accionComprobante.set(null);
        this.router.navigate(['/ventas']);
    }

    limpiar() {
        this.carrito.set([]);
        this.comentarioAbierto.set(null);
    }
}
