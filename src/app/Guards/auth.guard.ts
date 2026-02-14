import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ServicioAutenticacion } from '../Servicios/auth.service';

export const guardAutenticacion: CanActivateFn = (route, state) => {
    const servicioAutenticacion = inject(ServicioAutenticacion);
    const router = inject(Router);

    if (servicioAutenticacion.estaAutenticado()) {
        return true;
    }

    // Redirigir al login si no esta autenticado
    router.navigate(['/login']);
    return false;
};
