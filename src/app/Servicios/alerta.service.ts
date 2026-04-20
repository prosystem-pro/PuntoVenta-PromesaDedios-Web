import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
    providedIn: 'root'
})
export class AlertaServicio {

    constructor() { }

    MostrarExito(mensaje: string, titulo: string = 'Exito'): void {
        Swal.fire({
            icon: 'success',
            title: titulo,
            text: mensaje,
            confirmButtonText: 'Aceptar',
            showConfirmButton: true
        });
    }

    MostrarAlerta(mensaje: string, titulo: string = 'Atencion'): void {
        Swal.fire({
            icon: 'warning',
            title: titulo,
            text: mensaje,
            confirmButtonText: 'Aceptar',
            showConfirmButton: true
        });
    }

    MostrarInfo(mensaje: string, titulo: string = 'Informacion'): void {
        Swal.fire({
            icon: 'info',
            title: titulo,
            text: mensaje,
            confirmButtonText: 'Aceptar',
            showConfirmButton: true
        });
    }

    MostrarError(error: any, titulo: string = 'Error'): void {
        let mensaje = 'Ocurrio un error inesperado.';

        if (error && typeof error === 'object') {
            mensaje = error.message || error.error?.message || mensaje;
        } else if (typeof error === 'string') {
            mensaje = error;
        }

        Swal.fire({
            icon: 'error',
            title: titulo,
            text: mensaje,
            confirmButtonText: 'Aceptar',
            showConfirmButton: true
        });
    }

    Confirmacion(titulo: string, texto: string = '', confirmText: string = 'Confirmar', cancelText: string = 'Cancelar'): Promise<boolean> {
        return Swal.fire({
            title: titulo,
            text: texto,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: confirmText,
            cancelButtonText: cancelText
        }).then(result => result.isConfirmed);
    }

    MostrarToast(mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info' = 'success', posicion: 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start' = 'top-end'): void {
        const Toast = Swal.mixin({
            toast: true,
            position: posicion,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: tipo,
            title: mensaje
        });
    }

}
