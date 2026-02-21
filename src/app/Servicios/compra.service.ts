import { Injectable, signal } from '@angular/core';
import { Compra, CompraDetalleCompleto } from '../Modelos/compra.modelo';
import { RespuestaAPI } from '../Modelos/producto.modelo';

@Injectable({
    providedIn: 'root'
})
export class CompraServicio {

    private mockupCompras: Compra[] = [
        { CodigoCompra: 1, NombreProveedor: 'Carlos Merida de Leon', FechaCompra: '25/11/2025', Pagos: 1, Pendiente: 0, Vencimiento: '10/12/2025', Estatus: 'Pagado' },
        { CodigoCompra: 2, NombreProveedor: 'Maria de Leon', FechaCompra: '25/11/2025', Pagos: 3, Pendiente: 3000, Vencimiento: '10/12/2025', Estatus: 'Pendiente' },
        { CodigoCompra: 3, NombreProveedor: 'Karla Maria Castro de Soto', FechaCompra: '25/11/2025', Pagos: 4, Pendiente: 5000, Vencimiento: '10/12/2025', Estatus: 'Pendiente' },
        { CodigoCompra: 4, NombreProveedor: 'Erickson Ricardo de Leon Castro', FechaCompra: '25/11/2025', Pagos: 2, Pendiente: 2000, Vencimiento: '10/12/2025', Estatus: 'Pendiente' },
        { CodigoCompra: 5, NombreProveedor: 'Maria Juana Yoxon', FechaCompra: '25/11/2025', Pagos: 3, Pendiente: 1000, Vencimiento: '10/12/2025', Estatus: 'Pendiente' },
        { CodigoCompra: 6, NombreProveedor: 'Isabel Castro Soto', FechaCompra: '25/11/2025', Pagos: 2, Pendiente: 0, Vencimiento: '01/01/2026', Estatus: 'Pagado' },
        { CodigoCompra: 7, NombreProveedor: 'Angel Vicente Mejia Castro', FechaCompra: '25/11/2025', Pagos: 1, Pendiente: 0, Vencimiento: '01/01/2026', Estatus: 'Pagado' },
        { CodigoCompra: 8, NombreProveedor: 'Karla Soto de Leon', FechaCompra: '25/11/2025', Pagos: 4, Pendiente: 0, Vencimiento: '01/01/2026', Estatus: 'Pagado' },
        { CodigoCompra: 9, NombreProveedor: 'Douglas Claveri Castro Soto', FechaCompra: '25/11/2025', Pagos: 5, Pendiente: 3000, Vencimiento: '10/12/2025', Estatus: 'Pendiente' },
        { CodigoCompra: 10, NombreProveedor: 'Maria Sosa', FechaCompra: '25/11/2025', Pagos: 3, Pendiente: 0, Vencimiento: '01/01/2026', Estatus: 'Pagado' },
    ];

    constructor() { }

    async listar(filtros?: any): Promise<RespuestaAPI<Compra[]>> {
        return {
            success: true,
            tipo: 'Éxito',
            message: 'Listado cargado correctamente',
            data: this.mockupCompras
        };
    }

    async obtenerDetalle(id: number): Promise<RespuestaAPI<CompraDetalleCompleto>> {
        return {
            success: true,
            tipo: 'Éxito',
            message: 'Detalle cargado',
            data: {
                Fecha: '01/12/2025',
                NoDocumento: '9872619211',
                Proveedor: 'Carlos de León Estrada',
                Telefono: '3098-2343',
                SaldoPendiente: 3000,
                Pagos: [
                    { FechaPago: '04/12/2025', MedioPago: 'Efectivo', ValorPagado: 500 },
                    { FechaPago: '05/12/2025', MedioPago: 'Transferencia', ValorPagado: 500 },
                    { FechaPago: '06/12/2025', MedioPago: 'Cheque', ValorPagado: 1000 },
                ]
            }
        };
    }

    async guardar(datos: any): Promise<RespuestaAPI<any>> {
        return {
            success: true,
            tipo: 'Éxito',
            message: 'Compra guardada exitosamente',
            data: null
        };
    }
}
