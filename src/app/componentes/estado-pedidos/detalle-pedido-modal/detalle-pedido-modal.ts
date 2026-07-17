import { Component, Input, Output, EventEmitter, signal, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoPedidoServicio } from '../../../Servicios/estado-pedido.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { DetalleProductoPedido } from '../../../Modelos/estado-pedido.modelo';

// Muestra el contenido de un pedido (productos con cantidad solicitada y stock).
// Solo lectura; carga desde GET /estadopedido/detalle-productos/:CodigoPedidoProduccion.
@Component({
    selector: 'app-detalle-pedido-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './detalle-pedido-modal.html',
    styleUrl: './detalle-pedido-modal.css'
})
export class DetallePedidoModal implements OnChanges {
    private servicio = inject(EstadoPedidoServicio);
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() codigoPedidoProduccion: number | null = null;
    @Input() documento: string | null = null;

    @Output() cerrar = new EventEmitter<void>();

    cargando = signal(false);
    productos = signal<DetalleProductoPedido[]>([]);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue && this.codigoPedidoProduccion) {
            this.productos.set([]);
            this.cargar();
        }
    }

    private async cargar() {
        const codigo = this.codigoPedidoProduccion;
        if (!codigo) return;
        this.cargando.set(true);
        try {
            const res = await this.servicio.obtenerDetalleProductos(codigo);
            this.productos.set(res.success ? (res.data || []) : []);
        } catch (error: any) {
            // El API responde 404 cuando el pedido no tiene productos: lista vacía.
            if (error?.response?.status === 404) {
                this.productos.set([]);
            } else {
                this.servicioAlerta.MostrarError(error, 'No se pudo cargar el detalle del pedido');
            }
        } finally {
            this.cargando.set(false);
        }
    }

    onCerrar() {
        this.cerrar.emit();
    }
}
