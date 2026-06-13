import { Component, OnInit, signal, inject, OnDestroy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Mesa } from '../../../Modelos/mesa.modelo';
import { ClasificacionMesa } from '../../../Modelos/clasificacion-mesa.modelo';
import { Cliente } from '../../../Modelos/cliente.modelo';
import { FacturarMesaRequest, ComprobanteVenta } from '../../../Modelos/venta.modelo';
import { MesaServicio } from '../../../Servicios/mesa.service';
import { VentaServicio } from '../../../Servicios/venta.service';
import { ServicioConfiguracion } from '../../../Servicios/configuracion.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { Entorno } from '../../../Entorno/Entorno';
import { MesaIconoComponent } from '../mesa-icono/mesa-icono';
import { ClienteFacturaModal } from '../../facturar/cliente-factura-modal/cliente-factura-modal';
import { MesaCobroModal, ResultadoCobro } from '../mesa-cobro-modal/mesa-cobro-modal';
import { MesaCombinarModal } from '../mesa-combinar-modal/mesa-combinar-modal';
import { MesaMoverModal } from '../mesa-mover-modal/mesa-mover-modal';
import { ComprobanteVentaModal } from '../../facturar/comprobante-venta-modal/comprobante-venta-modal';
import { ComandaModal, Comanda } from '../comanda-modal/comanda-modal';

