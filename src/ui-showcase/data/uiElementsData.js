import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Brain,
  Briefcase,
  CheckCircle,
  ClipboardList,
  Clock,
  Database,
  Edit2,
  Layout,
  LayoutGrid,
  Layers,
  List,
  Minus,
  Package,
  Plus,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Square,
  Target,
  Trash2,
  Users,
  Wrench,
  X,
} from 'lucide-react';

export const ISSUE_STATUS = {
  open: { label: 'Open', color: '#ef4444', icon: ShieldAlert },
  in_progress: { label: 'In Progress', color: '#f59e0b', icon: Clock },
  resolved: { label: 'Resolved', color: '#10b981', icon: CheckCircle },
};

export const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

export const COLOR_TOKEN_GROUPS = [
  {
    title: 'Brand',
    tokens: [
      { name: 'Primary', value: 'var(--primary)' },
      { name: 'Primary Light', value: 'var(--primary-light)' },
      { name: 'Primary Dark', value: 'var(--primary-dark)' },
    ],
  },
  {
    title: 'Semantic',
    tokens: [
      { name: 'Success', value: 'var(--success)' },
      { name: 'Warning', value: 'var(--warning)' },
      { name: 'Danger', value: 'var(--danger)' },
      { name: 'Rose', value: 'var(--rose)' },
    ],
  },
  {
    title: 'Surfaces',
    tokens: [
      { name: 'Background', value: 'var(--bg)' },
      { name: 'Secondary', value: 'var(--bg-secondary)' },
      { name: 'Card', value: 'var(--card)' },
      { name: 'Sidebar', value: 'var(--sidebar-bg)' },
    ],
  },
  {
    title: 'Text & Border',
    tokens: [
      { name: 'Text', value: 'var(--text)' },
      { name: 'Secondary', value: 'var(--text-secondary)' },
      { name: 'Muted', value: 'var(--text-muted)' },
      { name: 'Border', value: 'var(--border)' },
    ],
  },
];

export const TYPOGRAPHY_SAMPLES = [
  { label: 'Display', style: { fontSize: 34, fontWeight: 800, lineHeight: 1.05 }, text: 'Aesthetic baseline heading' },
  { label: 'Section Heading', style: { fontSize: 22, fontWeight: 700, lineHeight: 1.2 }, text: 'Structured section title' },
  { label: 'Card Title', style: { fontSize: 16, fontWeight: 700, lineHeight: 1.25 }, text: 'Dense card heading' },
  { label: 'Body', style: { fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: 'var(--text-secondary)' }, text: 'This is the default reading size used in tables, panels, previews, and descriptive text throughout the app.' },
  { label: 'Meta Label', style: { fontSize: 11, fontWeight: 800, lineHeight: 1.3, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }, text: 'Context Label' },
  { label: 'Mono', style: { fontSize: 13, fontWeight: 500, lineHeight: 1.5, fontFamily: 'var(--font-mono)' }, text: 'fact_sales.order_id = TEXT' },
];

export const TAB_SELECTOR_ITEMS = [
  { id: 'issues', label: 'Issues', icon: AlertCircle },
  { id: 'stakeholders', label: 'Stakeholders', icon: Users },
  { id: 'map', label: 'Domain Map', icon: Database },
  { id: 'dictionary', label: 'Data Dictionary', icon: ClipboardList },
  { id: 'rules', label: 'Business Rules', icon: Shield },
];

export const SIDEBAR_ITEMS = [
  { id: 'context', label: 'Business Context', icon: BookOpen },
  { id: 'ui', label: 'UI Elements', icon: LayoutGrid },
  { id: 'ai', label: 'AI', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'dev', label: 'Development', icon: Wrench },
];

export const DOMAIN_CARD_SAMPLES = [
  {
    id: '__all__',
    name: 'All Entities',
    description: 'Universal pool containing every registered logical concept and physical data asset, including orphaned entities.',
    owner: 'Platform Governance',
    color: '#5B9AFF',
    icon: Layers,
    count: 7,
    selected: true,
    virtual: true,
  },
  {
    id: 'sales',
    name: 'Sales & Commercial',
    description: 'Comprehensive oversight of revenue generation, product catalog management, and transaction lifecycle. Focuses on monetization and order flow.',
    owner: 'Commercial Director',
    color: '#ff3b7c',
    icon: ShoppingCart,
    count: 3,
  },
  {
    id: 'customer',
    name: 'Customer Experience',
    description: 'Centralized view of customer demographics, behavior, and lifecycle value. Focuses on retention, segmentation, and support visibility.',
    owner: 'Marketing VP',
    color: '#a78bfa',
    icon: Users,
    count: 2,
  },
];

