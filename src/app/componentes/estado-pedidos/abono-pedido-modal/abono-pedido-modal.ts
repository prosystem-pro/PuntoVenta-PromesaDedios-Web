import { Component, Input, Output, EventEmitter, inject, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { EstadoPedidoServicio } from '../../../Servicios/estado-pedido.service';
import { PagoPedido } from '../../../Modelos/estado-pedido.modelo';

// Datos del pedido a abonar que ya conoce el padre (fila del listado).
// El saldo/teléfono/CodigoVenta se obtienen del detalle del API al abrir.
export interface PedidoAbono {
    Fecha?: string | null;
    Documento?: string | null;
    Cliente?: string | null;
    Telefono?: string | null;
    SaldoPendiente?: number;
}

interface PagoRealizado {
    FechaPago: string;
    MedioPago: string;
    Valor: number;
    Referencia?: string | null;
}

@Component({
    selector: 'app-abono-pedido-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './abono-pedido-modal.html',
    styleUrl: './abono-pedido-modal.css'
})
export class AbonoPedidoModal implements OnChanges {
    private servicioAlerta = inject(AlertaServicio);
    private servicio = inject(EstadoPedidoServicio);

    @Input() visible = false;
    @Input() colorSistema = Entorno.ColorSistema;
    @Input() pedido: PedidoAbono | null = null;
    // Código del pedido de producción para cargar detalle + abonos del API.
    @Input() codigoPedidoProduccion: number | null = null;
    // El borrado de pagos es solo para super administrador. El padre debe pasar
    // el valor real según el rol del usuario logueado.
    @Input() esSuperAdmin = false;

    @Output() cerrar = new EventEmitter<void>();
    // Avisa al padre que se registró un abono (para recargar el listado).
    @Output() abonoRegistrado = new EventEmitter<void>();

    // Datos que provienen del detalle del API
    private codigoVenta = signal<number | null>(null);
    telefono = signal<string | null>(null);
    cargando = signal(false);
    guardando = signal(false);

    // Catálogo de medios de pago (valor numérico igual al resto del sistema)
    mediosPago = [
        { valor: 1, nombre: 'Efectivo' },
        { valor: 2, nombre: 'Tarjeta' },
        { valor: 3, nombre: 'Transferencia' },
        { valor: 4, nombre: 'Cheque' }
    ];

    // Formulario "Agregar abono"
    medioPago = signal<number>(1);
    valor = signal<number | null>(null);
    referencia = signal<string>('');

    // Saldo y pagos (diseño local; sin API todavía)
    saldoPendiente = signal<number>(0);
    pagos = signal<PagoRealizado[]>([]);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue) {
            this.saldoPendiente.set(Number(this.pedido?.SaldoPendiente ?? 0));
            this.telefono.set(this.pedido?.Telefono ?? null);
            this.pagos.set([]);
            this.limpiarFormulario();
            this.cargarDatos();
        }
    }

    // Carga el detalle (saldo/teléfono/CodigoVenta) y los abonos ya registrados.
    private async cargarDatos() {
        const codigo = this.codigoPedidoProduccion;
        if (!codigo) return;

        this.cargando.set(true);
        try {
            const det = await this.servicio.obtenerDetalle(codigo);
            if (det.success && det.data) {
                this.codigoVenta.set(det.data.CodigoVenta);
                this.telefono.set(det.data.Telefono);
                this.saldoPendiente.set(Number(det.data.SaldoPendiente ?? 0));
            }
            await this.cargarPagos();
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo cargar el detalle del pedido');
        } finally {
            this.cargando.set(false);
        }
    }

    private async cargarPagos() {
        const codigoVenta = this.codigoVenta();
        if (!codigoVenta) {
            this.pagos.set([]);
            return;
        }
        try {
            const res = await this.servicio.listarPagos(codigoVenta);
            const lista: PagoPedido[] = res.success ? (res.data || []) : [];
            this.pagos.set(lista.map(p => ({
                FechaPago: p.FechaPago,
                MedioPago: p.MetodoPago,
                Valor: Number(p.Monto),
                Referencia: null
            })));
        } catch (error: any) {
            // El API responde 404 cuando no hay abonos: lista vacía.
            if (error?.response?.status === 404) {
                this.pagos.set([]);
            } else {
                throw error;
            }
        }
    }

    private limpiarFormulario() {
        this.medioPago.set(1);
        this.valor.set(null);
        this.referencia.set('');
    }

    esEfectivo = computed(() => this.medioPago() === 1);

    // Etiqueta del campo de referencia según el medio de pago
    etiquetaReferencia = computed(() => {
        switch (this.medioPago()) {
            case 2: return 'No. de autorización';
            case 3: return 'No. de transferencia';
            case 4: return 'No. de cheque';
            default: return 'No. de referencia';
        }
    });

    nombreMedio(valor: number): string {
        return this.mediosPago.find(m => m.valor === valor)?.nombre || '';
    }

    bloquearTeclasInvalidas(event: KeyboardEvent) {
        if (['-', '+', 'e', 'E'].includes(event.key)) {
            event.preventDefault();
        }
    }

    async agregarAbono() {
        const valor = this.valor();
        const saldo = this.saldoPendiente();

        // Valor: obligatorio, mayor a 0, máximo 2 decimales
        if (valor === null || valor === undefined || isNaN(Number(valor))) {
            this.servicioAlerta.MostrarAlerta('El valor es obligatorio.');
            return;
        }
        const monto = Number(valor);
        if (monto <= 0) {
            this.servicioAlerta.MostrarAlerta('El valor debe ser mayor a 0.');
            return;
        }
        if (Math.round(monto * 100) / 100 !== monto) {
            this.servicioAlerta.MostrarAlerta('El valor permite máximo 2 decimales.');
            return;
        }
        // No debe superar el saldo pendiente
        if (monto > saldo) {
            this.servicioAlerta.MostrarAlerta('Monto supera al saldo pendiente');
            return;
        }

        // Referencia: obligatoria y numérica para Tarjeta, Transferencia y Cheque
        let referencia: string | null = null;
        if (!this.esEfectivo()) {
            const ref = this.referencia().trim();
            if (!ref) {
                this.servicioAlerta.MostrarAlerta(`El campo "${this.etiquetaReferencia()}" es obligatorio.`);
                return;
            }
            if (!/^\d+$/.test(ref)) {
                this.servicioAlerta.MostrarAlerta(`El campo "${this.etiquetaReferencia()}" solo admite números.`);
                return;
            }
            referencia = ref;
        }

        // Registrar el abono contra el API
        const codigoVenta = this.codigoVenta();
        if (!codigoVenta) {
            this.servicioAlerta.MostrarError('No se pudo identificar la venta del pedido.');
            return;
        }
        if (this.guardando()) return;

        this.guardando.set(true);
        try {
            const res = await this.servicio.registrarAbono({
                CodigoVenta: codigoVenta,
                Monto: monto,
                MetodoPago: this.medioPago(),
                Referencia: referencia
            });

            if (res.success) {
                if (res.data) this.saldoPendiente.set(Number(res.data.SaldoRestante ?? 0));
                await this.cargarPagos();
                this.limpiarFormulario();
                this.servicioAlerta.MostrarToast('Pago realizado con éxito', 'success');
                // Avisa al padre por si el estado del pedido cambió (saldo en 0 => Cancelado)
                this.abonoRegistrado.emit();
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo registrar el abono');
        } finally {
            this.guardando.set(false);
        }
    }

    async eliminarPago(_index: number) {
        if (!this.esSuperAdmin) return;
        // El API aún no expone un endpoint para eliminar abonos.
        this.servicioAlerta.MostrarInfo('La eliminación de pagos estará disponible cuando el API tenga el endpoint correspondiente.', 'Pendiente');
    }

    verComprobante(_pago: PagoRealizado) {
        this.servicioAlerta.MostrarInfo('La visualización del comprobante estará disponible cuando el API tenga el endpoint correspondiente.', 'Pendiente');
    }

    onCerrar() {
        this.cerrar.emit();
    }
}
