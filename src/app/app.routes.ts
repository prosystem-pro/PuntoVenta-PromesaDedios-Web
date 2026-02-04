import { Routes } from '@angular/router';
import { Usuarios } from './componentes/usuarios/usuarios';
import { Roles } from './componentes/roles/roles';
import { Terminales } from './componentes/terminales/terminales';
import { Proveedores } from './componentes/proveedores/proveedores';
import { Clientes } from './componentes/clientes/clientes';
import { Configuracion } from './componentes/configuracion/configuracion';

export const routes: Routes = [
  //Rutas publicas
  { path: 'usuario', component: Usuarios },
  { path: 'rol', component: Roles },
  { path: 'terminal', component: Terminales },
  { path: 'proveedor', component: Proveedores },
  { path: 'cliente', component: Clientes },
  { path: 'configuracion', component: Configuracion },
];
