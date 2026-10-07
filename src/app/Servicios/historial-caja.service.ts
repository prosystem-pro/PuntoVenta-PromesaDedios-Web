import { Injectable } from '@angular/core';
// import axiosInstance from './axios.config';
import { RespuestaAPI } from '../Modelos/producto.modelo';
import { CierreCajaHistorial, DetalleCierreHistorial } from '../Modelos/historial-caja.modelo';

/**
 * Historial de cierre de caja (pantalla nueva, pedido de Walter).
 *
 * ⚠️ MOCK: el API todavía NO expone estos endpoints (Roberto los tiene en análisis).
 * Cuando estén listos, se reemplaza el cuerpo de cada método por la llamada axios
 * comentada arriba de cada uno. Las firmas (parámetros/retorno) ya quedan como se
 * espera consumirlas, así el cambio es solo la fuente de datos.
 *
 * Contrato esperado del API:
 *  - Listado:  GET  caja/historial-cierres?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
 *              -> RespuestaAPI<CierreCajaHistorial[]>  (paginado del lado del cliente por ahora)
 *  - Detalle:  GET  caja/detalle-cierre/:CodigoAperturaCaja
 *              -> RespuestaAPI<DetalleCierreHistorial>
 */
@Injectable({ providedIn: 'root' })
export class HistorialCajaServicio {

    constructor() { }

    // GET caja/historial-cierres?fechaInicio=&fechaFin=
    async listar(fechaInicio: string, fechaFin: string): Promise<RespuestaAPI<CierreCajaHistorial[]>> {
        // const res = await axiosInstance.get('caja/historial-cierres', { params: { fechaInicio, fechaFin } });
        // return res.data;
        await this.simularLatencia();
        return { success: true, tipo: 'Éxito', message: 'Historial obtenido (MOCK).', data: this.listadoMock() };
    }

    // GET caja/detalle-cierre/:CodigoAperturaCaja
    async obtenerDetalle(codigoAperturaCaja: number): Promise<RespuestaAPI<DetalleCierreHistorial>> {
        // const res = await axiosInstance.get(`caja/detalle-cierre/${codigoAperturaCaja}`);
        // return res.data;
        await this.simularLatencia();
        return { success: true, tipo: 'Éxito', message: 'Detalle obtenido (MOCK).', data: this.detalleMock(codigoAperturaCaja) };
    }

    // ---------------------------------------------------------------------------
    // Datos de ejemplo (solo para la maqueta). Se borran al cablear el API real.
    // ---------------------------------------------------------------------------
    private simularLatencia(ms = 350): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private listadoMock(): CierreCajaHistorial[] {
        // 20 filas (2 páginas de 10) para ejercitar la paginación como en la maqueta.
        const base: Array<[string, string, number]> = [
            ['01/10/2026 08:00', 'Victor Samines', 10000],
            ['01/10/2026 12:01', 'Roberto Yoxon', 8500],
            ['02/10/2026 08:00', 'Victor Samines', 10000],
            ['02/10/2026 12:30', 'Victor Samines', 9200],
            ['02/10/2026 17:30', 'Victor Samines', 11300],
            ['03/10/2026 08:00', 'Victor Samines', 10000],
            ['03/10/2026 12:20', 'Luis Castro', 7600],
            ['04/10/2026 08:00', 'Victor Samines', 10000],
            ['05/10/2026 08:00', 'Victor Samines', 10000],
            ['05/10/2026 14:10', 'Luis Castro', 9800],
            ['06/10/2026 08:00', 'Victor Samines', 10400],
            ['06/10/2026 13:15', 'Roberto Yoxon', 7900],
            ['07/10/2026 08:00', 'Victor Samines', 10000],
            ['07/10/2026 17:45', 'Luis Castro', 12100],
            ['08/10/2026 08:00', 'Victor Samines', 9600],
            ['08/10/2026 12:50', 'Victor Samines', 8800],
            ['09/10/2026 08:00', 'Luis Castro', 10000],
            ['09/10/2026 16:20', 'Victor Samines', 11500],
            ['10/10/2026 08:00', 'Victor Samines', 10000],
            ['10/10/2026 14:05', 'Roberto Yoxon', 9300],
        ];
        return base.map(([fecha, usuario, cierre], i) => ({
            CodigoAperturaCaja: i + 1,
            FechaApertura: fecha,
            NombreUsuario: usuario,
            MontoInicial: 500,
            TotalIngresos: 17000,
            TotalEgresos: 5500,
            MontoCierre: cierre,
        }));
    }

    private detalleMock(codigo: number): DetalleCierreHistorial {
        return {
            CodigoAperturaCaja: codigo,
            NombreUsuario: 'Luis Castro',
            NombreCaja: 'Caja 1',
            FechaApertura: '01/10/2026 08:00',
            FechaCierre: '01/10/2026 18:00',
            MontoCierre: 4500,
            DisponibleEnCaja: 4500,
            ResumenFormasPago: {
                Efectivo: '5000.00',
                Tarjeta: '500.00',
                Transferencia: '500.00',
                Cheque: '0.00',
                TotalGeneral: '6000.00',
            },
            ResumenIngresos: {
                MontoApertura: '5000.00',
                Ventas: '1500.00',
                Propinas: '1000.00',
                Abonos_Pedidos: '7000.00',
                Compras_Anuladas: '0.00',
                Abonos_Proveedores_Anulados: '0.00',
                Total: '17000.00',
            },
            ResumenEgresos: {
                Compras: '3000.00',
                Pago_Proveedores: '2000.00',
                Ventas_Anuladas: '500.00',
                Abonos_Anulados: '0.00',
                Total: '5500.00',
            },
            Denominaciones: [
                { CodigoDenominacion: 1, Valor: 0.05, Cantidad: 0 },
                { CodigoDenominacion: 2, Valor: 0.10, Cantidad: 0 },
                { CodigoDenominacion: 3, Valor: 0.25, Cantidad: 0 },
                { CodigoDenominacion: 4, Valor: 0.50, Cantidad: 0 },
                { CodigoDenominacion: 5, Valor: 1.00, Cantidad: 0 },
                { CodigoDenominacion: 6, Valor: 5.00, Cantidad: 0 },
                { CodigoDenominacion: 7, Valor: 10.00, Cantidad: 10 },
                { CodigoDenominacion: 8, Valor: 20.00, Cantidad: 5 },
                { CodigoDenominacion: 9, Valor: 50.00, Cantidad: 10 },
                { CodigoDenominacion: 10, Valor: 100.00, Cantidad: 20 },
                { CodigoDenominacion: 11, Valor: 200.00, Cantidad: 9 },
            ],
        };
    }
}
