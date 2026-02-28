import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServicioAutenticacion } from '../../Servicios/auth.service';
import { Entorno } from '../../Entorno/Entorno';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrl: './login.css',
})
export class PaginaLogin {
    NombreUsuario = '';
    Clave = '';
    error = signal('');
    cargando = signal(false);

    colorSistema = Entorno.ColorSistema;
    logo = Entorno.Logo;

    constructor(private servicioAutenticacion: ServicioAutenticacion, private router: Router) {
        // Si ya esta autenticado, redirigir al menu
        if (this.servicioAutenticacion.estaAutenticado()) {
            this.router.navigate(['/usuario']);
        }
    }

    async alEnviarFormulario() {
        if (!this.NombreUsuario || !this.Clave) {
            this.error.set('Por favor, ingrese usuario y contraseña');
            return;
        }

        this.cargando.set(true);
        this.error.set('');

        const res = await this.servicioAutenticacion.iniciarSesion(this.NombreUsuario, this.Clave);

        this.cargando.set(false);

        if (res.success) {
            this.router.navigate(['/usuario']);
        } else {
            this.error.set(res.message || 'Error al iniciar sesión');
        }
    }
}