export const ENTITY_CARD_SAMPLES = [
  {
    id: 'sales',
    name: 'Sales',
    description: 'Every completed, returned, or cancelled commerce transaction.',
    sensitivity: 'Internal',
    domainId: 'sales',
    domainColor: '#ff3b7c',
    icon: ShoppingCart,
    datasets: 1,
    measurementSource: 'Internal System',
    calculationType: 'Raw Data',
    regulations: [],
    businessQuestions: [
      'What is the monthly revenue by category?',
      'Which channel generates the most orders?',
      'What is the return rate?',
    ],
    fields: [
      { field: 'order_id', type: 'TEXT', sensitivity: 'Internal' },
      { field: 'revenue', type: 'REAL', sensitivity: 'Internal' },
    ],
    qualityRules: [
      { field: 'revenue', rule: 'NOT NULL', status: 'pass' },
      { field: 'revenue', rule: '> 0', status: 'fail' },
    ],
    images: [
      'entities/sales_1773144977576_2fmua.jpeg',
      'entities/sales_1773144999401_wx5pc.jpg',
    ],
    interestedStakeholders: [
      {
        id: 'stk-raul',
        name: 'Raul Sanz-López',
        role: 'Lead of Supply Chain & Fulfillment',
        initials: 'RS',
        context: 'Interested in operational order flow and fulfillment continuity.',
      },
      {
        id: 'stk-marc',
        name: 'Marc Volkov',
        role: 'Senior Data Architect',
        initials: 'MV',
        context: 'Designing the central fact table',
      },
      {
        id: 'stk-javier',
        name: 'Javier Belmonte',
        role: 'Financial Planning & Analysis (FP&A) Manager',
        initials: 'JB',
        context: 'Reconciling gross revenue vs. net profit',
      },
    ],
  },
  {
    id: 'products',
    name: 'Products',
    description: 'Master product catalog with category, list price, and merchandising metadata.',
    sensitivity: 'Public',
    domainId: 'sales',
    domainColor: '#ff3b7c',
    icon: Package,
    datasets: 1,
    measurementSource: 'Internal System',
    calculationType: 'Raw Data',
    regulations: [],
    businessQuestions: [
      'How many active products are there per category?',
      'What is the average ticket price per product?',
    ],
    fields: [
      { field: 'product_id', type: 'TEXT', sensitivity: 'Public' },
      { field: 'category', type: 'TEXT', sensitivity: 'Public' },
    ],
    qualityRules: [],
    images: [],
    interestedStakeholders: [
      {
        id: 'stk-marc',
        name: 'Marc Volkov',
        role: 'Senior Data Architect',
        initials: 'MV',
        context: 'Maintaining the master product catalog',
      },
      {
        id: 'stk-mateo',
        name: 'Mateo Ricci',
        role: 'Category Manager (Electronics & Media)',
        initials: 'MR',
        context: 'Maintaining metadata, specs, and categorization',
      },
    ],
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Demographic and contact records supporting support, lifecycle, and experience operations.',
    sensitivity: 'PII',
    domainId: 'customer',
    domainColor: '#a78bfa',
    icon: Users,
    datasets: 1,
    measurementSource: 'Internal System',
    calculationType: 'Raw Data',
    regulations: [],
    businessQuestions: ['What is the LTV (Lifetime Value) per segment?'],
    fields: [],
    qualityRules: [],
    images: [],
    interestedStakeholders: [
      {
        id: 'stk-sofia',
        name: 'Sofia Conti',
        role: 'Head of Customer Support',
        initials: 'SC',
        context: 'Monitoring CSAT scores and complaint history',
      },
      {
        id: 'stk-arantxa',
        name: 'Arantxa Urquiza',
        role: 'Data Privacy Officer (DPO)',
        initials: 'AU',
        context: 'Overseeing Right to be Forgotten and Data Portability requests',
      },
    ],
  },
  {
    id: 'employees',
    name: 'Employees',
    description: 'Detailed records of internal staff, organizational roles, and hierarchy assignments.',
    sensitivity: 'PII',
    domainId: 'hr',
    domainColor: '#ff3b7c',
    icon: Target,
    datasets: 1,
    measurementSource: 'Internal System',
    calculationType: 'Raw Data',
    regulations: [],
    businessQuestions: [
      'What is the current headcount per department?',
      'What is the average tenure of the staff?',
    ],
    fields: [],
    qualityRules: [],
    images: [],
    interestedStakeholders: [
      {
        id: 'stk-elena',
        name: 'Elena Moreno',
        role: 'HR Director',
        initials: 'EM',
        context: 'Owner of the employee master records',
      },
      {
        id: 'stk-arantxa',
        name: 'Arantxa Urquiza',
        role: 'Data Privacy Officer (DPO)',
        initials: 'AU',
        context: 'Ensuring internal privacy for staff records',
      },
    ],
  },
  {
    id: 'consumer-loyalty',
    name: 'consumer loyalty',
    description: 'Loyalty of consumers',
    sensitivity: 'Public',
    domainId: 'customer',
    domainColor: '#a78bfa',
    icon: Target,
    datasets: 1,
    measurementSource: 'CRM',
    calculationType: 'Derived',
    regulations: ['GDPR'],
    businessQuestions: ['Are the customers loyal?'],
    fields: [],
    qualityRules: [],
    images: [],
    interestedStakeholders: [
      {
        id: 'stk-beatriz',
        name: 'Beatriz Garrido',
        role: 'Head of Loyalty & Club Mart',
        initials: 'BG',
        context: 'Needs loyalty behavior to resolve consistently across identifiers.',
      },
    ],
  },
  {
    id: 'ai-adoption',
    name: 'AI adoption',
    description: 'Rate of adoption of AI tools by employees',
    sensitivity: 'Internal',
    domainId: 'hr',
    domainColor: '#ff3b7c',
    icon: Brain,
    datasets: 1,
    measurementSource: 'Internal Survey',
    calculationType: 'Derived',
    regulations: ['GDPR'],
    businessQuestions: ['What is the rate of AI adoption in the company?'],
    fields: [],
    qualityRules: [],
    images: [],
    interestedStakeholders: [],
  },
  {
    id: 'ux',
    name: 'UX',
    description: 'ux definition',
    sensitivity: 'Internal',
    domainId: 'customer',
    domainColor: '#a78bfa',
    icon: Layout,
    datasets: 4,
    measurementSource: 'Experience Ops',
    calculationType: 'Raw Data',
    regulations: [],
    businessQuestions: [],
    fields: [],
    qualityRules: [],
    images: [],
    interestedStakeholders: [],
  },
];

