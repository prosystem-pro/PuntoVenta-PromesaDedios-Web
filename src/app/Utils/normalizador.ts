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

/**
 * Valida un NIT guatemalteco mediante el dígito verificador módulo 11.
 * Espera el valor ya normalizado (solo dígitos y opcionalmente 'K' al final).
 * Devuelve true si el verificador coincide.
 */
export function esNITValido(valor: string | null | undefined): boolean {
    const nit = (valor || '').toString().toUpperCase().replace(/[^0-9K]/g, '');
    if (nit.length < 2) return false;
    const cuerpo = nit.slice(0, -1);
    const verificador = nit.slice(-1);
    if (!/^\d+$/.test(cuerpo)) return false;
    const largo = cuerpo.length;
    let suma = 0;
    for (let i = 0; i < largo; i++) {
        suma += parseInt(cuerpo[i], 10) * (largo + 1 - i);
    }
    const esperadoNum = (11 - (suma % 11)) % 11;
    const esperado = esperadoNum === 10 ? 'K' : esperadoNum.toString();
    return verificador === esperado;
}
