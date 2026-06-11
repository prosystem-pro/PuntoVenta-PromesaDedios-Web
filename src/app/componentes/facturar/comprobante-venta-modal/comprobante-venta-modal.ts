import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { ComprobanteVenta } from '../../../Modelos/venta.modelo';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-comprobante-venta-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './comprobante-venta-modal.html',
    styleUrl: './comprobante-venta-modal.css'
})
export class ComprobanteVentaModal implements OnChanges {
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() data: ComprobanteVenta | null = null;
    @Input() colorSistema = Entorno.ColorSistema;
    /** Acción automática al abrir el comprobante: 'imprimir' dispara la pantalla de impresión */
    @Input() accionAuto: 'imprimir' | 'descargar' | null = null;

    @Output() cerrar = new EventEmitter<void>();

    @ViewChild('ticket') ticket!: ElementRef<HTMLElement>;

    logoUrl = Entorno.Logo;
    generandoPdf = signal(false);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue && this.data && this.accionAuto) {
            // Espera a que el ticket se renderice antes de imprimir/descargar
            setTimeout(() => {
                if (this.accionAuto === 'imprimir') this.imprimir();
                else if (this.accionAuto === 'descargar') this.descargarPdf();
            }, 300);
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

            // Ancho de ticket 80mm; alto proporcional al contenido
            const anchoMm = 80;
            const altoMm = (canvas.height * anchoMm) / canvas.width;
            const pdf = new jsPDF({ unit: 'mm', format: [anchoMm, altoMm] });
            pdf.addImage(imgData, 'PNG', 0, 0, anchoMm, altoMm);

            const doc = this.data?.DatosComprobante?.Documento || 'comprobante';
            pdf.save(`Comprobante_${doc}.pdf`);
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
