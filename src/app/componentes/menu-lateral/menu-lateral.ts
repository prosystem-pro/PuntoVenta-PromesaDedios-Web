import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Entorno } from '../../Entorno/Entorno';

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu-lateral.html',
  styleUrl: './menu-lateral.css',
})
export class MenuLateral {
  public colorPrincipal = Entorno.ColorSistema;
  public logo = Entorno.Logo;

  // Estado del menu: true = abierto, false = colapsado
  estaExpandido = signal(true);

  itemsMenu = [
    { texto: 'Caja', icono: 'bi bi-inbox-fill', ruta: '/caja' },
    { texto: 'Venta en mesa', icono: 'bi bi-shop', ruta: '/ventas' },
    { texto: 'Facturar', icono: 'bi bi-upc-scan', ruta: '/facturar' },
    { texto: 'Estado Pedidos', icono: 'bi bi-clipboard-check', ruta: '/pedidos' },
    { texto: 'Compras', icono: 'bi bi-cart4', ruta: '/compras' },
    { texto: 'Materia prima', icono: 'bi bi-truck', ruta: '/materia-prima' },
    { texto: 'Productos', icono: 'bi bi-boxes', ruta: '/productos' },
    { texto: 'Producción', icono: 'bi bi-gear', ruta: '/produccion' },
    { texto: 'Cocina', icono: 'bi bi-shop-window', ruta: '/cocina' },
    { texto: 'Clientes', icono: 'bi bi-people', ruta: '/cliente' },
    { texto: 'Proveedores', icono: 'bi bi-person-badge', ruta: '/proveedor' },
    { texto: 'Reportes', icono: 'bi bi-bar-chart-line', ruta: '/reportes' }
  ];

  alternarMenu() {
    this.estaExpandido.update(valor => !valor);
  }
}
