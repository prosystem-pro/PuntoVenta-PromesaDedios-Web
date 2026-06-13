import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mesa } from '../../../Modelos/mesa.modelo';
import { MesaIconoComponent } from '../mesa-icono/mesa-icono';

@Component({
    selector: 'app-mesa-mover-modal',
    standalone: true,
    imports: [CommonModule, MesaIconoComponent],
    templateUrl: './mesa-mover-modal.html',
    styleUrl: './mesa-mover-modal.css'
})
export class MesaMoverModal implements OnChanges {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() procesando = false;
    @Input() mesaOrigen: Mesa | null = null;
    @Input() mesas: Mesa[] = [];

    @Output() alCerrar = new EventEmitter<void>();
    @Output() alMover = new EventEmitter<number>();

    destino = signal<number | null>(null);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.destino.set(null);
        }
    }

    esOrigen(m: Mesa): boolean {
        return !!this.mesaOrigen && m.CodigoMesa === this.mesaOrigen.CodigoMesa;
    }

    estaOcupada(m: Mesa): boolean {
        return (m.Estatus === 2 || m.Estatus === 3) && !this.esOrigen(m);
    }

    disponible(m: Mesa): boolean {
        return m.Estatus === 1;
    }

    estado(m: Mesa): string {
        if (this.esOrigen(m)) return 'Actual';
        if (this.estaOcupada(m)) return 'Ocupado';
        return 'Disponible';
    }

    seleccionar(m: Mesa) {
        if (!this.disponible(m) || this.procesando) return;
        this.destino.set(this.destino() === m.CodigoMesa ? null : m.CodigoMesa);
    }

    confirmar() {
        const destino = this.destino();
        if (this.procesando || destino === null) return;
        this.alMover.emit(destino);
    }

    cerrar() {
        if (this.procesando) return;
        this.alCerrar.emit();
    }
}
