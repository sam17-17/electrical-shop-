
export enum EntityType {
  SUMMARY = 'summary',
  BALANCE_SHEET = 'balance-sheet',
  BANK_CASH = 'bank-cash',
  CUSTOMERS = 'customers',
  SALES_QUOTES = 'sales-quotes',
  SALES_ORDERS = 'sales-orders',
  SALES_INVOICES = 'sales-invoices',
  DELIVERY_NOTES = 'delivery-notes',
  SUPPLIERS = 'suppliers',
  PURCHASE_QUOTES = 'purchase-quotes',
  PURCHASE_ORDERS = 'purchase-orders',
  PURCHASE_INVOICES = 'purchase-invoices',
  EXPENSES = 'expenses',
  INVENTORY = 'inventory',
  PROJECTS = 'projects',
  EMPLOYEES = 'employees',
  JOURNAL = 'journal',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  SYSTEM_USERS = 'system-users',
  HOW_TO_USE = 'how-to-use',
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DataColumn {
  key: string;
  label: string;
  type: 'text' | 'currency' | 'date' | 'status' | 'number' | 'select' | 'email' | 'phone' | 'textarea' | 'items' | 'readonly' | 'password';
  options?: string[]; // For select/status types
  sourceType?: EntityType; // For dynamic entity lookups
  required?: boolean;
}

export interface GenericEntity {
  id: string;
  items?: LineItem[]; // Array of line items for documents
  [key: string]: any;
}

export interface NavItem {
  id: EntityType;
  label: string;
  icon: any; // Lucide icon component
  group?: string;
  allowedRoles?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type EntityState = Record<EntityType, GenericEntity[]>;