export const ENTITY_RELATIONSHIP_SAMPLES = [
  { from: 'ai-adoption', label: 'depends on', to: 'products' },
];

export const ISSUE_CARD_SAMPLES = [
  {
    id: 'iss-1',
    stakeholder: 'Sofia Conti',
    role: 'Head of Customer Support',
    initials: 'SC',
    priority: 'medium',
    createdAt: '3/10/26, 1:23 PM',
    title: 'Newsletter Opt-Out Sync Failure',
    description:
      "Customers who opt-out on the website are still receiving emails for up to 48 hours because the dim_customers PII flag isn't triggering the marketing API immediately.",
    status: 'open',
    expanded: true,
  },
  {
    id: 'iss-2',
    stakeholder: 'Beatriz Garrido',
    role: 'Head of Loyalty & Club Mart',
    initials: 'BG',
    priority: 'medium',
    createdAt: '3/10/26, 1:23 PM',
    title: 'Loyalty Program Attribution Gap',
    description:
      'Points earned via the mobile app are not correctly linking to the web-based profile ID. Approximately 12% of loyalty transactions are being held for manual review.',
    status: 'in_progress',
    expanded: false,
  },
];

export const STAKEHOLDER_LIST_SAMPLES = [
  {
    id: 'stk-1',
    name: 'Raul Sanz-Lopez',
    role: 'Lead of Supply Chain & Fulfillment',
    type: 'Individual',
    initials: 'RS',
    authority: 'High',
    literacy: 'Advanced',
    authorityDesc: 'Owns supply chain operating decisions, fulfillment prioritization, and warehouse escalations tied to service levels.',
    literacyDesc: 'Comfortable reading operational dashboards and exception queues, but relies on analysts for structural data changes.',
    expectations: ['Faster stock reconciliation between stores and the warehouse network.'],
    painPoints: ['Shipment status updates arrive too late for proactive intervention.'],
    interests: [
      {
        entityId: 'ent_supply_1289',
        name: 'Orders',
        definition: 'Tracks order lifecycle events from placement through shipment and delivery confirmation.',
        context: 'Needs earlier signals for fulfillment exceptions and delivery blockers.',
        icon: Database,
      },
    ],
  },
  {
    id: 'stk-2',
    name: 'Beatriz Garrido',
    role: 'Head of Loyalty & Club Mart',
    type: 'Individual',
    initials: 'BG',
    authority: 'Medium',
    literacy: 'Advanced',
    authorityDesc: 'Guides loyalty operations and campaign design, but major platform changes still require cross-functional approval.',
    literacyDesc: 'Understands attribution and campaign metrics well enough to challenge definitions and KPI drift.',
    expectations: ['Consistent member attribution across app, web, and in-store experiences.'],
    painPoints: ['Loyalty behavior is split across multiple disconnected identifiers.'],
    interests: [
      {
        entityId: 'ent_loyalty_4421',
        name: 'Customers',
        definition: 'Maintains customer identity, contact preferences, and loyalty participation attributes.',
        context: 'Needs confidence that loyalty events resolve to the right customer profile.',
        icon: Users,
      },
    ],
  },
  {
    id: 'stk-3',
    name: 'Elena Moreno',
    role: 'HR Director',
    type: 'Individual',
    initials: 'EM',
    authority: 'High',
    literacy: 'Intermediate',
    authorityDesc: 'Final authority on internal staff records, organizational restructuring, and HR software procurement.',
    literacyDesc: 'Comfortable reviewing people metrics and operational exceptions but depends on data teams for schema-level changes.',
    expectations: ['100% data accuracy for the upcoming annual performance review cycle.'],
    painPoints: ['Manual entry of employee data leading to high error rates in organizational charts.'],
    interests: [
      {
        entityId: 'ent_1772818914195',
        name: 'Employees',
        definition: 'Detailed records of internal staff, including roles, hierarchy, and department assignments.',
        context: 'Owner of the employee master records',
        icon: Database,
      },
    ],
  },
  {
    id: 'stk-4',
    name: 'Marc Volkov',
    role: 'Senior Data Architect',
    type: 'Individual',
    initials: 'MV',
    authority: 'High',
    literacy: 'Technical Expert',
    authorityDesc: 'Sets architectural guardrails for canonical datasets, modeling patterns, and data contract enforcement.',
    literacyDesc: 'Deep technical ownership across pipelines, warehouse models, and semantic alignment.',
    expectations: ['Logical entities should remain traceable to their physical manifestations.'],
    painPoints: ['Source systems drift faster than the governed semantic layer can absorb.'],
    interests: [
      {
        entityId: 'ent_products_3001',
        name: 'Products',
        definition: 'Master product catalog with category, list price, and merchandising metadata.',
        context: 'Maintaining the canonical product definition across ingestion paths.',
        icon: Package,
      },
    ],
  },
  {
    id: 'stk-5',
    name: 'Javier Belmonte',
    role: 'Financial Planning & Analysis (FP&A) Manager',
    type: 'Individual',
    initials: 'JB',
    authority: 'Medium',
    literacy: 'Advanced',
    authorityDesc: 'Owns financial planning cycles and reporting requirements for revenue and margin oversight.',
    literacyDesc: 'Strong with metrics, drilldowns, and reporting logic, but not with underlying model engineering.',
    expectations: ['Reliable month-end numbers without manual reconciliation.'],
    painPoints: ['Revenue definitions shift between reporting contexts and planning workbooks.'],
    interests: [
      {
        entityId: 'ent_finance_2811',
        name: 'Revenue',
        definition: 'Represents recognized commercial performance under approved business rules and exclusions.',
        context: 'Needs one accepted revenue definition for planning and reporting.',
        icon: Target,
      },
    ],
  },
  {
    id: 'stk-6',
    name: 'Sofia Conti',
    role: 'Head of Customer Support',
    type: 'Individual',
    initials: 'SC',
    authority: 'Medium',
    literacy: 'Intermediate',
    authorityDesc: 'Owns support process health, escalation handling, and service issue visibility.',
    literacyDesc: 'Comfortable with queue-level metrics and issue triage, but not data model internals.',
    expectations: ['Clear issue ownership and faster resolution for customer-facing failures.'],
    painPoints: ['Operational incidents are often discovered by customers before internal teams.'],
    interests: [
      {
        entityId: 'ent_support_9051',
        name: 'Cases',
        definition: 'Tracks support requests, escalation states, and service outcomes for customer operations.',
        context: 'Needs a direct link between issue signals and frontline support workflows.',
        icon: AlertCircle,
      },
    ],
  },
  {
    id: 'stk-7',
    name: 'Mateo Ricci',
    role: 'Category Manager (Electronics & Media)',
    type: 'Individual',
    initials: 'MR',
    authority: 'Medium',
    literacy: 'Business Fluent',
    authorityDesc: 'Owns category metadata quality, assortment decisions, and merchandising readiness for his product lines.',
    literacyDesc: 'Strong commercial fluency and analytics usage, but depends on governed assets for consistency.',
    expectations: ['Product attributes should stay aligned across catalog, pricing, and campaign systems.'],
    painPoints: ['Spec and category mismatches create merchandising delays.'],
    interests: [
      {
        entityId: 'ent_catalog_7114',
        name: 'Products',
        definition: 'Defines product identity, category placement, pricing anchors, and merchandising descriptors.',
        context: 'Maintaining metadata, specs, and categorization',
        icon: Package,
      },
    ],
  },
];

