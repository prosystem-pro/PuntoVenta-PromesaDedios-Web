import { Routes } from '@angular/router';
import { Usuarios } from './componentes/usuarios/usuarios';
import { Roles } from './componentes/roles/roles';
import { Terminales } from './componentes/terminales/terminales';
import { Proveedores } from './componentes/proveedores/proveedores';
import { Clientes } from './componentes/clientes/clientes';
import { Configuracion } from './componentes/configuracion/configuracion';
import { PaginaLogin } from './componentes/login/login';
import { guardAutenticacion } from './Guards/auth.guard';
import { Productos } from './componentes/productos/productos';

export const routes: Routes = [
  // Rutas publicas
  { path: 'login', component: PaginaLogin },

  // Rutas protegidas
  {
    path: '',
    canActivate: [guardAutenticacion],
    children: [
      { path: 'usuario', component: Usuarios },
      { path: 'rol', component: Roles },
      { path: 'terminal', component: Terminales },
      { path: 'proveedor', component: Proveedores },
      { path: 'cliente', component: Clientes },
      { path: 'productos', component: Productos },
      { path: 'productos/nuevo', loadComponent: () => import('./componentes/productos/producto-detalle/producto-detalle').then(m => m.ProductoDetalle) },
      { path: 'productos/editar/:id', loadComponent: () => import('./componentes/productos/producto-detalle/producto-detalle').then(m => m.ProductoDetalle) },
      { path: 'configuracion', component: Configuracion },
      { path: '', redirectTo: 'usuario', pathMatch: 'full' },
    ],
  },

  // Redireccion por defecto
  { path: '**', redirectTo: 'login' },
];
