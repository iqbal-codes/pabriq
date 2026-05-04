export type Messages = {
  auth: {
    signIn: string
    signUp: string
    email: string
    password: string
    name: string
    signInTitle: string
    signUpTitle: string
    signInDesc: string
    signUpDesc: string
    alreadyHaveAccount: string
    needAccount: string
    createOne: string
    nameMin: string
    emailValid: string
    passwordMin: string
    passwordDesc: string
    authFailed: string
  }
  admin: {
    logOut: string
  }
  app: {
    title: string
    retry: string
    language: string
    english: string
    indonesian: string
  }
  assetUpload: {
    dropzone: {
      title: string
      hint: string
    }
    actions: {
      browse: string
      remove: string
      retry: string
      undo: string
    }
    states: {
      uploading: string
      processing: string
      failed: string
      done: string
    }
    errors: {
      tooLarge: string
      wrongType: string
      uploadFailed: string
      limitReached: string
      serverError: string
    }
    hints: {
      acceptedFormats: string
      maxSize: string
    }
  }
  common: {
    back: string
    loading: string
    close: string
    pageNotFound: string
    pageNotFoundDesc: string
    goHome: string
    confirm: string
    cancel: string
    preview: string
    actions: string
  }
  settings: {
    comingSoon: string
  }
  dataTable: {
    clearFilters: string
    columnVisibility: string
    errorRetry: string
    errorTitle: string
    firstPage: string
    lastPage: string
    nextPage: string
    of: string
    page: string
    perPage: string
    previousPage: string
    resetColumns: string
    rowsSelected: string
    visibleRows: string
    loading: string
    filterAll: string
    filters: string
    applyFilters: string
    cancelFilters: string
    activeFilters: string
  }
  combobox: {
    searchPlaceholder: string
    noResults: string
    loading: string
  }
  orders: {
    title: string
    createOrder: string
    editOrder: string
    viewOrder: string
    customer: string
    status: string
    total: string
    orderNumber: string
    validUntil: string
    notes: string
    lineItemNotes: string
    lineItemName: string
    quantity: string
    unitPrice: string
    totalLabel: string
    lineItems: string
    summary: string
    attachments: string
    save: string
    saving: string
    orderCreated: string
    orderUpdated: string
    searchPlaceholder: string
    noOrders: string
    noOrdersDesc: string
    noResults: string
    addLineItem: string
    removeLineItem: string
    createCustomer: string
    customerNamePlaceholder: string
    customerPhonePlaceholder: string
    addItem: string
    specification: string
    selectProduct: string
    orderTotal: string
    searchProducts: string
    addToOrder: string
    lineSubtotal: string
    maxQtyError: string
    phone: string
    email: string
    copyPortalLink: string
    linkCopied: string
    generateLink: string
    approve: string
    reject: string
    rejectReason: string
    rejectReasonPlaceholder: string
    orderApproved: string
    orderRejected: string
  }
  breadcrumb: {
    dashboard: string
    detail: string
    edit: string
    new: string
    customers: string
    createCustomer: string
    editCustomer: string
    viewCustomer: string
    products: string
    newProduct: string
    editProduct: string
    orders: string
    createOrder: string
    viewOrder: string
    editOrder: string
    settings: string
    general: string
    productionStages: string
  }
  status: {
    draft: string
    pending: string
    approved: string
    production: string
    in_delivery: string
    completed: string
    cancelled: string
    rejected: string
    active: string
    inactive: string
    paid: string
    overdue: string
    failed: string
  }
  org: {
    title: string
    welcome: string
    createDesc: string
    create: string
    name: string
    namePlaceholder: string
    nameMin: string
    nameInvalid: string
    creating: string
    creationFailed: string
    taken: string
    redirecting: string
    logoPhoto: string
    logoPhotoHint: string
  }
  sidebar: {
    dashboard: string
    orders: string
    customers: string
    products: string
    invoices: string
    production: string
    settings: string
  }
  customers: {
    title: string
    createCustomer: string
    editCustomer: string
    viewCustomer: string
    customerInfo: string
    name: string
    email: string
    phone: string
    notes: string
    active: string
    inactive: string
    searchPlaceholder: string
    noCustomers: string
    noCustomersDesc: string
    noResults: string
    save: string
    saving: string
    delete: string
    deleteConfirm: string
    customerCreated: string
    customerUpdated: string
    nameRequired: string
    photo: string
    uploadPhoto: string
    removePhoto: string
  }
  dashboard: {
    welcome: string
    activeOrders: string
    activeOrdersDesc: string
    products: string
    productsDesc: string
    invoices: string
    invoicesDesc: string
  }
  products: {
    title: string
    createTitle: string
    editTitle: string
    productInfo: string
    pricingAndOrders: string
    name: string
    namePlaceholder: string
    description: string
    descriptionPlaceholder: string
    productionNotes: string
    productionNotesPlaceholder: string
    active: string
    inactive: string
    searchPlaceholder: string
    noProducts: string
    noProductsDesc: string
    noResults: string
    createProduct: string
    updateProduct: string
    created: string
    updated: string
    deleted: string
    deleteConfirm: string
    basePrice: string
    productionDays: string
    minQuantity: string
    maxQuantity: string
    noPhoto: string
    viewProduct: string
    editProduct: string
    pricing: {
      title: string
      breakpoints: string
      unitPrice: string
      minQuantity: string
      addBreakpoint: string
      noBreakpoints: string
      preview: string
      interpolate: string
      interpolateOn: string
      interpolateOff: string
    }
  }
  address: {
    title: string
    areaSearch: string
    areaSearchPlaceholder: string
    startTypingToSearch: string
    searchingAreas: string
    noResults: string
    streetAddress: string
    streetAddressPlaceholder: string
    saveAsCustomerAddress: string
    isWni: string
    isWna: string
    areaNotSupported: string
    orgAddressRequired: string
    areaNotFound: string
    defaultAddress: string
  }
  production: {
    title: string
    kanbanTab: string
    listTab: string
    stagesTab: string
    searchPlaceholder: string
    allStages: string
    queue: string
    done: string
    noTasks: string
    taskDetail: string
    specification: string
    attachments: string
    activity: string
    comments: string
    commentPlaceholder: string
    send: string
    startProduction: string
    advanceTo: string
    completeRequirements: string
    requirementRequired: string
    requirementOptional: string
    uploadFile: string
    requestReview: string
    reviewAdvancement: string
    approve: string
    approveOrder: string
    reject: string
    rejectOrder: string
    cancelOrder: string
    reviewNotes: string
    canceled: string
    stageManagement: string
    addStage: string
    editStage: string
    deleteStage: string
    deleteStageConfirm: string
    stageName: string
    stageDescription: string
    stageDescriptionPlaceholder: string
    needApproval: string
    needApprovalHint: string
    active: string
    inactive: string
    requirements: string
    addRequirement: string
    requirementLabel: string
    requirementType: string
    requirementTypeText: string
    requirementTypeNumber: string
    requirementTypeUpload: string
    required: string
    optional: string
    reorder: string
    movedToStage: string
    advancedFromQueue: string
    advancementRequested: string
    approved: string
    rejected: string
    savedRequirement: string
    taskCompleted: string
    orderApproved: string
    orderRejected: string
    pendingApproval: string
  }
  portal: {
    title: string
    waitApproval: string
    orderSummary: string
    lineItems: string
    productName: string
    quantity: string
    unitPrice: string
    lineTotal: string
    itemName: string
    itemNamePlaceholder: string
    itemNotes: string
    itemNotesPlaceholder: string
    attachment: string
    addAttachment: string
    shippingAddress: string
    orderTotal: string
    submit: string
    submitting: string
    guestName: string
    guestNamePlaceholder: string
    guestPhone: string
    guestPhonePlaceholder: string
    copyLink: string
    linkCopied: string
    downloadInvoice: string
    contactAdmin: string
    notFound: string
    statusDraft: string
    statusPending: string
    statusApproved: string
    statusProduction: string
    statusInDelivery: string
    statusCompleted: string
    statusCancelled: string
    required: string
    areaRequired: string
  }
}

