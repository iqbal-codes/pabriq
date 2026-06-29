export type AdminMetric = {
  label: string
  value: string
  detail: string
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Operator'
  status: 'Active' | 'Invited' | 'Suspended'
}

export type AdminAction = {
  id: string
  title: string
  owner: string
  status: 'Ready' | 'Review' | 'Blocked'
}

export type AdminSummary = {
  metrics: Array<AdminMetric>
  users: Array<AdminUser>
  actions: Array<AdminAction>
}

export const adminSummary: AdminSummary = {
  metrics: [
    {
      label: 'Protected pages',
      value: '3',
      detail: 'Overview, users, and system routes',
    },
    {
      label: 'Session source',
      value: 'Better Auth',
      detail: 'Email and password with Drizzle tables',
    },
    {
      label: 'Client state',
      value: 'Store + DB',
      detail: 'Local preferences and operational actions',
    },
  ],
  users: [
    {
      id: 'usr_001',
      name: 'Avery Stone',
      email: 'avery@example.com',
      role: 'Owner',
      status: 'Active',
    },
    {
      id: 'usr_002',
      name: 'Mina Park',
      email: 'mina@example.com',
      role: 'Admin',
      status: 'Active',
    },
    {
      id: 'usr_003',
      name: 'Jon Bell',
      email: 'jon@example.com',
      role: 'Operator',
      status: 'Invited',
    },
  ],
  actions: [
    {
      id: 'act_001',
      title: 'Verify auth API health',
      owner: 'Platform',
      status: 'Ready',
    },
    {
      id: 'act_002',
      title: 'Add organization membership',
      owner: 'Admin',
      status: 'Review',
    },
    {
      id: 'act_003',
      title: 'Connect production Neon branch',
      owner: 'Data',
      status: 'Blocked',
    },
  ],
}
