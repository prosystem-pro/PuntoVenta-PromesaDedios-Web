import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoObservacion } from '../../../Modelos/producto.modelo';

// Modal reutilizable que muestra las observaciones de los pedidos al entrar a
// Abastecer (Materia Prima / Productos). Lista "NumeroPedido - Observación" por pedido.
@Component({
    selector: 'app-observaciones-pedidos-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './observaciones-pedidos-modal.html',
    styleUrl: './observaciones-pedidos-modal.css'
})
export class ObservacionesPedidosModal {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() observaciones: PedidoObservacion[] = [];

    @Output() alCerrar = new EventEmitter<void>();

    cerrar() {
        this.alCerrar.emit();
    }
}
