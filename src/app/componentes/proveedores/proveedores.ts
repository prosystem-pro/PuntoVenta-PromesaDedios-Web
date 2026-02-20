import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Proveedor } from '../../Modelos/proveedor.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalProveedor } from './modal-proveedor/modal-proveedor';
import { ServicioProveedor } from '../../Servicios/proveedor.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-proveedores',
    standalone: true,
    imports: [FormsModule, CommonModule, ModalProveedor],
    templateUrl: './proveedores.html',
    styleUrl: './proveedores.css',
})
export class Proveedores implements OnInit {
    private servicioProveedor = inject(ServicioProveedor);
    private servicioAlerta = inject(AlertaServicio);

    // Color del sistema desde Entorno
    colorSistema = Entorno.ColorSistema;

    // Datos
    proveedores = signal<Proveedor[]>([]);
    cargando = signal(false);

    // Busqueda
    textoBusqueda = signal('');

    // Control del modal
    mostrarModal = signal(false);
    proveedorSeleccionado = signal<Proveedor | null>(null);

    // Paginacion fija
    paginaActual = signal(1);
    itemsPorPagina = 7;

    // Proveedores filtrados basados en busqueda
    proveedoresFiltrados = computed(() => {
        const busqueda = this.textoBusqueda().toLowerCase().trim();
        if (!busqueda) {
            return this.proveedores();
        }
        return this.proveedores().filter(p =>
            p.NombreProveedor.toLowerCase().includes(busqueda) ||
            p.NIT.toLowerCase().includes(busqueda) ||
            p.Telefono.includes(busqueda) ||
            p.Direccion.toLowerCase().includes(busqueda) ||
            p.Correo.toLowerCase().includes(busqueda)
        );
    });

    // Total de registros y paginas
    totalRegistros = computed(() => this.proveedoresFiltrados().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));

    // Proveedores de la pagina actual
    proveedoresPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.proveedoresFiltrados().slice(inicio, fin);
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
        this.cargarProveedores();
    }

    async cargarProveedores() {
        this.cargando.set(true);
        const res = await this.servicioProveedor.obtenerProveedores();
        this.cargando.set(false);

        if (res.success) {
            this.proveedores.set(res.data as Proveedor[]);
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al cargar proveedores');
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
    async eliminarProveedor(id: number) {
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Esta seguro de eliminar este proveedor?',
            'Esta accion no se puede deshacer',
            'Si, eliminar',
            'Cancelar'
        );

        if (confirmado) {
            this.cargando.set(true);
            const res = await this.servicioProveedor.eliminarProveedor(id);
            this.cargando.set(false);

            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Proveedor eliminado correctamente');
                this.cargarProveedores();
            } else {
                this.servicioAlerta.MostrarError(res, 'Error al eliminar proveedor');
            }
        }
    }

    editarProveedor(proveedor: Proveedor): void {
        this.proveedorSeleccionado.set(proveedor);
        this.mostrarModal.set(true);
    }

    crearProveedor(): void {
        this.proveedorSeleccionado.set(null);
        this.mostrarModal.set(true);
    }

    cerrarModal(): void {
        this.mostrarModal.set(false);
        this.proveedorSeleccionado.set(null);
    }

    async manejarGuardarProveedor(datos: any) {
        let res;
        if (this.proveedorSeleccionado()) {
            // Editar
            res = await this.servicioProveedor.editarProveedor(this.proveedorSeleccionado()!.CodigoProveedor, datos);
        } else {
            // Crear
            res = await this.servicioProveedor.crearProveedor(datos);
        }

        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message || 'Proveedor guardado correctamente');
            this.cargarProveedores();
            this.cerrarModal();
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al guardar proveedor');
        }
    }

    exportarExcel(): void {
        const datosParaExportar = this.proveedoresFiltrados().map((p, index) => ({
            'No.': index + 1,
            'Nombre': p.NombreProveedor,
            'NIT': p.NIT,
            'Telefono': p.Telefono,
            'Direccion': p.Direccion,
            'Correo': p.Correo,
            'Estatus': p.Estatus === 1 ? 'Activo' : 'Inactivo'
        }));

        const hoja: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExportar);
        const libro: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Proveedores');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(libro, `Listado_Proveedores_${fecha}.xlsx`);
    }

    formatearNumero(num: number): string {
        return num.toString();
    }

}
