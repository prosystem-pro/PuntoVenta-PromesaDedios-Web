import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertaServicio } from '../../../Servicios/alerta.service';

// Modal reutilizable para capturar un motivo antes de una accion destructiva
// (anular compra/pago/pedido, eliminar pedido). Cada pantalla decide los textos
// y si el motivo es obligatorio; al confirmar emite el texto ya validado.
@Component({
    selector: 'app-motivo-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './motivo-modal.html',
    styleUrl: './motivo-modal.css'
})
export class MotivoModal implements OnChanges {
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() procesando = false;

    @Input() titulo = 'Confirmar acción';
    @Input() mensaje = '';                         // línea descriptiva opcional
    @Input() etiquetaConfirmar = 'Confirmar';
    @Input() etiquetaMotivo = 'Motivo';
    @Input() placeholder = 'Describa el motivo...';
    @Input() obligatorio = true;                   // exige texto para confirmar

    // Para anulaciones con reverso: además del motivo, pide el método con que se
    // devuelve el dinero. Cuando está activo, confirmar emite alConfirmarMetodo.
    @Input() pedirMetodo = false;
    @Input() etiquetaMetodo = 'Método de devolución';

    @Output() alCerrar = new EventEmitter<void>();
    @Output() alConfirmar = new EventEmitter<string>();
    @Output() alConfirmarMetodo = new EventEmitter<{ motivo: string; metodo: number }>();

    motivo = signal<string>('');
    metodo = signal<number>(1);   // 1=Efectivo, 2=Tarjeta, 3=Transferencia, 4=Cheque

    mediosPago = [
        { valor: 1, nombre: 'Efectivo' },
        { valor: 2, nombre: 'Tarjeta' },
        { valor: 3, nombre: 'Transferencia' },
        { valor: 4, nombre: 'Cheque' },
    ];

    ngOnChanges(changes: SimpleChanges): void {
        // Limpia el campo cada vez que se abre para no arrastrar el motivo anterior.
        if (changes['visible'] && this.visible) {
            this.motivo.set('');
            this.metodo.set(1);
        }
    }

    confirmar() {
        if (this.procesando) return;
        const texto = this.motivo().trim();
        if (this.obligatorio && !texto) {
            this.servicioAlerta.MostrarAlerta('Debe ingresar el motivo.');
            return;
        }
        if (this.pedirMetodo) {
            this.alConfirmarMetodo.emit({ motivo: texto, metodo: this.metodo() });
        } else {
            this.alConfirmar.emit(texto);
        }
    }

    cerrar() {
        if (this.procesando) return;
        this.alCerrar.emit();
    }
}
