import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Entorno } from '../../Entorno/Entorno';
import { Empresa } from '../../Modelos/empresa.modelo';
import { Mesa } from '../../Modelos/mesa.modelo';
import { ClasificacionMesa } from '../../Modelos/clasificacion-mesa.modelo';
import { ModalMesa } from './modal-mesa/modal-mesa';
import { ServicioConfiguracion } from '../../Servicios/configuracion.service';
import { AlertaServicio } from '../../Servicios/alerta.service';

@Component({
    selector: 'app-configuracion',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalMesa],
    templateUrl: './configuracion.html',
    styleUrl: './configuracion.css'
})
export class Configuracion implements OnInit {
    private servicioConfig = inject(ServicioConfiguracion);
    private servicioAlerta = inject(AlertaServicio);
    private fb = inject(FormBuilder);

    colorSistemaValue = Entorno.ColorSistema;

    // Formulario Empresa
    empresaForm: FormGroup;
    empresaActual = signal<Empresa | null>(null);
    logoUrl = signal(Entorno.Logo || 'logo.png');

    // Datos Mesas
    todasLasMesas = signal<Mesa[]>([]);
    clasificaciones = signal<ClasificacionMesa[]>([]);

    // Control Modales
    mostrarModalMesa = signal(false);
    mesaAEditar = signal<Mesa | null>(null);

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

    paginasArray = computed(() => {
        const total = this.totalPaginas();
        return Array.from({ length: total }, (_, i) => i + 1);
    });

    constructor() {
        this.empresaForm = this.fb.group({
            NombreComercial: ['', [Validators.required]],
            NombrePropietario: ['', [Validators.required]],
            Correo: ['', [Validators.required, Validators.email]],
            Telefono: ['', [Validators.required]],
            Departamento: ['', [Validators.required]],
            Municipio: ['', [Validators.required]],
            NIT: [''],
            Direccion: [''],
            RazonSocial: ['']
        });
    }

    ngOnInit(): void {
        this.cargarDatosEmpresa();
        this.cargarDatosMesas();
        this.cargarClasificaciones();
    }

    async cargarDatosEmpresa() {
        const res = await this.servicioConfig.obtenerEmpresas();
        if (res.success && res.data.length > 0) {
            const empresa = res.data[0];
            this.empresaActual.set(empresa);
            this.empresaForm.patchValue({
                NombreComercial: empresa.NombreComercial,
                NombrePropietario: empresa.NombrePropietario,
                Correo: empresa.Correo,
                Telefono: empresa.Telefono,
                Departamento: empresa.Departamento,
                Municipio: empresa.Municipio,
                NIT: empresa.NIT,
                Direccion: empresa.Direccion,
                RazonSocial: empresa.RazonSocial
            });
            if (empresa.ImagenUrl) {
                this.logoUrl.set(empresa.ImagenUrl);
            }
        }
    }

    async cargarDatosMesas() {
        const res = await this.servicioConfig.obtenerMesas();
        if (res.success) {
            // Transformamos el resultado para que coincida con lo esperado por la vista
            // El API devuelve: { Clasificacion, Apodo, TotalMesas }
            const mesasMapeadas = (res.data || []).map((m: any, index: number) => ({
                CodigoMesa: index + 1,
                NombreClasificacion: m.Clasificacion,
                NombreMesa: m.Apodo,
                CantidadMesas: m.TotalMesas,
                Estatus: 1, // Por defecto activo ya que el listado es de mesas operativas
                CodigoClasificacionMesa: 0
            }));
            this.todasLasMesas.set(mesasMapeadas);
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al cargar mesas');
        }
    }

    async cargarClasificaciones() {
        const res = await this.servicioConfig.obtenerClasificaciones();
        if (res.success) {
            this.clasificaciones.set(res.data);
        }
    }

    async actualizarEmpresa() {
        if (this.empresaForm.valid && this.empresaActual()) {
            const res = await this.servicioConfig.actualizarEmpresa(this.empresaActual()!.CodigoEmpresa, this.empresaForm.value);
            if (res.success) {
                this.servicioAlerta.MostrarExito('Configuración de empresa actualizada');
                this.cargarDatosEmpresa();
            } else {
                this.servicioAlerta.MostrarError(res, 'Error al actualizar empresa');
            }
        } else {
            this.empresaForm.markAllAsTouched();
        }
    }

    solicitarImagen(): void {
        // Implementación pendiente de carga de imagen
    }

    // Métodos Mesas
    crearMesas(): void {
        this.mesaAEditar.set(null);
        this.mostrarModalMesa.set(true);
    }

    cerrarModalMesa(): void {
        this.mostrarModalMesa.set(false);
        this.mesaAEditar.set(null);
    }

    async manejarGuardarMesa(datos: any) {
        let res;
        if (this.mesaAEditar()) {
            const clasifAnterior = this.clasificaciones().find(c => c.NombreClasificacion === this.mesaAEditar()!.NombreClasificacion);
            const payload = {
                CodigoClasificacionAnterior: clasifAnterior?.CodigoClasificacionMesa,
                CodigoClasificacionNuevo: datos.CodigoClasificacionMesa,
                ApodoAnterior: this.mesaAEditar()!.NombreMesa,
                ApodoNuevo: datos.NombreMesa,
                Cantidad: datos.CantidadMesas,
                IconoUrl: 'Mesa.png' // Default o del formulario si se agrega
            };
            res = await this.servicioConfig.editarMesa(payload);
        } else {
            const payload = {
                CodigoClasificacionMesa: datos.CodigoClasificacionMesa,
                NombreMesa: datos.NombreMesa,
                Cantidad: datos.CantidadMesas,
                IconoUrl: 'Mesa.png' // Default
            };
            res = await this.servicioConfig.crearMesa(payload);
        }

        if (res.success) {
            this.servicioAlerta.MostrarExito('Configuración de mesas guardada');
            this.cargarDatosMesas();
            this.cerrarModalMesa();
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al guardar mesas');
        }
    }

    editarMesa(mesa: any): void {
        // Mapear para que el modal reconozca el ID de la clasificación por su nombre
        const clasif = this.clasificaciones().find(c => c.NombreClasificacion === mesa.NombreClasificacion);
        if (clasif) {
            mesa.CodigoClasificacionMesa = clasif.CodigoClasificacionMesa;
        }
        this.mesaAEditar.set(mesa);
        this.mostrarModalMesa.set(true);
    }

    async eliminarMesa(mesa: any) {
        const confirmado = await this.servicioAlerta.Confirmacion('¿Está seguro?', `Se eliminarán las ${mesa.CantidadMesas} mesas de "${mesa.NombreMesa}"`);
        if (confirmado) {
            const clasif = this.clasificaciones().find(c => c.NombreClasificacion === mesa.NombreClasificacion);
            const payload = {
                CodigoClasificacionMesa: clasif?.CodigoClasificacionMesa,
                Apodo: mesa.NombreMesa
            };
            const res = await this.servicioConfig.eliminarMesa(payload);
            if (res.success) {
                this.servicioAlerta.MostrarExito('Configuración de mesas eliminada');
                this.cargarDatosMesas();
            } else {
                this.servicioAlerta.MostrarError(res, 'Error al eliminar');
            }
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
