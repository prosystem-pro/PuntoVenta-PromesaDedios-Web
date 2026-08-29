import { Injectable } from '@angular/core';
import { ComprobanteVenta } from '../Modelos/venta.modelo';

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

// Ticket serializado que entiende SunmiPrinter.printReceipt (todos opcionales).
interface TicketNativo {
    logo?: string;
    negocio?: { nombre?: string; detalle?: string[] };
    seccionDatos?: { titulo?: string; filas?: { izq: string; der: string }[] };
    productos?: { titulo?: string; encabezado?: string[]; items?: { cant: string; nombre: string; total: string }[] };
    totales?: { etiqueta: string; valor: string; negrita?: boolean }[];
    pago?: { titulo?: string; filas?: { izq: string; der: string }[] };
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
        const bridge = this.bridge;
        if (!bridge) {
            window.print();
            return 'web';
        }
        bridge.printReceipt(JSON.stringify(this.construirTicket(data)));
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
