// Modelos de "Historial de cierre de caja" (pantalla nueva — pedido de Walter).
// Reutiliza los resúmenes de la caja abierta (ver caja.modelo.ts) para el detalle.
import { ResumenIngresosCaja, ResumenEgresosCaja, ResumenFormasPagoCaja } from './caja.modelo';

// Fila del listado (imagen #50): un cierre de caja ya realizado.
export interface CierreCajaHistorial {
    CodigoAperturaCaja: number;
    FechaApertura: string;   // "dd/MM/yyyy HH:mm" (o ISO; el front lo muestra tal cual con fechaCorta)
    NombreUsuario: string;
    MontoInicial: number;
    TotalIngresos: number;
    TotalEgresos: number;
    MontoCierre: number;     // disponible / monto de cierre
}

// Una denominación contada en el cierre (para el detalle).
export interface DenominacionCierreHistorial {
    CodigoDenominacion: number;
    Valor: number;
    Cantidad: number;
}

// Detalle de un cierre (imagen #51) — se abre con la lupa.
export interface DetalleCierreHistorial {
    CodigoAperturaCaja: number;
    NombreUsuario: string;    // Responsable
    NombreCaja: string;       // "Caja 1"
    FechaApertura: string;    // Turno (apertura)
    FechaCierre: string;
    MontoCierre: number;
    DisponibleEnCaja: number;
    ResumenFormasPago: ResumenFormasPagoCaja;
    ResumenIngresos: ResumenIngresosCaja;
    ResumenEgresos: ResumenEgresosCaja;
    Denominaciones: DenominacionCierreHistorial[];
}
