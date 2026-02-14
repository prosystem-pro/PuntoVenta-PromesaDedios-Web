import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuLateral } from './componentes/menu-lateral/menu-lateral';
import { Navbar } from './componentes/navbar/navbar';
import { ServicioAutenticacion } from './Servicios/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenuLateral, Navbar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly titulo = signal('punto-de-venta');
  servicioAutenticacion = inject(ServicioAutenticacion);
}
