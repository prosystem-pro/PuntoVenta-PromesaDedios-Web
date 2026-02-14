import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Terminal } from '../../Modelos/terminal.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalTerminal } from './modal-terminal/modal-terminal';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-terminales',
    standalone: true,
    imports: [FormsModule, CommonModule, ModalTerminal],
    templateUrl: './terminales.html',
    styleUrl: './terminales.css',
})
export class Terminales implements OnInit {
    colorSistema = Entorno.ColorSistema;

    private todasLasTerminales: Terminal[] = [];

    textoBusqueda = signal('');
    mostrarModalCrear = signal(false);

    paginaActual = signal(1);
    itemsPorPagina = 7;

    terminalesFiltradas = computed(() => {
        const busqueda = this.textoBusqueda().toLowerCase().trim();
        if (!busqueda) {
            return this.todasLasTerminales;
        }
        return this.todasLasTerminales.filter(t =>
            t.NombreTerminal.toLowerCase().includes(busqueda)
        );
    });

    totalRegistros = computed(() => this.terminalesFiltradas().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));

    terminalesPaginadas = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.terminalesFiltradas().slice(inicio, fin);
    });

    rangoInicio = computed(() => {
        if (this.totalRegistros() === 0) return 0;
        return (this.paginaActual() - 1) * this.itemsPorPagina + 1;
    });

    rangoFin = computed(() => {
        const fin = this.paginaActual() * this.itemsPorPagina;
        return Math.min(fin, this.totalRegistros());
    });

    ngOnInit(): void {
        this.cargarTerminales();
    }

    private cargarTerminales(): void {
        const nombres = [
            'Principal',
            'Caja 01',
            'Caja 02',
            'Terminal Vendedor 01',
            'Terminal Vendedor 02',
            'Terminal Vendedor 03',
            'Terminal Vendedor 04',
            'Terminal Vendedor 05',
            'Terminal Vendedor 06',
            'Terminal'
        ];

        const usuarios = [3, 2, 4, 2, 1, 5, 2, 1, 5, 6];

        this.todasLasTerminales = nombres.map((nombre, i) => ({
            CodigoTerminal: i + 1,
            NombreTerminal: nombre,
            CantidadUsuarios: usuarios[i],
            Estatus: 1
        }));
    }

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

    eliminarTerminal(id: number): void {
    }

    editarTerminal(terminal: Terminal): void {
    }

    crearTerminal(): void {
        this.mostrarModalCrear.set(true);
    }

    cerrarModalCrear(): void {
        this.mostrarModalCrear.set(false);
    }

    manejarGuardarTerminal(datos: any): void {

        const nuevo: Terminal = {
            CodigoTerminal: this.todasLasTerminales.length + 1,
            NombreTerminal: datos.nombreTerminal,
            CantidadUsuarios: Object.values(datos.usuarios).filter(v => v === true).length,
            Estatus: 1
        };

        this.todasLasTerminales = [nuevo, ...this.todasLasTerminales];
        this.textoBusqueda.set('');
    }

    exportarExcel(): void {
        const datosParaExportar = this.terminalesFiltradas().map(t => ({
            'No.': this.formatearNumero(t.CodigoTerminal),
            'Nombre': t.NombreTerminal,
            '# Usuarios': t.CantidadUsuarios,
            'Estatus': t.Estatus === 1 ? 'Activo' : 'Inactivo'
        }));

        const hoja: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExportar);
        const libro: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Terminales');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(libro, `Listado_Terminales_${fecha}.xlsx`);
    }

    formatearNumero(num: number): string {
        return num.toString().padStart(2, '0');
    }
}
