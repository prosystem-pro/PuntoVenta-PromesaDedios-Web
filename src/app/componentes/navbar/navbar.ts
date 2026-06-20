import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Entorno } from '../../Entorno/Entorno';
import { ServicioAutenticacion } from '../../Servicios/auth.service';
import { CajaEstadoService } from '../../Servicios/caja-estado.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  public colorPrincipal = Entorno.ColorSistema;
  servicioAutenticacion = inject(ServicioAutenticacion);
  cajaEstado = inject(CajaEstadoService);
  private router = inject(Router);

  ngOnInit(): void {
    this.cajaEstado.cargar();
  }

  cerrarSesion(event: Event): void {
    event.preventDefault();
    this.servicioAutenticacion.cerrarSesion();
  }
}