@Component({
    selector: 'app-mesa-listado',
    standalone: true,
    imports: [CommonModule, RouterModule, MesaIconoComponent, ClienteFacturaModal, MesaCobroModal, MesaCombinarModal, MesaMoverModal, ComprobanteVentaModal, ComandaModal],
    templateUrl: './mesa-listado.html',
    styleUrl: './mesa-listado.css'
})
export class MesaListado implements OnInit, OnDestroy {
    private servicioMesa = inject(MesaServicio);
    private servicioVenta = inject(VentaServicio);
    private servicioConfig = inject(ServicioConfiguracion);
    private servicioAlerta = inject(AlertaServicio);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);

    colorSistema = Entorno.ColorSistema;

    mesas = signal<Mesa[]>([]);
    clasificaciones = signal<ClasificacionMesa[]>([]);
    filtroClasificacion = signal<number | null>(null);
    cargando = signal(false);

    // Acciones de tarjeta ocupada
    mesaAccion = signal<Mesa | null>(null);
    mostrarCliente = signal(false);
    mostrarPago = signal(false);
    mostrarComprobante = signal(false);
    comprobante = signal<ComprobanteVenta | null>(null);
    accionComprobante = signal<'imprimir' | 'descargar' | null>(null);
    procesando = signal(false);
    mostrarCombinar = signal(false);
    mostrarMover = signal(false);
    mostrarComanda = signal(false);
    comandaData = signal<Comanda | null>(null);

    // Tick de 1s para refrescar el cronometro de las tarjetas ocupadas
    private tick = signal(0);

    private intervalId: any;
    private tickId: any;

    constructor() { }

    async ngOnInit() {
        await this.cargarCatalogos();
        await this.cargarMesas();

        // Intervalo de actualizacion (cada 10 segundos para estados y totales)
        this.intervalId = setInterval(() => {
            this.cargarMesas(false);
        }, 10000);

        // Tick de 1 segundo para el cronometro de las tarjetas
        this.tickId = setInterval(() => {
            this.tick.update(v => v + 1);
        }, 1000);
    }

    ngOnDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        if (this.tickId) {
            clearInterval(this.tickId);
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

    // ---- Accesores de estado (la respuesta del API trae Estatus + Venta anidada) ----
    // El API solo deja la mesa en 1 (libre) o 2 (ocupada). Las combinadas tambien son 2.
    estaOcupada(mesa: Mesa): boolean {
        return mesa.Estatus === 2;
    }

    // Tarjeta ocupada con venta: muestra acciones y total
    tieneVentaPropia(mesa: Mesa): boolean {
        return mesa.Estatus === 2;
    }

    totalMesa(mesa: Mesa): number {
        return mesa.Venta?.Total ?? 0;
    }

    // Cronometro: tiempo transcurrido desde la apertura del pedido (HH:MM:SS)
    tiempoMesa(mesa: Mesa): string {
        this.tick(); // dependencia para refrescar cada segundo
        const inicio = mesa.Venta?.FechaApertura;
        if (!inicio) return '00:00:00';
        const ms = Date.now() - new Date(inicio).getTime();
        if (isNaN(ms) || ms < 0) return '00:00:00';
        const totalSeg = Math.floor(ms / 1000);
        const h = Math.floor(totalSeg / 3600);
        const m = Math.floor((totalSeg % 3600) / 60);
        const s = totalSeg % 60;
        const dos = (n: number) => n.toString().padStart(2, '0');
        return `${dos(h)}:${dos(m)}:${dos(s)}`;
    }

    clienteMesa(mesa: Mesa): string | null {
        return mesa.Venta?.Cliente?.NombreCliente ?? null;
    }

    // El API puede devolver un nombre suelto (ej. "Mesa.png") que no es accesible.
    // Solo usamos la imagen si es una URL absoluta; si no, se pinta el icono generico.
    iconoUrlValido(mesa: Mesa): boolean {
        const url = mesa.ImagenUrl || '';
        return /^https?:\/\//i.test(url);
    }

    // Navegacion: abrir mesa libre o gestionar la venta de una ocupada
    irAVenta(mesa: Mesa) {
        this.router.navigate(['/ventas/mesa', mesa.CodigoMesa]);
    }

    // ---- Eliminar pedido ----
    async eliminarPedido(mesa: Mesa) {
        if (!this.estaOcupada(mesa)) return;

        const confirmar = await this.servicioAlerta.Confirmacion(
            `Eliminar pedido`,
            `¿Desea eliminar el pedido de la ${mesa.NombreMesa}?`
        );
        if (!confirmar) return;

        const res = await this.servicioMesa.eliminarPedido(mesa.CodigoMesa);
        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message);
            this.cargarMesas();
        } else {
            this.servicioAlerta.MostrarError(res.message);
        }
    }

    // ---- Agregar cliente ----
    abrirAgregarCliente(mesa: Mesa) {
        this.mesaAccion.set(mesa);
        this.mostrarCliente.set(true);
    }

    cerrarCliente() {
        this.mostrarCliente.set(false);
    }

    async clienteConfirmado(datos: { cliente: Cliente | null }) {
        const mesa = this.mesaAccion();
        if (!mesa || !datos.cliente?.CodigoCliente) return;

        const res = await this.servicioMesa.agregarCliente({
            CodigoMesa: mesa.CodigoMesa,
            CodigoCliente: datos.cliente.CodigoCliente,
            Nota: ''
        });
        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message);
            this.mostrarCliente.set(false);
            this.cargarMesas(false);
        } else {
            this.servicioAlerta.MostrarError(res.message);
        }
    }

    // ---- Cobrar / Facturar desde la tarjeta ----
    abrirCobro(mesa: Mesa) {
        if (this.totalMesa(mesa) <= 0) {
            this.servicioAlerta.MostrarAlerta('La mesa no tiene consumo para cobrar');
            return;
        }
        this.mesaAccion.set(mesa);
        this.mostrarPago.set(true);
    }

    cerrarCobro() {
        if (this.procesando()) return;
        this.mostrarPago.set(false);
    }

    async procesarCobro(resultado: ResultadoCobro) {
        const mesa = this.mesaAccion();
        if (this.procesando() || !mesa || !resultado.pago) return;

        this.procesando.set(true);
        try {
            const request: FacturarMesaRequest = {
                CodigoMesa: mesa.CodigoMesa,
                Propina: resultado.propina,
                Pagos: [resultado.pago]
            };

            const res = await this.servicioVenta.facturarMesa(request);
            if (res.success) {
                this.mostrarPago.set(false);
                this.comprobante.set(res.data as ComprobanteVenta);
                this.accionComprobante.set(resultado.accion);
                this.mostrarComprobante.set(true);
                this.cargarMesas(false);
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        } finally {
            this.procesando.set(false);
        }
    }

    cerrarComprobante() {
        this.mostrarComprobante.set(false);
        this.comprobante.set(null);
        this.accionComprobante.set(null);
    }

    montoCobro(): number {
        return this.totalMesa(this.mesaAccion() ?? ({} as Mesa));
    }

    // ---- Imprimir comanda (mismo ticket que los comprobantes) ----
    async imprimirComanda(mesa: Mesa) {
        let data: Comanda | null = null;
        try {
            const res = await this.servicioMesa.obtenerComanda(mesa.CodigoMesa);
            if (res.success) data = res.data as Comanda;
        } catch {
            data = null;
        }
        if (!data) {
            this.servicioAlerta.MostrarAlerta('La mesa no tiene comanda para imprimir');
            return;
        }
        this.comandaData.set(data);
        this.mostrarComanda.set(true);
    }

    cerrarComanda() {
        this.mostrarComanda.set(false);
        this.comandaData.set(null);
    }

    // ---- Combinar mesas ----
    // Nota: el endpoint del API tiene un bug de Estatus (usa 1 en vez de 2). El modal y la
    // integracion ya estan listos; funcionara cuando el dev corrija el API.
    abrirCombinar(mesa: Mesa) {
        this.mesaAccion.set(mesa);
        this.mostrarCombinar.set(true);
    }

    cerrarCombinar() {
        if (this.procesando()) return;
        this.mostrarCombinar.set(false);
    }

    async combinarConfirmado(ids: number[]) {
        const mesa = this.mesaAccion();
        if (this.procesando() || !mesa || ids.length === 0) return;

        this.procesando.set(true);
        try {
            const res = await this.servicioMesa.combinarMesas({ CodigoMesaOrigen: mesa.CodigoMesa, MesasAgregar: ids });
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.mostrarCombinar.set(false);
                this.cargarMesas(false);
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError(error, 'No se pudieron combinar las mesas');
        } finally {
            this.procesando.set(false);
        }
    }

    // ---- Mover pedido ----
    abrirMover(mesa: Mesa) {
        this.mesaAccion.set(mesa);
        this.mostrarMover.set(true);
    }

    cerrarMover() {
        if (this.procesando()) return;
        this.mostrarMover.set(false);
    }

    async moverConfirmado(destino: number) {
        const mesa = this.mesaAccion();
        if (this.procesando() || !mesa) return;

        this.procesando.set(true);
        try {
            const res = await this.servicioMesa.moverPedido({ CodigoMesaOrigen: mesa.CodigoMesa, CodigoMesaDestino: destino });
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message);
                this.mostrarMover.set(false);
                this.cargarMesas(false);
            } else {
                this.servicioAlerta.MostrarError(res.message);
            }
        } catch (error) {
            this.servicioAlerta.MostrarError(error, 'No se pudo mover el pedido');
        } finally {
            this.procesando.set(false);
        }
    }
}
