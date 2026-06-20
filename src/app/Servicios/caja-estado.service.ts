import { Injectable, inject, signal } from '@angular/core';
import { ServicioConfiguracion } from './configuracion.service';

/**
 * Estado de caja compartido entre el navbar (cabecera global) y la pantalla de Caja.
 * El navbar lo carga al iniciar; la pantalla de Caja lo refresca al aperturar.
 */
@Injectable({ providedIn: 'root' })
export class CajaEstadoService {
    private config = inject(ServicioConfiguracion);

    nombreCaja = signal<string>('Caja');
    abierta = signal<boolean>(false);
    turno = signal<string>('');
    cargado = signal<boolean>(false);

    async cargar(): Promise<void> {
        try {
            const res = await this.config.obtenerCajaActual();
            if (res.success && res.data?.CajaAbierta) {
                const c = res.data.CajaAbierta;
                this.abierta.set(true);
                this.nombreCaja.set(this.etiqueta(c.NumeroCaja, c.DescripcionCaja));
                this.turno.set(c.FechaApertura ?? '');
            } else {
                this.abierta.set(false);
                this.nombreCaja.set('Caja');
                this.turno.set('');
            }
        } catch {
            this.abierta.set(false);
            this.nombreCaja.set('Caja');
            this.turno.set('');
        } finally {
            this.cargado.set(true);
        }
    }

    private etiqueta(numero: number | string | null | undefined, descripcion: string | null | undefined): string {
        if (descripcion) return descripcion;
        if (numero !== null && numero !== undefined && numero !== '') return `Caja ${numero}`;
        return 'Caja';
    }
}
