import { Component, OnInit, signal, inject, computed, OnDestroy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Mesa } from '../../../Modelos/mesa.modelo';
import { ClasificacionMesa } from '../../../Modelos/clasificacion-mesa.modelo';
import { MesaServicio } from '../../../Servicios/mesa.service';
import { ServicioConfiguracion } from '../../../Servicios/configuracion.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';

@Component({
    selector: 'app-mesa-listado',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './mesa-listado.html',
    styleUrl: './mesa-listado.css'
})
export class MesaListado implements OnInit, OnDestroy {
    private servicioMesa = inject(MesaServicio);
    private servicioConfig = inject(ServicioConfiguracion);
    private servicioAlerta = inject(AlertaServicio);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);

    colorSistema = Entorno.ColorSistema;

    mesas = signal<Mesa[]>([]);
    clasificaciones = signal<ClasificacionMesa[]>([]);
    filtroClasificacion = signal<number | null>(null);
    cargando = signal(false);

    private intervalId: any;

    constructor() { }

    async ngOnInit() {
        await this.cargarCatalogos();
        await this.cargarMesas();

        // Intervalo de actualización (cada 10 segundos para estados y timers)
        this.intervalId = setInterval(() => {
            this.cargarMesas(false);
        }, 10000);
    }

    ngOnDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    async cargarCatalogos() {
        const res = await this.servicioConfig.obtenerClasificaciones();
        if (res.success) {
            this.clasificaciones.set(res.data || []);
        }
    }

    async cargarMesas(conLoader: boolean = true) {
        if (conLoader) this.cargando.set(true);
        try {
            const res = await this.servicioMesa.listarEstado(this.filtroClasificacion() || undefined);
            if (res.success) {
                this.mesas.set(res.data || []);
            }
        } finally {
            if (conLoader) this.cargando.set(false);
        }
    }

    filtrar(id: any) {
        const valor = id === 'null' ? null : Number(id);
        this.filtroClasificacion.set(valor);
        this.cargarMesas();
    }

    async eliminarPedido(mesa: Mesa) {
        if (!mesa.Ocupada) return;

        const confirmar = await this.servicioAlerta.Confirmacion(`Eliminar pedido`, `¿Desea eliminar el pedido de la ${mesa.NombreMesa}?`);
        if (confirmar) {
            const res = await this.servicioMesa.eliminarPedido(mesa.CodigoMesa);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.cargarMesas();
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        }
    }

    // Navegación
    irAVenta(mesa: Mesa) {
        this.router.navigate(['/ventas/mesa', mesa.CodigoMesa]);
    }
}
