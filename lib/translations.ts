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
    apply: { pl: 'Zastosuj', en: 'Apply' },
    discard: { pl: 'Odrzuć', en: 'Discard' },
    perUnit: { pl: '/szt', en: '/unit' },
    perPiece: { pl: 'za sztukę', en: 'per piece' },
    costPerUnit: { pl: 'Koszt za sztukę', en: 'Cost per unit' },
    totalCost: { pl: 'Całkowity koszt', en: 'Total Cost' },
    milimeters: { pl: 'mm', en: 'mm' },
    hours: { pl: 'godz.', en: 'hours' },
    minutes: { pl: 'min.', en: 'min.' },
  },

  // ============================================
  // NAVIGATION / SIDEBAR
  // ============================================
  nav: {
    dashboard: { pl: 'Pulpit', en: 'Dashboard' },
    orders: { pl: 'Zamówienia', en: 'Orders' },
    inventory: { pl: 'Magazyn', en: 'Inventory' },
    documents: { pl: 'Wydania', en: 'Documents' },
    files: { pl: 'Pliki', en: 'Files' },
    timeTracking: { pl: 'Czas Pracy', en: 'Time Tracking' },
    reports: { pl: 'Raporty', en: 'Reports' },
    tags: { pl: 'Tagi', en: 'Tags' },
    users: { pl: 'Użytkownicy', en: 'Users' },
    settings: { pl: 'Ustawienia', en: 'Settings' },
    profile: { pl: 'Mój Profil', en: 'My Profile' },
    logout: { pl: 'Wyloguj', en: 'Logout' },
    closeMenu: { pl: 'Zamknij menu', en: 'Close menu' },
    toggleSidebar: { pl: 'Przełącz pasek boczny', en: 'Toggle sidebar' },
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
    unknownOperator: { pl: 'Nieznany', en: 'Unknown' },
    runningFor: { pl: 'Działa przez {hours}h', en: 'Running for {hours}h' },
    moreItems: { pl: '+ {count} więcej', en: '+ {count} more' },
  },

  // ============================================
  // REPORTS
  // ============================================
  reports: {
    title: { pl: 'Raporty', en: 'Reports' },
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
  },

  // ============================================
  // PROFILE / SETTINGS
  // ============================================
  profile: {
    title: { pl: 'Mój Profil', en: 'My Profile' },
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
