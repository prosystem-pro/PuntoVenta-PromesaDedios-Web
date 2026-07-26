import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Entorno } from '../../Entorno/Entorno';
import { ServicioConfiguracion } from '../../Servicios/configuracion.service';
import { DenominacionServicio } from '../../Servicios/denominacion.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { CajaEstadoService } from '../../Servicios/caja-estado.service';
import {
    DesgloseEfectivoItem, DenominacionCaja, MovimientoCaja, DatosCaja,
    ResumenIngresosCaja, ResumenEgresosCaja, ResumenFormasPagoCaja
} from '../../Modelos/caja.modelo';
import { Denominacion } from '../../Modelos/denominacion.modelo';
import { ComprobanteVentaModal } from '../facturar/comprobante-venta-modal/comprobante-venta-modal';
import { FacturaCompraModal } from '../compras/factura-compra-modal/factura-compra-modal';
import { ComprobanteAbonoModal } from '../compras/comprobante-abono-modal/comprobante-abono-modal';
import { ComprobantePagoModal } from '../estado-pedidos/comprobante-pago-modal/comprobante-pago-modal';

// Tipo de documento que abre la lupa, según el origen del movimiento de caja.
type TipoDocumentoCaja = 'venta' | 'compra' | 'abono' | 'pago';

// Fila de la herramienta de conteo: una denominación con su cantidad ingresada.
interface FilaDenominacion {
    CodigoDenominacion: number;
    Valor: number;
    Cantidad: number | null;
}

@Component({
    selector: 'app-caja',
    standalone: true,
    imports: [CommonModule, FormsModule, ComprobanteVentaModal, FacturaCompraModal, ComprobanteAbonoModal, ComprobantePagoModal],
    templateUrl: './caja.html',
    styleUrl: './caja.css'
})
export class Caja implements OnInit {
    private servicioConfig = inject(ServicioConfiguracion);
    private servicioDenominacion = inject(DenominacionServicio);
    private servicioAlerta = inject(AlertaServicio);
    private cajaEstado = inject(CajaEstadoService);

    colorSistema = Entorno.ColorSistema;
    logo = Entorno.Logo;

    // 'cargando' | 'cerrado' (muestra apertura) | 'abierto' (muestra resumen)
    estado = signal<'cargando' | 'cerrado' | 'abierto'>('cargando');
    // Dentro de 'abierto': qué muestra el panel derecho.
    vistaAbierta = signal<'movimientos' | 'cierre'>('movimientos');

    // Datos de cabecera
    nombreUsuario = signal<string>('');
    turno = signal<string>('');

    // Caja (para aperturar / cerrar)
    codigoCaja = signal<number | null>(null);
    nombreCaja = signal<string>('');

    // Formulario de apertura
    montoInicial = signal<number | null>(null);
    denominaciones = signal<FilaDenominacion[]>([]);
    abriendo = signal(false);

    // Suma de la herramienta de conteo de apertura (cantidad x valor).
    totalDenominaciones = computed(() =>
        this.denominaciones().reduce((acc, d) => acc + (Number(d.Cantidad) || 0) * d.Valor, 0)
    );

    // ----- Estado 'abierto': resúmenes y movimientos reales -----
    codigoApertura = signal<number | null>(null);
    resumenIngresos = signal<ResumenIngresosCaja | null>(null);
    resumenEgresos = signal<ResumenEgresosCaja | null>(null);
    resumenFormasPago = signal<ResumenFormasPagoCaja | null>(null);
    totalGeneral = signal<string>('0.00');

    movimientos = signal<MovimientoCaja[]>([]);
    busqueda = signal('');
    ordenCampo = signal<keyof MovimientoCaja | ''>('');
    ordenAsc = signal(true);
    paginaActual = signal(1);
    readonly itemsPorPagina = 10;

    // Filtro por rango de fechas de los movimientos (opcional).
    fechaInicioMov = signal('');
    fechaFinMov = signal('');
    filtroFechaAplicado = signal(false);
    cargandoMovimientos = signal(false);

    // ----- Ver documento del movimiento (lupa) -----
    // El API devuelve distintas formas según el tipo de movimiento; ramificamos por TipoOperacion
    // y abrimos el modal que corresponde. La data es genérica (cada modal sabe leer su forma).
    mostrarDocumento = signal(false);
    tipoDocumento = signal<TipoDocumentoCaja | null>(null);
    documentoData = signal<any>(null);
    cargandoDocumento = signal<number | null>(null); // CodigoMovimiento en carga

    // ----- Cierre de caja (inline en el panel derecho) -----
    montoCierre = signal<number | null>(null);
    denominacionesCierre = signal<FilaDenominacion[]>([]);
    cargandoCierre = signal(false);
    cerrando = signal(false);

