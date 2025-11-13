// lib/password-validation.ts
// Day 10: Password Validation Utilities

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Waliduje hasło pod kątem wymagań bezpieczeństwa
 * @param password - Hasło do sprawdzenia
 * @returns Obiekt z rezultatem walidacji i listą błędów
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  // Minimum 8 znaków
  if (password.length < 8) {
    errors.push('Hasło musi mieć minimum 8 znaków');
  }

  // Przynajmniej jedna wielka litera
  if (!/[A-Z]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną wielką literę');
  }

  // Przynajmniej jedna mała litera
  if (!/[a-z]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną małą literę');
  }

  // Przynajmniej jedna cyfra
  if (!/[0-9]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną cyfrę');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface PasswordStrength {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  color: string;
  label: string;
}

/**
 * Oblicza siłę hasła
 * @param password - Hasło do oceny
 * @returns Obiekt z oceną siły hasła
 */
export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;

  // Długość
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Znaki
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++; // Znaki specjalne

  // Złożoność
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 6) score++;

  // Ocena
  if (score <= 3) {
    return {
      strength: 'weak',
      score,
      color: 'text-red-500',
      label: 'Słabe',
    };
  }

  if (score <= 6) {
    return {
      strength: 'medium',
      score,
      color: 'text-yellow-500',
      label: 'Średnie',
    };
  }

  return {
    strength: 'strong',
    score,
    color: 'text-green-500',
    label: 'Silne',
  };
}

/**
 * Sprawdza czy hasło jest powszechnie używane (słabe hasło)
 * @param password - Hasło do sprawdzenia
 * @returns true jeśli hasło jest na liście najpopularniejszych
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    '12345678',
    'password',
    'password123',
    'qwerty',
    'qwerty123',
    'admin',
    'admin123',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
    'Password1',
    'password1',
    'qwertyui',
  ];

  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Pełna walidacja hasła (z checkowanie popularnych haseł)
 * @param password - Hasło do walidacji
 * @returns Obiekt z rezultatem walidacji
 */
export function validatePasswordStrict(password: string): PasswordValidation {
  const validation = validatePassword(password);

  // Dodatkowy check dla popularnych haseł
  if (validation.isValid && isCommonPassword(password)) {
    validation.isValid = false;
    validation.errors.push(
      'To hasło jest zbyt powszechne. Wybierz bardziej unikalne hasło.'
    );
  }

  return validation;
}

/**
 * Sprawdza czy hasła są identyczne
 * @param password - Hasło
 * @param confirmPassword - Potwierdzenie hasła
 * @returns true jeśli hasła są identyczne
 */
export function passwordsMatch(
  password: string,
  confirmPassword: string
): boolean {
  return password === confirmPassword;
}

/**
 * Generuje sugestie dla poprawy hasła
 * @param password - Hasło do oceny
 * @returns Array sugestii
 */
export function getPasswordSuggestions(password: string): string[] {
  const suggestions: string[] = [];

  if (password.length < 8) {
    suggestions.push('Dodaj więcej znaków (minimum 8)');
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('Dodaj wielką literę');
  }

  if (!/[a-z]/.test(password)) {
    suggestions.push('Dodaj małą literę');
  }

  if (!/[0-9]/.test(password)) {
    suggestions.push('Dodaj cyfrę');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    suggestions.push('Dodaj znak specjalny (!@#$%^&*)');
  }

  if (password.length < 12) {
    suggestions.push('Rozważ dłuższe hasło (12+ znaków) dla większego bezpieczeństwa');
  }

  return suggestions;
}
