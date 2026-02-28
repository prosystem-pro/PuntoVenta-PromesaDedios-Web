import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompraServicio } from '../../../Servicios/compra.service';
import { CompraDetalleCompleto } from '../../../Modelos/compra.modelo';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';

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

    @Input() visible = false;
    @Input() compraId: number | null = null;
    @Output() cerrar = new EventEmitter<void>();

    colorSistema = Entorno.ColorSistema;
    detalle = signal<CompraDetalleCompleto | null>(null);
    cargando = signal(false);

    // Form fields for new payment
    nuevoMedioPago = 'Efectivo';
    nuevoValor = 0;

    mediosPago = ['Efectivo', 'Tarjeta de credito', 'Transferencia', 'Cheque'];

    constructor() { }

    async ngOnChanges(changes: SimpleChanges) {
        if (changes['visible']?.currentValue && this.compraId) {
            await this.cargarDetalle();
        }
    }

    async cargarDetalle() {
        if (!this.compraId) return;
        this.cargando.set(true);
        try {
            const res = await this.servicioCompra.obtenerDetalle(this.compraId);
            if (res.success) {
                this.detalle.set(res.data || null);
            }
        } finally {
            this.cargando.set(false);
        }
    }

    async agregarPago() {
        if (!this.compraId || this.nuevoValor <= 0) return;

        this.cargando.set(true);
        try {
            const medioPagoMap: any = {
                'Efectivo': 1,
                'Tarjeta de credito': 2,
                'Transferencia': 3,
                'Cheque': 4
            };

            const payload = {
                CodigoCompra: this.compraId,
                MontoAbono: this.nuevoValor,
                MetodoPago: medioPagoMap[this.nuevoMedioPago] || 1,
                CodigoAperturaCaja: 1
            };

            const res = await this.servicioCompra.registrarAbono(payload);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Pago registrado correctamente');
                this.nuevoValor = 0;
                await this.cargarDetalle(); // Recargar detalle para ver el nuevo pago y el saldo actualizado
            } else {
                this.servicioAlerta.MostrarError(res);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError({ error: { message: 'Error al registrar el abono' } });
        } finally {
            this.cargando.set(false);
        }
    }

    onCerrar() {
        this.detalle.set(null);
        this.cerrar.emit();
    }
}
