import { Component, Input, Output, EventEmitter, inject, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';

// Datos del pedido a abonar (los enviará el API cuando exista el endpoint)
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

    @Input() visible = false;
    @Input() colorSistema = Entorno.ColorSistema;
    @Input() pedido: PedidoAbono | null = null;
    // El borrado de pagos es solo para super administrador. El padre debe pasar
    // el valor real según el rol del usuario logueado.
    @Input() esSuperAdmin = false;

    @Output() cerrar = new EventEmitter<void>();

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
            this.pagos.set([]);
            this.limpiarFormulario();
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

    agregarAbono() {
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

        // Registrar el abono (diseño local). Con API: POST y recargar.
        const ahora = new Date();
        this.pagos.update(lista => [...lista, {
            FechaPago: ahora.toISOString(),
            MedioPago: this.nombreMedio(this.medioPago()),
            Valor: monto,
            Referencia: referencia
        }]);
        this.saldoPendiente.update(s => Number((s - monto).toFixed(2)));

        this.servicioAlerta.MostrarToast('Pago realizado con éxito', 'success');
        this.limpiarFormulario();
    }

    async eliminarPago(index: number) {
        if (!this.esSuperAdmin) return;
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Desea eliminar este pago?',
            'Esta acción no se puede deshacer y el saldo pendiente aumentará.'
        );
        if (!confirmado) return;

        const pago = this.pagos()[index];
        if (pago) this.saldoPendiente.update(s => Number((s + pago.Valor).toFixed(2)));
        this.pagos.update(lista => lista.filter((_, i) => i !== index));
    }

    verComprobante(_pago: PagoRealizado) {
        this.servicioAlerta.MostrarInfo('La visualización del comprobante estará disponible cuando el API tenga el endpoint correspondiente.', 'Pendiente');
    }

    onCerrar() {
        this.cerrar.emit();
    }
}