    totalContadoCierre = computed(() =>
        this.denominacionesCierre().reduce((acc, d) => acc + (Number(d.Cantidad) || 0) * d.Valor, 0)
    );

    // El botón "Cerrar caja" del menú lateral marca cajaEstado.cierrePendiente;
    // cuando eso pasa y ya hay caja abierta, abrimos el formulario de cierre y consumimos
    // la solicitud (en microtask para no escribir señales dentro del effect).
    private procesandoCierrePendiente = false;

    constructor() {
        effect(() => {
            const pendiente = this.cajaEstado.cierrePendiente();
            const abierta = this.estado() === 'abierto';
            if (pendiente && abierta && !this.procesandoCierrePendiente) {
                this.procesandoCierrePendiente = true;
                queueMicrotask(() => {
                    this.cajaEstado.consumirCierre();
                    this.abrirCierre();
                    this.procesandoCierrePendiente = false;
                });
            }
        });
    }

    // Etiqueta legible del tipo de operación del movimiento.
    private etiquetasOperacion: Record<string, string> = {
        VENTA: 'Venta al contado',
        COMPRA_CONTADO: 'Compra al contado',
        ABONO_COMPRA_CREDITO: 'Abono compra crédito',
        ABONO_PEDIDO: 'Abono de pedido'
    };
    etiquetaOperacion(tipo: string): string {
        if (this.etiquetasOperacion[tipo]) return this.etiquetasOperacion[tipo];
        return (tipo || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
    }

    // Filtra por el texto de búsqueda (documento, operación, entidad, monto).
    movimientosFiltrados = computed(() => {
        const texto = this.busqueda().trim().toLowerCase();
        let lista = this.movimientos();
        if (texto) {
            lista = lista.filter(m =>
                (m.Documento || '').toLowerCase().includes(texto) ||
                this.etiquetaOperacion(m.TipoOperacion).toLowerCase().includes(texto) ||
                (m.Entidad || '').toLowerCase().includes(texto) ||
                String(m.MontoTotal).includes(texto)
            );
        }
        const campo = this.ordenCampo();
        if (campo) {
            const dir = this.ordenAsc() ? 1 : -1;
            lista = [...lista].sort((a, b) => {
                const va = a[campo] as any;
                const vb = b[campo] as any;
                if (va < vb) return -1 * dir;
                if (va > vb) return 1 * dir;
                return 0;
            });
        }
        return lista;
    });

    totalPaginas = computed(() =>
        Math.max(1, Math.ceil(this.movimientosFiltrados().length / this.itemsPorPagina))
    );

    movimientosPagina = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        return this.movimientosFiltrados().slice(inicio, inicio + this.itemsPorPagina);
    });

    ordenarPor(campo: keyof MovimientoCaja) {
        if (this.ordenCampo() === campo) {
            this.ordenAsc.update(v => !v);
        } else {
            this.ordenCampo.set(campo);
            this.ordenAsc.set(true);
        }
        this.paginaActual.set(1);
    }

    actualizarBusqueda(valor: string) {
        this.busqueda.set(valor);
        this.paginaActual.set(1);
    }

    irPagina(p: number) {
        if (p < 1 || p > this.totalPaginas()) return;
        this.paginaActual.set(p);
    }

    async ngOnInit() {
        await this.cargarEstado();
    }

    // Fuente única: obtener-datos-iniciales devuelve el estado (tieneCajaAbierta) y,
    // según el caso, los datos de apertura o los resúmenes de la caja abierta.
    private async cargarEstado(fechaInicio?: string, fechaFin?: string) {
        const primeraCarga = !fechaInicio && !fechaFin;
        if (primeraCarga) this.estado.set('cargando');
        this.cargandoMovimientos.set(true);
        try {
            const res = await this.servicioConfig.obtenerDatosInicialesCaja(fechaInicio, fechaFin);
            if (!res.success || !res.data) {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo obtener el estado de la caja');
                if (primeraCarga) this.estado.set('cerrado');
                return;
            }
            this.aplicarDatos(res.data);
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo obtener el estado de la caja');
            if (primeraCarga) this.estado.set('cerrado');
        } finally {
            this.cargandoMovimientos.set(false);
        }
    }

    private aplicarDatos(d: DatosCaja) {
        this.nombreUsuario.set(d.NombreUsuario ?? '');
        this.codigoCaja.set(d.Caja?.CodigoCaja ?? null);
        this.nombreCaja.set(this.etiquetaCaja(d.Caja?.NumeroCaja, d.Caja?.Descripcion));

        if (d.tieneCajaAbierta) {
            this.codigoApertura.set(d.Apertura?.CodigoAperturaCaja ?? null);
            this.turno.set(d.Apertura?.FechaApertura ?? '');
            this.resumenIngresos.set(d.ResumenTipoMovimiento?.Ingresos ?? null);
            this.resumenEgresos.set(d.ResumenTipoMovimiento?.Egresos ?? null);
            this.resumenFormasPago.set(d.ResumenFormasPago ?? null);
            this.totalGeneral.set(d.ResumenTipoMovimiento?.TotalGeneral ?? '0.00');
            this.movimientos.set(d.ResumenMovimientos?.Lista ?? []);
            this.paginaActual.set(1);
            this.estado.set('abierto');
        } else {
            this.turno.set(d.Turno ?? '');
            this.denominaciones.set(this.mapearDenominaciones(d.Denominaciones || []));
            this.estado.set('cerrado');
        }
    }

    private mapearDenominaciones(lista: (DenominacionCaja | Denominacion)[]): FilaDenominacion[] {
        return lista
            .slice()
            .sort((a, b) => Number(a.Valor) - Number(b.Valor))
            .map(de => ({ CodigoDenominacion: de.CodigoDenominacion, Valor: Number(de.Valor), Cantidad: null }));
    }

    private etiquetaCaja(numero: number | string | null | undefined, descripcion: string | null | undefined): string {
        if (descripcion) return descripcion;
        if (numero !== null && numero !== undefined && numero !== '') return `Caja ${numero}`;
        return 'Caja';
    }

    // Bloquea signos y notación científica al teclear en los inputs numéricos.
    bloquearTeclasInvalidas(event: KeyboardEvent) {
        if (['-', '+', 'e', 'E'].includes(event.key)) {
            event.preventDefault();
        }
    }

    // Sanitiza un valor numérico (cubre copiar/pegar, no solo teclado):
    // vacío/NaN -> null, negativos rechazados -> null, máximo 2 decimales.
    private sanitizarValor(valor: any): number | null {
        if (valor === null || valor === undefined || valor === '' || isNaN(Number(valor))) return null;
        const n = Number(valor);
        if (n < 0) return null;
        return Math.trunc(n * 100) / 100;
    }

    setMontoInicial(valor: any) {
        this.montoInicial.set(this.sanitizarValor(valor));
    }

    setMontoCierre(valor: any) {
        this.montoCierre.set(this.sanitizarValor(valor));
    }

    // ----- Filtro de fechas de movimientos -----
    async buscarMovimientos() {
        const inicio = this.fechaInicioMov();
        const fin = this.fechaFinMov();
        if (!inicio || !fin) {
            this.servicioAlerta.MostrarAlerta('Seleccione la fecha de inicio y la fecha fin.');
            return;
        }
        if (inicio > fin) {
            this.servicioAlerta.MostrarAlerta('La fecha de inicio no puede ser mayor que la fecha fin.');
            return;
        }
        this.filtroFechaAplicado.set(true);
        await this.cargarEstado(inicio, fin);
    }

    async limpiarFiltroMovimientos() {
        this.fechaInicioMov.set('');
        this.fechaFinMov.set('');
        this.filtroFechaAplicado.set(false);
        await this.cargarEstado();
    }

    // ----- Apertura -----
    actualizarCantidad(codigo: number, valor: any) {
        const limpio = this.sanitizarValor(valor);
        this.denominaciones.update(lista =>
            lista.map(d => d.CodigoDenominacion === codigo ? { ...d, Cantidad: limpio } : d)
        );
    }

    private montoValido(monto: number | null, etiqueta: string): boolean {
        if (monto === null || monto === undefined || isNaN(Number(monto))) {
            this.servicioAlerta.MostrarAlerta(`El ${etiqueta} es obligatorio.`);
            return false;
        }
        if (Number(monto) < 0) {
            this.servicioAlerta.MostrarAlerta(`El ${etiqueta} debe ser un valor positivo.`);
            return false;
        }
        if (Math.round(Number(monto) * 100) / 100 !== Number(monto)) {
            this.servicioAlerta.MostrarAlerta(`El ${etiqueta} permite máximo 2 decimales.`);
            return false;
        }
        return true;
    }

    async aperturarCaja() {
        if (this.abriendo()) return;
        if (!this.montoValido(this.montoInicial(), 'monto inicial')) return;

        const codigoCaja = this.codigoCaja();
        if (!codigoCaja) {
            this.servicioAlerta.MostrarAlerta('No hay una caja configurada para aperturar.');
            return;
        }

        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Desea aperturar la caja?',
            `Se abrirá ${this.nombreCaja()} con un monto inicial de Q ${Number(this.montoInicial()).toFixed(2)}.`,
            'Aperturar'
        );
        if (!confirmado) return;

        const desglose: DesgloseEfectivoItem[] = this.denominaciones()
            .filter(d => Number(d.Cantidad) > 0)
            .map(d => ({ CodigoDenominacion: d.CodigoDenominacion, Cantidad: Number(d.Cantidad) }));

        this.abriendo.set(true);
        try {
            const res = await this.servicioConfig.abrirCaja({
                CodigoCaja: codigoCaja,
                MontoInicial: Number(this.montoInicial()),
                DesgloseEfectivo: desglose
            });
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Caja abierta correctamente.');
                this.montoInicial.set(null);
                await this.cargarEstado();
                await this.cajaEstado.cargar();
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo aperturar la caja');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo aperturar la caja');
        } finally {
            this.abriendo.set(false);
        }
    }

    // Mapea el tipo de operación del movimiento al documento/modal que le corresponde.
    // Devuelve null cuando el movimiento no tiene documento visible (apertura, etc.).
    private tipoDocumentoPara(tipoOperacion: string): TipoDocumentoCaja | null {
        switch (tipoOperacion) {
            case 'VENTA': return 'venta';                 // factura de venta con productos
            case 'COMPRA_CONTADO': return 'compra';       // factura de compra
            case 'ABONO_COMPRA_CREDITO': return 'abono';  // recibo de abono a proveedor
            case 'ABONO_PEDIDO': return 'pago';           // recibo de pago de venta/pedido
            default: return null;
        }
    }

    // ----- Ver documento del movimiento -----
    async verDocumento(m: MovimientoCaja) {
        if (!m.CodigoMovimiento || this.cargandoDocumento() !== null) return;

        const tipo = this.tipoDocumentoPara(m.TipoOperacion);
        if (!tipo) {
            this.servicioAlerta.MostrarAlerta('Este movimiento no tiene un documento para mostrar.');
            return;
        }

        this.cargandoDocumento.set(m.CodigoMovimiento);
        try {
            const res = await this.servicioConfig.obtenerDocumentoMovimiento(m.CodigoMovimiento);
            if (res.success && res.data) {
                this.tipoDocumento.set(tipo);
                this.documentoData.set(res.data);
                this.mostrarDocumento.set(true);
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo obtener el documento');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo obtener el documento');
        } finally {
            this.cargandoDocumento.set(null);
        }
    }

    cerrarDocumento() {
        this.mostrarDocumento.set(false);
        this.documentoData.set(null);
        this.tipoDocumento.set(null);
    }

    // ----- Cierre de caja (inline) -----
    async abrirCierre() {
        if (!this.codigoApertura()) {
            this.servicioAlerta.MostrarAlerta('No se identificó la apertura de caja a cerrar.');
            return;
        }
        this.montoCierre.set(null);
        this.denominacionesCierre.set([]);
        this.vistaAbierta.set('cierre');
        // Las denominaciones para el conteo no vienen en la caja abierta: se cargan aparte.
        this.cargandoCierre.set(true);
        try {
            const res = await this.servicioDenominacion.listar();
            this.denominacionesCierre.set(this.mapearDenominaciones(res.success ? (res.data || []) : []));
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudieron cargar las denominaciones');
        } finally {
            this.cargandoCierre.set(false);
        }
    }

    cancelarCierre() {
        if (this.cerrando()) return;
        this.vistaAbierta.set('movimientos');
    }

    actualizarCantidadCierre(codigo: number, valor: any) {
        const limpio = this.sanitizarValor(valor);
        this.denominacionesCierre.update(lista =>
            lista.map(d => d.CodigoDenominacion === codigo ? { ...d, Cantidad: limpio } : d)
        );
    }

    async cerrarCaja() {
        if (this.cerrando()) return;
        if (!this.montoValido(this.montoCierre(), 'monto de cierre')) return;

        const codigoApertura = this.codigoApertura();
        if (!codigoApertura) {
            this.servicioAlerta.MostrarAlerta('No se identificó la apertura de caja a cerrar.');
            return;
        }

        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Desea cerrar la caja?',
            `Se cerrará ${this.nombreCaja()} con un monto final declarado de Q ${Number(this.montoCierre()).toFixed(2)}.`,
            'Cerrar caja'
        );
        if (!confirmado) return;

        const desglose: DesgloseEfectivoItem[] = this.denominacionesCierre()
            .filter(d => Number(d.Cantidad) > 0)
            .map(d => ({ CodigoDenominacion: d.CodigoDenominacion, Cantidad: Number(d.Cantidad) }));

        this.cerrando.set(true);
        try {
            const res = await this.servicioConfig.cerrarCaja({
                CodigoAperturaCaja: codigoApertura,
                MontoFinalDeclarado: Number(this.montoCierre()),
                DesgloseEfectivoFinal: desglose
            });
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Caja cerrada correctamente.');
                this.vistaAbierta.set('movimientos');
                await this.cargarEstado();
                await this.cajaEstado.cargar();
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo cerrar la caja');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo cerrar la caja');
        } finally {
            this.cerrando.set(false);
        }
    }
}
