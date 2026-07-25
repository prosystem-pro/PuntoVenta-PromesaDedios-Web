import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { CompraServicio } from '../../../Servicios/compra.service';
import { FacturaCompra } from '../../../Modelos/compra.modelo';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Comprobante/factura de una compra. Carga por CodigoCompra y permite imprimir/descargar.
@Component({
    selector: 'app-factura-compra-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './factura-compra-modal.html',
    styleUrl: './factura-compra-modal.css'
})
export class FacturaCompraModal implements OnChanges {
    private servicioCompra = inject(CompraServicio);
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() codigoCompra: number | null = null;
    @Input() colorSistema = Entorno.ColorSistema;

    @Output() cerrar = new EventEmitter<void>();

    @ViewChild('ticket') ticket!: ElementRef<HTMLElement>;

    logoUrl = Entorno.Logo;
    data = signal<FacturaCompra | null>(null);
    cargando = signal(false);
    generandoPdf = signal(false);

    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (changes['visible']?.currentValue && this.codigoCompra) {
            this.data.set(null);
            await this.cargar();
        }
    }

    private async cargar() {
        if (!this.codigoCompra) return;
        this.cargando.set(true);
        try {
            const res = await this.servicioCompra.obtenerFactura(this.codigoCompra);
            if (res.success && res.data) {
                this.data.set(res.data);
            } else {
                this.servicioAlerta.MostrarError(res, 'No se pudo obtener la factura de la compra');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo obtener la factura de la compra');
        } finally {
            this.cargando.set(false);
        }
    }

    imprimir() {
        window.print();
    }

    async descargarPdf() {
        if (!this.ticket) return;
        this.generandoPdf.set(true);
        try {
            const canvas = await html2canvas(this.ticket.nativeElement, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            const anchoMm = 80;
            const altoMm = (canvas.height * anchoMm) / canvas.width;
            const pdf = new jsPDF({ unit: 'mm', format: [anchoMm, altoMm] });
            pdf.addImage(imgData, 'PNG', 0, 0, anchoMm, altoMm);
            const doc = this.data()?.DatosComprobante?.Documento || 'compra';
            pdf.save(`FacturaCompra_${doc}.pdf`);
        } catch (error) {
            this.servicioAlerta.MostrarError(error, 'No se pudo generar el PDF');
        } finally {
            this.generandoPdf.set(false);
        }
    }

    onCerrar() {
        this.cerrar.emit();
    }
}
