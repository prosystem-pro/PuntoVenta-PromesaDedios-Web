import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';

@Component({
    selector: 'app-modal-terminal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './modal-terminal.html',
    styleUrl: './modal-terminal.css'
})
export class ModalTerminal implements OnInit {
    @Input() visible = false;
    @Input() colorSistema = '#ff9500';
    @Output() alCerrar = new EventEmitter<void>();
    @Output() alGuardar = new EventEmitter<any>();

    terminalForm: FormGroup;

    // Usuarios simulados (Deberían venir del API en el futuro)
    usuariosActivos = [
        { id: 1, nombre: 'Mario Castro Mejia' },
        { id: 2, nombre: 'Carlos Merida' },
        { id: 3, nombre: 'Roberto Carlos Yoxon' },
        { id: 4, nombre: 'Victor Samines' },
        { id: 5, nombre: 'Melani De León' },
        { id: 6, nombre: 'Carla de Leon' },
        { id: 7, nombre: 'Maynor Calel' },
        { id: 8, nombre: 'Douglas Clavery Muñoz' },
        { id: 9, nombre: 'Sofia Valery de Leon' },
        { id: 10, nombre: 'Adelina Soto' },
        { id: 11, nombre: 'Isai Miranda' },
        { id: 12, nombre: 'Sergio Mejia' },
        { id: 13, nombre: 'Beatriz Mejia' },
        { id: 14, nombre: 'Nelson Castro Mejia' },
        { id: 15, nombre: 'Ericka Castro' },
        { id: 16, nombre: 'Carmen Jacinto' }
    ];

    constructor(private fb: FormBuilder) {
        const usuariosGroup: any = {};
        this.usuariosActivos.forEach(u => {
            usuariosGroup[`u_${u.id}`] = new FormControl(false);
        });

        this.terminalForm = this.fb.group({
            nombreTerminal: ['', [Validators.required]],
            usuarios: this.fb.group(usuariosGroup)
        });
    }

    ngOnInit(): void { }

    cerrar() {
        this.alCerrar.emit();
        this.terminalForm.reset();
    }

    guardar() {
        if (this.terminalForm.valid) {
            this.alGuardar.emit(this.terminalForm.value);
            this.cerrar();
        } else {
            this.terminalForm.markAllAsTouched();
        }
    }
}