export const ICON_GROUPS = [
  {
    title: 'Shell Navigation',
    items: [
      { label: 'Business Context', icon: BookOpen, color: 'var(--text-secondary)' },
      { label: 'UI Elements', icon: LayoutGrid, color: 'var(--primary)' },
      { label: 'AI', icon: Brain, color: 'var(--text-secondary)' },
      { label: 'Settings', icon: Settings, color: 'var(--text-secondary)' },
      { label: 'Development', icon: Wrench, color: 'var(--text-secondary)' },
    ],
  },
  {
    title: 'Business Context Tabs',
    items: [
      { label: 'Issues', icon: AlertCircle, color: 'var(--text-secondary)' },
      { label: 'Stakeholders', icon: Users, color: 'var(--text-secondary)' },
      { label: 'Domain Map', icon: Database, color: 'var(--primary)' },
      { label: 'Data Dictionary', icon: ClipboardList, color: 'var(--text-secondary)' },
      { label: 'Business Rules', icon: Shield, color: 'var(--text-secondary)' },
    ],
  },
  {
    title: 'Domain & Entity Icons',
    items: [
      { label: 'Business Domain', icon: Briefcase, color: '#5B9AFF' },
      { label: 'Sales', icon: ShoppingCart, color: '#ff3b7c' },
      { label: 'Products', icon: Package, color: '#ff3b7c' },
      { label: 'Customers', icon: Users, color: '#a78bfa' },
      { label: 'Employees', icon: Target, color: '#ff3b7c' },
      { label: 'All Entities', icon: Layers, color: '#5B9AFF' },
    ],
  },
  {
    title: 'Actions & Status',
    items: [
      { label: 'Add', icon: Plus, color: 'var(--text)' },
      { label: 'List View', icon: List, color: 'var(--text)' },
      { label: 'Edit', icon: Edit2, color: 'var(--text-muted)' },
      { label: 'Delete', icon: Trash2, color: 'var(--danger)' },
      { label: 'Open', icon: ShieldAlert, color: '#ef4444' },
      { label: 'In Progress', icon: Clock, color: '#f59e0b' },
      { label: 'Resolved', icon: CheckCircle, color: '#10b981' },
      { label: 'Warning', icon: AlertTriangle, color: 'var(--warning)' },
    ],
  },
  {
    title: 'Window Controls',
    items: [
      { label: 'Minimize', icon: Minus, color: 'var(--text-muted)' },
      { label: 'Maximize', icon: Square, color: 'var(--text-muted)' },
      { label: 'Close', icon: X, color: 'var(--danger)' },
    ],
  },
];

