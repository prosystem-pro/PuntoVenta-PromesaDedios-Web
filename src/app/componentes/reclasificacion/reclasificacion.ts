import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Entorno } from '../../Entorno/Entorno';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { ServicioConfiguracion } from '../../Servicios/configuracion.service';
import { CajaEstadoService } from '../../Servicios/caja-estado.service';
import { ReclasificacionServicio } from '../../Servicios/reclasificacion.service';
import { DatosReclasificacion, GuardarReclasificacionPayload } from '../../Modelos/reclasificacion.modelo';

type ClaveMetodo = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Cheque';

interface FilaReclas {
    clave: ClaveMetodo;
    label: string;
    icono: string;
    sistema: number;    // lo que el sistema tiene por método (columna "Venta")
    declarado: number;  // lo que el usuario declara (columna "Monto final", editable)
}

@Component({
    selector: 'app-reclasificacion',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './reclasificacion.html',
    styleUrl: './reclasificacion.css'
})
export class Reclasificacion implements OnInit {
    private servicio = inject(ReclasificacionServicio);
    private servicioConfig = inject(ServicioConfiguracion);
    private cajaEstado = inject(CajaEstadoService);
    private servicioAlerta = inject(AlertaServicio);
    private router = inject(Router);

    colorSistema = Entorno.ColorSistema;

    estado = signal<'cargando' | 'listo' | 'sin-turno' | 'error'>('cargando');
    guardando = signal(false);

    codigoApertura = signal<number | null>(null);
    codigoCaja = signal<number | null>(null);
    observaciones = signal('');

    private metodos: { clave: ClaveMetodo; label: string; icono: string }[] = [
        { clave: 'Efectivo', label: 'Efectivo', icono: 'bi-cash-coin' },
        { clave: 'Tarjeta', label: 'Tarjeta', icono: 'bi-credit-card' },
        { clave: 'Transferencia', label: 'Transferencia', icono: 'bi-arrow-left-right' },
        { clave: 'Cheque', label: 'Cheque', icono: 'bi-file-earmark-text' },
    ];

    filas = signal<FilaReclas[]>([]);

    // Totales del panel "Resumen del turno".
    totalSistema = computed(() => this.filas().reduce((a, f) => a + f.sistema, 0));
    totalFinal = computed(() => this.filas().reduce((a, f) => a + f.declarado, 0));
    totalDiferencia = computed(() => this.totalFinal() - this.totalSistema());

    diferencia(fila: FilaReclas): number {
        return fila.declarado - fila.sistema;
    }

    async ngOnInit() {
        await this.cargar();
    }

    async recargar() {
        await this.cargar();
    }

    private async cargar() {
        this.estado.set('cargando');
        try {
            // El turno vigente sale de datos-iniciales (no hay param de ruta todavía).
            const inicial = await this.servicioConfig.obtenerDatosInicialesCaja();
            if (!inicial.success || !inicial.data?.tieneCajaAbierta || !inicial.data.Apertura?.CodigoAperturaCaja) {
                this.estado.set('sin-turno');
                return;
            }
            const codigo = inicial.data.Apertura.CodigoAperturaCaja;
            this.codigoApertura.set(codigo);

            const res = await this.servicio.obtenerDatos(codigo);
            if (!res.success || !res.data) {
                this.servicioAlerta.MostrarError(res.message, 'No se pudieron cargar los datos de reclasificación');
                this.estado.set('error');
                return;
            }
            this.aplicarDatos(res.data);
            this.estado.set('listo');
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudieron cargar los datos de reclasificación');
            this.estado.set('error');
        }
    }

    private aplicarDatos(d: DatosReclasificacion) {
        this.codigoCaja.set(d.CodigoCaja ?? null);
        this.filas.set(this.metodos.map(m => ({
            clave: m.clave,
            label: m.label,
            icono: m.icono,
            sistema: Number(d.Sistema?.[m.clave] ?? 0),
            // Declarado viene pre-cargado = Sistema; es lo editable (Monto final).
            declarado: Number(d.Declarado?.[m.clave] ?? d.Sistema?.[m.clave] ?? 0),
        })));
    }

    // Edición del "Monto final" (Declarado) de una fila; la Diferencia se recalcula sola.
    actualizarDeclarado(clave: ClaveMetodo, valor: any) {
        const n = this.sanitizar(valor);
        this.filas.update(fs => fs.map(f => f.clave === clave ? { ...f, declarado: n } : f));
    }

    private sanitizar(valor: any): number {
        if (valor === null || valor === undefined || valor === '' || isNaN(Number(valor))) return 0;
        const n = Number(valor);
        if (n < 0) return 0;
        return Math.trunc(n * 100) / 100;
    }

    bloquearTeclasInvalidas(event: KeyboardEvent) {
        if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault();
    }

    async guardar() {
        if (this.guardando()) return;
        const codigo = this.codigoApertura();
        if (!codigo) return;

        const hayDiferencia = Math.abs(this.totalDiferencia()) > 0.001;
        const mensaje = hayDiferencia
            ? `El total declarado (Q ${this.totalFinal().toFixed(2)}) no coincide con el del sistema (Q ${this.totalSistema().toFixed(2)}). ¿Guardar de todas formas?`
            : '¿Guardar la reclasificación del turno?';
        const confirmado = await this.servicioAlerta.Confirmacion('Guardar reclasificación', mensaje, 'Guardar');
        if (!confirmado) return;

        const buscar = (c: ClaveMetodo) => this.filas().find(f => f.clave === c)?.declarado ?? 0;
        const payload: GuardarReclasificacionPayload = {
            CodigoAperturaCaja: codigo,
            TotalEfectivoDeclarado: buscar('Efectivo'),
            TotalTarjetaDeclarado: buscar('Tarjeta'),
            TotalTransferenciaDeclarado: buscar('Transferencia'),
            TotalChequeDeclarado: buscar('Cheque'),
            Observaciones: this.observaciones().trim(),
        };

        this.guardando.set(true);
        try {
            const res = await this.servicio.guardar(payload);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Reclasificación guardada');
                // Guardar completa el cierre: refrescar el estado de caja del navbar.
                await this.cajaEstado.cargar();
                this.router.navigate(['/caja']);
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo guardar la reclasificación');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo guardar la reclasificación');
        } finally {
            this.guardando.set(false);
        }
    }

    cancelar() {
        this.router.navigate(['/caja']);
    }
}
