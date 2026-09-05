import { Injectable } from '@angular/core';
import { Entorno } from '../Entorno/Entorno';
import { ComprobanteVenta } from '../Modelos/venta.modelo';
import type { ComprobantePago } from '../Modelos/estado-pedido.modelo';
import type { FacturaCompra } from '../Modelos/compra.modelo';
import type { Comanda } from '../componentes/mesa/comanda-modal/comanda-modal';

/**
 * Puente nativo que expone el wrapper Android (Sunmi V3 MIX) cuando la web corre
 * dentro de la APK. En desktop/navegador normal `window.SunmiPrinter` no existe.
 * Ver el proyecto pos-sunmi-wrapper (SunmiPrinterBridge.kt) para el contrato.
 */
interface SunmiPrinterBridge {
    isReady?(): boolean;
    getStatus?(): string;
    printReceipt(json: string): void;
}

// Fila de dos columnas (izquierda / derecha alineada al borde).
type Fila = { izq: string; der: string };

// Ticket serializado que entiende SunmiPrinter.printReceipt (todos opcionales).
interface TicketNativo {
    logo?: string;
    negocio?: { nombre?: string; detalle?: string[] };
    // Bloques genéricos de dos columnas, en orden. Para documentos con varias
    // secciones (comprobante de pago, abono...) que no encajan en los slots fijos.
    secciones?: { titulo?: string; filas: Fila[] }[];
    seccionDatos?: { titulo?: string; filas?: Fila[] };
    productos?: { titulo?: string; encabezado?: string[]; items?: { cant: string; nombre: string; total: string }[] };
    totales?: { etiqueta: string; valor: string; negrita?: boolean }[];
    pago?: { titulo?: string; filas?: Fila[] };
    pie?: string;
    cortar?: boolean;
    abrirCajon?: boolean;
    copias?: number;
}

/**
 * Servicio de impresión con detección de plataforma.
 *
 * - Dentro de la APK Sunmi: serializa el ticket y llama al puente nativo, que
 *   imprime en la térmica de 80mm integrada.
 * - En desktop/navegador: hace fallback a `window.print()` (imprime el DOM del
 *   comprobante como siempre).
 *
 * El mismo código funciona en ambos entornos: quien llama no necesita saber dónde corre.
 */
@Injectable({ providedIn: 'root' })
export class ImpresionService {

    /**
     * Logo del negocio en base64 (data URI), precargado una vez para incrustarlo
     * en los comprobantes nativos. El puente Kotlin lo decodifica e imprime como
     * bitmap. Si no se pudo cargar, los tickets salen sin logo (el nombre del
     * negocio ya va en texto grande, así que no es crítico).
     */
    private logoBase64: string | null = null;

    constructor() {
        this.precargarLogo();
    }

    /**
     * Prepara el logo para la térmica y lo guarda como data URI. Silencioso si falla.
     *
     * La impresora es 1-bit (blanco/negro), sin canal alfa: si se le manda el PNG
     * original (arte negro sobre fondo TRANSPARENTE), rellena todo el recuadro de
     * negro. Por eso aquí se aplana sobre fondo blanco y se aplica un umbral a
     * blanco/negro puro; así la "P" sale nítida y no como bloque negro.
     */
    private async precargarLogo(): Promise<void> {
        try {
            const img = await this.cargarImagen(Entorno.Logo);

            // El bitmap se genera al ANCHO COMPLETO del cabezal (80mm ≈ 576 dots) con
            // la P centrada dentro sobre blanco. Motivo: en modo buffer el V3 MIX no
            // respeta setAlignment para el bitmap (lo pega a la izquierda); al ocupar
            // el bloque toda la línea, la P queda centrada igual, y su alto empuja el
            // nombre del negocio a la línea siguiente.
            const anchoTermica = 576; // dots imprimibles del cabezal 80mm
            const maxLogoW = 300;     // ancho al que se dibuja la P dentro del bloque
            // El PNG original es chico (90px). Permitimos AMPLIAR hasta maxLogoW (sin
            // el tope Math.min(1,...) que antes lo dejaba a tamaño nativo); el umbral
            // posterior limpia la interpolación y la P sale nítida.
            const escala = maxLogoW / (img.width || maxLogoW);
            const lw = Math.max(1, Math.round(img.width * escala));
            const lh = Math.max(1, Math.round(img.height * escala));

            const w = anchoTermica;
            const h = lh;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Fondo blanco: mata la transparencia (que en térmica salía como bloque negro).
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            // Logo centrado horizontalmente dentro del bloque de ancho completo.
            const offsetX = Math.round((w - lw) / 2);
            ctx.drawImage(img, offsetX, 0, lw, lh);

            // Umbral a blanco/negro puro para impresión nítida.
            const datos = ctx.getImageData(0, 0, w, h);
            const px = datos.data;
            for (let i = 0; i < px.length; i += 4) {
                const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
                const v = lum < 185 ? 0 : 255;
                px[i] = px[i + 1] = px[i + 2] = v;
                px[i + 3] = 255;
            }
            ctx.putImageData(datos, 0, 0);

            this.logoBase64 = canvas.toDataURL('image/png');
        } catch {
            // Sin logo: se imprime igual, solo con el nombre del negocio en texto.
        }
    }