const en: Messages = {
  auth: {
    signIn: 'Sign in',
    signUp: 'Create an account',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    signInTitle: 'Sign in',
    signUpTitle: 'Create an account',
    signInDesc: 'Enter your email and password to continue.',
    signUpDesc: 'Use email and password to create your account.',
    alreadyHaveAccount: 'Already have an account?',
    needAccount: 'Need an account?',
    createOne: 'Create one',
    nameMin: 'Name must be at least 2 characters',
    emailValid: 'Enter a valid email address',
    passwordMin: 'Password must be at least 8 characters',
    passwordDesc: 'Minimum 8 characters.',
    authFailed: 'Authentication failed',
  },
  admin: {
    logOut: 'Log out',
  },
  app: {
    title: 'Admin Console',
    retry: 'Retry',
    language: 'Language',
    english: 'English',
    indonesian: 'Indonesian',
  },
  assetUpload: {
    dropzone: {
      title: 'Drop files here',
      hint: 'or click to browse',
    },
    actions: {
      browse: 'Browse files',
      remove: 'Remove',
      retry: 'Retry',
      undo: 'Undo',
    },
    states: {
      uploading: 'Uploading...',
      processing: 'Processing...',
      failed: 'Failed',
      done: 'Done',
    },
    errors: {
      tooLarge: 'File is too large',
      wrongType: 'File type not supported',
      uploadFailed: 'Upload failed',
      limitReached: 'Maximum files reached',
      serverError: 'Server error',
    },
    hints: {
      acceptedFormats: 'PNG, JPG, WebP up to {size}',
      maxSize: 'Max {size}',
    },
  },
  common: {
    back: 'Back',
    loading: 'Loading',
    close: 'Close',
    pageNotFound: 'Page not found',
    pageNotFoundDesc:
      "The page you're looking for doesn't exist or may have been moved.",
    goHome: 'Go home',
    confirm: 'Confirm',
    cancel: 'Cancel',
    preview: 'Preview',
    actions: 'Actions',
  },
  dataTable: {
    clearFilters: 'Clear filters',
    columnVisibility: 'Columns',
    errorRetry: 'Retry',
    errorTitle: 'Something went wrong',
    firstPage: 'First page',
    lastPage: 'Last page',
    nextPage: 'Next page',
    of: 'of',
    page: 'Page',
    perPage: 'Per page',
    previousPage: 'Previous page',
    resetColumns: 'Reset columns',
    rowsSelected: '{selected} of {total} selected',
    visibleRows: '{from}-{to} of {total}',
    loading: 'Loading',
    filterAll: 'All',
    filters: 'Filters',
    applyFilters: 'Apply',
    cancelFilters: 'Cancel',
    activeFilters: 'Active filters',
  },
  orders: {
    title: 'Orders',
    createOrder: 'Create Order',
    editOrder: 'Edit Order',
    viewOrder: 'View Order',
    customer: 'Customer',
    status: 'Status',
    total: 'Total',
    orderNumber: 'Order Number',
    validUntil: 'Valid Until',
    notes: 'Notes',
    lineItemNotes: 'Item Notes',
    lineItemName: 'Item Name',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    totalLabel: 'Total',
    lineItems: 'Line Items',
    summary: 'Order Summary',
    attachments: 'Attachments',
    save: 'Save',
    saving: 'Saving...',
    orderCreated: 'Order created successfully',
    orderUpdated: 'Order updated successfully',
    searchPlaceholder: 'Search orders...',
    noOrders: 'No orders yet',
    noOrdersDesc: 'Create your first draft order to get started.',
    noResults: 'No orders match your search',
    addLineItem: 'Add Line Item',
    removeLineItem: 'Remove',
    createCustomer: 'Create Customer',
    customerNamePlaceholder: 'Enter customer name',
    customerPhonePlaceholder: 'Enter phone number',
    addItem: 'Add Item',
    specification: 'Specification',
    selectProduct: 'Select Product',
    orderTotal: 'Order Total',
    searchProducts: 'Search products...',
    addToOrder: 'Add',
    lineSubtotal: 'Subtotal',
    maxQtyError: 'Max quantity is {max}',
    phone: 'Phone',
    email: 'Email',
    copyPortalLink: 'Copy Portal Link',
    linkCopied: 'Portal link copied',
    generateLink: 'Generate Portal Link',
    approve: 'Approve',
    reject: 'Reject',
    rejectReason: 'Rejection Reason',
    rejectReasonPlaceholder: 'Enter reason for rejection',
    orderApproved: 'Order approved',
    orderRejected: 'Order rejected',
  },
  breadcrumb: {
    dashboard: 'Dashboard',
    detail: 'Detail',
    edit: 'Edit',
    new: 'New',
    customers: 'Customers',
    createCustomer: 'Create Customer',
    editCustomer: 'Edit Customer',
    viewCustomer: 'View Customer',
    products: 'Products',
    newProduct: 'New Product',
    editProduct: 'Edit Product',
    orders: 'Orders',
    createOrder: 'Create Order',
    viewOrder: 'View Order',
    editOrder: 'Edit Order',
    settings: 'Settings',
    general: 'General',
    productionStages: 'Production Stages',
  },
  status: {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    production: 'In Production',
    in_delivery: 'In Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    active: 'Active',
    inactive: 'Inactive',
    paid: 'Paid',
    overdue: 'Overdue',
    failed: 'Failed',
  },
  org: {
    title: 'Organizations',
    welcome: 'Welcome to Pabriq',
    createDesc: 'Name your organization to get started',
    create: 'Create Organization',
    name: 'Organization Name',
    namePlaceholder: 'e.g. My Workshop',
    nameMin: 'Name must be at least 2 characters',
    nameInvalid: 'Invalid organization name',
    creating: 'Creating...',
    creationFailed: 'Failed to create organization',
    taken: 'That name is taken. Please try a different organization name.',
    redirecting: 'Redirecting...',
    logoPhoto: 'Organization Photo',
    logoPhotoHint: 'PNG, JPG, or WebP up to 5MB',
  },
  sidebar: {
    dashboard: 'Dashboard',
    orders: 'Orders',
    customers: 'Customers',
    products: 'Products',
    invoices: 'Invoices',
    production: 'Production',
    settings: 'Settings',
  },
  settings: {
    comingSoon: 'General settings coming soon',
  },
  customers: {
    title: 'Customers',
    createCustomer: 'Create Customer',
    editCustomer: 'Edit Customer',
    viewCustomer: 'View Customer',
    customerInfo: 'Customer Information',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    notes: 'Notes',
    active: 'Active',
    inactive: 'Inactive',
    searchPlaceholder: 'Search customers...',
    noCustomers: 'No customers yet',
    noCustomersDesc: 'Add your first customer to start managing orders.',
    noResults: 'No customers match your search',
    save: 'Save',
    saving: 'Saving...',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this customer?',
    customerCreated: 'Customer created successfully',
    customerUpdated: 'Customer updated successfully',
    nameRequired: 'Name is required',
    photo: 'Photo',
    uploadPhoto: 'Upload Photo',
    removePhoto: 'Remove Photo',
  },
  dashboard: {
    welcome: 'Welcome to your Pabriq workspace',
    activeOrders: 'Active Orders',
    activeOrdersDesc: 'Orders currently in production',
    products: 'Products',
    productsDesc: 'Products in your catalog',
    invoices: 'Invoices',
    invoicesDesc: 'Outstanding invoices',
  },
  products: {
    title: 'Products',
    createTitle: 'New Product',
    editTitle: 'Edit Product',
    productInfo: 'Product Information',
    pricingAndOrders: 'Pricing & Orders',
    name: 'Product Name',
    namePlaceholder: 'e.g. Custom T-Shirt',
    description: 'Description',
    descriptionPlaceholder: 'Describe the product',
    productionNotes: 'Production Notes',
    productionNotesPlaceholder: 'Special instructions for production',
    active: 'Active',
    inactive: 'Inactive',
    searchPlaceholder: 'Search products...',
    noProducts: 'No products yet',
    noProductsDesc: 'Create your first product to start building your catalog.',
    noResults: 'No products match your search',
    createProduct: 'Create Product',
    updateProduct: 'Update Product',
    created: 'Product created successfully',
    updated: 'Product updated successfully',
    deleted: 'Product deleted',
    deleteConfirm: 'Are you sure you want to delete this product?',
    basePrice: 'Base Price',
    productionDays: 'Production Days',
    minQuantity: 'Min. Quantity',
    maxQuantity: 'Max. Quantity',
    noPhoto: 'No photo',
    viewProduct: 'View Product',
    editProduct: 'Edit Product',
    pricing: {
      title: 'Pricing',
      breakpoints: 'Pricing Breakpoints',
      unitPrice: 'Unit Price',
      minQuantity: 'Min. Quantity',
      addBreakpoint: 'Add Breakpoint',
      noBreakpoints: 'No pricing breakpoints configured',
      preview: 'Pricing Preview',
      interpolate: 'Interpolate pricing',
      interpolateOn:
        'Prices are calculated using linear interpolation between breakpoints',
      interpolateOff: 'Prices use the nearest lower breakpoint (step pricing)',
    },
  },
  address: {
    title: 'Address',
    areaSearch: 'Search area...',
    areaSearchPlaceholder: 'Search subdistrict, district, city, or postal code',
    startTypingToSearch: 'Start typing to search areas',
    searchingAreas: 'Searching areas...',
    noResults: 'Area not found',
    streetAddress: 'Street Address',
    streetAddressPlaceholder: 'e.g. Jl. Raya Bogor No. 123',
    saveAsCustomerAddress: 'Save as customer address',
    isWni: 'Indonesian (WNI)',
    isWna: 'Foreign (WNA)',
    areaNotSupported: 'Shipping calculation not available for WNA customers',
    orgAddressRequired: 'Please set your organization address to continue',
    areaNotFound: 'Area not found. Please check the area name.',
    defaultAddress: 'Default address',
  },
  production: {
    title: 'Production',
    kanbanTab: 'Kanban',
    listTab: 'List',
    stagesTab: 'Stages',
    searchPlaceholder: 'Search orders...',
    allStages: 'All Stages',
    queue: 'Queue',
    done: 'Done',
    noTasks: 'No tasks yet',
    taskDetail: 'Task Detail',
    specification: 'Specification',
    attachments: 'Attachments',
    activity: 'Activity',
    comments: 'Comments',
    commentPlaceholder: 'Add a comment...',
    send: 'Send',
    startProduction: 'Start Production',
    advanceTo: 'Advance to {stage}',
    completeRequirements: 'Complete Requirements',
    requirementRequired: 'Required',
    requirementOptional: 'Optional',
    uploadFile: 'Upload File',
    requestReview: 'Request Review',
    reviewAdvancement: 'Review Advancement',
    approve: 'Approve & Advance',
    approveOrder: 'Approve Order',
    reject: 'Reject',
    rejectOrder: 'Reject Order',
    cancelOrder: 'Cancel Order',
    reviewNotes: 'Review Notes',
    canceled: 'Canceled',
    stageManagement: 'Production Stages',
    addStage: 'Add Stage',
    editStage: 'Edit Stage',
    deleteStage: 'Delete Stage',
    deleteStageConfirm: 'Are you sure you want to delete this stage?',
    stageName: 'Stage Name',
    stageDescription: 'Description',
    stageDescriptionPlaceholder: 'Describe this stage',
    needApproval: 'Requires Approval',
    needApprovalHint: 'Advancing past this stage requires admin approval',
    active: 'Active',
    inactive: 'Inactive',
    requirements: 'Requirements',
    addRequirement: 'Add Requirement',
    requirementLabel: 'Label',
    requirementType: 'Type',
    requirementTypeText: 'Text',
    requirementTypeNumber: 'Number',
    requirementTypeUpload: 'Upload',
    required: 'Required',
    optional: 'Optional',
    reorder: 'Reorder',
    movedToStage: 'Moved to {stage}',
    advancedFromQueue: 'Advanced from Queue',
    advancementRequested: 'Advancement requested',
    approved: 'Approved by {actor}',
    rejected: 'Rejected by {actor}',
    savedRequirement: 'Requirement saved',
    taskCompleted: 'Task completed',
    orderApproved: 'Order approved successfully',
    orderRejected: 'Order rejected',
    pendingApproval: 'Pending Approval',
  },
  portal: {
    title: 'Order Confirmation',
    waitApproval:
      'Your order has been submitted. Please wait for admin approval.',
    orderSummary: 'Order Summary',
    lineItems: 'Order Items',
    productName: 'Product',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    lineTotal: 'Total',
    itemName: 'Item Name',
    itemNamePlaceholder: 'Enter item name (optional override)',
    itemNotes: 'Notes / Specification',
    itemNotesPlaceholder: 'Add notes or specifications for this item',
    attachment: 'Attachment',
    addAttachment: 'Add attachment',
    shippingAddress: 'Shipping Address',
    orderTotal: 'Order Total',
    submit: 'Confirm Order',
    submitting: 'Submitting...',
    guestName: 'Full Name',
    guestNamePlaceholder: 'Enter your full name',
    guestPhone: 'Phone Number',
    guestPhonePlaceholder: 'Enter your phone number',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!',
    downloadInvoice: 'Download Invoice',
    contactAdmin: 'Contact Admin via WhatsApp',
    notFound: 'Order not found',
    statusDraft: 'Pending Confirmation',
    statusPending: 'Awaiting Approval',
    statusApproved: 'Approved',
    statusProduction: 'In Production',
    statusInDelivery: 'In Delivery',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    required: 'This field is required',
    areaRequired: 'Please select an area',
  },
  combobox: {
    searchPlaceholder: 'Search...',
    noResults: 'No results found',
    loading: 'Searching...',
  },
}

export default en
