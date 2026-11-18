import type { Paginated } from './ui';

export type InventoryUser = {
    id: number;
    name: string;
};

export type InventoryItem = {
    id: number;
    name: string;
    sku: string | null;
    category: string;
    unit: string;
    min_stock: string | number;
    unit_cost: string | number;
    stock: string | number;
    active: boolean;
    created_at?: string;
    updated_at?: string;
};

export type InventoryMovement = {
    id: number;
    inventory_item_id: number;
    type: string;
    quantity: string | number;
    unit_cost: string | number | null;
    reason: string | null;
    reference: string | null;
    occurred_at: string;
    voided_at: string | null;
    void_reason: string | null;
    reversal_of_id: number | null;
    created_at: string;
    item?: {
        id: number;
        name: string;
        sku: string | null;
        unit: string;
    } | null;
    created_by?: InventoryUser | null;
    voided_by?: InventoryUser | null;
};

export type InventoryItemOption = {
    id: number;
    name: string;
    sku: string | null;
    unit: string;
    stock: string | number;
    min_stock: string | number;
    unit_cost: string | number;
};

export type InventoryActivity = {
    id: number;
    module: string;
    moduleLabel: string;
    action: string;
    actionLabel: string;
    description: string;
    actor: string;
    createdAt: string | null;
    subject: string | null;
    tone: 'danger' | 'success' | 'info';
};

export type InventoryActivityModuleOption = {
    value: string;
    label: string;
};

export type InventoryAlert = {
    id: number;
    name: string;
    sku: string | null;
    unit: string;
    stock: string | number;
    min_stock: string | number;
};

export type InventoryKpis = {
    totalItems: number;
    totalStock: number;
    lowStock: number;
    outOfStock: number;
    inventoryValue: number;
};

export type InventoryPeriod = {
    from: string;
    to: string;
};

export type InventoryTab = 'resumen' | 'articulos' | 'movimientos';

export type InventoryFilters = {
    from: string;
    to: string;
    search: string;
    category: string;
    state: string;
    stock_state: string;
    movement_type: string;
    movement_state: string;
    activity_scope: string;
    activity_module: string;
    tab: InventoryTab;
};

export type InventoryOptions = {
    categories: string[];
    units: string[];
    states: string[];
    stockStates: string[];
    movementTypes: string[];
    movementStates: string[];
    activityScopes: string[];
    activityModules: InventoryActivityModuleOption[];
};

export type InventoryPermissions = {
    manage: boolean;
    adjust: boolean;
};

export type InventoryIndexProps = {
    currency: string;
    timezone: string;
    period: InventoryPeriod;
    kpis: InventoryKpis;
    items: Paginated<InventoryItem>;
    movements: Paginated<InventoryMovement>;
    activity: Paginated<InventoryActivity>;
    alerts: InventoryAlert[];
    itemsForMovement: InventoryItemOption[];
    filters: InventoryFilters;
    options: InventoryOptions;
    permissions: InventoryPermissions;
};
