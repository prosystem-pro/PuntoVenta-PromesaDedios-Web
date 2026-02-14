import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Rol } from '../../Modelos/rol.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalRol } from './modal-rol/modal-rol';
import { ServicioUsuario } from '../../Servicios/usuario.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-roles',
    standalone: true,
    imports: [FormsModule, CommonModule, ModalRol],
    templateUrl: './roles.html',
    styleUrl: './roles.css',
})
export class Roles implements OnInit {
    private servicioUsuario = inject(ServicioUsuario);
    private servicioAlerta = inject(AlertaServicio);

    // Color del sistema desde Entorno
    colorSistema = Entorno.ColorSistema;

    // Datos
    roles = signal<Rol[]>([]);
    cargando = signal(false);

    // Busqueda
    textoBusqueda = signal('');

    // Control del modal
    mostrarModal = signal(false);
    rolSeleccionado = signal<Rol | null>(null);

    // Paginacion fija
    paginaActual = signal(1);
    itemsPorPagina = 7;

    // Roles filtrados basados en busqueda
    rolesFiltrados = computed(() => {
        const busqueda = this.textoBusqueda().toLowerCase().trim();
        if (!busqueda) {
            return this.roles();
        }
        return this.roles().filter(r =>
            r.NombreRol.toLowerCase().includes(busqueda)
        );
    });

    // Total de registros y paginas
    totalRegistros = computed(() => this.rolesFiltrados().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));

    // Roles de la pagina actual
    rolesPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.rolesFiltrados().slice(inicio, fin);
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
        this.cargarRoles();
    }

    async cargarRoles() {
        this.cargando.set(true);
        const res = await this.servicioUsuario.obtenerRoles();
        this.cargando.set(false);

        if (res.success) {
            this.roles.set(res.data as Rol[]);
        } else {
            // Error manejado por el servicio
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

    alCambiarBusqueda(evento: Event): void {
        const input = evento.target as HTMLInputElement;
        this.textoBusqueda.set(input.value);
        this.paginaActual.set(1);
    }

    // Metodos de acciones
    async eliminarRol(id: number) {
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Está seguro de eliminar este rol?',
            'Esta acción no se puede deshacer',
            'Sí, eliminar',
            'Cancelar'
        );

        if (confirmado) {
            this.cargando.set(true);
            const res = await this.servicioUsuario.eliminarRol(id);
            this.cargando.set(false);

            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Rol eliminado correctamente');
                this.cargarRoles();
            } else {
                this.servicioAlerta.MostrarError(res, 'Error al eliminar rol');
            }
        }
    }

    editarRol(rol: Rol): void {
        this.rolSeleccionado.set(rol);
        this.mostrarModal.set(true);
    }

    crearRol(): void {
        this.rolSeleccionado.set(null);
        this.mostrarModal.set(true);
    }

    cerrarModal(): void {
        this.mostrarModal.set(false);
        this.rolSeleccionado.set(null);
    }

    async manejarGuardarRol(datos: any) {
        let res;
        const payload = {
            NombreRol: datos.nombreRol,
            Estatus: 1 // Por defecto activo, se puede expandir el modal para incluir estatus
        };

        this.cargando.set(true);
        if (this.rolSeleccionado()) {
            res = await this.servicioUsuario.editarRol(this.rolSeleccionado()!.CodigoRol, payload);
        } else {
            res = await this.servicioUsuario.crearRol(payload);
        }
        this.cargando.set(false);

        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message || 'Rol guardado correctamente');
            this.cargarRoles();
            this.cerrarModal();
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al guardar rol');
        }
    }

    exportarExcel(): void {
        const datosParaExportar = this.rolesFiltrados().map((r, index) => ({
            'No.': index + 1,
            'Nombre': r.NombreRol,
            'Estatus': r.Estatus === 1 ? 'Activo' : 'Inactivo'
        }));

        const hoja: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExportar);
        const libro: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Roles');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(libro, `Listado_Roles_${fecha}.xlsx`);
    }

    formatearNumero(num: number): string {
        return num.toString();
    }
}
