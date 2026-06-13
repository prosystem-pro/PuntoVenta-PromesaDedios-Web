import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entorno } from '../../../Entorno/Entorno';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ComandaProducto {
    CodigoProducto?: number;
    Producto?: string;
    Cantidad: number;
    PrecioUnitario?: number;
    Total: number;
}

export interface Comanda {
    Mesa?: string;
    Fecha?: string;
    Documento?: string;
    Responsable?: string;
    Productos: ComandaProducto[];
    Totales?: { Subtotal?: number; Iva?: number; Total?: number };
}

@Component({
    selector: 'app-comanda-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './comanda-modal.html',
    styleUrl: './comanda-modal.css'
})
export class ComandaModal implements OnChanges {
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() data: Comanda | null = null;
    @Input() colorSistema = Entorno.ColorSistema;
    /** Acción automática al abrir: 'imprimir' dispara la impresión de una */
    @Input() accionAuto: 'imprimir' | 'descargar' | null = null;

    @Output() cerrar = new EventEmitter<void>();

    @ViewChild('ticket') ticket!: ElementRef<HTMLElement>;

    logoUrl = Entorno.Logo;
    generandoPdf = signal(false);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue && this.data && this.accionAuto) {
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
            const anchoMm = 80;
            const altoMm = (canvas.height * anchoMm) / canvas.width;
            const pdf = new jsPDF({ unit: 'mm', format: [anchoMm, altoMm] });
            pdf.addImage(imgData, 'PNG', 0, 0, anchoMm, altoMm);
            const doc = this.data?.Documento || 'comanda';
            pdf.save(`Comanda_${doc}.pdf`);
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
