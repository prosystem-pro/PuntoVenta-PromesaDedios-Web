// Modelos de "Historial de cierre de caja" (pantalla nueva — pedido de Walter).
// Reutiliza los resúmenes de la caja abierta (ver caja.modelo.ts) para el detalle.
import { ResumenIngresosCaja, ResumenEgresosCaja, ResumenFormasPagoCaja } from './caja.modelo';

// Fila del listado (imagen #50): un cierre de caja ya realizado.
export interface CierreCajaHistorial {
    CodigoAperturaCaja: number;
    FechaApertura: string;   // "dd/MM/yyyy HH:mm" (o ISO; el front lo muestra tal cual con fechaCorta)
    FechaCierre: string;     // fecha/hora en que se cerró la caja
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

// Desglose de efectivo por vendedor del turno (API: PorVendedor).
// OJO: hoy el API solo manda CodigoUsuario (sin nombre); por eso no se pinta aún.
export interface VendedorCierreHistorial {
    CodigoUsuario: number;
    IngresosEfectivo: string;
    EgresosEfectivo: string;
    TotalEfectivo: string;
}

// Detalle de un cierre (imagen #51) — se abre con la lupa.
export interface DetalleCierreHistorial {
    CodigoAperturaCaja: number;
    NombreUsuario: string;      // Responsable
    NombreCaja: string;         // "Caja 1"
    FechaApertura: string;      // Turno (apertura)
    FechaCierre: string;
    MontoInicial: string;       // monto de apertura
    MontoCierre: number;        // monto final contado al cerrar
    IngresosEfectivo: string;
    EgresosEfectivo: string;
    EsperadoEfectivo: string;   // efectivo esperado = "Disponible en caja"
    DiferenciaReal: string;     // sobrante (+) / faltante (-)
    ResumenFormasPago: ResumenFormasPagoCaja;
    ResumenIngresos: ResumenIngresosCaja;
    ResumenEgresos: ResumenEgresosCaja;
    Denominaciones: DenominacionCierreHistorial[];
    PorVendedor?: VendedorCierreHistorial[];
    Observaciones?: string;     // Observación de la reclasificación (cuando el API la devuelva)
}
