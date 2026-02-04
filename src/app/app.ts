import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuLateral } from './componentes/menu-lateral/menu-lateral';
import { Navbar } from './componentes/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuLateral, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly titulo = signal('punto-de-venta');
}
