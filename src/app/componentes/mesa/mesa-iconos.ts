// Catalogo de iconos "quemados" para las mesas. El propietario elige, al crear la
// configuracion de mesa, el que mejor se adapte a la clasificacion. El id se guarda
// en el campo IconoUrl/ImagenUrl de la mesa.
//
// bi = clase de Bootstrap Icons. bi: null => se pinta el icono SVG de mesa (mesa con sillas).
export interface MesaIcono {
    id: string;
    nombre: string;
    bi: string | null;
}

export const MESA_ICONOS: MesaIcono[] = [
    { id: 'mesa', nombre: 'Mesa', bi: null },
    { id: 'bi-cup-hot-fill', nombre: 'Café / Barra', bi: 'bi-cup-hot-fill' },
    { id: 'bi-tree-fill', nombre: 'Jardín', bi: 'bi-tree-fill' },
    { id: 'bi-umbrella-fill', nombre: 'Terraza', bi: 'bi-umbrella-fill' },
    { id: 'bi-car-front-fill', nombre: 'Parqueo', bi: 'bi-car-front-fill' },
    { id: 'bi-house-door-fill', nombre: 'Salón', bi: 'bi-house-door-fill' },
    { id: 'bi-flower1', nombre: 'Patio', bi: 'bi-flower1' },
    { id: 'bi-star-fill', nombre: 'VIP', bi: 'bi-star-fill' }
];

export const MESA_ICONO_DEFECTO = 'mesa';

export function buscarMesaIcono(id: string | null | undefined): MesaIcono {
    return MESA_ICONOS.find(i => i.id === id) ?? MESA_ICONOS[0];
}
