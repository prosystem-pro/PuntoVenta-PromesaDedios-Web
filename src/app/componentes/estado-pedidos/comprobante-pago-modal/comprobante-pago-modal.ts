import { Component, Input, Output, EventEmitter, signal, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { ImpresionService } from '../../../Servicios/impresion.service';
import { ComprobantePago } from '../../../Modelos/estado-pedido.modelo';
// jspdf y html2canvas se cargan de forma dinamica dentro de descargarPdf()
// para no incluirlos en el bundle inicial (solo se usan al descargar el PDF).

@Component({
    selector: 'app-comprobante-pago-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './comprobante-pago-modal.html',
    styleUrl: './comprobante-pago-modal.css'
})
export class ComprobantePagoModal {
    private servicioAlerta = inject(AlertaServicio);
    private impresion = inject(ImpresionService);

    @Input() visible = false;
    @Input() data: ComprobantePago | null = null;
    @Input() colorSistema = Entorno.ColorSistema;

    @Output() cerrar = new EventEmitter<void>();

    @ViewChild('ticket') ticket!: ElementRef<HTMLElement>;

    logoUrl = Entorno.Logo;
    generandoPdf = signal(false);

    imprimir() {
        if (this.data) {
            this.impresion.imprimirComprobantePago(this.data);
        } else {
            window.print();
        }
    }

    async descargarPdf() {
        if (!this.ticket) return;
        this.generandoPdf.set(true);
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ]);
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

            const doc = this.data?.DatosComprobante?.DocumentoPago || 'comprobante-pago';
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
