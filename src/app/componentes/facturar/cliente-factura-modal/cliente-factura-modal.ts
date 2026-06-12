import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cliente } from '../../../Modelos/cliente.modelo';
import { ClienteServicio } from '../../../Servicios/cliente.service';
import { AlertaServicio } from '../../../Servicios/alerta.service';
import { ModalCliente } from '../../clientes/modal-cliente/modal-cliente';

@Component({
    selector: 'app-cliente-factura-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalCliente],
    templateUrl: './cliente-factura-modal.html',
    styleUrl: './cliente-factura-modal.css'
})
export class ClienteFacturaModal implements OnChanges {
    private servicioCliente = inject(ClienteServicio);
    private servicioAlerta = inject(AlertaServicio);

    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Input() textoConfirmar = 'Facturar';
    /** Si true, exige seleccionar un cliente registrado (no permite C/F). Útil para "Bajo pedido". */
    @Input() requiereCliente = false;
    /** Si true, muestra y exige la fecha de entrega (flujo "Bajo pedido"). */
    @Input() pedirFechaEntrega = false;

    @Output() alCerrar = new EventEmitter<void>();
    @Output() alConfirmar = new EventEmitter<{ cliente: Cliente | null; fechaEntrega: string | null }>();

    fechaEntrega = signal<string>('');

    // Hoy en YYYY-MM-DD: la fecha de entrega no puede ser anterior a hoy (solo hoy o futuro)
    get hoyISO(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    clientes = signal<Cliente[]>([]);
    cargando = signal(false);

    // Búsqueda por nombre
    textoBusqueda = signal('');
    mostrarSugerencias = signal(false);
    clienteSeleccionado = signal<Cliente | null>(null);

    // Modal de registro de cliente nuevo (reutiliza el componente existente)
    mostrarModalNuevo = signal(false);

    private yaCargado = false;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.reiniciar();
            if (!this.yaCargado) {
                this.cargarClientes();
            }
        }
    }

    private reiniciar() {
        this.clienteSeleccionado.set(null);
        this.textoBusqueda.set('');
        this.mostrarSugerencias.set(false);
        this.fechaEntrega.set('');
    }

    async cargarClientes() {
        this.cargando.set(true);
        const res = await this.servicioCliente.listarClientes();
        this.cargando.set(false);
        if (res.success) {
            this.clientes.set((res.data as Cliente[]) || []);
            this.yaCargado = true;
        } else {
            this.servicioAlerta.MostrarError(res, 'Error al cargar clientes');
        }
    }

    sugerencias = computed(() => {
        const texto = this.textoBusqueda().toLowerCase().trim();
        if (!texto) return this.clientes().slice(0, 8);
        return this.clientes().filter(c =>
            c.NombreCliente?.toLowerCase().includes(texto) ||
            c.NIT?.toLowerCase().includes(texto) ||
            c.Telefono?.includes(texto)
        ).slice(0, 8);
    });

    alEscribir(valor: string) {
        this.textoBusqueda.set(valor);
        this.mostrarSugerencias.set(true);
        // Si el usuario edita el nombre, deja de coincidir con el cliente seleccionado
        if (this.clienteSeleccionado() && valor !== this.clienteSeleccionado()!.NombreCliente) {
            this.clienteSeleccionado.set(null);
        }
    }

    seleccionarCliente(cliente: Cliente) {
        this.clienteSeleccionado.set(cliente);
        this.textoBusqueda.set(cliente.NombreCliente);
        this.mostrarSugerencias.set(false);
    }

    ocultarSugerencias() {
        // Pequeño retraso para permitir el click en una sugerencia antes de ocultar
        setTimeout(() => this.mostrarSugerencias.set(false), 150);
    }

    // --- Registro de cliente nuevo (reutiliza ModalCliente) ---
    abrirNuevoCliente() {
        this.mostrarModalNuevo.set(true);
    }

    cerrarNuevoCliente() {
        this.mostrarModalNuevo.set(false);
    }

    async guardarNuevoCliente(datos: any) {
        const res = await this.servicioCliente.crearCliente(datos);
        if (res.success) {
            this.servicioAlerta.MostrarToast('Cliente registrado correctamente', 'success');
            this.mostrarModalNuevo.set(false);
            await this.cargarClientes();
            // Auto-seleccionar el cliente recién creado (por nombre)
            const nuevo = this.clientes().find(c => c.NombreCliente === datos.NombreCliente);
            if (nuevo) this.seleccionarCliente(nuevo);
        } else {
            const mensaje = this.servicioCliente.interpretarError(res);
            this.servicioAlerta.MostrarError({ message: mensaje }, 'Error al guardar cliente');
        }
    }

    confirmar() {
        if (this.requiereCliente && !this.clienteSeleccionado()) {
            this.servicioAlerta.MostrarAlerta('Debe seleccionar un cliente registrado para continuar');
            return;
        }
        if (this.pedirFechaEntrega && !this.fechaEntrega()) {
            this.servicioAlerta.MostrarAlerta('Debe indicar la fecha de entrega');
            return;
        }
        if (this.pedirFechaEntrega && this.fechaEntrega() < this.hoyISO) {
            this.servicioAlerta.MostrarAlerta('La fecha de entrega no puede ser anterior a hoy');
            return;
        }
        this.alConfirmar.emit({
            cliente: this.clienteSeleccionado(),
            fechaEntrega: this.fechaEntrega() || null
        });
    }

    cerrar() {
        this.alCerrar.emit();
    }
}
