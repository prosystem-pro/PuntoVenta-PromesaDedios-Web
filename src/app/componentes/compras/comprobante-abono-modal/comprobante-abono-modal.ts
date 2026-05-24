import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entorno } from '../../../Entorno/Entorno';
import { CompraServicio } from '../../../Servicios/compra.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';

@Component({
    selector: 'app-comprobante-abono-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './comprobante-abono-modal.html',
    styleUrl: './comprobante-abono-modal.css'
})
export class ComprobanteAbonoModal implements OnChanges {
    private servicioCompra = inject(CompraServicio);
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() codigoPagoProveedor: number | null = null;
    @Output() cerrar = new EventEmitter<void>();

    colorSistema = Entorno.ColorSistema;
    logoUrl = Entorno.Logo;
    cargando = signal(false);
    data = signal<any>(null);

    async ngOnChanges(changes: SimpleChanges) {
        if (changes['visible']?.currentValue && this.codigoPagoProveedor) {
            await this.cargar();
        }
    }

    async cargar() {
        this.cargando.set(true);
        this.data.set(null);
        try {
            const res = await this.servicioCompra.obtenerFacturaAbono(this.codigoPagoProveedor!);
            if (res.success) {
                this.data.set(res.data);
            } else {
                this.servicioAlerta.MostrarError(res);
                this.onCerrar();
            }
        } catch (error) {
            this.servicioAlerta.MostrarError(error);
            this.onCerrar();
        } finally {
            this.cargando.set(false);
        }
    }

    imprimir() {
        window.print();
    }

    onCerrar() {
        this.data.set(null);
        this.cerrar.emit();
    }
}
