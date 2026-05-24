// Utilidades de normalización de datos para formularios.
// Aplican formato consistente (Title Case, NIT sin guiones, etc.) antes de
// mostrar al usuario y antes de enviar al backend.

export function normalizarTitleCase(valor: string | null | undefined): string {
    if (!valor) return '';
    return valor
        .toString()
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/(^|\s|-|\/)([a-záéíóúñ])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

export function normalizarNIT(valor: string | null | undefined): string {
    if (!valor) return '';
    // NIT en Guatemala admite dígitos y opcionalmente 'K' como dígito verificador.
    return valor.toString().toUpperCase().replace(/[^0-9K]/g, '');
}

export function normalizarTelefono(valor: string | null | undefined): string {
    if (!valor) return '';
    return valor.toString().replace(/\D/g, '').slice(0, 8);
}

export function normalizarCorreo(valor: string | null | undefined): string {
    if (!valor) return '';
    return valor.toString().trim().toLowerCase();
}

export function normalizarTextoLimpio(valor: string | null | undefined): string {
    if (!valor) return '';
    return valor.toString().trim().replace(/\s+/g, ' ');
}
