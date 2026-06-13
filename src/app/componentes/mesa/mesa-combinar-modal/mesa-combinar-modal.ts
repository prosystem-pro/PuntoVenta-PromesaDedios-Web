import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mesa } from '../../../Modelos/mesa.modelo';
import { MesaIconoComponent } from '../mesa-icono/mesa-icono';

@Component({
    selector: 'app-mesa-combinar-modal',
    standalone: true,
    imports: [CommonModule, MesaIconoComponent],
    templateUrl: './mesa-combinar-modal.html',
    styleUrl: './mesa-combinar-modal.css'
})
export class MesaCombinarModal implements OnChanges {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() procesando = false;
    @Input() mesaOrigen: Mesa | null = null;
    @Input() mesas: Mesa[] = [];

    @Output() alCerrar = new EventEmitter<void>();
    @Output() alCombinar = new EventEmitter<number[]>();

    seleccionadas = signal<number[]>([]);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.seleccionadas.set([]);
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

    estaSeleccionada(m: Mesa): boolean {
        return this.seleccionadas().includes(m.CodigoMesa);
    }

    estado(m: Mesa): string {
        if (this.esOrigen(m)) return 'Actual';
        if (this.estaOcupada(m)) return 'Ocupado';
        return 'Disponible';
    }

    toggle(m: Mesa) {
        if (!this.disponible(m) || this.procesando) return;
        this.seleccionadas.update(arr =>
            arr.includes(m.CodigoMesa) ? arr.filter(id => id !== m.CodigoMesa) : [...arr, m.CodigoMesa]
        );
    }

    confirmar() {
        if (this.procesando || this.seleccionadas().length === 0) return;
        this.alCombinar.emit(this.seleccionadas());
    }

    cerrar() {
        if (this.procesando) return;
        this.alCerrar.emit();
    }
}
