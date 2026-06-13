import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CocinaServicio } from '../../Servicios/cocina.service';
import { CocinaPedido } from '../../Modelos/cocina.modelo';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { Entorno } from '../../Entorno/Entorno';

@Component({
    selector: 'app-cocina',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './cocina.html',
    styleUrl: './cocina.css'
})
export class Cocina implements OnInit, OnDestroy {
    private servicio = inject(CocinaServicio);
    private servicioAlerta = inject(AlertaServicio);

    colorSistema = Entorno.ColorSistema;

    pedidos = signal<CocinaPedido[]>([]);
    cargando = signal(false);
    // CodigoCocinaPedido que se está atendiendo (para deshabilitar su botón)
    procesando = signal<number | null>(null);

    // Tick de 1s para refrescar los cronómetros
    private tick = signal(0);
    private intervalId: any;
    private tickId: any;

    async ngOnInit() {
        await this.cargar();
        // Refresca el listado cada 10s para captar nuevos pedidos
        this.intervalId = setInterval(() => this.cargar(false), 10000);
        this.tickId = setInterval(() => this.tick.update(v => v + 1), 1000);
    }

    ngOnDestroy() {
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.tickId) clearInterval(this.tickId);
    }

    async cargar(conLoader: boolean = true) {
        if (conLoader) this.cargando.set(true);
        try {
            const res = await this.servicio.listar();
            this.pedidos.set(res.success ? (res.data || []) : []);
        } catch (error: any) {
            // El API responde 404 cuando no hay pedidos pendientes: lista vacía.
            if (error?.response?.status === 404) {
                this.pedidos.set([]);
            } else {
                this.servicioAlerta.MostrarError(error, 'No se pudieron cargar los pedidos de cocina');
                this.pedidos.set([]);
            }
        } finally {
            if (conLoader) this.cargando.set(false);
        }
    }

    // Milisegundos transcurridos desde que entró el pedido a cocina
    private msTranscurridos(p: CocinaPedido): number {
        if (!p.FechaInicio) return 0;
        const ms = Date.now() - new Date(p.FechaInicio).getTime();
        return isNaN(ms) || ms < 0 ? 0 : ms;
    }

    // Cronómetro HH:MM:SS
    tiempo(p: CocinaPedido): string {
        this.tick(); // dependencia para refrescar cada segundo
        const totalSeg = Math.floor(this.msTranscurridos(p) / 1000);
        const h = Math.floor(totalSeg / 3600);
        const m = Math.floor((totalSeg % 3600) / 60);
        const s = totalSeg % 60;
        const dos = (n: number) => n.toString().padStart(2, '0');
        return `${dos(h)}:${dos(m)}:${dos(s)}`;
    }

    // Color del encabezado según la antigüedad: verde < 5 min, naranja 5-15, rojo >= 15
    claseTiempo(p: CocinaPedido): string {
        this.tick();
        const min = this.msTranscurridos(p) / 60000;
        if (min >= 15) return 'cab-rojo';
        if (min >= 5) return 'cab-naranja';
        return 'cab-verde';
    }

    async atender(p: CocinaPedido) {
        if (this.procesando() !== null) return;
        this.procesando.set(p.CodigoCocinaPedido);
        try {
            const res = await this.servicio.entregar(p.CodigoCocinaPedido);
            if (res.success) {
                this.servicioAlerta.MostrarToast('Pedido atendido', 'success');
                await this.cargar(false);
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo marcar el pedido como atendido');
        } finally {
            this.procesando.set(null);
        }
    }
}
