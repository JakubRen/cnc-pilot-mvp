import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  getPasswordStrength,
  isCommonPassword,
  validatePasswordStrict,
  passwordsMatch,
  getPasswordSuggestions
} from '@/lib/password-validation'

describe('validatePassword', () => {
  it('should pass for valid password', () => {
    const result = validatePassword('StrongPass123')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should fail for password shorter than 8 characters', () => {
    const result = validatePassword('Abc123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Hasło musi mieć minimum 8 znaków')
  })

  it('should fail for password without uppercase letter', () => {
    const result = validatePassword('lowercase123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Hasło musi zawierać przynajmniej jedną wielką literę')
  })

  it('should fail for password without lowercase letter', () => {
    const result = validatePassword('UPPERCASE123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Hasło musi zawierać przynajmniej jedną małą literę')
  })

  it('should fail for password without number', () => {
    const result = validatePassword('NoNumbersHere')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Hasło musi zawierać przynajmniej jedną cyfrę')
  })

  it('should return multiple errors for weak password', () => {
    const result = validatePassword('weak')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('getPasswordStrength', () => {
  it('should return weak for short passwords', () => {
    const result = getPasswordStrength('abc')
    expect(result.strength).toBe('weak')
    expect(result.label).toBe('Słabe')
  })

  it('should return medium for decent passwords', () => {
    const result = getPasswordStrength('Password1')
    expect(result.strength).toBe('medium')
    expect(result.label).toBe('Średnie')
  })

  it('should return strong for complex passwords', () => {
    const result = getPasswordStrength('MyStr0ng!P@ssword2024')
    expect(result.strength).toBe('strong')
    expect(result.label).toBe('Silne')
  })

  it('should have higher score for longer passwords', () => {
    const short = getPasswordStrength('Pass123!')
    const long = getPasswordStrength('MyVeryLongSecurePassword123!')
    expect(long.score).toBeGreaterThan(short.score)
  })
})

describe('isCommonPassword', () => {
  it('should detect common passwords', () => {
    expect(isCommonPassword('12345678')).toBe(true)
    expect(isCommonPassword('password')).toBe(true)
    expect(isCommonPassword('password123')).toBe(true)
    expect(isCommonPassword('qwerty')).toBe(true)
    expect(isCommonPassword('admin123')).toBe(true)
  })

  it('should be case insensitive', () => {
    expect(isCommonPassword('PASSWORD')).toBe(true)
    expect(isCommonPassword('Password')).toBe(true)
    expect(isCommonPassword('QWERTY')).toBe(true)
  })

  it('should return false for unique passwords', () => {
    expect(isCommonPassword('MyUniquePassword123!')).toBe(false)
    expect(isCommonPassword('xK9#mN2$pQ7')).toBe(false)
  })
})

describe('validatePasswordStrict', () => {
  it('should pass for strong unique password', () => {
    const result = validatePasswordStrict('UniquePass123!')
    expect(result.isValid).toBe(true)
  })

  it('should fail for common passwords even if they meet other criteria', () => {
    const result = validatePasswordStrict('Password1')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('To hasło jest zbyt powszechne. Wybierz bardziej unikalne hasło.')
  })
})

describe('passwordsMatch', () => {
  it('should return true for matching passwords', () => {
    expect(passwordsMatch('password123', 'password123')).toBe(true)
  })

  it('should return false for different passwords', () => {
    expect(passwordsMatch('password123', 'password124')).toBe(false)
  })

  it('should be case sensitive', () => {
    expect(passwordsMatch('Password', 'password')).toBe(false)
  })
})

describe('getPasswordSuggestions', () => {
  it('should suggest adding more characters for short password', () => {
    const suggestions = getPasswordSuggestions('abc')
    expect(suggestions).toContain('Dodaj więcej znaków (minimum 8)')
  })

  it('should suggest adding uppercase for lowercase-only password', () => {
    const suggestions = getPasswordSuggestions('lowercase123')
    expect(suggestions).toContain('Dodaj wielką literę')
  })

  it('should suggest adding number for letters-only password', () => {
    const suggestions = getPasswordSuggestions('OnlyLetters')
    expect(suggestions).toContain('Dodaj cyfrę')
  })

  it('should suggest special characters', () => {
    const suggestions = getPasswordSuggestions('NoSpecial123')
    expect(suggestions).toContain('Dodaj znak specjalny (!@#$%^&*)')
  })

  it('should return empty array for strong password', () => {
    const suggestions = getPasswordSuggestions('VeryStrongPassword123!')
    expect(suggestions).toHaveLength(0)
  })
})
