import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Entorno } from '../../Entorno/Entorno';
import { CajaEstadoService } from '../../Servicios/caja-estado.service';
import { ServicioAutenticacion } from '../../Servicios/auth.service';

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

  cajaEstado = inject(CajaEstadoService);
  private auth = inject(ServicioAutenticacion);
  private router = inject(Router);

  // Estado del menu: true = abierto, false = colapsado
  estaExpandido = signal(true);

  // Lleva a la pantalla de Caja y le pide abrir el formulario de cierre.
  cerrarCaja(): void {
    this.cajaEstado.solicitarCierre();
    this.router.navigate(['/caja']);
  }

  // Cada ítem se ata a su NombreRecurso del API (el que guarda su pantalla). Se muestra
  // solo si el rol del usuario tiene ese recurso (o es SuperAdmin/AccesoCompleto).
  itemsMenu = [
    { texto: 'Caja', icono: 'bi bi-inbox-fill', ruta: '/caja', recurso: 'Caja' },
    { texto: 'Venta en mesa', icono: 'bi bi-shop', ruta: '/ventas', recurso: 'VentaMesa' },
    { texto: 'Facturar', icono: 'bi bi-upc-scan', ruta: '/facturar', recurso: 'Facturar' },
    { texto: 'Historial Ventas', icono: 'bi bi-journal-text', ruta: '/historial-ventas', recurso: 'HistorialVenta' },
    { texto: 'Estado Pedidos', icono: 'bi bi-clipboard-check', ruta: '/pedidos', recurso: 'EstadoPedido' },
    { texto: 'Compras', icono: 'bi bi-cart4', ruta: '/compras', recurso: 'Compra' },
    { texto: 'Materia prima', icono: 'bi bi-truck', ruta: '/materia-prima', recurso: 'MateriaPrima' },
    { texto: 'Productos', icono: 'bi bi-boxes', ruta: '/productos', recurso: 'Producto' },
    { texto: 'Producción', icono: 'bi bi-gear', ruta: '/produccion', recurso: 'Produccion' },
    { texto: 'Cocina', icono: 'bi bi-shop-window', ruta: '/cocina', recurso: 'Cocina' },
    { texto: 'Clientes', icono: 'bi bi-people', ruta: '/cliente', recurso: 'Cliente' },
    { texto: 'Proveedores', icono: 'bi bi-person-badge', ruta: '/proveedor', recurso: 'Proveedor' },
    { texto: 'Reportes', icono: 'bi bi-bar-chart-line', ruta: '/reportes', recurso: 'Reporte' }
  ];

  // Ítems visibles según los permisos del usuario (reacciona al login/logout)
  itemsVisibles = computed(() =>
    this.itemsMenu.filter(item => this.auth.tieneAcceso(item.recurso))
  );

  // El botón "Cerrar caja" solo para quien tenga el módulo Caja
  puedeVerCaja = computed(() => this.auth.tieneAcceso('Caja'));

  alternarMenu() {
    this.estaExpandido.update(valor => !valor);
  }
}
