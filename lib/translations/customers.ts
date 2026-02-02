// lib/translations/customers.ts
// Sections: inventory, documents, files, filesSection, tags, tagsSection, calendar, auditLogs, clientPortal, search, notifications, profile, reports, users, docs

export const customersTranslations = {
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
  // FILES SECTION
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
  // TAGS SECTION
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
  // PROFILE / SETTINGS
  // ============================================
  profile: {
    title: { pl: 'Mój Profil', en: 'My Profile' },
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
  // DOCS / KNOWLEDGE PORTAL
  // ============================================
  docs: {
    userGuide: { pl: 'Poradnik Użytkownika', en: 'User Guide' },
    processDiagrams: { pl: 'Diagramy Procesów', en: 'Process Diagrams' },
  },
} as const
