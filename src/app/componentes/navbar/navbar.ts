import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { Entorno } from '../../Entorno/Entorno';
import { ServicioAutenticacion } from '../../Servicios/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  public colorPrincipal = Entorno.ColorSistema;
  servicioAutenticacion = inject(ServicioAutenticacion);
  private router = inject(Router);

  cerrarSesion(event: Event): void {
    event.preventDefault();
    this.servicioAutenticacion.cerrarSesion();
  }
}
