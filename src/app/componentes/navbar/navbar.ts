import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Entorno } from '../../Entorno/Entorno';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  public colorPrincipal = Entorno.ColorSistema;
}
