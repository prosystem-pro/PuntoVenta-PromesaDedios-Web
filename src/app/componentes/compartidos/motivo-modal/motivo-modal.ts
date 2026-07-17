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

    @Output() alCerrar = new EventEmitter<void>();
    @Output() alConfirmar = new EventEmitter<string>();

    motivo = signal<string>('');

    ngOnChanges(changes: SimpleChanges): void {
        // Limpia el campo cada vez que se abre para no arrastrar el motivo anterior.
        if (changes['visible'] && this.visible) {
            this.motivo.set('');
        }
    }

    confirmar() {
        if (this.procesando) return;
        const texto = this.motivo().trim();
        if (this.obligatorio && !texto) {
            this.servicioAlerta.MostrarAlerta('Debe ingresar el motivo.');
            return;
        }
        this.alConfirmar.emit(texto);
    }

    cerrar() {
        if (this.procesando) return;
        this.alCerrar.emit();
    }
}
