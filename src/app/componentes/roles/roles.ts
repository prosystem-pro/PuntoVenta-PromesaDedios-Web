import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Rol } from '../../Modelos/rol.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalRol } from './modal-rol/modal-rol';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-roles',
    standalone: true,
    imports: [FormsModule, CommonModule, ModalRol],
    templateUrl: './roles.html',
    styleUrl: './roles.css',
})
export class Roles implements OnInit {
    // Color del sistema desde Entorno
    colorSistema = Entorno.ColorSistema;

    // Datos
    private todosLosRoles: Rol[] = [];

    // Busqueda
    textoBusqueda = signal('');

    // Control del modal
    mostrarModalCrear = signal(false);

    // Paginacion fija
    paginaActual = signal(1);
    itemsPorPagina = 7;

    // Roles filtrados basados en busqueda
    rolesFiltrados = computed(() => {
        const busqueda = this.textoBusqueda().toLowerCase().trim();
        if (!busqueda) {
            return this.todosLosRoles;
        }
        return this.todosLosRoles.filter(r =>
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

    private cargarRoles(): void {
        // Datos simulados segun la imagen
        const nombres = [
            'Administrador',
            'Propietario',
            'Vendedor auxiliar',
            'Vendedor',
            'Pasante',
            'Panadero',
            'Bodeguero',
            'Bodeguero',
            'Bodeguero',
            'Bodeguero'
        ];

        const usuarios = [3, 2, 4, 2, 1, 5, 2, 1, 5, 6];
        const permisos = [5, 5, 2, 1, 4, 6, 10, 8, 1, 3];

        this.todosLosRoles = nombres.map((nombre, i) => ({
            CodigoRol: i + 1,
            NombreRol: nombre,
            CantidadUsuarios: usuarios[i],
            CantidadPermisos: permisos[i],
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

    alCambiarBusqueda(evento: Event): void {
        const input = evento.target as HTMLInputElement;
        this.textoBusqueda.set(input.value);
        this.paginaActual.set(1);
    }

    // Metodos de acciones
    eliminarRol(id: number): void {
        console.log('Eliminando rol:', id);
    }

    editarRol(rol: Rol): void {
        console.log('Editando rol:', rol.NombreRol);
    }

    crearRol(): void {
        this.mostrarModalCrear.set(true);
    }

    cerrarModalCrear(): void {
        this.mostrarModalCrear.set(false);
    }

    manejarGuardarRol(datos: any): void {
        console.log('Nuevo rol capturado:', datos);

        // Simulación de agregar a la lista local
        const nuevo: Rol = {
            CodigoRol: this.todosLosRoles.length + 1,
            NombreRol: datos.nombreRol,
            CantidadUsuarios: 0,
            CantidadPermisos: Object.values(datos.permisos).filter(v => v === true).length,
            Estatus: 1
        };

        this.todosLosRoles = [nuevo, ...this.todosLosRoles];
        // Resetear busqueda para mostrar el nuevo registro
        this.textoBusqueda.set('');
    }

    exportarExcel(): void {
        const datosParaExportar = this.rolesFiltrados().map(r => ({
            'No.': this.formatearNumero(r.CodigoRol),
            'Nombre': r.NombreRol,
            '# Usuarios': r.CantidadUsuarios,
            '# Permisos': r.CantidadPermisos,
            'Estatus': r.Estatus === 1 ? 'Activo' : 'Inactivo'
        }));

        const hoja: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExportar);
        const libro: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Roles');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(libro, `Listado_Roles_${fecha}.xlsx`);
    }

    formatearNumero(num: number): string {
        return num.toString().padStart(2, '0');
    }
}
