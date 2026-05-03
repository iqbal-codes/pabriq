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
    loading: string
    pageNotFound: string
    pageNotFoundDesc: string
    goHome: string
    confirm: string
    cancel: string
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
  }
  orders: {
    title: string
    createOrder: string
    editOrder: string
    customer: string
    status: string
    total: string
    notes: string
    quantity: string
    unitPrice: string
    lineItems: string
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
  }
  breadcrumb: {
    dashboard: string
    customers: string
    createCustomer: string
    editCustomer: string
    products: string
    newProduct: string
    editProduct: string
    orders: string
    createOrder: string
  }
  status: {
    draft: string
    pending: string
    approved: string
    production: string
    in_delivery: string
    completed: string
    cancelled: string
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
    variant: {
      title: string
      name: string
      namePlaceholder: string
      add: string
      noVariants: string
      attributes: string
    }
    pricing: {
      title: string
      breakpoints: string
      unitPrice: string
      minQuantity: string
      addBreakpoint: string
      noBreakpoints: string
      preview: string
    }
  }
  address: {
    title: string
    areaSearch: string
    areaSearchPlaceholder: string
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
    loading: 'Loading',
    pageNotFound: 'Page not found',
    pageNotFoundDesc:
      "The page you're looking for doesn't exist or may have been moved.",
    goHome: 'Go home',
    confirm: 'Confirm',
    cancel: 'Cancel',
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
  },
  orders: {
    title: 'Orders',
    createOrder: 'Create Order',
    editOrder: 'Edit Order',
    customer: 'Customer',
    status: 'Status',
    total: 'Total',
    notes: 'Notes',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    lineItems: 'Line Items',
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
  },
  breadcrumb: {
    dashboard: 'Dashboard',
    customers: 'Customers',
    createCustomer: 'Create Customer',
    editCustomer: 'Edit Customer',
    products: 'Products',
    newProduct: 'New Product',
    editProduct: 'Edit Product',
    orders: 'Orders',
    createOrder: 'Create Order',
  },
  status: {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    production: 'In Production',
    in_delivery: 'In Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
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
  customers: {
    title: 'Customers',
    createCustomer: 'Create Customer',
    editCustomer: 'Edit Customer',
    customerInfo: 'Customer Information',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    notes: 'Internal Notes',
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
    variant: {
      title: 'Variants',
      name: 'Variant Name',
      namePlaceholder: 'e.g. Large',
      add: 'Add Variant',
      noVariants: 'No variants configured',
      attributes: 'Attributes',
    },
    pricing: {
      title: 'Pricing',
      breakpoints: 'Pricing Breakpoints',
      unitPrice: 'Unit Price',
      minQuantity: 'Min. Quantity',
      addBreakpoint: 'Add Breakpoint',
      noBreakpoints: 'No pricing breakpoints configured',
      preview: 'Pricing Preview',
    },
  },
  address: {
    title: 'Address',
    areaSearch: 'Search area...',
    areaSearchPlaceholder: 'Search subdistrict, district, city, or postal code',
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
}

export default en
