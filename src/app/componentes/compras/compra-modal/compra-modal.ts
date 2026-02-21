import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Entorno } from '../../../Entorno/Entorno';

@Component({
    selector: 'app-compra-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './compra-modal.html',
    styleUrl: './compra-modal.css'
})
export class CompraModal {
    private fb = inject(FormBuilder);

    @Input() visible = false;
    @Output() cerrar = new EventEmitter<void>();
    @Output() guardado = new EventEmitter<any>();

    colorSistema = Entorno.ColorSistema;
    form: FormGroup;

    // Opciones Mockup
    categorias = ['Endulzante', 'Harina', 'Lácteos', 'Limpieza'];
    presentaciones = ['Unidad', 'Libra', 'Litro', 'Caja'];
    mediosPago = ['Efectivo', 'Tarjeta de credito', 'Transferencia', 'Cheque'];
    metodosPago = ['Contado', 'Credito'];

    constructor() {
        this.form = this.fb.group({
            Proveedor: ['', Validators.required],
            Items: this.fb.array([]),
            MedioPago: ['Efectivo'],
            MetodoPago: ['Contado'],
            FechaVencimiento: ['2025-11-25']
        });

        // Cargar algunos items de ejemplo iniciales
        this.agregarItemMockup('Endulzante', 'Azucar caña real', 'Unidad', 4, 30);
        this.agregarItemMockup('Endulzante', 'Azucar morena', 'Unidad', 3, 25);
        this.agregarItemMockup('Harina', 'Arina blanca', 'Libra', 5, 50);
    }

    get items() {
        return this.form.get('Items') as FormArray;
    }

    agregarItemMockup(cat: string, prod: string, pres: string, precio: number, cant: number) {
        this.items.push(this.fb.group({
            Categoria: [cat],
            Producto: [prod],
            Presentacion: [pres],
            Precio: [precio],
            Cantidad: [cant]
        }));
    }

    eliminarItem(index: number) {
        this.items.removeAt(index);
    }

    onCerrar() {
        this.cerrar.emit();
    }

    onGuardar() {
        if (this.form.valid) {
            this.guardado.emit(this.form.value);
            this.onCerrar();
        }
    }
}