    /** Carga una imagen (same-origin, para no manchar el canvas). */
    private cargarImagen(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo cargar el logo'));
            img.src = src;
        });
    }

    /** Referencia al puente nativo, si estamos dentro del wrapper Android. */
    private get bridge(): SunmiPrinterBridge | null {
        const sp = (window as any).SunmiPrinter;
        return sp && typeof sp.printReceipt === 'function' ? (sp as SunmiPrinterBridge) : null;
    }

    /** ¿La web está corriendo dentro del wrapper Sunmi? */
    get hayImpresoraNativa(): boolean {
        return this.bridge !== null;
    }

    /** Estado de la impresora nativa (para diagnóstico en UI, si se quiere). */
    estadoNativo(): string | null {
        try {
            return this.bridge?.getStatus?.() ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Imprime un comprobante de venta. Devuelve 'nativo' si fue por la impresora
     * Sunmi, o 'web' si cayó al fallback de navegador.
     *
     * Nota: si estamos en el wrapper, SIEMPRE se usa el nativo (aunque la impresora
     * reporte no lista), porque en el equipo `window.print()` solo abriría el
     * diálogo "Guardar como PDF". El lado nativo muestra un error visible si falla.
     */
    imprimirComprobante(data: ComprobanteVenta): 'nativo' | 'web' {
        return this.emitir(this.construirTicket(data));
    }

    /** Imprime una comanda de cocina. */
    imprimirComanda(d: Comanda): 'nativo' | 'web' {
        const t = d.Totales ?? {};
        const totales: TicketNativo['totales'] = [];
        if (t.Iva) {
            totales.push({ etiqueta: 'Subtotal', valor: this.q(t.Subtotal) });
            totales.push({ etiqueta: 'IVA', valor: this.q(t.Iva) });
        }
        totales.push({ etiqueta: 'Total', valor: this.q(t.Total), negrita: true });

        return this.emitir({
            negocio: { nombre: 'COMANDA' },
            seccionDatos: {
                titulo: d.Mesa || 'Mesa',
                filas: [
                    { izq: `Fecha: ${this.fecha(d.Fecha)}`, der: `Documento: ${d.Documento || '-'}` },
                    { izq: `Responsable: ${d.Responsable || '-'}`, der: '' },
                ],
            },
            productos: {
                titulo: 'Producto',
                encabezado: ['Cant', 'Producto', 'Total'],
                items: (d.Productos ?? []).map(p => ({
                    cant: String(p.Cantidad ?? ''),
                    nombre: p.Producto || '',
                    total: this.q(p.Total),
                })),
            },
            totales,
            pie: 'Comanda de cocina',
            cortar: true,
        }, false);
    }

    /** Imprime la factura/comprobante de una compra. */
    imprimirFacturaCompra(d: FacturaCompra): 'nativo' | 'web' {
        const dc = d.DatosComprobante ?? {};
        const filasDatos: Fila[] = [
            { izq: `Fecha: ${this.fecha(dc.Fecha)}`, der: `Documento: ${dc.Documento ?? '-'}` },
            { izq: `Responsable: ${dc.Responsable || '-'}`, der: '' },
            { izq: `Proveedor: ${dc.Proveedor || '-'}`, der: `Nit: ${dc.Nit || 'C/F'}` },
            { izq: `Dirección: ${dc.Direccion || '-'}`, der: `Celular: ${dc.Celular || '-'}` },
        ];
        if (dc.FechaVencimiento) {
            filasDatos.push({ izq: `Vencimiento: ${this.fecha(dc.FechaVencimiento, false)}`, der: '' });
        }

        const totales: TicketNativo['totales'] = [
            { etiqueta: 'Total', valor: this.q(d.Totales?.Total), negrita: true },
        ];
        if (d.Totales?.SaldoPendiente && d.Totales.SaldoPendiente > 0) {
            totales.push({ etiqueta: 'Saldo pendiente', valor: this.q(d.Totales.SaldoPendiente) });
        }

        // En papel de 80mm omitimos P.Unit y mostramos el subtotal como "Total" por línea.
        const filasPago: Fila[] = [];
        for (const fp of d.FormaPago ?? []) {
            if (fp.Referencia) filasPago.push({ izq: `Referencia: ${fp.Referencia}`, der: '' });
            filasPago.push({ izq: this.titulo(fp.MetodoPago), der: this.q(fp.MontoPagado) });
        }

        return this.emitir({
            negocio: {
                nombre: d.Empresa?.Nombre || 'Promesa de Dios',
                detalle: [d.Empresa?.Nit, d.Empresa?.Direccion, d.Empresa?.Telefono].filter((x): x is string => !!x),
            },
            seccionDatos: { titulo: 'Datos de comprobante', filas: filasDatos },
            productos: {
                titulo: 'Producto',
                encabezado: ['Cant', 'Producto', 'Total'],
                items: (d.Productos ?? []).map(p => ({
                    cant: String(p.Cantidad ?? ''),
                    nombre: p.Producto || '',
                    total: this.q(p.Subtotal),
                })),
            },
            totales,
            pago: filasPago.length ? { titulo: 'Forma de pago', filas: filasPago } : undefined,
            pie: 'Comprobante de compra',
            cortar: true,
        });
    }

    /** Imprime el comprobante de un abono a proveedor (compras). El recibo llega como objeto suelto. */
    imprimirComprobanteAbono(d: any): 'nativo' | 'web' {
        const emp = d?.Empresa ?? {};
        const prov = d?.Proveedor ?? {};
        const saldo = d?.Saldo ?? {};
        const fp = d?.FormaPago ?? {};

        const filasPago: Fila[] = [];
        if (fp.NumeroReferencia) filasPago.push({ izq: `Referencia: ${fp.NumeroReferencia}`, der: '' });
        filasPago.push({ izq: this.titulo(fp.Metodo), der: this.q(fp.Monto) });
        if (fp.Banco) filasPago.push({ izq: `Banco: ${fp.Banco}`, der: '' });

        return this.emitir({
            negocio: {
                nombre: emp.NombreEmpresa || 'Promesa de Dios',
                detalle: [emp.Nit, emp.Direccion, emp.Telefono].filter((x): x is string => !!x),
            },
            secciones: [
                {
                    titulo: 'Datos de comprobante',
                    filas: [
                        { izq: `Fecha: ${this.fecha(prov.Fecha)}`, der: `Documento: ${prov.Documento || '-'}` },
                        { izq: `No. Pago: ${prov.NumeroPago || '-'}`, der: `Responsable: ${prov.Responsable || '-'}` },
                        { izq: `Nombre: ${prov.NombreProveedor || '-'}`, der: `Nit: ${prov.Nit || '-'}` },
                        { izq: `Dirección: ${prov.Direccion || '-'}`, der: `Celular: ${prov.Celular || '-'}` },
                    ],
                },
                { titulo: 'Nota', filas: [{ izq: 'Autorizado por Propietario', der: '' }] },
                {
                    titulo: 'Saldo',
                    filas: [
                        { izq: 'Saldo anterior', der: this.q(saldo.SaldoAnterior) },
                        { izq: 'Monto abonado', der: this.q(saldo.SaldoAbonado) },
                        { izq: 'Saldo actual', der: this.q(saldo.SaldoActual) },
                    ],
                },
                { titulo: 'Forma de pago', filas: filasPago },
                { filas: [{ izq: '', der: '' }, { izq: 'F. ____________________________', der: '' }, { izq: 'Firma', der: '' }] },
            ],
            cortar: true,
        });
    }

    /** Imprime el comprobante de pago/abono de un pedido (estado de pedidos). */
    imprimirComprobantePago(d: ComprobantePago): 'nativo' | 'web' {
        const dc = d.DatosComprobante ?? {};
        const fp = d.FormaPago ?? {};
        const dm = d.DetalleMovimiento ?? {};

        const filasPago: Fila[] = [];
        if (fp.Referencia) filasPago.push({ izq: `Referencia: ${fp.Referencia}`, der: '' });
        filasPago.push({ izq: this.titulo(fp.MetodoPago), der: this.q(fp.Monto) });
        filasPago.push({ izq: 'Recibido', der: this.q(fp.MontoRecibido) });
        filasPago.push({ izq: 'Cambio', der: this.q(fp.Cambio) });

        return this.emitir({
            negocio: {
                nombre: d.Empresa?.Nombre || 'Promesa de Dios',
                detalle: [d.Empresa?.Nit, d.Empresa?.Direccion, d.Empresa?.Telefono].filter((x): x is string => !!x),
            },
            secciones: [
                {
                    titulo: 'Comprobante de pago',
                    filas: [
                        { izq: `Fecha: ${this.fecha(dc.FechaPago)}`, der: '' },
                        { izq: `No. Pago: ${dc.DocumentoPago || '-'}`, der: `Pedido: ${dc.DocumentoVenta || '-'}` },
                        { izq: `Cliente: ${dc.Cliente || 'C/F'}`, der: `Nit: ${dc.Nit || 'C/F'}` },
                        { izq: `Dirección: ${dc.Direccion || '-'}`, der: `Celular: ${dc.Celular || '-'}` },
                    ],
                },
                { titulo: 'Forma de pago', filas: filasPago },
                {
                    filas: [
                        { izq: 'Saldo anterior', der: this.q(dm.SaldoAnterior) },
                        { izq: 'Monto abonado', der: this.q(dm.MontoAbonado) },
                        { izq: 'Saldo pendiente', der: this.q(dm.SaldoPendiente) },
                    ],
                },
            ],
            pie: '¡Gracias por su pago!',
            cortar: true,
        });
    }

    /**
     * Envía el ticket a la impresora nativa si estamos en el wrapper; si no, cae al
     * fallback de navegador (window.print sobre el DOM del modal).
     */
    private emitir(ticket: TicketNativo, conLogo = true): 'nativo' | 'web' {
        // Incrusta el logo en los comprobantes (no en la comanda de cocina). Si aún
        // no se precargó, sale sin logo; el nombre del negocio ya va en texto.
        if (conLogo && this.logoBase64 && !ticket.logo) {
            ticket.logo = this.logoBase64;
        }
        const bridge = this.bridge;
        if (!bridge) {
            window.print();
            return 'web';
        }
        bridge.printReceipt(JSON.stringify(ticket));
        return 'nativo';
    }

    // ---------------------------------------------------------------------
    // Mapeo ComprobanteVenta -> TicketNativo (mismo layout que el modal DOM).
    // ---------------------------------------------------------------------
    private construirTicket(d: ComprobanteVenta): TicketNativo {
        const dc = d.DatosComprobante ?? {};
        const esPedido = !!dc.FechaEntrega; // pedido a futuro: sin "Cambio"

        // Datos de comprobante (dos columnas), igual que el ticket web.
        const filasDatos: { izq: string; der: string }[] = [
            { izq: `Fecha: ${this.fecha(dc.FechaFacturacion)}`, der: `Documento: ${dc.Documento || '-'}` },
            { izq: `Responsable: ${dc.Responsable || '-'}`, der: '' },
            { izq: `Cliente: ${dc.Cliente || 'C/F'}`, der: `Nit: ${dc.Nit || 'C/F'}` },
            { izq: `Dirección: ${dc.Direccion || '-'}`, der: `Celular: ${dc.Celular || '-'}` },
        ];
        if (dc.FechaEntrega) {
            filasDatos.push({ izq: `Entrega: ${this.fecha(dc.FechaEntrega, false)}`, der: '' });
        }

        // Totales: Subtotal/IVA solo si hay IVA; Total a pagar siempre (en negrita).
        const t = d.Totales ?? ({} as ComprobanteVenta['Totales']);
        const totales: TicketNativo['totales'] = [];
        if (t.Iva) {
            totales.push({ etiqueta: 'Subtotal', valor: this.q(t.Subtotal) });
            totales.push({ etiqueta: 'IVA', valor: this.q(t.Iva) });
        }
        totales.push({ etiqueta: 'Total a pagar', valor: this.q(t.Total), negrita: true });

        // Forma de pago: por cada método, referencia (si hay), monto y cambio.
        const filasPago: { izq: string; der: string }[] = [];
        for (const fp of d.FormaPago ?? []) {
            if (fp.Referencia) filasPago.push({ izq: `Referencia: ${fp.Referencia}`, der: '' });
            filasPago.push({ izq: this.titulo(fp.MetodoPago), der: this.q(fp.MontoCobrado) });
            if (!esPedido) filasPago.push({ izq: 'Cambio', der: this.q(fp.Cambio) });
        }
        if (t.SaldoPendiente && t.SaldoPendiente > 0) {
            filasPago.push({ izq: 'Saldo pendiente', der: this.q(t.SaldoPendiente) });
        }

        return {
            negocio: {
                nombre: d.Empresa?.Nombre || 'Promesa de Dios',
                detalle: [d.Empresa?.Nit, d.Empresa?.Direccion, d.Empresa?.Telefono]
                    .filter((x): x is string => !!x),
            },
            seccionDatos: { titulo: 'Datos de comprobante', filas: filasDatos },
            productos: {
                titulo: 'Producto',
                encabezado: ['Cant', 'Producto', 'Total'],
                items: (d.Productos ?? []).map(p => ({
                    cant: String(p.Cantidad ?? ''),
                    nombre: p.Producto || '',
                    total: this.q(p.Total),
                })),
            },
            totales,
            pago: { titulo: 'Forma de pago', filas: filasPago },
            pie: '¡Gracias por su compra!',
            cortar: true,
        };
    }

    // ---------------------------------------------------------------------
    // Formateadores (equivalentes a los pipes number/date/titlecase del ticket).
    // ---------------------------------------------------------------------

    /** "Q 1,234.56" con separador de miles y 2 decimales. */
    private q(n?: number | null): string {
        const v = Number(n ?? 0);
        return 'Q ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Fecha en 'dd/MM/yyyy HH:mm'. Acepta Date/ISO o un string ya formateado
     * del API (se devuelve tal cual si no es parseable), igual que el modal.
     */
    private fecha(valor?: string | null, conHora = true): string {
        if (!valor) return '';
        const f = new Date(valor);
        if (isNaN(f.getTime())) return String(valor);
        const p = (x: number) => String(x).padStart(2, '0');
        const dmy = `${p(f.getDate())}/${p(f.getMonth() + 1)}/${f.getFullYear()}`;
        return conHora ? `${dmy} ${p(f.getHours())}:${p(f.getMinutes())}` : dmy;
    }

    /** Capitaliza cada palabra (equivale al pipe titlecase del método de pago). */
    private titulo(s?: string | null): string {
        return (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
}
