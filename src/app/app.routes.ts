import { Routes } from '@angular/router';
import { PaginaLogin } from './componentes/login/login';
import { guardAutenticacion } from './Guards/auth.guard';

export const routes: Routes = [
  // Rutas publicas
  { path: 'login', component: PaginaLogin },

  // Rutas protegidas
  {
    path: '',
    canActivate: [guardAutenticacion],
    children: [
      { path: 'usuario', loadComponent: () => import('./componentes/usuarios/usuarios').then(m => m.Usuarios) },
      { path: 'rol', loadComponent: () => import('./componentes/roles/roles').then(m => m.Roles) },
      { path: 'terminal', loadComponent: () => import('./componentes/terminales/terminales').then(m => m.Terminales) },
      { path: 'proveedor', loadComponent: () => import('./componentes/proveedores/proveedores').then(m => m.Proveedores) },
      { path: 'cliente', loadComponent: () => import('./componentes/clientes/clientes').then(m => m.Clientes) },
      { path: 'productos', loadComponent: () => import('./componentes/productos/productos').then(m => m.Productos) },
      { path: 'materia-prima', loadComponent: () => import('./componentes/materia-prima/materia-prima').then(m => m.MateriaPrima) },
      { path: 'materia-prima/nuevo', loadComponent: () => import('./componentes/materia-prima/materia-prima-detalle/materia-prima-detalle').then(m => m.MateriaPrimaDetalle) },
      { path: 'materia-prima/editar/:id', loadComponent: () => import('./componentes/materia-prima/materia-prima-detalle/materia-prima-detalle').then(m => m.MateriaPrimaDetalle) },
      { path: 'productos/nuevo', loadComponent: () => import('./componentes/productos/producto-detalle/producto-detalle').then(m => m.ProductoDetalle) },
      { path: 'productos/editar/:id', loadComponent: () => import('./componentes/productos/producto-detalle/producto-detalle').then(m => m.ProductoDetalle) },
      { path: 'caja', loadComponent: () => import('./componentes/caja/caja').then(m => m.Caja) },
      { path: 'compras', loadComponent: () => import('./componentes/compras/compras').then(m => m.Compras) },
      { path: 'facturar', loadComponent: () => import('./componentes/facturar/facturar').then(m => m.Facturar) },
      { path: 'historial-ventas', loadComponent: () => import('./componentes/historial-ventas/historial-ventas').then(m => m.HistorialVentas) },
      { path: 'pedidos', loadComponent: () => import('./componentes/estado-pedidos/estado-pedidos').then(m => m.EstadoPedidos) },
      { path: 'estado-pagos', loadComponent: () => import('./componentes/estado-pagos/estado-pagos').then(m => m.EstadoPagos) },
      { path: 'ventas', loadComponent: () => import('./componentes/mesa/mesa-listado/mesa-listado').then(m => m.MesaListado) },
      { path: 'ventas/mesa/:id', loadComponent: () => import('./componentes/mesa/venta-mesa/venta-mesa').then(m => m.VentaMesa) },
      { path: 'produccion', loadComponent: () => import('./componentes/produccion/produccion-listado/produccion-listado').then(m => m.ProduccionListado) },
      { path: 'cocina', loadComponent: () => import('./componentes/cocina/cocina').then(m => m.Cocina) },
      { path: 'produccion/ingresar/:id', loadComponent: () => import('./componentes/produccion/produccion-ingresar/produccion-ingresar').then(m => m.ProduccionIngresar) },
      { path: 'configuracion', loadComponent: () => import('./componentes/configuracion/configuracion').then(m => m.Configuracion) },
      { path: '', redirectTo: 'usuario', pathMatch: 'full' },
    ],
  },

  // Redireccion por defecto
  { path: '**', redirectTo: 'login' },
];
