import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../Modelos/usuario.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalUsuario } from './modal-usuario/modal-usuario';
import { ServicioUsuario } from '../../Servicios/usuario.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, CommonModule, ModalUsuario],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  private servicioUsuario = inject(ServicioUsuario);
  private servicioAlerta = inject(AlertaServicio);

  // Color del sistema desde Entorno
  colorSistema = Entorno.ColorSistema;

  // Datos
  usuarios = signal<Usuario[]>([]);
  cargando = signal(false);

  // Busqueda
  textoBusqueda = signal('');

  // Control del modal
  mostrarModal = signal(false);
  usuarioSeleccionado = signal<Usuario | null>(null);

  // Paginacion fija
  paginaActual = signal(1);
  itemsPorPagina = 7;

  // Usuarios filtrados basados en busqueda
  usuariosFiltrados = computed(() => {
    const busqueda = this.textoBusqueda().toLowerCase().trim();
    if (!busqueda) {
      return this.usuarios();
    }
    return this.usuarios().filter(u =>
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

  async cargarUsuarios() {
    this.cargando.set(true);
    const res = await this.servicioUsuario.obtenerUsuarios();
    this.cargando.set(false);

    if (res.success) {
      this.usuarios.set(res.data as Usuario[]);
    } else {
      // Error manejado
    }
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
    this.paginaActual.set(1);
  }

  // Metodos de acciones
  async eliminarUsuario(id: number) {
    const confirmado = await this.servicioAlerta.Confirmacion(
      '¿Esta seguro de eliminar este usuario?',
      'Esta accion no se puede deshacer',
      'Si, eliminar',
      'Cancelar'
    );

    if (confirmado) {
      this.cargando.set(true);
      const res = await this.servicioUsuario.eliminarUsuario(id);
      this.cargando.set(false);

      if (res.success) {
        this.servicioAlerta.MostrarExito(res.message || 'Usuario eliminado correctamente');
        this.cargarUsuarios();
      } else {
        this.servicioAlerta.MostrarError(res, 'Error al eliminar usuario');
      }
    }
  }

  editarUsuario(usuario: Usuario): void {
    this.usuarioSeleccionado.set(usuario);
    this.mostrarModal.set(true);
  }

  crearUsuario(): void {
    this.usuarioSeleccionado.set(null);
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.usuarioSeleccionado.set(null);
  }

  async manejarGuardarUsuario(datos: any) {
    let res;
    if (this.usuarioSeleccionado()) {
      // Editar
      res = await this.servicioUsuario.editarUsuario(this.usuarioSeleccionado()!.CodigoUsuario, datos);
    } else {
      // Crear
      res = await this.servicioUsuario.crearUsuario(datos);
    }

    if (res.success) {
      this.servicioAlerta.MostrarExito(res.message || 'Usuario guardado correctamente');
      this.cargarUsuarios();
      this.cerrarModal();
    } else {
      this.servicioAlerta.MostrarError(res, 'Error al guardar usuario');
    }
  }

  exportarExcel(): void {
    const datosParaExportar = this.usuariosFiltrados().map((u, index) => ({
      'No.': index + 1,
      'Nombre': u.NombreCompleto,
      'Usuario': u.NombreUsuario,
      'Telefono': u.Telefono,
      'Direccion': u.Direccion,
      'Estatus': u.Estatus === 1 ? 'Activo' : 'Inactivo'
    }));

    const hoja: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExportar);
    const libro: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Usuarios');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `Listado_Usuarios_${fecha}.xlsx`);
  }

  formatearNumero(num: number): string {
    return num.toString();
  }

}
