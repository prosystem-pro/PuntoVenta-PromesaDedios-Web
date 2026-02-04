import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Cliente } from '../../Modelos/cliente.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalCliente } from './modal-cliente/modal-cliente';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-clientes',
    standalone: true,
    imports: [FormsModule, CommonModule, ModalCliente],
    templateUrl: './clientes.html',
    styleUrl: './clientes.css',
})
export class Clientes implements OnInit {
    // Color del sistema desde Entorno
    colorSistema = Entorno.ColorSistema;

    // Datos
    private todosLosClientes: Cliente[] = [];

    // Busqueda
    textoBusqueda = signal('');

    // Control del modal
    mostrarModalCrear = signal(false);

    // Paginacion fija
    paginaActual = signal(1);
    itemsPorPagina = 7;

    // Clientes filtrados basados en busqueda
    clientesFiltrados = computed(() => {
        const busqueda = this.textoBusqueda().toLowerCase().trim();
        if (!busqueda) {
            return this.todosLosClientes;
        }
        return this.todosLosClientes.filter(c =>
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

    private cargarClientes(): void {
        // Simulacion de JSON del API con 20 registros
        const nombres = [
            'Maria Luisa Castro Merida de Juarez',
            'Juan Alberto Perez Maldonado',
            'Ana Lucia Gonzalez Estrada',
            'Carlos Roberto Hernandez Mendez',
            'Silvia Patricia Lopez Ruiz',
            'Ricardo Antonio Martinez Garcia',
            'Claudia Maria Sanchez Diaz',
            'Jorge Mario Torres Vega',
            'Rosa Maria Ramirez Cruz',
            'Luis Fernando Sanchez Luna',
            'Elena Sofia Perez Ortiz',
            'Victor Manuel Lopez Castillo',
            'Beatriz Adriana Gutierrez Rios',
            'Mario Rene Moreno Silva',
            'Indira Cristina Vargas Ponce',
            'Sergio David Reyes Aguilar',
            'Karla Andrea Flores Navarro',
            'Oscar Esteban Romero Campos',
            'Marta Jose Herrera Delgado',
            'Estuardo Alejandro Cruz Espinoza'
        ];

        this.todosLosClientes = Array(20).fill(null).map((_, i) => ({
            CodigoCliente: i + 1,
            NombreCliente: nombres[i],
            NIT: `8897322-${i % 9 + 1}`,
            Direccion: 'San Antonio Palopo, Solola',
            Telefono: '4456-7665',
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
    eliminarCliente(id: number): void {
        console.log('Eliminando cliente:', id);
        if (confirm('¿Esta seguro de eliminar este cliente?')) {
            this.todosLosClientes = this.todosLosClientes.filter(c => c.CodigoCliente !== id);
            this.textoBusqueda.set(this.textoBusqueda()); // Forzar actualizacion
        }
    }

    editarCliente(cliente: Cliente): void {
        console.log('Editando cliente:', cliente.NombreCliente);
    }

    crearCliente(): void {
        this.mostrarModalCrear.set(true);
    }

    cerrarModalCrear(): void {
        this.mostrarModalCrear.set(false);
    }

    manejarGuardarCliente(datos: any): void {
        console.log('Nuevo cliente capturado:', datos);

        const nuevo: Cliente = {
            CodigoCliente: this.todosLosClientes.length + 1,
            NombreCliente: datos.nombre,
            NIT: datos.nit,
            Direccion: datos.direccion,
            Telefono: datos.telefono,
            Estatus: datos.activo ? 1 : 0
        };

        this.todosLosClientes = [nuevo, ...this.todosLosClientes];
        this.textoBusqueda.set(this.textoBusqueda());
    }

    exportarExcel(): void {
        const datosParaExportar = this.clientesFiltrados().map(c => ({
            'No.': this.formatearNumero(c.CodigoCliente),
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
        return num.toString().padStart(2, '0');
    }

}
