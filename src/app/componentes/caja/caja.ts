import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Entorno } from '../../Entorno/Entorno';
import { ServicioConfiguracion } from '../../Servicios/configuracion.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { CajaEstadoService } from '../../Servicios/caja-estado.service';
import { CajaAbierta, DesgloseEfectivoItem, DenominacionCaja, MovimientoCaja } from '../../Modelos/caja.modelo';

// Fila de la herramienta de conteo: una denominación con su cantidad ingresada.
interface FilaDenominacion {
    CodigoDenominacion: number;
    Valor: number;
    Cantidad: number | null;
}

@Component({
    selector: 'app-caja',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './caja.html',
    styleUrl: './caja.css'
})
export class Caja implements OnInit {
    private servicioConfig = inject(ServicioConfiguracion);
    private servicioAlerta = inject(AlertaServicio);
    private cajaEstado = inject(CajaEstadoService);

    colorSistema = Entorno.ColorSistema;
    logo = Entorno.Logo;

    // 'cargando' | 'cerrado' (muestra apertura) | 'abierto' (muestra resumen)
    estado = signal<'cargando' | 'cerrado' | 'abierto'>('cargando');

    // Datos de cabecera
    nombreUsuario = signal<string>('');
    turno = signal<string>('');

    // Caja a aperturar
    codigoCaja = signal<number | null>(null);
    nombreCaja = signal<string>('');

    // Caja abierta (cuando estado === 'abierto')
    cajaAbierta = signal<CajaAbierta | null>(null);

    // Formulario de apertura
    montoInicial = signal<number | null>(null);
    denominaciones = signal<FilaDenominacion[]>([]);
    abriendo = signal(false);

    // Suma de la herramienta de conteo (cantidad x valor de cada denominación).
    totalDenominaciones = computed(() =>
        this.denominaciones().reduce((acc, d) => acc + (Number(d.Cantidad) || 0) * d.Valor, 0)
    );

    // ----- Estado 'abierto': Movimientos de caja (maqueta, pendiente de endpoint) -----
    movimientos = signal<MovimientoCaja[]>([]);
    busqueda = signal('');
    ordenCampo = signal<keyof MovimientoCaja | ''>('');
    ordenAsc = signal(true);
    paginaActual = signal(1);
    readonly itemsPorPagina = 10;

    private metodosPago: Record<number, string> = {
        1: 'Efectivo', 2: 'Tarjeta', 3: 'Transferencia', 4: 'Cheque'
    };
    nombreMetodo(valor: number): string {
        return this.metodosPago[valor] || '—';
    }

    // Filtra por el texto de búsqueda (documento, tipo, método, nombre, monto).
    movimientosFiltrados = computed(() => {
        const texto = this.busqueda().trim().toLowerCase();
        let lista = this.movimientos();
        if (texto) {
            lista = lista.filter(m =>
                m.Documento.toLowerCase().includes(texto) ||
                m.TipoOperacion.toLowerCase().includes(texto) ||
                this.nombreMetodo(m.MetodoPago).toLowerCase().includes(texto) ||
                m.Nombre.toLowerCase().includes(texto) ||
                String(m.Monto).includes(texto)
            );
        }
        const campo = this.ordenCampo();
        if (campo) {
            const dir = this.ordenAsc() ? 1 : -1;
            lista = [...lista].sort((a, b) => {
                const va = a[campo] as any;
                const vb = b[campo] as any;
                if (va < vb) return -1 * dir;
                if (va > vb) return 1 * dir;
                return 0;
            });
        }
        return lista;
    });

    totalPaginas = computed(() =>
        Math.max(1, Math.ceil(this.movimientosFiltrados().length / this.itemsPorPagina))
    );

