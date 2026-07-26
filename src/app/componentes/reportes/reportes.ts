import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Entorno } from '../../Entorno/Entorno';
import { AlertaServicio } from '../../Servicios/alerta.service';
import { ReporteServicio } from '../../Servicios/reporte.service';
import { ConsolidadoReporte, TipoReporte, RankingEntidad } from '../../Modelos/reporte.modelo';

@Component({
    selector: 'app-reportes',
    standalone: true,
    imports: [CommonModule, FormsModule, BaseChartDirective],
    templateUrl: './reportes.html',
    styleUrl: './reportes.css'
})
export class Reportes implements OnInit {
    private servicio = inject(ReporteServicio);
    private servicioAlerta = inject(AlertaServicio);

    colorSistema = Entorno.ColorSistema;

    // --- Filtros ---
    tipo = signal<TipoReporte>('VENTA');
    anio = signal<number>(new Date().getFullYear());
    mes = signal<number>(new Date().getMonth() + 1);

    cargando = signal(false);
    data = signal<ConsolidadoReporte | null>(null);

    // Opciones de los selectores
    anios: number[] = (() => {
        const actual = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => actual - i);
    })();
    meses = [
        { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' }, { valor: 3, nombre: 'Marzo' },
        { valor: 4, nombre: 'Abril' }, { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
        { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' }, { valor: 9, nombre: 'Septiembre' },
        { valor: 10, nombre: 'Octubre' }, { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' }
    ];
    private nombresMes = this.meses.map(m => m.nombre);

    tipos: { valor: TipoReporte; etiqueta: string }[] = [
        { valor: 'VENTA', etiqueta: 'Estadística de ventas' },
        { valor: 'COMPRA', etiqueta: 'Estadística de compras' },
        { valor: 'PEDIDO', etiqueta: 'Estadística de pedidos' }
    ];

    // --- Etiquetas dependientes del tipo ---
    tituloTipo = computed(() => {
        switch (this.tipo()) {
            case 'COMPRA': return 'Estadísticas de compras';
            case 'PEDIDO': return 'Estadísticas de pedidos';
            default: return 'Estadísticas de ventas';
        }
    });
    palabraTotal = computed(() => {
        switch (this.tipo()) {
            case 'COMPRA': return 'Total de compras';
            case 'PEDIDO': return 'Total de pedidos';
            default: return 'Total de ventas';
        }
    });
    tituloMensual = computed(() => {
        switch (this.tipo()) {
            case 'COMPRA': return 'Compras mensuales';
            case 'PEDIDO': return 'Pedidos mensuales';
            default: return 'Ventas mensuales';
        }
    });
    tituloAnual = computed(() => {
        switch (this.tipo()) {
            case 'COMPRA': return 'Compras anuales';
            case 'PEDIDO': return 'Pedidos anuales';
            default: return 'Ventas anuales';
        }
    });
    // En COMPRA el ranking es de proveedores; en VENTA/PEDIDO de clientes.
    tituloRankingEntidad = computed(() => this.tipo() === 'COMPRA' ? 'Ranking de proveedores' : 'Ranking de clientes');
    columnaEntidad = computed(() => this.tipo() === 'COMPRA' ? 'Proveedor' : 'Cliente');

    // --- Tarjetas de métodos de pago ---
    metodos = computed(() => {
        const mp = this.data()?.MetodosPago;
        return [
            { nombre: 'Efectivo', monto: mp?.EFECTIVO ?? 0 },
            { nombre: 'Transferencia', monto: mp?.TRANSFERENCIA ?? 0 },
            { nombre: 'Tarjeta', monto: mp?.TARJETA ?? 0 },
            { nombre: 'Cheque', monto: mp?.CHEQUE ?? 0 }
        ];
    });
    totalGeneral = computed(() => this.data()?.MetodosPago?.TOTAL_GENERAL ?? 0);

    // Mini-gráficas DECORATIVAS de las tarjetas (el API no manda serie por método;
    // en el prototipo son solo estéticas). Un patrón distinto por tarjeta para dar variedad.
    sparklines: number[][] = [
        [6, 7, 4, 8, 3, 9, 5, 7, 6, 8, 4, 7],
        [5, 6, 8, 4, 7, 3, 6, 9, 5, 7, 6, 8],
        [7, 5, 6, 4, 8, 6, 9, 5, 7, 4, 6, 7],
        [4, 6, 5, 8, 6, 9, 4, 7, 5, 8, 6, 5],
        [6, 8, 5, 9, 6, 7, 4, 8, 6, 9, 5, 7]
    ];

    // Convierte una serie de valores en los puntos de un SVG de 100x30 (viewBox).
    puntosSpark(vals: number[]): string {
        const w = 100, h = 30;
        const max = Math.max(...vals), min = Math.min(...vals);
        const rango = (max - min) || 1;
        const paso = w / (vals.length - 1);
        return vals
            .map((v, i) => `${(i * paso).toFixed(1)},${(h - ((v - min) / rango) * h).toFixed(1)}`)
            .join(' ');
    }

    // --- Rankings ---
    rankingTransacciones = computed(() => this.data()?.RankingTransacciones ?? []);
    rankingEntidades = computed(() => this.data()?.RankingClientes ?? []);
    nombreEntidad(r: RankingEntidad): string {
        return r.Cliente ?? r.Proveedor ?? '—';
    }

    // --- Gráficas ---
    dataLinea = signal<ChartData<'line'>>({ labels: [], datasets: [] });
    dataBarra = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

    opcionesLinea: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    };
    opcionesBarra: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    };

    async ngOnInit() {
        await this.cargar();
    }

    // Placeholder: aún no se define a dónde navega "Ir a consultas".
    irAConsultas() {
        this.servicioAlerta.MostrarInfo('Sección pendiente de definir su destino.', 'Ir a consultas');
    }

    async cambiarTipo(valor: TipoReporte) {
        this.tipo.set(valor);
        await this.cargar();
    }

    async cargar() {
        this.cargando.set(true);
        try {
            const res = await this.servicio.obtenerConsolidado(this.tipo(), this.anio(), this.mes());
            if (res.success && res.data) {
                this.data.set(res.data);
                this.construirGraficas(res.data);
            } else {
                this.data.set(null);
                this.limpiarGraficas();
                this.servicioAlerta.MostrarError(res.message, 'No se pudo obtener el reporte');
            }
        } catch (error: any) {
            this.data.set(null);
            this.limpiarGraficas();
            this.servicioAlerta.MostrarError(error, 'No se pudo obtener el reporte');
        } finally {
            this.cargando.set(false);
        }
    }

    // Los bloques mensual/anual cambian de nombre según el tipo: los normalizamos.
    private serieMensual(d: ConsolidadoReporte) {
        return d.VentasMensuales ?? d.PedidosMensuales ?? d.ComprasMensuales ?? [];
    }
    private serieAnual(d: ConsolidadoReporte) {
        return d.VentasAnuales ?? d.PedidosAnuales ?? d.ComprasAnuales ?? [];
    }

    private construirGraficas(d: ConsolidadoReporte) {
        const color = this.colorSistema;

        // Línea: eje continuo de todos los días del mes seleccionado (0 donde no hay dato).
        const diasEnMes = new Date(this.anio(), this.mes(), 0).getDate();
        const mapaDias = new Map(this.serieMensual(d).map(p => [parseInt(p.Dia, 10), p.Transaccion]));
        const labelsDias: string[] = [];
        const dataDias: number[] = [];
        for (let dia = 1; dia <= diasEnMes; dia++) {
            labelsDias.push(String(dia).padStart(2, '0'));
            dataDias.push(mapaDias.get(dia) ?? 0);
        }
        this.dataLinea.set({
            labels: labelsDias,
            datasets: [{
                data: dataDias,
                label: this.tituloMensual(),
                borderColor: color,
                backgroundColor: this.conAlfa(color, 0.15),
                pointBackgroundColor: color,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 2
            }]
        });

        // Barra: los 12 meses del año (0 donde no hay dato).
        const mapaMeses = new Map(this.serieAnual(d).map(p => [parseInt(p.Mes, 10), p.Transacciones]));
        const dataMeses = this.nombresMes.map((_, i) => mapaMeses.get(i + 1) ?? 0);
        this.dataBarra.set({
            labels: this.nombresMes,
            datasets: [{
                data: dataMeses,
                label: this.tituloAnual(),
                backgroundColor: this.conAlfa(color, 0.75),
                hoverBackgroundColor: color,
                borderRadius: 4
            }]
        });
    }

    private limpiarGraficas() {
        this.dataLinea.set({ labels: [], datasets: [] });
        this.dataBarra.set({ labels: [], datasets: [] });
    }

    // Convierte un color #RRGGBB a rgba con la opacidad dada (para relleno/hover).
    private conAlfa(hex: string, alfa: number): string {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!m) return hex;
        const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alfa})`;
    }
}