export const STAKEHOLDER_MODAL_ENTITY_OPTIONS = [
  ...ENTITY_CARD_SAMPLES.map((entity) => ({
    id: entity.id,
    name: entity.name,
  })),
  {
    id: 'ent_1772818914195',
    name: 'Employees',
  },
];

export const FALLBACK_EDIT_STAKEHOLDER = {
  id: 'STK-preview-sofia',
  name: 'Sofia Conti',
  role: 'Head of Customer Support',
  type: 'Individual',
  avatar: '',
  avatarFocus: { x: 50, y: 50 },
  expectations: ['Maintain a Net Promoter Score (NPS) above 75 for the 2026 fiscal year'],
  painPoints: ['Support agents lack a single customer view during escalations.'],
  interests: [
    { entityId: 'customers', context: 'Monitoring CSAT scores and complaint history' },
    { entityId: 'sales', context: 'Investigating return rates and faulty product batches' },
  ],
  authority: 'Medium / Operational Lead',
  authorityDesc: 'Manages support workflows and can authorize service recovery actions based on data insights.',
  literacy: 'Proficient / Business',
  literacyDesc: 'Focused on service metrics, customer sentiment, and lifecycle health.',
};

export const NEW_ENTITY_FORM = {
  domainId: null,
  sensitivity: 'Internal',
  manifestations: [],
  tempRelationships: [],
  calculationType: 'Raw',
  regulations: [],
  businessQuestions: [],
  images: [],
  interestedStakeholderIds: [],
  measurementSource: '',
  description: '',
  name: '',
};

