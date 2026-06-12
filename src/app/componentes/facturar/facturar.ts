import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Producto, CategoriaProducto } from '../../Modelos/producto.modelo';
import { Cliente } from '../../Modelos/cliente.modelo';
import { ComprobanteVenta, FacturarVentanillaRequest, CrearVentaPedidoRequest } from '../../Modelos/venta.modelo';
import { ProductoServicio } from '../../Servicios/producto.service';
import { VentaServicio } from '../../Servicios/venta.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { Entorno } from '../../Entorno/Entorno';
import { ClienteFacturaModal } from './cliente-factura-modal/cliente-factura-modal';
import { MontoPagoModal, ResultadoPago } from './monto-pago-modal/monto-pago-modal';
import { ComprobanteVentaModal } from './comprobante-venta-modal/comprobante-venta-modal';

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
    selector: 'app-facturar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ClienteFacturaModal, MontoPagoModal, ComprobanteVentaModal],
    templateUrl: './facturar.html',
    styleUrl: './facturar.css'
})
export class Facturar implements OnInit {
    private servicioProducto = inject(ProductoServicio);
    private servicioVenta = inject(VentaServicio);
    private servicioAlerta = inject(AlertaServicio);
    private router = inject(Router);

    colorSistema = Entorno.ColorSistema;

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
        // Luminancia percibida (0 = negro, 1 = blanco)
        const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminancia < 0.6;
    }

    // Catalogos
    categorias = signal<CategoriaProducto[]>([]);
    productos = signal<ProductoVenta[]>([]);          // productos de la categoría activa
    private productosGlobal: Producto[] = [];          // catálogo completo (para código de barras)

    // Estado vista
    categoriaSeleccionada = signal<number | null>(null);
    textoFiltro = signal('');
    codigoBarra = signal('');
    cargando = signal(false);

    // Carrito / Orden
    carrito = signal<ItemCarrito[]>([]);
    comentarioAbierto = signal<number | null>(null);  // CodigoProducto con el comentario desplegado
    total = computed(() =>
        this.carrito().reduce((acc, item) => acc + (item.PrecioUnitario * item.Cantidad), 0)
    );

    // Modal Cliente
    mostrarModalCliente = signal(false);
    flujo = signal<'facturar' | 'pedido'>('facturar');
    clienteSeleccionado = signal<Cliente | null>(null);
    fechaEntrega = signal<string | null>(null);

    // Modal Monto
    mostrarModalMonto = signal(false);
    procesandoPago = signal(false);

    // Comprobante
    mostrarComprobante = signal(false);
    comprobante = signal<ComprobanteVenta | null>(null);
    accionComprobante = signal<'imprimir' | 'descargar' | null>(null);

    async ngOnInit() {
        await this.cargarCategorias();
        // Catálogo completo en segundo plano (solo para resolver código de barras)
        this.servicioProducto.Listar().then(res => {
            if (res.success) this.productosGlobal = res.data || [];
        });
    }

    async cargarCategorias() {
        this.cargando.set(true);
        try {
            const res = await this.servicioProducto.ListarCategorias('VENTANILLA');
            if (res.success) {
                const cats = res.data || [];
                this.categorias.set(cats);
                // Selecciona la primera categoría por defecto (no hay opción "Todos")
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
                    // El API ya envía StockMinimo: el aviso de "stock bajo" se calcula contra este valor.
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
    // Si el API no envía StockMinimo, no se muestra aviso (evita falsos positivos).
    esStockBajo(prod: ProductoVenta): boolean {
        return prod.Stock !== null && prod.Stock !== undefined
            && prod.StockMinimo !== null && prod.StockMinimo !== undefined
            && prod.Stock <= prod.StockMinimo;
    }

    // Cantidad de un producto que ya está en el carrito (para el badge)
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

    // Cantidad editada manualmente en el input. Mientras el campo está vacío
    // (NaN) no se toca el carrito para no eliminar la fila a medio escribir.
    cambiarCantidad(codigo: number, valor: string | number | null) {
        if (valor === '' || valor === null || valor === undefined) return;
        const n = Math.floor(Number(valor));
        if (isNaN(n)) return;
        this.actualizarCantidad(codigo, n);
    }

    // Muestra/oculta el campo de comentario de un producto
    toggleComentario(codigo: number) {
        this.comentarioAbierto.update(actual => actual === codigo ? null : codigo);
    }

    cambiarNota(codigo: number, texto: string) {
        this.carrito.update(items => items.map(it =>
            it.CodigoProducto === codigo ? { ...it, Nota: texto } : it
        ));
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

    cambiarAMesa() {
        this.router.navigate(['/ventas']);
    }

    limpiar() {
        this.carrito.set([]);
    }

    // --- Acciones de pago ---
    facturar() {
        if (this.carrito().length === 0) {
            this.servicioAlerta.MostrarAlerta('Agregue al menos un producto a la orden');
            return;
        }
        this.flujo.set('facturar');
        this.mostrarModalCliente.set(true);
    }

    bajoPedido() {
        if (this.carrito().length === 0) {
            this.servicioAlerta.MostrarAlerta('Agregue al menos un producto a la orden');
            return;
        }
        this.flujo.set('pedido');
        this.mostrarModalCliente.set(true);
    }

    cerrarModalCliente() {
        this.mostrarModalCliente.set(false);
    }

    // Cliente confirmado en el modal → continúa al paso de pago
    clienteConfirmado(datos: { cliente: Cliente | null; fechaEntrega: string | null }) {
        this.clienteSeleccionado.set(datos.cliente);
        this.fechaEntrega.set(datos.fechaEntrega);
        this.mostrarModalCliente.set(false);
        this.mostrarModalMonto.set(true);
    }

    cerrarModalMonto() {
        this.mostrarModalMonto.set(false);
    }

    private etiquetaMetodo(codigo: number): string {
        switch (codigo) {
            case 1: return 'EFECTIVO';
            case 2: return 'TARJETA';
            case 3: return 'TRANSFERENCIA';
            case 4: return 'CHEQUE';
            default: return 'DESCONOCIDO';
        }
    }

    // Procesa el pago contra el API y muestra el comprobante
    async procesarPago(resultado: ResultadoPago) {
        if (this.flujo() === 'pedido') {
            await this.procesarPedido(resultado);
        } else {
            await this.procesarFactura(resultado);
        }
    }

    private async procesarFactura(resultado: ResultadoPago) {
        this.procesandoPago.set(true);
        try {
            const request: FacturarVentanillaRequest = {
                CodigoCliente: this.clienteSeleccionado()?.CodigoCliente ?? null,
                Productos: this.carrito().map(it => ({
                    CodigoProducto: it.CodigoProducto,
                    Cantidad: it.Cantidad,
                    PrecioUnitario: it.PrecioUnitario,
                    Observaciones: it.Nota?.trim() || null
                })),
                Pagos: resultado.pago ? [resultado.pago] : [],
                Propina: 0
            };

            const res = await this.servicioVenta.facturarVentanilla(request);

            if (res.success) {
                const comprobante = res.data as ComprobanteVenta;
                // El API no devuelve la Referencia en FormaPago; la completamos
                // con la que ingresó el usuario en el modal de pago.
                if (comprobante.FormaPago?.length) {
                    comprobante.FormaPago = comprobante.FormaPago.map((fp, i) => ({
                        ...fp,
                        Referencia: request.Pagos[i]?.Referencia ?? null
                    }));
                }
                this.comprobante.set(comprobante);
                this.abrirComprobante(resultado.accion);
            } else {
                this.servicioAlerta.MostrarError(res, 'No se pudo facturar la venta');
            }
        } catch (error) {
            this.servicioAlerta.MostrarError(error, 'No se pudo facturar la venta');
        } finally {
            this.procesandoPago.set(false);
        }
    }

    private async procesarPedido(resultado: ResultadoPago) {
        this.procesandoPago.set(true);
        try {
            const itemsSnapshot = this.carrito();
            const pago = resultado.pago;

            const request: CrearVentaPedidoRequest = {
                CodigoCliente: this.clienteSeleccionado()?.CodigoCliente ?? null,
                FechaEntrega: this.fechaEntrega() ?? '',
                Productos: itemsSnapshot.map(it => ({
                    CodigoProducto: it.CodigoProducto,
                    Cantidad: it.Cantidad,
                    PrecioUnitario: it.PrecioUnitario,
                    Observaciones: it.Nota?.trim() || null
                })),
                Pagos: pago ? [pago] : [],
                Propina: 0
            };

            const res = await this.servicioVenta.crearVentaPedido(request);

            if (res.success) {
                // El API del pedido no devuelve Productos ni FormaPago: los completamos del frontend
                const data = res.data || {};
                const comprobante: ComprobanteVenta = {
                    Empresa: data.Empresa || {},
                    DatosComprobante: {
                        FechaFacturacion: data.DatosComprobante?.FechaCreacion ?? null,
                        FechaEntrega: data.DatosComprobante?.FechaEntrega ?? this.fechaEntrega(),
                        Documento: data.DatosComprobante?.Documento ?? null,
                        Responsable: data.DatosComprobante?.Responsable ?? null,
                        Cliente: data.DatosComprobante?.Cliente ?? null,
                        Direccion: data.DatosComprobante?.Direccion ?? null,
                        Nit: data.DatosComprobante?.Nit ?? null,
                        Celular: data.DatosComprobante?.Celular ?? null
                    },
                    Productos: itemsSnapshot.map(it => ({
                        Cantidad: it.Cantidad,
                        Producto: it.NombreProducto,
                        Total: Number((it.PrecioUnitario * it.Cantidad).toFixed(2))
                    })),
                    Totales: data.Totales || { Subtotal: 0, Iva: 0, Propina: 0, Total: 0, TotalCobrado: 0 },
                    FormaPago: pago ? [{
                        MetodoPago: this.etiquetaMetodo(pago.MetodoPago as number),
                        MontoCobrado: pago.Monto,
                        MontoRecibido: pago.MontoRecibido,
                        Cambio: pago.Cambio,
                        Referencia: pago.Referencia ?? null
                    }] : []
                };

                this.comprobante.set(comprobante);
                this.abrirComprobante(resultado.accion);
            } else {
                this.servicioAlerta.MostrarError(res, 'No se pudo crear el pedido');
            }
        } catch (error) {
            this.servicioAlerta.MostrarError(error, 'No se pudo crear el pedido');
        } finally {
            this.procesandoPago.set(false);
        }
    }

    // Abre el comprobante. Si la acción es 'imprimir' dispara la pantalla de
    // impresión de una; si es 'descargar' genera el PDF automáticamente.
    private abrirComprobante(accion: 'imprimir' | 'descargar') {
        this.accionComprobante.set(accion);
        this.mostrarModalMonto.set(false);
        this.mostrarComprobante.set(true);
        // Limpia la orden procesada
        this.carrito.set([]);
        this.clienteSeleccionado.set(null);
        this.fechaEntrega.set(null);
        this.comentarioAbierto.set(null);
    }

    cerrarComprobante() {
        this.mostrarComprobante.set(false);
        this.comprobante.set(null);
        this.accionComprobante.set(null);
    }
}
