import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { buscarMesaIcono } from '../mesa-iconos';

@Component({
    selector: 'app-mesa-icono',
    standalone: true,
    imports: [CommonModule],
    template: `
@if (bi) {
<i class="bi" [ngClass]="bi"></i>
} @else {
<svg viewBox="0 0 110 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 16 V60" />
        <path d="M16 42 H34" />
        <path d="M34 42 V60" />
        <path d="M42 32 H68" />
        <path d="M46 32 V60" />
        <path d="M64 32 V60" />
        <path d="M94 16 V60" />
        <path d="M76 42 H94" />
        <path d="M76 42 V60" />
    </g>
</svg>
}
`,
    styles: [`
        :host { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
        i { font-size: 1em; }
        svg { width: 1.2em; height: 1.2em; display: block; }
    `]
})
export class MesaIconoComponent {
    // id del icono guardado en IconoUrl/ImagenUrl. Si no se reconoce, se pinta el SVG de mesa.
    @Input() iconoId: string | null | undefined = 'mesa';

    get bi(): string | null {
        return buscarMesaIcono(this.iconoId).bi;
    }
}
