// lib/translations/orders.ts
// Sections: orders, orderFilters, orderStats, orderStatus

export const ordersTranslations = {
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
} as const