export function buildFallbackInventoryData() {
  const domains = DOMAIN_CARD_SAMPLES.filter((domain) => !domain.virtual).map((domain) => ({
    id: domain.id,
    name: domain.name,
    color: domain.color,
  }));

  const entities = ENTITY_CARD_SAMPLES.map((entity) => ({
    id: entity.id,
    domainId: entity.domainId,
    name: entity.name,
    manifestations:
      entity.images?.length > 0
        ? [entity.table || entity.id]
        : entity.id === 'ux'
          ? ['customers.csv', 'order_items.csv', 'orders.csv', 'products.csv']
          : entity.id === 'consumer-loyalty'
            ? ['sales.db']
            : [entity.table || entity.id],
  }));

  return { domains, entities };
}

export function buildFallbackDomainMapData() {
  const domains = DOMAIN_CARD_SAMPLES.filter((domain) => !domain.virtual).map((domain) => ({
    id: domain.id,
    name: domain.name,
    color: domain.color,
  }));

  const entities = ENTITY_CARD_SAMPLES.map((entity) => ({
    id: entity.id,
    domainId: entity.domainId,
    name: entity.name,
    manifestations:
      entity.images?.length > 0
        ? [entity.table || entity.id]
        : entity.id === 'ux'
          ? ['customers.csv', 'order_items.csv', 'orders.csv', 'products.csv']
          : entity.id === 'consumer-loyalty'
            ? ['sales.db']
            : [entity.table || entity.id],
  }));

  return { domains, entities };
}

export const DATASET_SELECTOR_CATALOG = [
  {
    library: 'Commerce Warehouse',
    items: [
      {
        name: 'fact_sales',
        type: 'table',
        fileFormat: 'SQL Table',
        lastModified: '2026-03-10T12:23:00Z',
        fileSize: 2_482_000,
        step_label: 'daily_warehouse_refresh',
        records: 145230,
      },
      {
        name: 'dim_product',
        type: 'table',
        fileFormat: 'SQL Table',
        lastModified: '2026-03-10T12:21:00Z',
        fileSize: 662_000,
        step_label: 'product_sync',
        records: 1240,
      },
    ],
  },
  {
    library: 'Local Files',
    items: [
      {
        name: 'customers.csv',
        type: 'csv',
        fileFormat: 'CSV',
        lastModified: '2026-03-10T08:15:00Z',
        fileSize: 184_000,
        step_label: 'manual_import',
        records: 8750,
      },
      {
        name: 'orders.csv',
        type: 'csv',
        fileFormat: 'CSV',
        lastModified: '2026-03-09T19:42:00Z',
        fileSize: 924_000,
        step_label: 'manual_import',
        records: 52344,
      },
    ],
  },
];

export function buildFallbackEntityPickerEntities() {
  const domainNameById = new Map(
    DOMAIN_CARD_SAMPLES.filter((domain) => !domain.virtual).map((domain) => [domain.id, domain.name])
  );

  return ENTITY_CARD_SAMPLES.map((entity) => ({
    id: entity.id,
    name: entity.name,
    description: entity.description,
    domain: domainNameById.get(entity.domainId) || entity.domainId,
    associatedImages: entity.images || [],
  }));
}
