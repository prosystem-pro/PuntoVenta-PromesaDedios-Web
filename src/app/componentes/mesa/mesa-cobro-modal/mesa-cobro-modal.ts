import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { PagoVenta } from '../../../Modelos/venta.modelo';

export interface ResultadoCobro {
    pago: PagoVenta;
    propina: number;
    accion: 'imprimir' | 'descargar';
}

@Component({
    selector: 'app-mesa-cobro-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './mesa-cobro-modal.html',
    styleUrl: './mesa-cobro-modal.css'
})
export class MesaCobroModal implements OnChanges {
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    // total de productos (sin propina). Se respalda en una señal para que los
    // computed (propinaMonto/totalCobrar/cambio) reaccionen al cambiar el @Input;
    // un computed sobre un @Input plano se queda con el valor cacheado de la 1ra mesa.
    private totalSig = signal(0);
    @Input() set total(valor: number) { this.totalSig.set(Number(valor) || 0); }
    get total(): number { return this.totalSig(); }
    @Input() procesando = false;

    @Output() alCerrar = new EventEmitter<void>();
    @Output() alProcesar = new EventEmitter<ResultadoCobro>();

    metodos = [
        { valor: 1, etiqueta: 'Efectivo' },
        { valor: 3, etiqueta: 'Transferencia' },
        { valor: 2, etiqueta: 'Tarjeta' },
        { valor: 4, etiqueta: 'Cheque' }
    ];

    // Porcentajes de propina 1..20
    porcentajes = Array.from({ length: 20 }, (_, i) => i + 1);

    metodoPago = signal<number>(1);
    montoRecibido = signal<number | null>(null);
    referencia = signal<string>('');
    propinaActiva = signal(false);
    propinaPct = signal<number>(0);

    esEfectivo = computed(() => this.metodoPago() === 1);

    propinaMonto = computed(() => {
        if (!this.propinaActiva() || this.propinaPct() <= 0) return 0;
        return Number((this.total * this.propinaPct() / 100).toFixed(2));
    });

    totalCobrar = computed(() => Number((this.total + this.propinaMonto()).toFixed(2)));

    cambio = computed(() => {
        const recibido = this.montoRecibido() ?? 0;
        const c = recibido - this.totalCobrar();
        return c > 0 ? c : 0;
    });

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.metodoPago.set(1);
            this.montoRecibido.set(null);
            this.referencia.set('');
            this.propinaActiva.set(false);
            this.propinaPct.set(0);
        }
    }

    cambiarMetodo(valor: number) {
        this.metodoPago.set(valor);
        // Para métodos no-efectivo el monto coincide con el total a cobrar (sin cambio)
        if (valor !== 1) {
            this.montoRecibido.set(this.totalCobrar());
        } else {
            this.montoRecibido.set(null);
        }
    }

    togglePropina() {
        this.propinaActiva.update(v => !v);
        if (!this.propinaActiva()) this.propinaPct.set(0);
        // Si el método no es efectivo, recalcular el monto recibido con la nueva propina
        if (!this.esEfectivo()) this.montoRecibido.set(this.totalCobrar());
    }

    seleccionarPropina(pct: number) {
        this.propinaPct.set(pct);
        if (!this.esEfectivo()) this.montoRecibido.set(this.totalCobrar());
    }

    private validar(): PagoVenta | null {
        const monto = this.montoRecibido();
        if (monto === null || isNaN(monto) || monto <= 0) {
            this.servicioAlerta.MostrarAlerta('Ingrese el monto recibido');
            return null;
        }
        if (monto < this.totalCobrar()) {
            this.servicioAlerta.MostrarAlerta('El monto recibido es menor al total a cobrar');
            return null;
        }
        if (!this.esEfectivo() && !this.referencia().trim()) {
            this.servicioAlerta.MostrarAlerta('Ingrese el número de referencia / autorización');
            return null;
        }
        return {
            MetodoPago: this.metodoPago(),
            Monto: this.totalCobrar(),
            MontoRecibido: monto,
            Cambio: this.cambio(),
            Referencia: this.esEfectivo() ? null : this.referencia().trim()
        };
    }

    procesar(accion: 'imprimir' | 'descargar') {
        if (this.procesando) return;
        const pago = this.validar();
        if (!pago) return;
        this.alProcesar.emit({ pago, propina: this.propinaMonto(), accion });
    }

    cerrar() {
        if (this.procesando) return;
        this.alCerrar.emit();
    }
}
