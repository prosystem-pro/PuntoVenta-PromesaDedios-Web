import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompraServicio } from '../../../Servicios/compra.service';
import { CompraDetalleCompleto } from '../../../Modelos/compra.modelo';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { ServicioConfiguracion } from '../../../Servicios/configuracion.service';

@Component({
    selector: 'app-pago-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
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
    nuevoCodigoAperturaCaja = 1;

    abonosTemporales = signal<any[]>([]);

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
            if (res.success) {
                this.detalle.set(res.data || null);
            }

            // Cargar Caja Actual
            const resCaja = await this.servicioConfig.obtenerCajaActual();
            if (resCaja.success && resCaja.data) {
                this.nuevoCodigoAperturaCaja = resCaja.data.CodigoAperturaCaja || 1;
            }
        } finally {
            this.cargando.set(false);
        }
    }

    agregarPago() {
        if (!this.compraId || this.nuevoValor <= 0) return;

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
            this.onCerrar();
            return;
        }

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
                const res = await this.servicioCompra.registrarAbono(payload);
                if (res.success) exitos++;
            }

            if (exitos > 0) {
                this.servicioAlerta.MostrarExito(`Se registraron ${exitos} abono(s) correctamente`);
                this.abonosTemporales.set([]);
                await this.cargarDetalle();
            }

            // Si todos salieron bien o no había más, cerramos o nos quedamos
            this.onCerrar();
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al procesar los abonos' } });
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
        const url = `${Entorno.ApiUrl}compra/imprimir/abono/${pago.CodigoPagoProveedor || pago.CodigoAbono}`;
        window.open(url, '_blank');
    }

    onCerrar() {
        this.detalle.set(null);
        this.abonosTemporales.set([]);
        this.limpiarFormulario();
        this.cerrar.emit();
    }
}