    movimientosPagina = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        return this.movimientosFiltrados().slice(inicio, inicio + this.itemsPorPagina);
    });

    ordenarPor(campo: keyof MovimientoCaja) {
        if (this.ordenCampo() === campo) {
            this.ordenAsc.update(v => !v);
        } else {
            this.ordenCampo.set(campo);
            this.ordenAsc.set(true);
        }
        this.paginaActual.set(1);
    }

    actualizarBusqueda(valor: string) {
        this.busqueda.set(valor);
        this.paginaActual.set(1);
    }

    irPagina(p: number) {
        if (p < 1 || p > this.totalPaginas()) return;
        this.paginaActual.set(p);
    }

    async ngOnInit() {
        await this.cargarEstado();
    }

    private async cargarEstado() {
        this.estado.set('cargando');
        try {
            const res = await this.servicioConfig.obtenerCajaActual();
            if (res.success && res.data) {
                this.nombreUsuario.set(res.data.NombreUsuario ?? '');
                if (res.data.CajaAbierta) {
                    this.cajaAbierta.set(res.data.CajaAbierta);
                    this.nombreCaja.set(this.etiquetaCaja(res.data.CajaAbierta.NumeroCaja, res.data.CajaAbierta.DescripcionCaja));
                    this.turno.set(res.data.CajaAbierta.FechaApertura ?? '');
                    this.estado.set('abierto');
                    return;
                }
            }
            // No hay caja abierta → cargar datos para el formulario de apertura.
            await this.cargarDatosApertura();
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo obtener el estado de la caja');
            this.estado.set('cerrado');
        }
    }

    private async cargarDatosApertura() {
        try {
            const res = await this.servicioConfig.obtenerDatosInicialesCaja();
            if (res.success && res.data) {
                const d = res.data;
                this.nombreUsuario.set(d.NombreUsuario ?? this.nombreUsuario());
                this.codigoCaja.set(d.Caja?.CodigoCaja ?? null);
                this.nombreCaja.set(this.etiquetaCaja(d.Caja?.NumeroCaja, d.Caja?.Descripcion));
                this.turno.set(d.Turno ?? '');
                this.denominaciones.set(
                    (d.Denominaciones || []).map((de: DenominacionCaja) => ({
                        CodigoDenominacion: de.CodigoDenominacion,
                        Valor: Number(de.Valor),
                        Cantidad: null
                    }))
                );
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudieron cargar los datos de apertura');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudieron cargar los datos de apertura');
        } finally {
            this.estado.set('cerrado');
        }
    }

    private etiquetaCaja(numero: number | string | null | undefined, descripcion: string | null | undefined): string {
        if (descripcion) return descripcion;
        if (numero !== null && numero !== undefined && numero !== '') return `Caja ${numero}`;
        return 'Caja';
    }

    // Bloquea signos y notación científica en los inputs numéricos.
    bloquearTeclasInvalidas(event: KeyboardEvent) {
        if (['-', '+', 'e', 'E'].includes(event.key)) {
            event.preventDefault();
        }
    }

    actualizarCantidad(codigo: number, valor: number | null) {
        this.denominaciones.update(lista =>
            lista.map(d => d.CodigoDenominacion === codigo ? { ...d, Cantidad: valor } : d)
        );
    }

    private montoInicialValido(): boolean {
        const monto = this.montoInicial();
        if (monto === null || monto === undefined || isNaN(Number(monto))) {
            this.servicioAlerta.MostrarAlerta('El monto inicial es obligatorio.');
            return false;
        }
        if (Number(monto) < 0) {
            this.servicioAlerta.MostrarAlerta('El monto inicial debe ser un valor positivo.');
            return false;
        }
        if (Math.round(Number(monto) * 100) / 100 !== Number(monto)) {
            this.servicioAlerta.MostrarAlerta('El monto inicial permite máximo 2 decimales.');
            return false;
        }
        return true;
    }

    async aperturarCaja() {
        if (this.abriendo()) return;
        if (!this.montoInicialValido()) return;

        const codigoCaja = this.codigoCaja();
        if (!codigoCaja) {
            this.servicioAlerta.MostrarAlerta('No hay una caja configurada para aperturar.');
            return;
        }

        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Desea aperturar la caja?',
            `Se abrirá ${this.nombreCaja()} con un monto inicial de Q ${Number(this.montoInicial()).toFixed(2)}.`,
            'Aperturar'
        );
        if (!confirmado) return;

        // Solo se envían las denominaciones con cantidad ingresada (> 0).
        const desglose: DesgloseEfectivoItem[] = this.denominaciones()
            .filter(d => Number(d.Cantidad) > 0)
            .map(d => ({ CodigoDenominacion: d.CodigoDenominacion, Cantidad: Number(d.Cantidad) }));

        this.abriendo.set(true);
        try {
            const res = await this.servicioConfig.abrirCaja({
                CodigoCaja: codigoCaja,
                MontoInicial: Number(this.montoInicial()),
                DesgloseEfectivo: desglose
            });
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Caja abierta correctamente.');
                this.montoInicial.set(null);
                await this.cargarEstado();
                // Refresca la cabecera global (navbar) con el nuevo estado de caja.
                await this.cajaEstado.cargar();
            } else {
                this.servicioAlerta.MostrarError(res.message, 'No se pudo aperturar la caja');
            }
        } catch (error: any) {
            this.servicioAlerta.MostrarError(error, 'No se pudo aperturar la caja');
        } finally {
            this.abriendo.set(false);
        }
    }
}
