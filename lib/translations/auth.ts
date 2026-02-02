// lib/translations/auth.ts
// Sections: auth, passwordReset, emailVerification

export const authTranslations = {
  // ============================================
  // AUTH / LOGIN / REGISTER
  // ============================================
  auth: {
    login: { pl: 'Logowanie', en: 'Login' },
    loginBtn: { pl: 'Zaloguj się', en: 'Sign In' },
    loggingIn: { pl: 'Logowanie...', en: 'Logging in...' },
    loginSuccess: { pl: 'Logowanie pomyślne!', en: 'Login successful!' },
    loginFailed: { pl: 'Logowanie nie powiodło się', en: 'Login failed' },
    register: { pl: 'Rejestracja', en: 'Register' },
    registerBtn: { pl: 'Zarejestruj się', en: 'Sign Up' },
    createAccount: { pl: 'Utwórz Konto', en: 'Create Account' },
    creatingAccount: { pl: 'Tworzenie konta...', en: 'Creating account...' },
    accountCreated: { pl: 'Konto utworzone pomyślnie!', en: 'Account created successfully!' },
    email: { pl: 'Email', en: 'Email' },
    emailPlaceholder: { pl: 'jan.kowalski@firma.pl', en: 'john.doe@company.com' },
    emailBusiness: { pl: 'Email (firmowy)', en: 'Email (business)' },
    emailBusinessHint: { pl: 'Użyj firmowego adresu email (nie gmail, wp, itp.)', en: 'Use your business email (not gmail, yahoo, etc.)' },
    password: { pl: 'Hasło', en: 'Password' },
    passwordPlaceholder: { pl: '••••••••', en: '••••••••' },
    fullName: { pl: 'Imię i Nazwisko', en: 'Full Name' },
    fullNamePlaceholder: { pl: 'Jan Kowalski', en: 'John Doe' },
    noAccount: { pl: 'Nie masz konta?', en: "Don't have an account?" },
    hasAccount: { pl: 'Masz już konto?', en: 'Already have an account?' },
    forgotPassword: { pl: 'Zapomniałeś hasła?', en: 'Forgot password?' },
    resetPassword: { pl: 'Zresetuj hasło', en: 'Reset password' },
    sendResetLink: { pl: 'Wyślij link resetujący', en: 'Send reset link' },
    invalidEmail: { pl: 'Nieprawidłowy adres email', en: 'Invalid email address' },
    passwordMinLength: { pl: 'Hasło musi mieć minimum {min} znaków', en: 'Password must be at least {min} characters' },
    nameMinLength: { pl: 'Imię i nazwisko musi mieć minimum {min} znaki', en: 'Name must be at least {min} characters' },
    checkingDomain: { pl: 'Sprawdzanie domeny email...', en: 'Checking email domain...' },
    companyNotFound: { pl: 'Nie można zidentyfikować firmy', en: 'Cannot identify company' },
    registrationError: { pl: 'Błąd rejestracji', en: 'Registration error' },
    genericError: { pl: 'Wystąpił błąd. Spróbuj ponownie.', en: 'An error occurred. Please try again.' },
    noAccess: { pl: 'Brak dostępu', en: 'Access Denied' },
    noAccessMessage: { pl: 'Nie masz uprawnień do wyświetlenia tej strony. Skontaktuj się z administratorem, jeśli uważasz, że to błąd.', en: "You don't have permission to view this page. Contact your administrator if you believe this is an error." },
    returnToDashboard: { pl: 'Wróć do Pulpitu', en: 'Return to Dashboard' },
    loggingOut: { pl: 'Wylogowywanie...', en: 'Logging out...' },
  },

  // ============================================
  // PASSWORD RESET
  // ============================================
  passwordReset: {
    title: { pl: 'Zapomniałeś hasła?', en: 'Forgot password?' },
    subtitle: { pl: 'Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła.', en: 'Enter your email address and we will send you a password reset link.' },
    emailLabel: { pl: 'Adres email', en: 'Email address' },
    sending: { pl: 'Wysyłanie...', en: 'Sending...' },
    sendLink: { pl: 'Wyślij link resetujący', en: 'Send reset link' },
    linkSent: { pl: 'Link resetujący został wysłany!', en: 'Reset link has been sent!' },
    checkEmail: { pl: 'Sprawdź swoją skrzynkę email', en: 'Check your email inbox' },
    sentTo: { pl: 'Wysłaliśmy link do resetowania hasła na adres:', en: 'We sent a password reset link to:' },
    linkSentConfirm: { pl: 'Link został wysłany', en: 'Link has been sent' },
    linkValid: { pl: 'Link jest ważny przez 1 godzinę', en: 'Link is valid for 1 hour' },
    checkSpam: { pl: 'Nie widzisz emaila? Sprawdź folder SPAM.', en: "Don't see the email? Check your SPAM folder." },
    backToLogin: { pl: '← Powrót do logowania', en: '← Back to login' },
    // New password
    setNewPassword: { pl: 'Ustaw nowe hasło', en: 'Set new password' },
    newPasswordSubtitle: { pl: 'Wprowadź nowe, bezpieczne hasło do swojego konta.', en: 'Enter a new, secure password for your account.' },
    newPassword: { pl: 'Nowe hasło', en: 'New password' },
    confirmPassword: { pl: 'Potwierdź hasło', en: 'Confirm password' },
    passwordStrength: { pl: 'Siła hasła:', en: 'Password strength:' },
    passwordsNotMatch: { pl: 'Hasła nie są identyczne', en: 'Passwords do not match' },
    passwordsMatch: { pl: 'Hasła są identyczne', en: 'Passwords match' },
    requirements: { pl: 'Wymagania dla hasła:', en: 'Password requirements:' },
    minChars: { pl: 'Minimum 8 znaków', en: 'Minimum 8 characters' },
    uppercase: { pl: 'Przynajmniej jedna wielka litera', en: 'At least one uppercase letter' },
    lowercase: { pl: 'Przynajmniej jedna mała litera', en: 'At least one lowercase letter' },
    number: { pl: 'Przynajmniej jedna cyfra', en: 'At least one number' },
    changingPassword: { pl: 'Zmienianie hasła...', en: 'Changing password...' },
    changePassword: { pl: 'Zmień hasło', en: 'Change password' },
    passwordChanged: { pl: 'Hasło zostało zmienione!', en: 'Password has been changed!' },
    redirecting: { pl: 'Przekierowanie do strony logowania...', en: 'Redirecting to login page...' },
    validationErrors: { pl: 'Błędy walidacji:', en: 'Validation errors:' },
  },

  // ============================================
  // EMAIL VERIFICATION
  // ============================================
  emailVerification: {
    title: { pl: 'Potwierdź swój adres email', en: 'Verify your email address' },
    subtitle: { pl: 'Wysłaliśmy link aktywacyjny na Twój adres email.', en: 'We sent an activation link to your email address.' },
    instruction: { pl: 'Aby kontynuować, musisz potwierdzić swój adres email klikając w link aktywacyjny.', en: 'To continue, you must confirm your email address by clicking the activation link.' },
    notSeeingEmail: { pl: 'Nie widzisz emaila?', en: "Don't see the email?" },
    checkSpam: { pl: 'Sprawdź folder SPAM lub Wiadomości niechciane', en: 'Check your SPAM or Junk folder' },
    waitFewMinutes: { pl: 'Poczekaj kilka minut - email może dotrzeć z opóźnieniem', en: 'Wait a few minutes - email might be delayed' },
    contactAdmin: { pl: 'Skontaktuj się z administratorem jeśli problem się powtarza', en: 'Contact administrator if the problem persists' },
    backToLogin: { pl: 'Powrót do logowania', en: 'Back to login' },
  },
} as const
