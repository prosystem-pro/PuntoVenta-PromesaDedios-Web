import { Routes } from '@angular/router';
import { PaginaLogin } from './componentes/login/login';
import { guardAutenticacion } from './Guards/auth.guard';
import { guardPermiso } from './Guards/permiso.guard';

export const routes: Routes = [
  // Rutas publicas
  { path: 'login', component: PaginaLogin },

  // Rutas protegidas (auth + permiso por recurso del rol)
  {
    path: '',
    canActivate: [guardAutenticacion],
    children: [
      { path: 'usuario', data: { recurso: 'Administrativo' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/usuarios/usuarios').then(m => m.Usuarios) },
      { path: 'rol', data: { recurso: 'Administrativo' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/roles/roles').then(m => m.Roles) },
      { path: 'terminal', loadComponent: () => import('./componentes/terminales/terminales').then(m => m.Terminales) },
      { path: 'proveedor', data: { recurso: 'Proveedor' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/proveedores/proveedores').then(m => m.Proveedores) },
      { path: 'cliente', data: { recurso: 'Cliente' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/clientes/clientes').then(m => m.Clientes) },
      { path: 'productos', data: { recurso: 'Producto' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/productos/productos').then(m => m.Productos) },
      { path: 'materia-prima', data: { recurso: 'MateriaPrima' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/materia-prima/materia-prima').then(m => m.MateriaPrima) },
      { path: 'materia-prima/nuevo', data: { recurso: 'MateriaPrima' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/materia-prima/materia-prima-detalle/materia-prima-detalle').then(m => m.MateriaPrimaDetalle) },
      { path: 'materia-prima/editar/:id', data: { recurso: 'MateriaPrima' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/materia-prima/materia-prima-detalle/materia-prima-detalle').then(m => m.MateriaPrimaDetalle) },
      { path: 'productos/nuevo', data: { recurso: 'Producto' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/productos/producto-detalle/producto-detalle').then(m => m.ProductoDetalle) },
      { path: 'productos/editar/:id', data: { recurso: 'Producto' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/productos/producto-detalle/producto-detalle').then(m => m.ProductoDetalle) },
      { path: 'caja', data: { recurso: 'Caja' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/caja/caja').then(m => m.Caja) },
      { path: 'compras', data: { recurso: 'Compra' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/compras/compras').then(m => m.Compras) },
      { path: 'facturar', data: { recurso: 'Facturar' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/facturar/facturar').then(m => m.Facturar) },
      { path: 'historial-ventas', data: { recurso: 'HistorialVenta' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/historial-ventas/historial-ventas').then(m => m.HistorialVentas) },
      { path: 'pedidos', data: { recurso: 'EstadoPedido' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/estado-pedidos/estado-pedidos').then(m => m.EstadoPedidos) },
      { path: 'estado-pagos', data: { recurso: 'EstadoPedido' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/estado-pagos/estado-pagos').then(m => m.EstadoPagos) },
      { path: 'ventas', data: { recurso: 'VentaMesa' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/mesa/mesa-listado/mesa-listado').then(m => m.MesaListado) },
      { path: 'ventas/mesa/:id', data: { recurso: 'VentaMesa' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/mesa/venta-mesa/venta-mesa').then(m => m.VentaMesa) },
      { path: 'produccion', data: { recurso: 'Produccion' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/produccion/produccion-listado/produccion-listado').then(m => m.ProduccionListado) },
      { path: 'cocina', data: { recurso: 'Cocina' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/cocina/cocina').then(m => m.Cocina) },
      { path: 'produccion/ingresar/:id', data: { recurso: 'Produccion' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/produccion/produccion-ingresar/produccion-ingresar').then(m => m.ProduccionIngresar) },
      { path: 'configuracion', data: { recurso: 'Administrativo' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/configuracion/configuracion').then(m => m.Configuracion) },
      { path: 'reportes', data: { recurso: 'Reporte' }, canActivate: [guardPermiso], loadComponent: () => import('./componentes/reportes/reportes').then(m => m.Reportes) },
      // El landing '/caja' lo resuelve guardPermiso: si el rol no tiene Caja, rebota a la primera pantalla accesible
      { path: '', redirectTo: 'caja', pathMatch: 'full' },
    ],
  },

  // Redireccion por defecto
  { path: '**', redirectTo: 'login' },
];
