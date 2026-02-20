import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Cliente } from '../../Modelos/cliente.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalCliente } from './modal-cliente/modal-cliente';
import { ClienteServicio } from '../../Servicios/cliente.service';
import { AlertaServicio } from '../../Servicios/alerta.service';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-clientes',
    standalone: true,
    imports: [FormsModule, CommonModule, ModalCliente],
    templateUrl: './clientes.html',
    styleUrl: './clientes.css',
})
export class Clientes implements OnInit {
    // Inyeccion de servicios
    private servicioCliente = inject(ClienteServicio);
    private servicioAlerta = inject(AlertaServicio);

    // Color del sistema desde Entorno
    colorSistema = Entorno.ColorSistema;

    // Datos
    clientes = signal<Cliente[]>([]);
    cargando = signal(false);

    // Busqueda
    textoBusqueda = signal('');

    // Control del modal
    mostrarModal = signal(false);
    clienteSeleccionado = signal<Cliente | null>(null);

    // Paginacion
    paginaActual = signal(1);
    itemsPorPagina = 7;

    // Clientes filtrados basados en busqueda
    clientesFiltrados = computed(() => {
        const busqueda = this.textoBusqueda().toLowerCase().trim();
        if (!busqueda) {
            return this.clientes();
        }
        return this.clientes().filter(c =>
            c.NombreCliente.toLowerCase().includes(busqueda) ||
            c.NIT.toLowerCase().includes(busqueda) ||
            c.Telefono.includes(busqueda) ||
            c.Direccion.toLowerCase().includes(busqueda)
        );
    });

    // Total de registros y paginas
    totalRegistros = computed(() => this.clientesFiltrados().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));

    // Clientes de la pagina actual
    clientesPaginados = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.clientesFiltrados().slice(inicio, fin);
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
        this.cargarClientes();
    }

    async cargarClientes() {
        this.cargando.set(true);
        const res = await this.servicioCliente.listarClientes();
        this.cargando.set(false);

        if (res.success) {
            this.clientes.set(res.data as Cliente[]);
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al cargar clientes');
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
    async eliminarCliente(id: number) {
        const confirmado = await this.servicioAlerta.Confirmacion(
            '¿Esta seguro de eliminar este cliente?',
            'Esta accion no se puede deshacer'
        );

        if (confirmado) {
            const res = await this.servicioCliente.eliminarCliente(id);
            if (res.success) {
                this.servicioAlerta.MostrarExito(res.message || 'Cliente eliminado correctamente');
                this.cargarClientes();
            } else {
                this.servicioAlerta.MostrarError(res, 'Error al eliminar cliente');
            }
        }
    }

    editarCliente(cliente: Cliente): void {
        this.clienteSeleccionado.set(cliente);
        this.mostrarModal.set(true);
    }

    crearCliente(): void {
        this.clienteSeleccionado.set(null);
        this.mostrarModal.set(true);
    }

    cerrarModal(): void {
        this.mostrarModal.set(false);
        this.clienteSeleccionado.set(null);
    }

    async manejarGuardarCliente(datos: any) {
        let res;

        if (this.clienteSeleccionado()) {
            // Editar
            res = await this.servicioCliente.editarCliente(this.clienteSeleccionado()!.CodigoCliente, datos);
        } else {
            // Crear
            res = await this.servicioCliente.crearCliente(datos);
        }

        if (res.success) {
            this.servicioAlerta.MostrarExito(res.message || 'Cliente guardado correctamente');
            this.cargarClientes();
            this.cerrarModal();
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al guardar cliente');
        }
    }

    exportarExcel(): void {
        const datosParaExportar = this.clientesFiltrados().map((c, index) => ({
            'No.': index + 1,
            'Nombre': c.NombreCliente,
            'NIT': c.NIT,
            'Direccion': c.Direccion,
            'Telefono': c.Telefono,
            'Estatus': c.Estatus === 1 ? 'Activo' : 'Inactivo'
        }));

        const hoja: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExportar);
        const libro: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Clientes');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(libro, `Listado_Clientes_${fecha}.xlsx`);
    }

    formatearNumero(num: number): string {
        return num.toString();
    }

}
