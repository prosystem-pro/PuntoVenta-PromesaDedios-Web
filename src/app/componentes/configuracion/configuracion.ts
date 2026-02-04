import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Entorno } from '../../Entorno/Entorno';
import { Empresa } from '../../Modelos/empresa.modelo';
import { Mesa } from '../../Modelos/mesa.modelo';
import { ModalMesa } from './modal-mesa/modal-mesa';
import { ModalClasificacion } from './modal-clasificacion/modal-clasificacion';

@Component({
    selector: 'app-configuracion',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalMesa, ModalClasificacion],
    templateUrl: './configuracion.html',
    styleUrl: './configuracion.css'
})
export class Configuracion implements OnInit {
    colorSistemaValue = Entorno.ColorSistema;

    // Formulario Empresa
    empresaForm: FormGroup;
    logoUrl = signal('logoPromesaDeDios.png');

    // Datos Mesas
    todasLasMesas = signal<Mesa[]>([]);

    // Control Modales
    mostrarModalMesa = signal(false);
    mostrarModalClasificacion = signal(false);

    // Paginación Mesas
    paginaActual = signal(1);
    itemsPorPagina = 5;

    totalRegistros = computed(() => this.todasLasMesas().length);
    totalPaginas = computed(() => Math.ceil(this.totalRegistros() / this.itemsPorPagina));

    mesasPaginadas = computed(() => {
        const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return this.todasLasMesas().slice(inicio, fin);
    });

    rangoInicio = computed(() => {
        if (this.totalRegistros() === 0) return 0;
        return (this.paginaActual() - 1) * this.itemsPorPagina + 1;
    });

    rangoFin = computed(() => {
        const fin = this.paginaActual() * this.itemsPorPagina;
        return Math.min(fin, this.totalRegistros());
    });

    constructor(private fb: FormBuilder) {
        this.empresaForm = this.fb.group({
            empresa: ['Promesa de Dios', [Validators.required]],
            propietario: ['Victor Samines', [Validators.required]],
            correo: ['contoso@ejemplo.com', [Validators.required, Validators.email]],
            telefono: ['4456-7665', [Validators.required]],
            departamento: ['Solola', [Validators.required]],
            municipio: ['San Antonio Palopo', [Validators.required]]
        });
    }

    ngOnInit(): void {
        this.cargarDatosMesas();
    }

    cargarDatosMesas(): void {
        // Datos simulados
        const mesas: Mesa[] = [
            { CodigoMesa: 1, CodigoClasificacionMesa: 1, NombreMesa: 'Mesa', Descripcion: '', ImagenUrl: '', Estatus: 1, NombreClasificacion: 'Salon Principal', CantidadMesas: 10 },
            { CodigoMesa: 2, CodigoClasificacionMesa: 2, NombreMesa: 'Sillones', Descripcion: '', ImagenUrl: '', Estatus: 1, NombreClasificacion: 'Jardin', CantidadMesas: 8 },
            { CodigoMesa: 3, CodigoClasificacionMesa: 3, NombreMesa: 'Barra', Descripcion: '', ImagenUrl: '', Estatus: 1, NombreClasificacion: 'Terraza', CantidadMesas: 5 },
            { CodigoMesa: 4, CodigoClasificacionMesa: 1, NombreMesa: 'Mesa', Descripcion: '', ImagenUrl: '', Estatus: 1, NombreClasificacion: 'Salon 2', CantidadMesas: 10 }
        ];
        this.todasLasMesas.set(mesas);
    }

    actualizarEmpresa(): void {
        if (this.empresaForm.valid) {
            console.log('Actualizando datos de empresa:', this.empresaForm.value);
            alert('Información de la empresa actualizada correctamente');
        } else {
            this.empresaForm.markAllAsTouched();
        }
    }

    solicitarImagen(): void {
        console.log('Solicitando cambio de imagen...');
    }

    // Métodos Mesas
    crearMesas(): void {
        this.mostrarModalMesa.set(true);
    }

    cerrarModalMesa(): void {
        this.mostrarModalMesa.set(false);
    }

    manejarGuardarMesa(datos: any): void {
        console.log('Nueva mesa capturada:', datos);
        const nueva: Mesa = {
            CodigoMesa: this.todasLasMesas().length + 1,
            CodigoClasificacionMesa: datos.clasificacion,
            NombreMesa: datos.nombre,
            Descripcion: '',
            ImagenUrl: '',
            Estatus: datos.activo ? 1 : 0,
            NombreClasificacion: 'Clasificación ' + datos.clasificacion, // Simulado
            CantidadMesas: datos.cantidad
        };
        this.todasLasMesas.update(m => [...m, nueva]);
    }

    editarMesa(mesa: Mesa): void {
        console.log('Editando mesa:', mesa);
    }

    eliminarMesa(id: number): void {
        if (confirm('¿Está seguro de eliminar esta configuración de mesas?')) {
            this.todasLasMesas.update(m => m.filter(item => item.CodigoMesa !== id));
        }
    }

    // Paginación
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

    formatearNumero(num: number): string {
        return num.toString().padStart(2, '0');
    }
}
