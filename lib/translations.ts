// lib/translations.ts
// Simple translation system for CNC-Pilot MVP

export type Language = 'pl' | 'en';

export const translations = {
  // ============================================
  // COMMON / SHARED
  // ============================================
  common: {
    appName: { pl: 'CNC-Pilot', en: 'CNC-Pilot' },
    tagline: { pl: 'System Zarządzania Produkcją', en: 'Production Management System' },
    loading: { pl: 'Ładowanie...', en: 'Loading...' },
    save: { pl: 'Zapisz', en: 'Save' },
    cancel: { pl: 'Anuluj', en: 'Cancel' },
    delete: { pl: 'Usuń', en: 'Delete' },
    edit: { pl: 'Edytuj', en: 'Edit' },
    view: { pl: 'Podgląd', en: 'View' },
    duplicate: { pl: 'Duplikuj', en: 'Duplicate' },
    create: { pl: 'Utwórz', en: 'Create' },
    add: { pl: 'Dodaj', en: 'Add' },
    search: { pl: 'Szukaj...', en: 'Search...' },
    filter: { pl: 'Filtruj', en: 'Filter' },
    clear: { pl: 'Wyczyść', en: 'Clear' },
    all: { pl: 'Wszystkie', en: 'All' },
    yes: { pl: 'Tak', en: 'Yes' },
    no: { pl: 'Nie', en: 'No' },
    error: { pl: 'Błąd', en: 'Error' },
    success: { pl: 'Sukces', en: 'Success' },
    confirm: { pl: 'Potwierdź', en: 'Confirm' },
    back: { pl: 'Wróć', en: 'Back' },
    next: { pl: 'Dalej', en: 'Next' },
    actions: { pl: 'Akcje', en: 'Actions' },
    status: { pl: 'Status', en: 'Status' },
    date: { pl: 'Data', en: 'Date' },
    name: { pl: 'Nazwa', en: 'Name' },
    type: { pl: 'Typ', en: 'Type' },
    results: { pl: 'Wyniki', en: 'Results' },
    description: { pl: 'Opis', en: 'Description' },
    notes: { pl: 'Notatki', en: 'Notes' },
    quantity: { pl: 'Ilość', en: 'Quantity' },
    price: { pl: 'Cena', en: 'Price' },
    cost: { pl: 'Koszt', en: 'Cost' },
    total: { pl: 'Razem', en: 'Total' },
    selectLanguage: { pl: 'Wybierz język', en: 'Select language' },
    polish: { pl: 'Polski', en: 'Polish' },
    english: { pl: 'Angielski', en: 'English' },
    length: { pl: 'Długość', en: 'Length' },
    width: { pl: 'Szerokość', en: 'Width' },
    height: { pl: 'Wysokość', en: 'Height' },
    complexity: { pl: 'Złożoność', en: 'Complexity' },
    reasoning: { pl: 'Uzasadnienie', en: 'Reasoning' },
    confidence: { pl: 'Pewność', en: 'Confidence' },
    material: { pl: 'Materiał', en: 'Material' },
    labor: { pl: 'Praca', en: 'Labor' },
    overhead: { pl: 'Koszty ogólne', en: 'Overhead' },
    margin: { pl: 'Marża', en: 'Margin' },
    apply: { pl: 'Zastosuj', en: 'Apply' },
    discard: { pl: 'Odrzuć', en: 'Discard' },
    perUnit: { pl: '/szt', en: '/unit' },
    perPiece: { pl: 'za sztukę', en: 'per piece' },
    costPerUnit: { pl: 'Koszt za sztukę', en: 'Cost per unit' },
    totalCost: { pl: 'Całkowity koszt', en: 'Total Cost' },
    milimeters: { pl: 'mm', en: 'mm' },
    hours: { pl: 'godz.', en: 'hours' },
    minutes: { pl: 'min.', en: 'min.' },
    undoOperation: { pl: 'Tej operacji nie można cofnąć.', en: 'This operation cannot be undone.' },
    pcs: { pl: 'szt.', en: 'pcs' },
  },

  // ============================================
  // NAVIGATION / SIDEBAR
  // ============================================
  nav: {
    dashboard: { pl: 'Pulpit', en: 'Dashboard' },
    orders: { pl: 'Zamówienia', en: 'Orders' },
    production: { pl: 'Plan Produkcji', en: 'Production' },
    customers: { pl: 'Kontrahenci', en: 'Contractors' },
    quotesExpress: { pl: 'Express Quote', en: 'Express Quote' },
    quotes: { pl: 'Oferty', en: 'Quotes' },
    calendar: { pl: 'Kalendarz', en: 'Calendar' },
    inventory: { pl: 'Magazyn', en: 'Inventory' },
    documents: { pl: 'Dokumenty', en: 'Documents' },
    timeTracking: { pl: 'Czas Pracy', en: 'Time Tracking' },
    qualityControl: { pl: 'Kontrola Jakości', en: 'Quality Control' },
    cooperation: { pl: 'Kooperacja', en: 'Cooperation' },
    machines: { pl: 'Maszyny', en: 'Machines' },
    carbon: { pl: 'Paszport Węglowy', en: 'Carbon Passport' },
    costs: { pl: 'Koszty i Rentowność', en: 'Costs & Profitability' },
    reports: { pl: 'Raporty', en: 'Reports' },
    revenue: { pl: 'Przychody', en: 'Revenue' },
    users: { pl: 'Użytkownicy', en: 'Users' },
    settings: { pl: 'Ustawienia', en: 'Settings' },
    docs: { pl: 'Portal Wiedzy', en: 'Knowledge Portal' },
    profile: { pl: 'Mój Profil', en: 'My Profile' },
    logout: { pl: 'Wyloguj', en: 'Logout' },
    closeMenu: { pl: 'Zamknij menu', en: 'Close menu' },
    toggleSidebar: { pl: 'Przełącz pasek boczny', en: 'Toggle sidebar' },
    clientPortal: { pl: 'Portal Klienta', en: 'Client Portal' },
  },

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
  // ROLES
  // ============================================
  roles: {
    owner: { pl: 'Właściciel', en: 'Owner' },
    admin: { pl: 'Administrator', en: 'Administrator' },
    manager: { pl: 'Manager', en: 'Manager' },
    operator: { pl: 'Operator', en: 'Operator' },
    viewer: { pl: 'Przeglądający', en: 'Viewer' },
    pending: { pl: 'Oczekujący', en: 'Pending' },
  },

  // ============================================
  // ORDER STATUS
  // ============================================
  orderStatus: {
    all: { pl: 'Wszystkie Statusy', en: 'All Status' },
    pending: { pl: 'Oczekujące', en: 'Pending' },
    in_progress: { pl: 'W Realizacji', en: 'In Progress' },
    completed: { pl: 'Ukończone', en: 'Completed' },
    delayed: { pl: 'Opóźnione', en: 'Delayed' },
    cancelled: { pl: 'Anulowane', en: 'Cancelled' },
    overdue: { pl: 'Po Terminie', en: 'Overdue' },
  },

  // ============================================
  // ORDERS PAGE
  // ============================================
  orders: {
    title: { pl: 'Zamówienia', en: 'Orders' },
    order: { pl: 'Zamówienie', en: 'Order' },
    addOrder: { pl: '+ Dodaj Zamówienie', en: '+ Add Order' },
    createFirst: { pl: '+ Utwórz pierwsze zamówienie', en: '+ Create first order' },
    noOrders: { pl: 'Brak zamówień', en: 'No orders' },
    noOrdersDesc: { pl: 'Nie masz jeszcze żadnych zamówień...', en: "You don't have any orders yet..." },
    startCreating: { pl: 'Rozpocznij od utworzenia pierwszego zamówienia', en: 'Start by creating your first order' },
    orderNumber: { pl: 'Nr Zam.', en: 'Order #' },
    customer: { pl: 'Klient', en: 'Customer' },
    deadline: { pl: 'Termin', en: 'Deadline' },
    selectAll: { pl: 'Zaznacz wszystkie', en: 'Select all' },
    deselectAll: { pl: 'Odznacz wszystkie', en: 'Deselect all' },
    selected: { pl: 'zaznaczono', en: 'selected' },
    markInProgress: { pl: 'Oznacz w toku', en: 'Mark in progress' },
    markCompleted: { pl: 'Oznacz jako zakończone', en: 'Mark as completed' },
    markDelayed: { pl: 'Oznacz jako opóźnione', en: 'Mark as delayed' },
    exportCsv: { pl: 'Eksportuj CSV', en: 'Export CSV' },
    displaying: { pl: 'Wyświetlanie {filtered} z {total} zamówień', en: 'Showing {filtered} of {total} orders' },
    deleteConfirm: { pl: 'Czy na pewno chcesz usunąć zamówienie', en: 'Are you sure you want to delete order' },
    deleting: { pl: 'Usuwanie zamówienia...', en: 'Deleting order...' },
    deleted: { pl: 'Zamówienie zostało usunięte', en: 'Order deleted' },
    deleteFailed: { pl: 'Nie udało się usunąć zamówienia', en: 'Failed to delete order' },
    duplicateConfirm: { pl: 'Czy na pewno chcesz zduplikować zamówienie', en: 'Are you sure you want to duplicate order' },
    duplicating: { pl: 'Duplikowanie zamówienia...', en: 'Duplicating order...' },
    duplicated: { pl: 'zostało zduplikowane', en: 'has been duplicated' },
    duplicateFailed: { pl: 'Nie udało się zduplikować zamówienia', en: 'Failed to duplicate order' },
    updateConfirm: { pl: 'Czy na pewno chcesz zmienić status {count} zamówień na "{status}"?', en: 'Are you sure you want to change status of {count} orders to "{status}"?' },
    updating: { pl: 'Aktualizacja zamówień...', en: 'Updating orders...' },
    updated: { pl: 'Pomyślnie zaktualizowano {count} zamówień', en: 'Successfully updated {count} orders' },
    updateFailed: { pl: 'Nie udało się zaktualizować zamówień', en: 'Failed to update orders' },
    noOrdersToExport: { pl: 'Brak zamówień do eksportu', en: 'No orders to export' },
    exported: { pl: 'Wyeksportowano {count} zamówień do CSV', en: 'Exported {count} orders to CSV' },
    exportFailed: { pl: 'Błąd podczas eksportu CSV', en: 'Error exporting CSV' },
    // Add Order Page specific
    addNewOrder: { pl: 'Dodaj nowe zamówienie', en: 'Add new order' },
    orderNumberRequired: { pl: 'Numer zamówienia wymagany', en: 'Order number required' },
    customerNameRequired: { pl: 'Nazwa klienta wymagana', en: 'Customer name required' },
    quantityRequired: { pl: 'Ilość musi być minimum 1', en: 'Quantity must be at least 1' },
    deadlineRequired: { pl: 'Termin wymagany', en: 'Deadline required' },
    partName: { pl: 'Nazwa Części', en: 'Part Name' },
    partNameHint: { pl: 'Wybierz z magazynu lub wpisz nową nazwę, aby zobaczyć historię podobnych zleceń.', en: 'Select from inventory or enter a new name to see similar order history.' },
    aiPricingCalculatorTitle: { pl: 'Kalkulator Wyceny AI', en: 'AI Pricing Calculator' },
    complexitySimple: { pl: 'Proste (1-2h obróbki)', en: 'Simple (1-2h processing)' },
    complexityMedium: { pl: 'Średnie (3-6h obróbki)', en: 'Medium (3-6h processing)' },
    complexityComplex: { pl: 'Złożone (8-20h obróbki)', en: 'Complex (8-20h processing)' },
    calculateAiPrice: { pl: 'Oblicz Wycenę AI', en: 'Calculate AI Price' },
    calculating: { pl: 'Obliczam...', en: 'Calculating...' },
    fillMaterialQuantity: { pl: 'Wypełnij materiał i ilość przed kalkulacją', en: 'Fill material and quantity before calculation' },
    pricingEstimateReady: { pl: 'Wycena gotowa!', en: 'Estimate ready!' },
    pricingCalculationError: { pl: 'Nie udało się obliczyć wyceny', en: 'Failed to calculate estimate' },
    suggestedPrice: { pl: 'Sugerowana cena', en: 'Suggested price' },
    pricePerUnit: { pl: 'Cena za sztukę', en: 'Price per unit' },
    materialCostLabel: { pl: 'Materiał (PLN)', en: 'Material (PLN)' },
    laborCostLabel: { pl: 'Praca (PLN)', en: 'Labor (PLN)' },
    overheadCostLabel: { pl: 'Setup/Inne (PLN)', en: 'Setup/Other (PLN)' },
    totalCostCalculated: { pl: 'Łączny Koszt:', en: 'Total Cost:' },
    savingOrder: { pl: 'Tworzenie zamówienia...', en: 'Creating order...' },
    createOrderBtn: { pl: 'Utwórz Zamówienie', en: 'Create Order' },
    orderCreated: { pl: 'Zamówienie utworzone!', en: 'Order created!' },
    createOrderFailed: { pl: 'Nie udało się utworzyć zamówienia', en: 'Failed to create order' },
    notLoggedIn: { pl: 'Nie jesteś zalogowany', en: 'You are not logged in' },
    noCompanyAssigned: { pl: 'Użytkownik nie przypisany do firmy', en: 'User not assigned to a company' },
    pricingApplied: { pl: 'Wycena zastosowana!', en: 'Pricing applied!' },
    localPriceApplied: { pl: 'Zastosowano cenę: {price} PLN/szt', en: 'Applied price: {price} PLN/unit' },
    costCalculationTitle: { pl: 'Kalkulacja Kosztów', en: 'Cost Calculation' },
    materialCostPositive: { pl: 'Koszt materiału musi być dodatni', en: 'Material cost must be positive' },
    laborCostPositive: { pl: 'Koszt pracy musi być dodatni', en: 'Labor cost must be positive' },
    overheadCostPositive: { pl: 'Koszty ogólne muszą być dodatnie', en: 'Overhead cost must be positive' },
    totalCostPositive: { pl: 'Całkowity koszt musi być dodatni', en: 'Total cost must be positive' },
    howItWorksTitle: { pl: '💡 Jak to działa?', en: '💡 How it works?' },
    howItWorksDesc: { pl: 'System analizuje Twoją historię zleceń. Wpisz nazwę części lub wybierz materiał, aby zobaczyć średnie ceny i czasy realizacji z przeszłości.', en: 'The system analyzes your order history. Enter a part name or select a material to see average prices and lead times from the past.' },
  },

  // ============================================
  // ORDER FILTERS
  // ============================================
  orderFilters: {
    allDeadlines: { pl: 'Wszystkie terminy', en: 'All Deadlines' },
    urgent: { pl: 'Pilne (≤ 3 dni)', en: 'Urgent (≤ 3 days)' },
    overdue: { pl: 'Po Terminie', en: 'Overdue' },
    today: { pl: 'Dzisiaj', en: 'Today' },
    thisWeek: { pl: 'Ten Tydzień', en: 'This Week' },
    thisMonth: { pl: 'Ten Miesiąc', en: 'This Month' },
    nextMonth: { pl: 'Następny Miesiąc', en: 'Next Month' },
    sortDeadline: { pl: 'Sortuj: Termin', en: 'Sort: Deadline' },
    sortCostHigh: { pl: 'Sortuj: Koszt (Wysoki)', en: 'Sort: Cost (High to Low)' },
    sortCostLow: { pl: 'Sortuj: Koszt (Niski)', en: 'Sort: Cost (Low to High)' },
    sortNewest: { pl: 'Sortuj: Najnowsze', en: 'Sort: Newest First' },
    sortOldest: { pl: 'Sortuj: Najstarsze', en: 'Sort: Oldest First' },
  },

  // ============================================
  // ORDER STATS
  // ============================================
  orderStats: {
    totalOrders: { pl: 'Wszystkie Zamówienia', en: 'Total Orders' },
    inProgress: { pl: 'W Realizacji', en: 'In Progress' },
    urgentLabel: { pl: 'Pilne', en: 'Urgent' },
    urgentDays: { pl: '≤ 3 dni', en: '≤ 3 days' },
    overdueLabel: { pl: 'Po Terminie', en: 'Overdue' },
    statusBreakdown: { pl: 'Rozkład Statusów', en: 'Status Breakdown' },
    progress: { pl: 'Postęp', en: 'Progress' },
  },

  // ============================================
  // INVENTORY
  // ============================================
  inventory: {
    title: { pl: 'Magazyn', en: 'Inventory' },
    addItem: { pl: '+ Dodaj przedmiot', en: '+ Add item' },
    addToInventory: { pl: '+ Dodaj do Magazynu', en: '+ Add to Inventory' },
    noItems: { pl: 'Brak pozycji w magazynie', en: 'No inventory items' },
    noItemsDesc: { pl: 'Twój magazyn jest pusty...', en: 'Your inventory is empty...' },
    sku: { pl: 'SKU', en: 'SKU' },
    category: { pl: 'Kategoria', en: 'Category' },
    location: { pl: 'Lokalizacja', en: 'Location' },
    batch: { pl: 'Partia', en: 'Batch' },
    stockOk: { pl: 'W Porządku', en: 'OK' },
    stockNone: { pl: 'BRAK', en: 'NONE' },
    stockLow: { pl: 'NISKI STAN', en: 'LOW STOCK' },
    // Categories
    rawMaterial: { pl: 'Materiał Surowy', en: 'Raw Material' },
    part: { pl: 'Część', en: 'Part' },
    tool: { pl: 'Narzędzie', en: 'Tool' },
    consumable: { pl: 'Materiał Zużywalny', en: 'Consumable' },
    finishedGood: { pl: 'Gotowy Produkt', en: 'Finished Good' },
    // Form
    skuRequired: { pl: 'SKU wymagane', en: 'SKU required' },
    nameRequired: { pl: 'Nazwa wymagana', en: 'Name required' },
    quantityPositive: { pl: 'Ilość musi być dodatnia', en: 'Quantity must be positive' },
    unitRequired: { pl: 'Jednostka wymagana', en: 'Unit required' },
    thresholdPositive: { pl: 'Próg musi być dodatni', en: 'Threshold must be positive' },
    unit: { pl: 'Jednostka', en: 'Unit' },
    lowStockThreshold: { pl: 'Próg Niskiego Stanu', en: 'Low Stock Threshold' },
    supplier: { pl: 'Dostawca', en: 'Supplier' },
    unitCost: { pl: 'Koszt Jednostkowy (PLN)', en: 'Unit Cost (PLN)' },
    batchNumber: { pl: 'Numer Partii/Serii', en: 'Batch/Lot Number' },
    expiryDate: { pl: 'Data Ważności', en: 'Expiry Date' },
    initialStock: { pl: 'Zapas początkowy', en: 'Initial stock' },
    forTraceability: { pl: 'Do śledzenia', en: 'For traceability' },
    additionalDetails: { pl: 'Dodatkowe szczegóły...', en: 'Additional details...' },
    internalNotes: { pl: 'Notatki wewnętrzne...', en: 'Internal notes...' },
    creatingItem: { pl: 'Tworzenie pozycji...', en: 'Creating item...' },
    createItem: { pl: 'Utwórz Pozycję', en: 'Create Item' },
    itemCreated: { pl: 'Pozycja magazynowa została utworzona!', en: 'Inventory item created!' },
    itemCreateFailed: { pl: 'Nie udało się utworzyć pozycji', en: 'Failed to create item' },
    skuExists: { pl: 'SKU już istnieje dla tej firmy', en: 'SKU already exists for this company' },
    notAuthenticated: { pl: 'Nie jesteś zalogowany', en: 'Not authenticated' },
    companyNotFound: { pl: 'Firma użytkownika nie znaleziona', en: 'User company not found' },
    // Specific to InventorySelect
    noMaterialsInStock: { pl: 'Brak materiałów w magazynie. Dodaj materiały w zakładce Magazyn.', en: 'No materials in stock. Add materials in the Inventory section.' },
    noPartsInStock: { pl: 'Brak części w magazynie. Możesz wpisać nową nazwę.', en: 'No parts in stock. You can enter a new name.' },
    selectMaterial: { pl: 'Wybierz materiał z magazynu...', en: 'Select material from inventory...' },
    selectPart: { pl: 'Wybierz część z magazynu lub wpisz nową...', en: 'Select part from inventory or enter a new one...' },
  },

  // ============================================
  // TIME TRACKING
  // ============================================
  timeTracking: {
    title: { pl: 'Czas Pracy', en: 'Time Tracking' },
    subtitle: { pl: 'Śledź czas spędzony na zleceniach i monitoruj produktywność', en: 'Track time spent on orders and monitor productivity' },
    filters: { pl: 'Filtry', en: 'Filters' },
    order: { pl: 'Zamówienie', en: 'Order' },
    allOrders: { pl: 'Wszystkie Zamówienia', en: 'All Orders' },
    operator: { pl: 'Operator', en: 'Operator' },
    allOperators: { pl: 'Wszyscy Operatorzy', en: 'All Operators' },
    allStatus: { pl: 'Wszystkie Statusy', en: 'All Status' },
    running: { pl: 'Trwający', en: 'Running' },
    paused: { pl: 'Wstrzymany', en: 'Paused' },
    completedStatus: { pl: 'Ukończony', en: 'Completed' },
    dateRange: { pl: 'Zakres Dat', en: 'Date Range' },
    allTime: { pl: 'Cały Czas', en: 'All Time' },
  },

  // ============================================
  // DASHBOARD
  // ============================================
  dashboard: {
    title: { pl: 'Pulpit', en: 'Dashboard' },
    welcome: { pl: 'Witaj, {name}! Oto podsumowanie Twojej produkcji.', en: 'Welcome, {name}! Here is your production summary.' },
    customize: { pl: 'Personalizuj', en: 'Customize' },
    emptyDashboard: { pl: 'Dashboard jest pusty', en: 'Dashboard is empty' },
    enableWidgets: { pl: 'Włącz widgety w ustawieniach, aby zobaczyć dane', en: 'Enable widgets in settings to see data' },
    customizeDashboard: { pl: 'Personalizuj Dashboard', en: 'Customize Dashboard' },
    // Metrics
    allOrders: { pl: 'Wszystkie Zlecenia', en: 'All Orders' },
    inProgress: { pl: 'w realizacji', en: 'in progress' },
    overdueLabel: { pl: 'Po Terminie', en: 'Overdue' },
    needsAttention: { pl: 'Wymaga uwagi!', en: 'Needs attention!' },
    allOnTime: { pl: 'Wszystko w terminie', en: 'All on time' },
    revenueMonth: { pl: 'Przychód (Miesiąc)', en: 'Revenue (Month)' },
    completedThisWeek: { pl: 'ukończonych w tym tygodniu', en: 'completed this week' },
    activeTimers: { pl: 'Aktywne Timery', en: 'Active Timers' },
    operatorsWorking: { pl: 'Operatorzy pracują', en: 'Operators working' },
    noActive: { pl: 'Brak aktywnych', en: 'No active' },
    // Urgent Tasks
    urgentTasks: { pl: 'Pilne Zadania', en: 'Urgent Tasks' },
    allGood: { pl: 'Wszystko w porządku!', en: 'All good!' },
    noUrgentIssues: { pl: 'Brak pilnych problemów', en: 'No urgent issues' },
    overdueSection: { pl: 'PO TERMINIE', en: 'OVERDUE' },
    todaySection: { pl: 'DZISIAJ', en: 'TODAY' },
    lowStockSection: { pl: 'NISKI STAN', en: 'LOW STOCK' },
    oldTimersSection: { pl: 'STARE TIMERY', en: 'OLD TIMERS' },
    orderLabel: { pl: 'Zlecenie', en: 'Order' },
    deadlineLabel: { pl: 'Termin', en: 'Deadline' },
    overdueStatus: { pl: 'Po terminie', en: 'Overdue' },
    todayStatus: { pl: 'Dziś!', en: 'Today!' },
    lowStockStatus: { pl: 'Niski stan', en: 'Low stock' },
    onlyLeft: { pl: 'Tylko {qty} {unit} (min: {threshold})', en: 'Only {qty} {unit} (min: {threshold})' },
    unknownOrder: { pl: 'Nieznane zlecenie', en: 'Unknown order' },
    operator: { pl: 'Operator', en: 'Operator' },
    unknownOperator: { pl: 'Nieznany', en: 'Unknown' },
    runningFor: { pl: 'Działa przez {hours}h', en: 'Running for {hours}h' },
    moreItems: { pl: '+ {count} więcej', en: '+ {count} more' },
    // Production Plan
    productionPlan: { pl: 'Plan Produkcji', en: 'Production Plan' },
    noActiveOrders: { pl: 'Brak aktywnych zleceń', en: 'No active orders' },
    allOrdersCompleted: { pl: 'Wszystkie zlecenia zostały zakończone', en: 'All orders have been completed' },
    seeAll: { pl: 'Zobacz wszystkie', en: 'See all' },
    seeAllOrders: { pl: 'Zobacz wszystkie zlecenia', en: 'See all orders' },
    quantity: { pl: 'Ilość', en: 'Quantity' },
    pieces: { pl: 'szt', en: 'pcs' },
    value: { pl: 'Wartość', en: 'Value' },
    // Personalization Modal
    savingPreferences: { pl: 'Zapisuję preferencje...', en: 'Saving preferences...' },
    chooseWidgets: { pl: 'Wybierz, które widgety mają być widoczne na dashboardzie', en: 'Choose which widgets should be visible on the dashboard' },
    saving: { pl: 'Zapisuję...', en: 'Saving...' },
    savePreferences: { pl: 'Zapisz Preferencje', en: 'Save Preferences' },
    reset: { pl: 'Resetuj', en: 'Reset' },
    cancel: { pl: 'Anuluj', en: 'Cancel' },
    // Profitability Widget
    profitability30Days: { pl: 'Rentowność (30 dni)', en: 'Profitability (30 days)' },
    totalProfit: { pl: 'Zysk całkowity', en: 'Total Profit' },
    margin: { pl: 'Marża', en: 'Margin' },
    revenue: { pl: 'Przychód', en: 'Revenue' },
    cost: { pl: 'Koszt', en: 'Cost' },
  },

  // ============================================
  // REPORTS
  // ============================================
  reports: {
    title: { pl: 'Raporty', en: 'Reports' },
    titleAnalytics: { pl: 'Raporty & Analityka', en: 'Reports & Analytics' },
    subtitle: { pl: 'Przegląd danych, eksport raportów, i wizualizacje', en: 'Data overview, report exports, and visualizations' },
    ordersReport: { pl: 'Raport Zamówień', en: 'Orders Report' },
    ordersReportDesc: { pl: 'Analiza zamówień, filtrowanie, export CSV/PDF', en: 'Orders analysis, filtering, CSV/PDF export' },
    inventoryReport: { pl: 'Raport Magazynu', en: 'Inventory Report' },
    inventoryReportDesc: { pl: 'Wartość magazynu, niskie stany, rotacja', en: 'Inventory value, low stock, turnover' },
    timeReport: { pl: 'Raport Czasu Pracy', en: 'Time Report' },
    timeReportDesc: { pl: 'Produktywność, godziny, koszty operatorów', en: 'Productivity, hours, operator costs' },
    revenueReport: { pl: 'Raport Przychodów', en: 'Revenue Report' },
    revenueReportDesc: { pl: 'Analiza przychodów, per klient, per miesiąc', en: 'Revenue analysis, per client, per month' },
    ordersMonth: { pl: 'Zamówienia (miesiąc)', en: 'Orders (month)' },
    inventoryValue: { pl: 'Wartość magazynu', en: 'Inventory value' },
    hoursMonth: { pl: 'Godziny (miesiąc)', en: 'Hours (month)' },
    revenueMonth: { pl: 'Przychody (miesiąc)', en: 'Revenue (month)' },
    openReport: { pl: 'Otwórz raport →', en: 'Open report →' },
    reportInfo: { pl: 'Informacje o raportach', en: 'Report information' },
    exportInfo: { pl: 'Wszystkie raporty można wyeksportować do CSV i PDF', en: 'All reports can be exported to CSV and PDF' },
    multiTenantInfo: { pl: 'Dane są filtrowane według Twojej firmy (multi-tenancy)', en: 'Data is filtered by your company (multi-tenancy)' },
    dateRangeInfo: { pl: 'Możesz ustawić zakres dat i inne filtry', en: 'You can set date range and other filters' },
    realtimeInfo: { pl: 'Raporty aktualizują się w czasie rzeczywistym', en: 'Reports update in real-time' },
  },

  // ============================================
  // USERS
  // ============================================
  users: {
    title: { pl: 'Użytkownicy', en: 'Users' },
    addUser: { pl: '+ Dodaj Użytkownika', en: '+ Add User' },
    noUsers: { pl: 'Brak użytkowników', en: 'No users' },
    noUsersDesc: { pl: 'Dodaj nowych użytkowników!', en: 'Add new users!' },
    user: { pl: 'Użytkownik', en: 'User' },
  },

  // ============================================
  // DOCUMENTS
  // ============================================
  documents: {
    title: { pl: 'Wydania', en: 'Documents' },
    subtitle: { pl: 'Dokumenty magazynowe: PW (Przyjęcie), RW (Rozchód), WZ (Wydanie)', en: 'Warehouse documents: PW (Receipt), RW (Issue), WZ (Dispatch)' },
    addDocument: { pl: '+ Nowy Dokument', en: '+ New Document' },
    noDocuments: { pl: 'Brak dokumentów magazynowych', en: 'No warehouse documents' },
    noDocumentsDesc: { pl: 'Nie masz jeszcze żadnych dokumentów PW/RW/WZ...', en: "You don't have any PW/RW/WZ documents yet..." },
    type: { pl: 'Typ', en: 'Type' },
    number: { pl: 'Numer', en: 'Number' },
    contractor: { pl: 'Kontrahent', en: 'Contractor' },
    createdBy: { pl: 'Utworzył', en: 'Created by' },
    approved: { pl: 'Zatwierdzony', en: 'Approved' },
    draft: { pl: 'Szkic', en: 'Draft' },
  },

  // ============================================
  // FILES
  // ============================================
  files: {
    title: { pl: 'Pliki', en: 'Files' },
    subtitle: { pl: 'Prześlij i zarządzaj plikami oraz dokumentami', en: 'Upload and manage files and documents' },
    uploadFiles: { pl: 'Prześlij pliki', en: 'Upload files' },
    uploadedFiles: { pl: 'Przesłane pliki ({count})', en: 'Uploaded files ({count})' },
    uploading: { pl: 'Przesyłanie plików...', en: 'Uploading files...' },
    dropHere: { pl: 'Upuść pliki tutaj...', en: 'Drop files here...' },
    dragOrClick: { pl: 'Przeciągnij pliki tutaj lub kliknij aby wybrać', en: 'Drag files here or click to select' },
    maxFiles: { pl: 'Maksymalnie {max} plików, {size}MB każdy', en: 'Maximum {max} files, {size}MB each' },
    supportedFormats: { pl: 'Obsługiwane: PDF, obrazy, Excel, CSV', en: 'Supported: PDF, images, Excel, CSV' },
    rejectedFiles: { pl: 'Odrzucone pliki:', en: 'Rejected files:' },
    fileTooLarge: { pl: 'plik za duży', en: 'file too large' },
    selectedFiles: { pl: 'Wybrane pliki:', en: 'Selected files:' },
    uploaded: { pl: 'Przesłano: {filename}', en: 'Uploaded: {filename}' },
    uploadError: { pl: 'Błąd przesyłania: {filename}', en: 'Upload error: {filename}' },
    metadataError: { pl: 'Błąd zapisu metadanych: {filename}', en: 'Metadata error: {filename}' },
    genericUploadError: { pl: 'Wystąpił błąd podczas przesyłania plików', en: 'An error occurred while uploading files' },
    mustBeLoggedIn: { pl: 'Musisz być zalogowany aby przesłać pliki', en: 'You must be logged in to upload files' },
    noCompanyId: { pl: 'Błąd: Brak company_id', en: 'Error: No company_id' },
  },

  // ============================================
  // TAGS
  // ============================================
  tags: {
    title: { pl: 'Zarządzanie Tagami', en: 'Tag Management' },
    subtitle: { pl: 'Twórz tagi do kategoryzacji zamówień i magazynu', en: 'Create tags to categorize orders and inventory' },
    newTag: { pl: 'Nowy Tag', en: 'New Tag' },
    editTag: { pl: 'Edytuj Tag', en: 'Edit Tag' },
    noTags: { pl: 'Brak tagów', en: 'No tags' },
    noTagsDesc: { pl: 'Utwórz pierwszy tag, aby kategoryzować zamówienia i produkty', en: 'Create your first tag to categorize orders and products' },
    createFirst: { pl: 'Utwórz pierwszy tag', en: 'Create first tag' },
    tagName: { pl: 'Nazwa Taga', en: 'Tag Name' },
    tagNamePlaceholder: { pl: 'np. Pilne, Ważne, Opóźnione', en: 'e.g., Urgent, Important, Delayed' },
    tagColor: { pl: 'Kolor Taga', en: 'Tag Color' },
    preview: { pl: 'Podgląd', en: 'Preview' },
    enterTagName: { pl: 'Podaj nazwę taga', en: 'Enter tag name' },
    tagCreated: { pl: 'Tag utworzony!', en: 'Tag created!' },
    tagUpdated: { pl: 'Tag zaktualizowany!', en: 'Tag updated!' },
    tagDeleted: { pl: 'Tag usunięty!', en: 'Tag deleted!' },
    tagSaveError: { pl: 'Błąd podczas zapisywania', en: 'Error saving' },
    tagDeleteError: { pl: 'Błąd podczas usuwania', en: 'Error deleting' },
    tagLoadError: { pl: 'Błąd ładowania tagów', en: 'Error loading tags' },
    deleteConfirm: { pl: 'Czy na pewno chcesz usunąć ten tag?', en: 'Are you sure you want to delete this tag?' },
    updating: { pl: 'Aktualizowanie...', en: 'Updating...' },
    creating: { pl: 'Tworzenie...', en: 'Creating...' },
    deleting: { pl: 'Usuwanie...', en: 'Deleting...' },
    // Filter
    filterByTags: { pl: 'Filtruj po tagach', en: 'Filter by tags' },
    logic: { pl: 'Logika', en: 'Logic' },
    allAND: { pl: 'Wszystkie (AND)', en: 'All (AND)' },
    anyOR: { pl: 'Dowolny (OR)', en: 'Any (OR)' },
    selectTags: { pl: 'Wybierz tagi', en: 'Select tags' },
    selected: { pl: 'Wybrano', en: 'Selected' },
  },

  // ============================================
  // PROFILE / SETTINGS
  // ============================================
  profile: {
    title: { pl: 'Mój Profil', en: 'My Profile' },
  },

  // ============================================
  // GLOBAL SEARCH
  // ============================================
  search: {
    button: { pl: 'Szukaj...', en: 'Search...' },
    placeholder: { pl: 'Szukaj zamówień, magazynu, użytkowników...', en: 'Search orders, inventory, users...' },
    noResults: { pl: 'Nie znaleziono wyników dla', en: 'No results found for' },
    // Type labels
    typePages: { pl: 'Strony', en: 'Pages' },
    typeOrders: { pl: 'Zamówienia', en: 'Orders' },
    typeInventory: { pl: 'Magazyn', en: 'Inventory' },
    typeUsers: { pl: 'Użytkownicy', en: 'Users' },
    // Keyboard shortcuts
    navigation: { pl: 'Nawigacja', en: 'Navigate' },
    select: { pl: 'Wybierz', en: 'Select' },
    close: { pl: 'Zamknij', en: 'Close' },
  },

  // ============================================
  // NOTIFICATION SETTINGS
  // ============================================
  notifications: {
    title: { pl: 'Powiadomienia Email', en: 'Email Notifications' },
    enableAll: { pl: 'Włącz powiadomienia email', en: 'Enable email notifications' },
    enableAllDesc: { pl: 'Główny przełącznik dla wszystkich powiadomień', en: 'Main toggle for all notifications' },
    deadlineReminder: { pl: 'Powiadom o terminie na ile dni przed', en: 'Remind about deadline days before' },
    deadlineReminderDays: { pl: 'Przypominaj na {days} dni przed terminem', en: 'Remind {days} days before deadline' },
    days1: { pl: '1 dzień', en: '1 day' },
    days2: { pl: '2 dni', en: '2 days' },
    days3: { pl: '3 dni', en: '3 days' },
    days5: { pl: '5 dni', en: '5 days' },
    days7: { pl: '7 dni', en: '7 days' },
    // Events
    newOrder: { pl: 'Nowe zamówienia', en: 'New Orders' },
    newOrderDesc: { pl: 'Powiadomienie gdy zostanie utworzone nowe zamówienie', en: 'Notification when a new order is created' },
    orderStatusChange: { pl: 'Zmiana statusu zamówienia', en: 'Order Status Change' },
    orderStatusChangeDesc: { pl: 'Powiadomienie gdy status zamówienia się zmieni', en: 'Notification when order status changes' },
    deadlineApproaching: { pl: 'Zbliżające się terminy', en: 'Approaching Deadlines' },
    deadlineApproachingDesc: { pl: 'Przypomnienie o zbliżających się terminach realizacji', en: 'Reminder about approaching completion deadlines' },
    lowStock: { pl: 'Niski stan magazynowy', en: 'Low Stock' },
    lowStockDesc: { pl: 'Alert gdy stan magazynowy spadnie poniżej progu', en: 'Alert when inventory level falls below threshold' },
    newTeamMember: { pl: 'Nowy członek zespołu', en: 'New Team Member' },
    newTeamMemberDesc: { pl: 'Powiadomienie o nowych członkach zespołu', en: 'Notification about new team members' },
    dailyDigest: { pl: 'Podsumowanie dzienne', en: 'Daily Digest' },
    dailyDigestDesc: { pl: 'Codzienne podsumowanie aktywności (rano)', en: 'Daily activity summary (morning)' },
    weeklyReport: { pl: 'Raport tygodniowy', en: 'Weekly Report' },
    weeklyReportDesc: { pl: 'Raport tygodniowy z podsumowaniem (poniedziałek)', en: 'Weekly summary report (Monday)' },
    saving: { pl: 'Zapisywanie...', en: 'Saving...' },
    saveSettings: { pl: 'Zapisz ustawienia', en: 'Save Settings' },
    saved: { pl: 'Ustawienia zapisane!', en: 'Settings saved!' },
    errorSaving: { pl: 'Błąd podczas zapisywania', en: 'Error saving settings' },
  },

  // ============================================
  // TAGS
  // ============================================
  tagsSection: {
    manage: { pl: 'Zarządzanie Tagami', en: 'Tag Management' },
    subtitle: { pl: 'Twórz tagi do kategoryzacji zamówień i magazynu', en: 'Create tags to categorize orders and inventory' },
    noTags: { pl: 'Brak tagów', en: 'No tags' },
    noTagsDesc: { pl: 'Utwórz pierwszy tag, aby kategoryzować zamówienia i produkty', en: 'Create your first tag to categorize orders and products' },
    createFirst: { pl: 'Utwórz pierwszy tag', en: 'Create first tag' },
    name: { pl: 'Nazwa tagu', en: 'Tag name' },
    namePlaceholder: { pl: 'np. Pilne, Ważne, Opóźnione', en: 'e.g., Urgent, Important, Delayed' },
    color: { pl: 'Kolor', en: 'Color' },
    preview: { pl: 'Podgląd', en: 'Preview' },
    create: { pl: 'Utwórz', en: 'Create' },
    save: { pl: 'Zapisz', en: 'Save' },
    delete: { pl: 'Usuń', en: 'Delete' },
    deleteConfirm: { pl: 'Czy na pewno chcesz usunąć ten tag?', en: 'Are you sure you want to delete this tag?' },
    deleted: { pl: 'Tag usunięty!', en: 'Tag deleted!' },
    errorLoading: { pl: 'Błąd ładowania tagów', en: 'Error loading tags' },
    errorSaving: { pl: 'Błąd podczas zapisywania', en: 'Error saving' },
    errorDeleting: { pl: 'Błąd podczas usuwania', en: 'Error deleting' },
    enterName: { pl: 'Podaj nazwę taga', en: 'Enter tag name' },
    // Tag Filter
    clearFilter: { pl: 'Wyczyść', en: 'Clear' },
    matchAll: { pl: 'Pokaż elementy z wszystkimi wybranymi tagami', en: 'Show items with all selected tags' },
    matchAny: { pl: 'Pokaż elementy z dowolnym z wybranych tagów', en: 'Show items with any selected tags' },
    noAvailableTags: { pl: 'Brak dostępnych tagów', en: 'No available tags' },
    createToFilter: { pl: 'Utwórz tagi, aby filtrować zamówienia i produkty', en: 'Create tags to filter orders and products' },
    // Tag Select
    noTagsSelected: { pl: 'Brak tagów', en: 'No tags' },
    noTagsFound: { pl: 'Nie znaleziono tagów', en: 'No tags found' },
    searchTags: { pl: 'Szukaj tagów...', en: 'Search tags...' },
    errorUpdating: { pl: 'Błąd podczas aktualizacji tagów', en: 'Error updating tags' },
  },

  // ============================================
  // CALENDAR
  // ============================================
  calendar: {
    title: { pl: 'Kalendarz Produkcji', en: 'Production Calendar' },
    subtitle: { pl: 'Wizualizacja terminów realizacji zamówień', en: 'Visualization of order completion deadlines' },
    newOrder: { pl: 'Nowe zamówienie', en: 'New order' },
    allOrders: { pl: 'Wszystkie zamówienia', en: 'All orders' },
    // Views
    month: { pl: 'Miesiąc', en: 'Month' },
    week: { pl: 'Tydzień', en: 'Week' },
    timeline: { pl: 'Oś czasu', en: 'Timeline' },
    today: { pl: 'Dziś', en: 'Today' },
    day: { pl: 'Dzień', en: 'Day' },
    // Modal
    orderDetails: { pl: 'Szczegóły zamówienia', en: 'Order Details' },
    orderNumber: { pl: 'Numer zamówienia', en: 'Order Number' },
    part: { pl: 'Część', en: 'Part' },
    quantity: { pl: 'Ilość', en: 'Quantity' },
    viewOrder: { pl: 'Zobacz zamówienie →', en: 'View order →' },
  },

  // ============================================
  // AUDIT LOGS
  // ============================================
  auditLogs: {
    title: { pl: 'Dziennik Zdarzeń', en: 'Audit Log' },
    subtitle: { pl: 'Historia wszystkich akcji i zmian wykonanych przez użytkowników', en: 'History of all actions and changes made by users' },
    metaTitle: { pl: 'Dziennik Zdarzeń | CNC Pilot', en: 'Audit Log | CNC Pilot' },
    metaDesc: { pl: 'Historia zmian i akcji użytkowników', en: 'History of user changes and actions' },
    noAccess: { pl: 'Brak dostępu', en: 'Access Denied' },
    noAccessMessage: { pl: 'Tylko właściciele i administratorzy mogą przeglądać dziennik zdarzeń.', en: 'Only owners and administrators can view the audit log.' },
    user: { pl: 'Użytkownik', en: 'User' },
    showing: { pl: 'z {total} logów', en: 'of {total} logs' },
    noLogs: { pl: 'Brak logów spełniających kryteria', en: 'No logs matching criteria' },
    searchPlaceholder: { pl: 'Szukaj w logach...', en: 'Search in logs...' },
    dateRange: { pl: 'Zakres dat', en: 'Date Range' },
    action: { pl: 'Akcja', en: 'Action' },
    entityType: { pl: 'Typ encji', en: 'Entity Type' },
  },

  // ============================================
  // COOPERATION
  // ============================================
  cooperation: {
    title: { pl: 'Kooperacja', en: 'Cooperation' },
    subtitle: { pl: 'Zarządzanie procesami zewnętrznymi (hartowanie, anodowanie, etc.)', en: 'Managing external processes (hardening, anodizing, etc.)' },
    newShipment: { pl: 'Nowa wysyłka', en: 'New Shipment' },
    delayed: { pl: 'Opóźnione', en: 'Delayed' },
    delayedReturns: { pl: 'Opóźnione powroty', en: 'Delayed Returns' },
    daysDelay: { pl: '{days} dni opóźnienia', en: '{days} days delay' },
    noActiveOperations: { pl: 'Brak aktywnych operacji zewnętrznych', en: 'No active external operations' },
    createFirst: { pl: 'Utwórz pierwszą wysyłkę', en: 'Create first shipment' },
    returnDate: { pl: 'Powrót:', en: 'Return:' },
    sentDate: { pl: 'Wysłano:', en: 'Sent:' },
    moreItems: { pl: '+{count} więcej', en: '+{count} more' },
    noPartners: { pl: 'Brak kooperantów. Dodaj pierwszego.', en: 'No partners. Add the first one.' },
    recentlyCompleted: { pl: 'Ostatnio zakończone', en: 'Recently Completed' },
    noCompleted: { pl: 'Brak zakończonych operacji', en: 'No completed operations' },
    // Status
    sent: { pl: 'Wysłane', en: 'Sent' },
    inProgress: { pl: 'W trakcie', en: 'In Progress' },
    returning: { pl: 'Powrót', en: 'Returning' },
    completed: { pl: 'Zakończone', en: 'Completed' },
    // Error
    errorTitle: { pl: 'Wystąpił błąd', en: 'An Error Occurred' },
    errorMessage: { pl: 'Nie udało się załadować modułu kooperacji. Spróbuj ponownie.', en: 'Failed to load cooperation module. Try again.' },
    tryAgain: { pl: 'Spróbuj ponownie', en: 'Try Again' },
    backHome: { pl: 'Wróć do strony głównej', en: 'Back to Home' },
    // Send page
    sendTitle: { pl: 'Nowa wysyłka do kooperacji', en: 'New Cooperation Shipment' },
    shipmentData: { pl: 'Dane wysyłki', en: 'Shipment Data' },
    plannedReturn: { pl: 'Planowany powrót', en: 'Planned Return' },
    trackingNumber: { pl: 'Nr przesyłki / Kurier', en: 'Tracking Number / Courier' },
    itemsToSend: { pl: 'Pozycje do wysyłki', en: 'Items to Send' },
    addFromOrder: { pl: 'Dodaj z zamówienia', en: 'Add from Order' },
    selectOrder: { pl: '-- Wybierz zamówienie --', en: '-- Select Order --' },
    partName: { pl: 'Nazwa części (ręcznie)', en: 'Part Name (manual)' },
    noItems: { pl: 'Brak pozycji. Wybierz zamówienie lub dodaj ręcznie.', en: 'No items. Select order or add manually.' },
    remove: { pl: 'Usuń', en: 'Remove' },
    creating: { pl: 'Tworzenie...', en: 'Creating...' },
    createShipment: { pl: 'Utwórz wysyłkę', en: 'Create Shipment' },
    orderAlreadyAdded: { pl: 'To zamówienie jest już dodane', en: 'This order is already added' },
    enterPartName: { pl: 'Podaj nazwę części', en: 'Enter part name' },
    addOneItem: { pl: 'Dodaj przynajmniej jedną pozycję', en: 'Add at least one item' },
    creatingShipment: { pl: 'Tworzenie wysyłki...', en: 'Creating shipment...' },
    shipmentCreated: { pl: 'Wysyłka utworzona!', en: 'Shipment created!' },
    errorCreating: { pl: 'Nie udało się utworzyć wysyłki', en: 'Failed to create shipment' },
    // Details page
    back: { pl: '← Wróć', en: '← Back' },
    changeStatus: { pl: 'Zmień status', en: 'Change Status' },
    items: { pl: 'Pozycje', en: 'Items' },
    lost: { pl: 'Zgubione', en: 'Lost' },
    sendDate: { pl: 'Data wysyłki', en: 'Send Date' },
    expectedReturn: { pl: 'Planowany powrót', en: 'Expected Return' },
    actualReturn: { pl: 'Rzeczywisty powrót', en: 'Actual Return' },
    statusChangeError: { pl: 'Nie udało się zmienić statusu', en: 'Failed to change status' },
    operationCompleted: { pl: '✓ Operacja zakończona', en: '✓ Operation Completed' },
    // Main page
    cooperants: { pl: 'Kooperanci', en: 'Cooperants' },
    prepared: { pl: 'Przygotowane', en: 'Prepared' },
    atCooperant: { pl: 'U kooperanta', en: 'At Cooperant' },
    onWayBack: { pl: 'W drodze powrotnej', en: 'On Way Back' },
    activeOperations: { pl: 'Aktywne operacje', en: 'Active Operations' },
    noCooperant: { pl: 'Brak kooperanta', en: 'No cooperant' },
    pcs: { pl: 'szt', en: 'pcs' },
    overdue: { pl: 'OPÓŹNIONE', en: 'OVERDUE' },
    // Status update
    updatingStatus: { pl: 'Aktualizacja statusu...', en: 'Updating status...' },
    statusChangedTo: { pl: 'Status zmieniony na:', en: 'Status changed to:' },
    btnSend: { pl: 'Wyślij', en: 'Send' },
    btnAtCooperant: { pl: 'U kooperanta', en: 'At Cooperant' },
    btnOnWayBack: { pl: 'W drodze powrotnej', en: 'On Way Back' },
    btnComplete: { pl: 'Zakończ', en: 'Complete' },
    btnDelayed: { pl: 'Opóźnione', en: 'Delayed' },
    // Operation types
    opHartowanie: { pl: 'Hartowanie', en: 'Hardening' },
    opAnodowanie: { pl: 'Anodowanie', en: 'Anodizing' },
    opCynkowanie: { pl: 'Cynkowanie', en: 'Galvanizing' },
    opMalowanie: { pl: 'Malowanie proszkowe', en: 'Powder Coating' },
    opSzlifowanie: { pl: 'Szlifowanie', en: 'Grinding' },
    opChromowanie: { pl: 'Chromowanie', en: 'Chrome Plating' },
    opNiklowanie: { pl: 'Niklowanie', en: 'Nickel Plating' },
    opTrawienie: { pl: 'Trawienie', en: 'Etching' },
    opPiaskowanie: { pl: 'Piaskowanie', en: 'Sandblasting' },
    opInne: { pl: 'Inne', en: 'Other' },
  },

  // ============================================
  // CARBON FOOTPRINT / CBAM
  // ============================================
  carbon: {
    title: { pl: 'Paszport Węglowy', en: 'Carbon Passport' },
    subtitle: { pl: 'Kalkulator emisji CO2 zgodny z CBAM', en: 'CBAM-compliant CO2 emissions calculator' },
    cbamReady: { pl: 'CBAM Ready', en: 'CBAM Ready' },
    cbamTitle: { pl: 'Carbon Border Adjustment Mechanism (CBAM)', en: 'Carbon Border Adjustment Mechanism (CBAM)' },
    cbamDescription: { pl: 'Od 1 stycznia 2026 wchodzi w życie pełna faza CBAM. Eksporterzy do UE muszą deklarować ślad węglowy produktów. Ten kalkulator pomoże Ci obliczyć emisje CO2 dla Twoich wyrobów.', en: 'From January 1, 2026, the full CBAM phase comes into effect. Exporters to the EU must declare the carbon footprint of products. This calculator will help you calculate CO2 emissions for your products.' },
    reports: { pl: 'Raporty', en: 'Reports' },
    totalEmissions: { pl: 'Suma emisji', en: 'Total Emissions' },
    materialsInDatabase: { pl: 'Materiały w bazie', en: 'Materials in Database' },
    energySources: { pl: 'Źródła energii', en: 'Energy Sources' },
    calculator: { pl: 'Kalkulator emisji CO2', en: 'CO2 Emissions Calculator' },
    recentReports: { pl: 'Ostatnie raporty', en: 'Recent Reports' },
    noReports: { pl: 'Brak raportów. Oblicz pierwszą emisję!', en: 'No reports. Calculate your first emission!' },
    formula: { pl: 'Formuła obliczeniowa', en: 'Calculation Formula' },
    materialEmissionFactor: { pl: 'współczynnik emisji materiału (kg CO₂/kg)', en: 'material emission factor (kg CO₂/kg)' },
    energyEmissionFactor: { pl: 'współczynnik emisji energii (kg CO₂/kWh)', en: 'energy emission factor (kg CO₂/kWh)' },
    materialCoefficients: { pl: 'Współczynniki materiałów', en: 'Material Coefficients' },
    steel: { pl: 'Stal', en: 'Steel' },
    aluminum: { pl: 'Aluminium', en: 'Aluminum' },
    copperBrass: { pl: 'Miedź/Mosiądz', en: 'Copper/Brass' },
    titanium: { pl: 'Tytan', en: 'Titanium' },
    plastics: { pl: 'Tworzywa', en: 'Plastics' },
    iron: { pl: 'Żeliwo', en: 'Cast Iron' },
    // Calculator component
    productName: { pl: 'Nazwa produktu', en: 'Product Name' },
    productNamePlaceholder: { pl: 'np. Wałek Ø50x200', en: 'e.g. Shaft Ø50x200' },
    quantityPcs: { pl: 'Ilość (szt)', en: 'Quantity (pcs)' },
    linkToOrder: { pl: 'Powiąż z zamówieniem (opcjonalne)', en: 'Link to Order (optional)' },
    noLink: { pl: '-- Bez powiązania --', en: '-- No Link --' },
    materialEmission: { pl: 'Emisja z materiału', en: 'Material Emission' },
    material: { pl: 'Materiał', en: 'Material' },
    selectMaterial: { pl: '-- Wybierz materiał --', en: '-- Select Material --' },
    materialWeightKg: { pl: 'Waga materiału (kg)', en: 'Material Weight (kg)' },
    materialWeightPlaceholder: { pl: 'np. 2.5', en: 'e.g. 2.5' },
    materialEmissionResult: { pl: 'Emisja materiału:', en: 'Material Emission:' },
    energyEmission: { pl: 'Emisja z energii', en: 'Energy Emission' },
    energySource: { pl: 'Źródło energii', en: 'Energy Source' },
    selectSource: { pl: '-- Wybierz źródło --', en: '-- Select Source --' },
    consumption: { pl: 'Zużycie', en: 'Consumption' },
    consumptionPlaceholder: { pl: 'np. 15.5', en: 'e.g. 15.5' },
    energyEmissionResult: { pl: 'Emisja energii:', en: 'Energy Emission:' },
    calculationResult: { pl: 'Wynik obliczeń', en: 'Calculation Result' },
    totalEmission: { pl: 'Całkowita emisja', en: 'Total Emission' },
    emissionPerUnit: { pl: 'Emisja na sztukę', en: 'Emission Per Unit' },
    perPcs: { pl: 'CO₂ / szt', en: 'CO₂ / pcs' },
    material2: { pl: 'Materiał:', en: 'Material:' },
    energy: { pl: 'Energia:', en: 'Energy:' },
    saveCarbonPassport: { pl: 'Zapisz Paszport Węglowy', en: 'Save Carbon Passport' },
    generating: { pl: 'Generowanie...', en: 'Generating...' },
    productNameRequired: { pl: 'Podaj nazwę produktu', en: 'Enter product name' },
    calculateBeforeSaving: { pl: 'Oblicz emisję przed zapisaniem', en: 'Calculate emission before saving' },
    generatingReport: { pl: 'Generowanie raportu...', en: 'Generating report...' },
    reportCreated: { pl: 'Raport {number} utworzony!', en: 'Report {number} created!' },
    reportCreateError: { pl: 'Nie udało się utworzyć raportu', en: 'Failed to create report' },
    // Detail page
    backToCalculator: { pl: 'Powrót do kalkulatora', en: 'Back to Calculator' },
    carbonPassport: { pl: 'Paszport Węglowy', en: 'Carbon Passport' },
    cbamCompliant: { pl: 'Dokument zgodny z CBAM', en: 'CBAM Compliant Document' },
    cbamRegulation: { pl: 'Carbon Border Adjustment Mechanism - Rozporządzenie UE 2023/956', en: 'Carbon Border Adjustment Mechanism - EU Regulation 2023/956' },
    productInfo: { pl: 'Informacje o produkcie', en: 'Product Information' },
    productName2: { pl: 'Nazwa produktu', en: 'Product Name' },
    quantity2: { pl: 'Ilość', en: 'Quantity' },
    orderNumber: { pl: 'Nr zamówienia', en: 'Order Number' },
    customer: { pl: 'Klient', en: 'Customer' },
    emissionSummary: { pl: 'Podsumowanie emisji', en: 'Emission Summary' },
    totalCO2Emission: { pl: 'Całkowita emisja CO₂', en: 'Total CO₂ Emission' },
    kgCO2: { pl: 'kilogramów CO₂', en: 'kilograms CO₂' },
    emissionPerUnit2: { pl: 'Emisja na jednostkę', en: 'Emission Per Unit' },
    calculationDetails: { pl: 'Szczegóły obliczenia', en: 'Calculation Details' },
    materialEmission2: { pl: 'Emisja z materiału', en: 'Material Emission' },
    material3: { pl: 'Materiał', en: 'Material' },
    weight: { pl: 'Waga', en: 'Weight' },
    emissionFactor: { pl: 'Wsp. emisji', en: 'Emission Factor' },
    emission: { pl: 'Emisja', en: 'Emission' },
    noMaterialData: { pl: 'Brak danych o materiale', en: 'No material data' },
    energyEmission2: { pl: 'Emisja z energii', en: 'Energy Emission' },
    energyConsumption: { pl: 'Zużycie energii', en: 'Energy Consumption' },
    noEnergyData: { pl: 'Brak danych o energii', en: 'No energy data' },
    formulaUsed: { pl: 'Zastosowana formuła:', en: 'Formula Used:' },
    documentData: { pl: 'Dane dokumentu', en: 'Document Data' },
    reportNumber: { pl: 'Numer raportu', en: 'Report Number' },
    createdAt: { pl: 'Data utworzenia', en: 'Created At' },
    createdBy: { pl: 'Utworzony przez', en: 'Created By' },
    calculationMethod: { pl: 'Metoda obliczeń', en: 'Calculation Method' },
    simplified: { pl: 'Uproszczona', en: 'Simplified' },
    notesLabel: { pl: 'Uwagi:', en: 'Notes:' },
    // PDF component
    printPDF: { pl: 'Drukuj / PDF', en: 'Print / PDF' },
    autoGenerated: { pl: 'Dokument wygenerowany automatycznie przez CNC-Pilot', en: 'Document automatically generated by CNC-Pilot' },
    printDate: { pl: 'Data wydruku:', en: 'Print Date:' },
    noData: { pl: 'Brak danych', en: 'No data' },
  },

  // ============================================
  // COSTS & PROFITABILITY
  // ============================================
  costs: {
    title: { pl: 'Analiza Kosztów i Rentowności', en: 'Cost & Profitability Analysis' },
    lastDays: { pl: 'Ostatnie {days} dni • {count} zamówień', en: 'Last {days} days • {count} orders' },
    lastNDays: { pl: 'Ostatnie {days} dni', en: 'Last {days} days' },
    orders: { pl: 'zamówień', en: 'orders' },
    revenue: { pl: 'Przychód', en: 'Revenue' },
    totalCost: { pl: 'Koszt całkowity', en: 'Total Cost' },
    profit: { pl: 'Zysk', en: 'Profit' },
    avgMargin: { pl: '{margin}% marży', en: '{margin}% margin' },
    avgLaborCost: { pl: '{cost} PLN/h śr.', en: '{cost} PLN/h avg.' },
    profitable: { pl: 'Rentowne', en: 'Profitable' },
    unprofitable: { pl: 'Nierentowne', en: 'Unprofitable' },
    unprofitableCount: { pl: 'nierentownych', en: 'unprofitable' },
    laborHours: { pl: 'Godziny pracy', en: 'Labor Hours' },
    avg: { pl: 'śr.', en: 'avg.' },
    noPrice: { pl: 'Bez ceny', en: 'No Price' },
    noAnalysis: { pl: 'brak analizy', en: 'no analysis' },
    materials: { pl: 'Materiały', en: 'Materials' },
    labor: { pl: 'Praca', en: 'Labor' },
    overhead: { pl: 'Ogólne', en: 'Overhead' },
    ofCosts: { pl: 'kosztów', en: 'of costs' },
    order: { pl: 'Zamówienie', en: 'Order' },
    customer: { pl: 'Klient', en: 'Customer' },
    cost: { pl: 'Koszt', en: 'Cost' },
    price: { pl: 'Cena', en: 'Price' },
    margin: { pl: 'Marża', en: 'Margin' },
    hours: { pl: 'Godziny', en: 'Hours' },
    noOrders: { pl: 'Brak zamówień spełniających kryteria', en: 'No orders matching criteria' },
    profitability: { pl: 'Rentowność', en: 'Profitability' },
    period: { pl: 'Okres', en: 'Period' },
    days7: { pl: '7 dni', en: '7 days' },
    days14: { pl: '14 dni', en: '14 days' },
    days30: { pl: '30 dni', en: '30 days' },
    days60: { pl: '60 dni', en: '60 days' },
    days90: { pl: '90 dni', en: '90 days' },
    year: { pl: 'Rok', en: 'Year' },
    clearFilters: { pl: 'Wyczyść filtry', en: 'Clear filters' },
  },

  // ============================================
  // CLIENT PORTAL
  // ============================================
  clientPortal: {
    linkExpired: { pl: 'Link wygasł', en: 'Link Expired' },
    linkExpiredMessage: { pl: 'Ten link do portalu klienta wygasł. Skontaktuj się z dostawcą, aby otrzymać nowy link.', en: 'This client portal link has expired. Contact your supplier to receive a new link.' },
    yourOrders: { pl: 'Twoje zamówienia', en: 'Your Orders' },
    noOrders: { pl: 'Brak aktywnych zamówień', en: 'No active orders' },
    qty: { pl: 'Ilość: {qty} szt. | Termin: {deadline}', en: 'Qty: {qty} pcs | Deadline: {deadline}' },
    accepted: { pl: 'Przyjęte', en: 'Accepted' },
    questions: { pl: 'Masz pytania? Skontaktuj się bezpośrednio z dostawcą.', en: 'Have questions? Contact your supplier directly.' },
    completed: { pl: 'Ukończone', en: 'Completed' },
    lastUpdate: { pl: 'Ostatnia aktualizacja', en: 'Last update' },
    // Generate link
    linkGenerated: { pl: 'Link wygenerowany pomyślnie!', en: 'Link generated successfully!' },
    linkExists: { pl: 'Link dla tego klienta już istnieje', en: 'Link for this client already exists' },
    errorGenerating: { pl: 'Nie udało się wygenerować linku', en: 'Failed to generate link' },
    sendToClient: { pl: 'Wyślij ten link do {customer}, aby mogli śledzić status swoich zamówień.', en: 'Send this link to {customer} so they can track their order status.' },
    validFor: { pl: 'Link jest ważny przez 30 dni. Klient nie potrzebuje logowania.', en: 'Link is valid for 30 days. No login required.' },
  },

  // ============================================
  // ============================================
  // TIME STATS
  // ============================================
  timeStats: {
    today: { pl: 'Dziś', en: 'Today' },
    thisWeek: { pl: 'Ten tydzień', en: 'This Week' },
    thisMonth: { pl: 'Ten miesiąc', en: 'This Month' },
    costMonth: { pl: 'Koszt (miesiąc)', en: 'Cost (month)' },
    totalLaborCost: { pl: 'Całkowity koszt pracy', en: 'Total labor cost' },
  },

  // ============================================
  // VIEW MODE
  // ============================================
  viewMode: {
    fullView: { pl: 'Pełny widok', en: 'Full View' },
    kioskMode: { pl: 'Tryb Kiosk', en: 'Kiosk Mode' },
  },

  // ============================================
  // TOP CUSTOMERS
  // ============================================
  topCustomers: {
    title: { pl: '👥 Top 5 Klientów', en: '👥 Top 5 Customers' },
    subtitle: { pl: 'Największy przychód', en: 'Highest Revenue' },
    ordersCount: { pl: '{count} zlecenie', en: '{count} order' },
    ordersCount_plural: { pl: '{count} zlecenia', en: '{count} orders' },
    ordersCount_many: { pl: '{count} zleceń', en: '{count} orders' },
    willAppear: { pl: 'Zamówienia z kosztami pojawią się tutaj po ukończeniu', en: 'Orders with costs will appear here after completion' },
  },

  // ============================================
  // TABLE
  // ============================================
  table: {
    dragToReorder: { pl: 'Przeciągnij aby zmienić kolejność', en: 'Drag to reorder' },
    restoreDefaults: { pl: 'Przywróć domyślne', en: 'Restore Defaults' },
  },

  // ============================================
  // FILES
  // ============================================
  filesSection: {
    uploading: { pl: 'Przesyłanie plików...', en: 'Uploading files...' },
    dropHere: { pl: 'Upuść pliki tutaj...', en: 'Drop files here...' },
    dragDrop: { pl: 'Przeciągnij pliki tutaj lub kliknij aby wybrać', en: 'Drag files here or click to select' },
    maxFiles: { pl: 'Maksymalnie {count} plików, {size}MB każdy', en: 'Maximum {count} files, {size}MB each' },
    supported: { pl: 'Obsługiwane: PDF, obrazy, Excel, CSV', en: 'Supported: PDF, images, Excel, CSV' },
    fileTooLarge: { pl: 'plik za duży', en: 'file too large' },
    errorDownload: { pl: 'Błąd pobierania pliku', en: 'Error downloading file' },
    confirmDelete: { pl: 'Czy na pewno chcesz usunąć plik: {filename}?', en: 'Are you sure you want to delete file: {filename}?' },
    deleted: { pl: 'Plik usunięty!', en: 'File deleted!' },
    errorDelete: { pl: 'Błąd usuwania pliku', en: 'Error deleting file' },
    noFiles: { pl: 'Brak plików', en: 'No files' },
    noFilesType: { pl: 'Brak plików tego typu', en: 'No files of this type' },
    uploadFirst: { pl: 'Prześlij pierwszy plik używając formularza powyżej', en: 'Upload your first file using the form above' },
    changeFilter: { pl: 'Zmień filtr aby zobaczyć inne pliki', en: 'Change filter to see other files' },
    preview: { pl: 'Podgląd', en: 'Preview' },
    previewUnavailable: { pl: 'Podgląd niedostępny dla tego typu pliku', en: 'Preview unavailable for this file type' },
  },

  // ============================================
  // DOCS / KNOWLEDGE PORTAL
  // ============================================
  docs: {
    userGuide: { pl: 'Poradnik Użytkownika', en: 'User Guide' },
    processDiagrams: { pl: 'Diagramy Procesów', en: 'Process Diagrams' },
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
} as const;

// Type for translation keys
export type TranslationKey = keyof typeof translations;
export type TranslationSection<K extends TranslationKey> = keyof typeof translations[K];

// Helper function to get translation
export function t<
  K extends TranslationKey,
  S extends TranslationSection<K>
>(section: K, key: S, lang: Language, params?: Record<string, string | number>): string {
  const sectionData = translations[section] as Record<string, Record<Language, string>>;
  const translation = sectionData?.[key as string]?.[lang] || sectionData?.[key as string]?.['en'] || String(key);

  if (params) {
    return Object.entries(params).reduce(
      (text, [param, value]) => text.replace(new RegExp(`{${param}}`, 'g'), String(value)),
      translation
    );
  }

  return translation;
}

// Get language from localStorage (client-side)
export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'pl';
  return (localStorage.getItem('language') as Language) || 'pl';
}

// Set language to localStorage (client-side)
export function setStoredLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('language', lang);
}
