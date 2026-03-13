/**
 * Valida se a senha atende aos requisitos de segurança:
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
        errors.push('Senha deve ter no mínimo 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Senha deve conter pelo menos uma letra minúscula');
    }
    
    if (!/[0-9]/.test(password)) {
        errors.push('Senha deve conter pelo menos um número');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Senha deve conter pelo menos um caractere especial');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Valida CPF usando algoritmo oficial
 */
export function validarCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    cpf = cpf.replace(/[^\d]/g, '');
    
    // Verifica se tem 11 dígitos ou se é uma sequência repetida (ex: 111.111.111-11)
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
        return false;
    }
    
    // Calcula primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto >= 10 ? 0 : resto;
    
    // Verifica primeiro dígito
    if (parseInt(cpf.charAt(9)) !== digito1) {
        return false;
    }
    
    // Calcula segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digito2 = resto >= 10 ? 0 : resto;
    
    // Verifica segundo dígito
    return parseInt(cpf.charAt(10)) === digito2;
}

/**
 * Formata CPF para exibição
 */
export function formatarCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
