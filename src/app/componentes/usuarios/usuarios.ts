import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../Modelos/usuario.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalUsuario } from './modal-usuario/modal-usuario';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, CommonModule, ModalUsuario],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  // Color del sistema desde Entorno
  colorSistema = Entorno.ColorSistema;

  // Datos
  private todosLosUsuarios: Usuario[] = [];

  // Busqueda
  textoBusqueda = signal('');

  // Control del modal
  mostrarModalCrear = signal(false);

  // Paginacion fija
  paginaActual = signal(1);
  itemsPorPagina = 7;

  // Usuarios filtrados basados en busqueda
  usuariosFiltrados = computed(() => {
    const busqueda = this.textoBusqueda().toLowerCase().trim();
    if (!busqueda) {
      return this.todosLosUsuarios;
    }
    return this.todosLosUsuarios.filter(u =>
      u.NombreCompleto.toLowerCase().includes(busqueda) ||
      u.NombreUsuario.toLowerCase().includes(busqueda) ||
      u.Telefono.includes(busqueda) ||
      u.Direccion.toLowerCase().includes(busqueda)
    );
  });

  // Total de registros y paginas
  totalRegistros = computed(() => this.usuariosFiltrados().length);
  totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));

  // Usuarios de la pagina actual
  usuariosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.usuariosFiltrados().slice(inicio, fin);
  });

  // Rango de visualizacion
  rangoInicio = computed(() => {
    if (this.totalRegistros() === 0) return 0;
    return (this.paginaActual() - 1) * this.itemsPorPagina + 1;
  });

  rangoFin = computed(() => {
    const fin = this.paginaActual() * this.itemsPorPagina;
    return Math.min(fin, this.totalRegistros());
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  private cargarUsuarios(): void {
    // Simulacion de JSON del API con 20 registros
    const nombres = [
      'Maria Luisa Castro Merida de Juarez',
      'Carlos Alberto Mendez Lopez',
      'Ana Patricia Gonzalez Ruiz',
      'Roberto Carlos Hernandez Paz',
      'Lucia Fernanda Martinez Soto',
      'Juan Pablo Rodriguez Garcia',
      'Carmen Elena Diaz Morales',
      'Miguel Angel Torres Vega',
      'Patricia Isabel Ramirez Cruz',
      'Fernando Jose Sanchez Luna',
      'Sofia Alejandra Perez Ortiz',
      'Diego Armando Lopez Castillo',
      'Valentina Maria Gutierrez Rios',
      'Andres Felipe Moreno Silva',
      'Isabella Cristina Vargas Ponce',
      'Sebastian David Reyes Aguilar',
      'Camila Andrea Flores Navarro',
      'Nicolas Esteban Romero Campos',
      'Mariana Jose Herrera Delgado',
      'Daniel Alejandro Cruz Espinoza'
    ];

    const nombresUsuarios = ['MCastro', 'CMendez', 'AGonzalez', 'RHernandez', 'LMartinez',
      'JRodriguez', 'CDiaz', 'MTorres', 'PRamirez', 'FSanchez',
      'SPerez', 'DLopez', 'VGutierrez', 'AMoreno', 'IVargas',
      'SReyes', 'CFlores', 'NRomero', 'MHerrera', 'DCruz'];

    this.todosLosUsuarios = Array(20).fill(null).map((_, i) => ({
      CodigoUsuario: i + 1,
      CodigoRol: i % 3 + 1,
      NombreUsuario: nombresUsuarios[i],
      NombreCompleto: nombres[i],
      Telefono: '4456-7665',
      Direccion: 'San Antonio Palopo, Sololá',
      Estatus: 1
    }));
  }

  // Metodos de paginacion
  irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
    }
  }

  paginaAnterior(): void {
    this.irAPagina(this.paginaActual() - 1);
  }

  paginaSiguiente(): void {
    this.irAPagina(this.paginaActual() + 1);
  }

  // Metodo para actualizar busqueda
  alCambiarBusqueda(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.textoBusqueda.set(input.value);
    this.paginaActual.set(1); // Resetear a primera pagina al buscar
  }

  // Metodos de acciones
  eliminarUsuario(id: number): void {
    console.log('Eliminando usuario:', id);
  }

  editarUsuario(usuario: Usuario): void {
    console.log('Editando usuario:', usuario.NombreCompleto);
  }

  crearUsuario(): void {
    console.log('Abriendo modal para crear usuario...');
    this.mostrarModalCrear.set(true);
  }

  cerrarModalCrear(): void {
    this.mostrarModalCrear.set(false);
  }

  manejarGuardarUsuario(datos: any): void {
    console.log('Nuevo usuario capturado:', datos);

    const nuevo: Usuario = {
      CodigoUsuario: this.todosLosUsuarios.length + 1,
      CodigoRol: 1,
      NombreUsuario: datos.usuario,
      NombreCompleto: datos.nombre,
      Telefono: datos.celular,
      Direccion: datos.direccion,
      Estatus: datos.activo ? 1 : 0
    };

    this.todosLosUsuarios = [nuevo, ...this.todosLosUsuarios];
    this.textoBusqueda.set(this.textoBusqueda());
  }

  exportarExcel(): void {
    const datosParaExportar = this.usuariosFiltrados().map(u => ({
      'No.': this.formatearNumero(u.CodigoUsuario),
      'Nombre': u.NombreCompleto,
      'Usuario': u.NombreUsuario,
      'Teléfono': u.Telefono,
      'Dirección': u.Direccion,
      'Estatus': u.Estatus === 1 ? 'Activo' : 'Inactivo'
    }));

    const hoja: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExportar);
    const libro: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Usuarios');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `Listado_Usuarios_${fecha}.xlsx`);
  }

  formatearNumero(num: number): string {
    return num.toString().padStart(2, '0');
  }

}
