import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompraServicio } from '../../../Servicios/compra.service';
import { CompraDetalleCompleto } from '../../../Modelos/compra.modelo';
import { Entorno } from '../../../Entorno/Entorno';

@Component({
    selector: 'app-pago-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './pago-modal.html',
    styleUrl: './pago-modal.css'
})
export class PagoModal implements OnChanges {
    private servicioCompra = inject(CompraServicio);

    @Input() visible = false;
    @Input() compraId: number | null = null;
    @Output() cerrar = new EventEmitter<void>();

    colorSistema = Entorno.ColorSistema;
    detalle = signal<CompraDetalleCompleto | null>(null);

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
        const res = await this.servicioCompra.obtenerDetalle(this.compraId);
        if (res.success) {
            this.detalle.set(res.data || null);
        }
    }

    agregarPago() {
        if (this.nuevoValor <= 0) return;

        const d = this.detalle();
        if (d) {
            d.Pagos.unshift({
                FechaPago: new Date().toLocaleDateString(),
                MedioPago: this.nuevoMedioPago,
                ValorPagado: this.nuevoValor
            });
            d.SaldoPendiente -= this.nuevoValor;
            this.detalle.set({ ...d });
            this.nuevoValor = 0;
        }
    }

    eliminarPago(index: number) {
        const d = this.detalle();
        if (d) {
            const valor = d.Pagos[index].ValorPagado;
            d.Pagos.splice(index, 1);
            d.SaldoPendiente += valor;
            this.detalle.set({ ...d });
        }
    }

    onCerrar() {
        this.cerrar.emit();
    }

    onGuardar() {
        this.onCerrar();
    }
}
