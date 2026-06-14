import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { PagoVenta } from '../../../Modelos/venta.modelo';

export interface ResultadoPago {
    pago: PagoVenta | null; // null = pedido sin abono (crédito total)
    accion: 'imprimir' | 'descargar';
}

@Component({
    selector: 'app-monto-pago-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './monto-pago-modal.html',
    styleUrl: './monto-pago-modal.css'
})
export class MontoPagoModal implements OnChanges {
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() total = 0;
    @Input() procesando = false;
    /** 'contado' = venta directa (muestra "Su cambio"); 'pedido' = abono (muestra "Saldo pendiente"). */
    // Se respalda en una señal para que los computed (esPedido) reaccionen al cambiar el @Input.
    private modoSig = signal<'contado' | 'pedido'>('contado');
    @Input() set modo(valor: 'contado' | 'pedido') { this.modoSig.set(valor ?? 'contado'); }
    get modo(): 'contado' | 'pedido' { return this.modoSig(); }

    @Output() alCerrar = new EventEmitter<void>();
    @Output() alProcesar = new EventEmitter<ResultadoPago>();

    // Métodos de pago: valor = código que espera el API
    metodos = [
        { valor: 1, etiqueta: 'Efectivo' },
        { valor: 3, etiqueta: 'Transferencia' },
        { valor: 2, etiqueta: 'Tarjeta' },
        { valor: 4, etiqueta: 'Cheque' }
    ];

    metodoPago = signal<number>(1);
    montoRecibido = signal<number | null>(null);
    referencia = signal<string>('');

    esEfectivo = computed(() => this.metodoPago() === 1);
    esPedido = computed(() => this.modoSig() === 'pedido');

    // Contado: cambio = recibido - total. Pedido: no aplica.
    cambio = computed(() => {
        const recibido = this.montoRecibido() ?? 0;
        const c = recibido - this.total;
        return c > 0 ? c : 0;
    });

    // Pedido: saldo pendiente = total - abono.
    saldoPendiente = computed(() => {
        const abono = this.montoRecibido() ?? 0;
        const s = this.total - abono;
        return s > 0 ? s : 0;
    });

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.metodoPago.set(1);
            this.montoRecibido.set(null);
            this.referencia.set('');
        }
    }

    cambiarMetodo(valor: number) {
        this.metodoPago.set(valor);
        // En contado, para métodos no-efectivo el monto coincide con el total (sin cambio)
        if (!this.esPedido() && valor !== 1) {
            this.montoRecibido.set(this.total);
        } else {
            this.montoRecibido.set(null);
        }
    }

    private validar(): { pago: PagoVenta | null } | null {
        const monto = this.montoRecibido();

        if (this.esPedido()) {
            // Pedido: el abono es opcional (crédito total permitido)
            if (monto === null || monto === 0) {
                return { pago: null };
            }
            if (isNaN(monto) || monto < 0) {
                this.servicioAlerta.MostrarAlerta('Ingrese un abono válido');
                return null;
            }
            if (monto > this.total) {
                this.servicioAlerta.MostrarAlerta('El abono no puede ser mayor al total');
                return null;
            }
            if (!this.esEfectivo() && !this.referencia().trim()) {
                this.servicioAlerta.MostrarAlerta('Ingrese el número de referencia / autorización');
                return null;
            }
            return {
                pago: {
                    MetodoPago: this.metodoPago(),
                    Monto: monto,
                    MontoRecibido: monto,
                    Cambio: 0,
                    Referencia: this.esEfectivo() ? null : this.referencia().trim()
                }
            };
        }

        // Contado
        if (monto === null || isNaN(monto) || monto <= 0) {
            this.servicioAlerta.MostrarAlerta('Ingrese el monto recibido');
            return null;
        }
        if (monto < this.total) {
            this.servicioAlerta.MostrarAlerta('El monto recibido es menor al total a pagar');
            return null;
        }
        if (!this.esEfectivo() && !this.referencia().trim()) {
            this.servicioAlerta.MostrarAlerta('Ingrese el número de referencia / autorización');
            return null;
        }
        return {
            pago: {
                MetodoPago: this.metodoPago(),
                Monto: this.total,
                MontoRecibido: monto,
                Cambio: this.cambio(),
                Referencia: this.esEfectivo() ? null : this.referencia().trim()
            }
        };
    }

    procesar(accion: 'imprimir' | 'descargar') {
        if (this.procesando) return;
        const res = this.validar();
        if (!res) return;
        this.alProcesar.emit({ pago: res.pago, accion });
    }

    cerrar() {
        if (this.procesando) return;
        this.alCerrar.emit();
    }
}
