import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompraServicio } from '../../../Servicios/compra.service';
import { CompraDetalleCompleto } from '../../../Modelos/compra.modelo';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { ServicioConfiguracion } from '../../../Servicios/configuracion.service';
import { ComprobanteAbonoModal } from '../comprobante-abono-modal/comprobante-abono-modal';

@Component({
    selector: 'app-pago-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ComprobanteAbonoModal],
    templateUrl: './pago-modal.html',
    styleUrl: './pago-modal.css'
})
export class PagoModal implements OnChanges {
    private servicioCompra = inject(CompraServicio);
    private servicioAlerta = inject(AlertaServicio);
    private servicioConfig = inject(ServicioConfiguracion);

    @Input() visible = false;
    @Input() compraId: number | null = null;
    @Output() cerrar = new EventEmitter<void>();

    colorSistema = Entorno.ColorSistema;
    detalle = signal<CompraDetalleCompleto | null>(null);
    cargando = signal(false);

    // Form fields for new payment
    nuevoMedioPago = 'Efectivo';
    nuevoValor = 0;
    nuevoNumeroReferencia = '';
    nuevoBanco = '';
    // Apertura de caja activa del usuario. null = no hay caja abierta (bloquea el abono).
    nuevoCodigoAperturaCaja: number | null = null;

    abonosTemporales = signal<any[]>([]);

    mostrarComprobante = signal(false);
    codigoComprobante = signal<number | null>(null);

    mediosPago = ['Efectivo', 'Tarjeta de Crédito', 'Transferencia', 'Cheque'];

    constructor() { }

    async ngOnChanges(changes: SimpleChanges) {
        if (changes['visible']?.currentValue && this.compraId) {
            // Limpiar datos previos antes de cargar los nuevos para evitar cruces
            this.detalle.set(null);
            this.abonosTemporales.set([]);
            this.limpiarFormulario();
            await this.cargarDetalle();
        }
    }

    limpiarFormulario() {
        this.nuevoMedioPago = 'Efectivo';
        this.nuevoValor = 0;
        this.nuevoNumeroReferencia = '';
        this.nuevoBanco = '';
    }

    async cargarDetalle() {
        if (!this.compraId) return;
        this.cargando.set(true);
        try {
            const res = await this.servicioCompra.obtenerDetalle(this.compraId);
            if (res.success && res.data) {
                const data: any = res.data;
                // El API devuelve el proveedor bajo 'Proveedor_CodigoProveedor';
                // lo mapeamos a 'Proveedor' para mostrar nombre y telefono.
                const proveedor = data.Proveedor_CodigoProveedor || data.Proveedor || null;
                this.detalle.set({ ...data, Proveedor: proveedor });
            } else {
                this.detalle.set(null);
            }

            // Cargar Caja Actual
            const resCaja = await this.servicioConfig.obtenerCajaActual();
            if (resCaja.success && resCaja.data) {
                // El API devuelve el código anidado bajo CajaAbierta (null si no hay caja abierta).
                this.nuevoCodigoAperturaCaja = resCaja.data.CajaAbierta?.CodigoAperturaCaja ?? null;
            }
        } finally {
            this.cargando.set(false);
        }
    }

    bloquearTeclasInvalidas(event: KeyboardEvent) {
        if (['-', '+', 'e', 'E'].includes(event.key)) {
            event.preventDefault();
        }
    }

    private requiereReferencia(medio: string): boolean {
        return medio === 'Tarjeta de Crédito' || medio === 'Transferencia' || medio === 'Cheque';
    }

    agregarPago() {
        if (!this.compraId) return;

        // Sin caja abierta no se puede registrar el abono.
        if (!this.nuevoCodigoAperturaCaja) {
            this.servicioAlerta.MostrarAlerta('Debe abrir una caja antes de registrar el abono.');
            return;
        }

        if (Number(this.nuevoValor) <= 0) {
            this.servicioAlerta.MostrarAlerta('El Valor debe ser mayor a 0.');
            return;
        }

        if (this.requiereReferencia(this.nuevoMedioPago) && !(this.nuevoNumeroReferencia || '').trim()) {
            this.servicioAlerta.MostrarAlerta('El campo Referencia es obligatorio para la forma de pago seleccionada.');
            return;
        }

        const saldoPendiente = Number(this.detalle()?.SaldoPendiente || 0);
        const sumaTemporales = this.abonosTemporales().reduce((acc, a) => acc + Number(a.MontoAbono || 0), 0);
        const saldoDisponible = saldoPendiente - sumaTemporales;
        if (Number(this.nuevoValor) > saldoDisponible) {
            this.servicioAlerta.MostrarAlerta(`El monto ingresado supera el saldo pendiente actual (Q ${saldoDisponible.toFixed(2)}).`);
            return;
        }

        const medioPagoMap: any = {
            'Efectivo': 1,
            'Tarjeta de Crédito': 2,
            'Transferencia': 3,
            'Cheque': 4
        };

        const nuevoAbono = {
            CodigoCompra: this.compraId,
            MontoAbono: this.nuevoValor,
            MetodoPago: medioPagoMap[this.nuevoMedioPago] || 1,
            NombreMedioPago: this.nuevoMedioPago,
            CodigoAperturaCaja: this.nuevoCodigoAperturaCaja,
            NumeroReferencia: this.nuevoNumeroReferencia,
            Banco: this.nuevoBanco,
            FechaPago: new Date().toLocaleDateString(), // Solo para previsualización
            EsNuevo: true
        };

        this.abonosTemporales.update(lista => [...lista, nuevoAbono]);

        // Limpiar campos
        this.nuevoValor = 0;
        this.nuevoNumeroReferencia = '';
        this.nuevoBanco = '';
    }

