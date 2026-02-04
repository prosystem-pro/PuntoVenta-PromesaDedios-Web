import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Proveedor } from '../../Modelos/proveedor.modelo';
import { Entorno } from '../../Entorno/Entorno';
import { ModalProveedor } from './modal-proveedor/modal-proveedor';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-proveedores',
    standalone: true,
    imports: [FormsModule, CommonModule, ModalProveedor],
    templateUrl: './proveedores.html',
    styleUrl: './proveedores.css',
})
export class Proveedores implements OnInit {
    // Color del sistema desde Entorno
    colorSistema = Entorno.ColorSistema;

    // Datos
    private todosLosProveedores: Proveedor[] = [];

    // Busqueda
    textoBusqueda = signal('');

    // Control del modal
    mostrarModalCrear = signal(false);

    // Paginacion fija
    paginaActual = signal(1);
    itemsPorPagina = 7;

    // Proveedores filtrados basados en busqueda
    proveedoresFiltrados = computed(() => {
        const busqueda = this.textoBusqueda().toLowerCase().trim();
        if (!busqueda) {
            return this.todosLosProveedores;
        }
        return this.todosLosProveedores.filter(p =>
            p.NombreProveedor.toLowerCase().includes(busqueda) ||
            p.NIT.toLowerCase().includes(busqueda) ||
            p.Telefono.includes(busqueda) ||
            p.Direccion.toLowerCase().includes(busqueda)
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

    private cargarProveedores(): void {
        // Simulacion de JSON del API con 20 registros
        const nombres = [
            'Maria Luisa Castro Merida de Juarez',
            'Distribuidora Global S.A.',
            'Suministros Industriales S.A.',
            'Comercializadora del Sur',
            'Importaciones Modernas',
            'Tecnologias Avanzadas',
            'Soluciones Logisticas S.A.',
            'Alimentos y Bebidas del Norte',
            'Materiales de Construccion S.A.',
            'Servicios Integrales de Limpieza',
            'Muebles y Equipos de Oficina',
            'Textiles del Centro',
            'Repuestos y Accesorios Express',
            'Papeleria y Utiles S.A.',
            'Quimicos y Solventes Industriales',
            'Herramientas y Maquinaria S.A.',
            'Embalajes y Empaques',
            'Sistemas de Seguridad Integrados',
            'Mantenimiento Tecnico Profesional',
            'Agencia de Publicidad y Medios'
        ];

        this.todosLosProveedores = Array(20).fill(null).map((_, i) => ({
            CodigoProveedor: i + 1,
            NombreProveedor: nombres[i],
            Telefono: '4456-7665',
            NIT: `8897322-${i % 9 + 1}`,
            Direccion: 'San Antonio Palopo, Sololá',
            Correo: `proveedor${i + 1}@correo.com`,
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
    eliminarProveedor(id: number): void {
        console.log('Eliminando proveedor:', id);
        if (confirm('¿Esta seguro de eliminar este proveedor?')) {
            this.todosLosProveedores = this.todosLosProveedores.filter(p => p.CodigoProveedor !== id);
            this.textoBusqueda.set(this.textoBusqueda()); // Forzar actualizacion
        }
    }

    editarProveedor(proveedor: Proveedor): void {
        console.log('Editando proveedor:', proveedor.NombreProveedor);
        // Mas adelante se podria implementar la logica de editar
    }

    crearProveedor(): void {
        console.log('Abriendo modal para crear proveedor...');
        this.mostrarModalCrear.set(true);
    }

    cerrarModalCrear(): void {
        this.mostrarModalCrear.set(false);
    }

    manejarGuardarProveedor(datos: any): void {
        console.log('Nuevo proveedor capturado:', datos);

        const nuevo: Proveedor = {
            CodigoProveedor: this.todosLosProveedores.length + 1,
            NombreProveedor: datos.nombre,
            Telefono: datos.telefono,
            NIT: datos.nit,
            Direccion: datos.direccion,
            Correo: datos.correo,
            Estatus: datos.activo ? 1 : 0
        };

        this.todosLosProveedores = [nuevo, ...this.todosLosProveedores];
        this.textoBusqueda.set(this.textoBusqueda());
    }

    exportarExcel(): void {
        const datosParaExportar = this.proveedoresFiltrados().map(p => ({
            'No.': this.formatearNumero(p.CodigoProveedor),
            'Nombre': p.NombreProveedor,
            'NIT': p.NIT,
            'Teléfono': p.Telefono,
            'Dirección': p.Direccion,
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
        return num.toString().padStart(2, '0');
    }

}
