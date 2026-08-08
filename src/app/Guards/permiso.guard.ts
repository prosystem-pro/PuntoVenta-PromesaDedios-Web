import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ServicioAutenticacion } from '../Servicios/auth.service';

// Orden de preferencia para el "landing": cuando se niega el acceso a una ruta
// (o al entrar a '/'), se manda al usuario a la primera pantalla que sí puede ver.
const RUTAS_POR_RECURSO: { ruta: string; recurso: string }[] = [
    { ruta: '/caja', recurso: 'Caja' },
    { ruta: '/ventas', recurso: 'VentaMesa' },
    { ruta: '/facturar', recurso: 'Facturar' },
    { ruta: '/historial-ventas', recurso: 'HistorialVenta' },
    { ruta: '/pedidos', recurso: 'EstadoPedido' },
    { ruta: '/compras', recurso: 'Compra' },
    { ruta: '/materia-prima', recurso: 'MateriaPrima' },
    { ruta: '/productos', recurso: 'Producto' },
    { ruta: '/produccion', recurso: 'Produccion' },
    { ruta: '/cocina', recurso: 'Cocina' },
    { ruta: '/cliente', recurso: 'Cliente' },
    { ruta: '/proveedor', recurso: 'Proveedor' },
    { ruta: '/reportes', recurso: 'Reporte' },
    { ruta: '/usuario', recurso: 'Administrativo' },
];

// Bloquea el acceso por URL directa a módulos que el rol no tiene. La ruta declara su
// recurso en data: { recurso: 'Compra' }. Sin recurso declarado, deja pasar (solo auth).
export const guardPermiso: CanActivateFn = (route) => {
    const auth = inject(ServicioAutenticacion);
    const router = inject(Router);

    const recurso = route.data?.['recurso'] as string | undefined;
    if (!recurso || auth.tieneAcceso(recurso)) {
        return true;
    }

    // Sin acceso: redirigir a la primera pantalla que sí puede ver
    const destino = RUTAS_POR_RECURSO.find(r => auth.tieneAcceso(r.recurso));
    return router.createUrlTree([destino ? destino.ruta : '/login']);
};
