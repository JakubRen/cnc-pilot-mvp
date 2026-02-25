// lib/translations/common.ts
// Sections: common, nav, roles, viewMode, table

export const commonTranslations = {
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
    quotesExpress: { pl: 'Szybka Wycena', en: 'Express Quote' },
    quotes: { pl: 'Oferty', en: 'Quotes' },
    calendar: { pl: 'Kalendarz', en: 'Calendar' },
    products: { pl: 'Towary', en: 'Products' },
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
  // VIEW MODE
  // ============================================
  viewMode: {
    fullView: { pl: 'Pełny widok', en: 'Full View' },
    kioskMode: { pl: 'Tryb Kiosk', en: 'Kiosk Mode' },
  },

  // ============================================
  // TABLE
  // ============================================
  table: {
    dragToReorder: { pl: 'Przeciągnij aby zmienić kolejność', en: 'Drag to reorder' },
    restoreDefaults: { pl: 'Przywróć domyślne', en: 'Restore Defaults' },
  },
} as const