    removerAbonoTemporal(index: number) {
        this.abonosTemporales.update(lista => lista.filter((_, i) => i !== index));
    }

    async onGuardar() {
        const temporales = this.abonosTemporales();
        if (temporales.length === 0) {
            this.servicioAlerta.MostrarAlerta('Debe agregar al menos un abono antes de guardar.');
            return;
        }

        const total = temporales.reduce((acc, a) => acc + Number(a.MontoAbono || 0), 0);
        const detalle = temporales.length === 1
            ? `Se registrará 1 abono por un total de Q ${total.toFixed(2)}.`
            : `Se registrarán ${temporales.length} abonos por un total de Q ${total.toFixed(2)}.`;
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Desea confirmar el registro del abono?',
            detalle,
            'Confirmar',
            'Cancelar'
        );
        if (!confirmado) return;

        this.cargando.set(true);
        try {
            let exitos = 0;
            for (const abono of temporales) {
                const payload = {
                    CodigoCompra: abono.CodigoCompra,
                    MontoAbono: abono.MontoAbono,
                    MetodoPago: abono.MetodoPago,
                    CodigoAperturaCaja: abono.CodigoAperturaCaja,
                    NumeroReferencia: abono.NumeroReferencia,
                    Banco: abono.Banco
                };
                try {
                    const res = await this.servicioCompra.registrarAbono(payload);
                    if (res.success) {
                        exitos++;
                        this.abonosTemporales.update(lista => lista.filter(a => a !== abono));
                    } else {
                        this.servicioAlerta.MostrarError(res);
                        break;
                    }
                } catch (errorAbono) {
                    this.servicioAlerta.MostrarError(errorAbono);
                    break;
                }
            }

            if (exitos > 0) {
                this.servicioAlerta.MostrarExito(`Se registraron ${exitos} abono(s) correctamente`);
                await this.cargarDetalle();
                if (this.abonosTemporales().length === 0) this.onCerrar();
            }
        } finally {
            this.cargando.set(false);
        }
    }

    async eliminarPago(pago: any) {
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Desea eliminar este pago?',
            'Esta acción no se puede deshacer y el saldo pendiente aumentará.'
        );

        if (confirmado) {
            this.cargando.set(true);
            try {
                // El CodigoPagoProveedor debe venir en el objeto de pagos
                const res = await this.servicioCompra.eliminarPago(pago.CodigoPagoProveedor || pago.CodigoAbono);
                if (res.success) {
                    this.servicioAlerta.MostrarExito(res.message || 'Pago eliminado correctamente');
                    await this.cargarDetalle();
                } else {
                    this.servicioAlerta.MostrarError(res);
                }
            } catch (error) {
                this.servicioAlerta.MostrarError({ error: { message: 'Error al eliminar el pago' } });
            } finally {
                this.cargando.set(false);
            }
        }
    }

    imprimirTicket(pago: any) {
        const id = pago.CodigoPagoProveedor || pago.CodigoAbono;
        if (!id) return;
        this.codigoComprobante.set(id);
        this.mostrarComprobante.set(true);
    }

    cerrarComprobante() {
        this.mostrarComprobante.set(false);
        this.codigoComprobante.set(null);
    }

    private tieneInformacionPendiente(): boolean {
        if (this.abonosTemporales().length > 0) return true;
        if (Number(this.nuevoValor) > 0) return true;
        if ((this.nuevoNumeroReferencia || '').trim() !== '') return true;
        if ((this.nuevoBanco || '').trim() !== '') return true;
        return false;
    }

    async onCerrar() {
        if (this.tieneInformacionPendiente()) {
            const continuar = await this.servicioAlerta.Confirmacion(
                '¿Cerrar sin guardar?',
                'Si cierra esta ventana, la información cargada no se guardará y se perderán los cambios realizados.',
                'Cerrar',
                'Cancelar'
            );
            if (!continuar) return;
        }
        this.detalle.set(null);
        this.abonosTemporales.set([]);
        this.limpiarFormulario();
        this.cerrar.emit();
    }
}
