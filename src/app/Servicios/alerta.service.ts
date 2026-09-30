import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
    providedIn: 'root'
})
export class AlertaServicio {

    constructor() { }

    MostrarExito(mensaje: string, titulo: string = 'Éxito'): void {
        Swal.fire({
            icon: 'success',
            title: titulo,
            text: mensaje,
            confirmButtonText: 'Aceptar',
            showConfirmButton: true
        });
    }

    MostrarAlerta(mensaje: string, titulo: string = 'Atención'): void {
        Swal.fire({
            icon: 'warning',
            title: titulo,
            text: mensaje,
            confirmButtonText: 'Aceptar',
            showConfirmButton: true
        });
    }

    MostrarInfo(mensaje: string, titulo: string = 'Información'): void {
        Swal.fire({
            icon: 'info',
            title: titulo,
            text: mensaje,
            confirmButtonText: 'Aceptar',
            showConfirmButton: true
        });
    }

    // Igual que MostrarInfo pero con contenido HTML (para mostrar varios campos con
    // saltos de línea). Quien llama es responsable de escapar el texto dinámico.
    MostrarInfoHtml(html: string, titulo: string = 'Información'): void {
        Swal.fire({
            icon: 'info',
            title: titulo,
            html: html,
            confirmButtonText: 'Aceptar',
            showConfirmButton: true
        });
    }

    // Popup de detalle de anulación (TC-763 / TC-809): motivo + quién anuló + cuándo.
    // Usuario y fecha se muestran solo si el API los envía. Escapa el texto dinámico.
    MostrarMotivoAnulacion(motivo: string, usuario?: string | null, fecha?: string | null): void {
        const esc = (t: string) => t.replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
        const filas = [`<div class="text-start"><b>Motivo:</b> ${esc(motivo)}</div>`];
        if (usuario && usuario.trim()) {
            filas.push(`<div class="text-start"><b>Anulado por:</b> ${esc(usuario.trim())}</div>`);
        }
        if (fecha && fecha.trim()) {
            filas.push(`<div class="text-start"><b>Fecha y hora:</b> ${esc(fecha.trim())}</div>`);
        }
        this.MostrarInfoHtml(filas.join(''), 'Motivo de anulación');
    }

    MostrarError(error: any, titulo: string = 'Error'): void {
        let mensaje = 'Ocurrio un error inesperado.';

        if (typeof error === 'string') {
            mensaje = error;
        } else if (error && typeof error === 'object') {
            // Prioriza el mensaje específico que devuelve el backend:
            // axios:   error.response.data.error.message  o  error.response.data.message
            // backend: { error: { message } }              o  { message }
            mensaje = error.response?.data?.error?.message
                || error.response?.data?.message
                || error.error?.message
                || error.message
                || mensaje;
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
