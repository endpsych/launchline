/*
src/data/glossary.js
------------------------------------------------------
Default data for the Business Glossary.
Updated:
- Transitioned 'owner' fields from static text to relational Stakeholder IDs.
- Ensures compatibility with the new People Layer and IPC data fetching.
*/

export const GLOSSARY_DEFAULT = [
  {
    term:       'Order',
    definition: 'A confirmed purchase transaction placed by a customer. An order may contain one or more line items. Status can be: completed, returned, or cancelled.',
    domain:     'Sales',
    owner:      'STK-102', // Operations Lead
    source:     'orders.csv',
  },
  {
    term:       'Order Item',
    definition: 'A single product line within an order. Represents the quantity and price of one SKU purchased in a given transaction.',
    domain:     'Sales',
    owner:      'STK-102', // Operations Lead
    source:     'order_items.csv',
  },
  {
    term:       'Revenue',
    definition: 'Sum of line_total for all completed order items within a given period. Excludes returned and cancelled orders.',
    domain:     'Finance',
    owner:      'STK-101', // Finance Director
    source:     'fact_sales',
  },
  {
    term:       'Average Ticket',
    definition: 'Total revenue divided by the number of completed orders in a period. Used as a proxy for customer spending power.',
    domain:     'Finance',
    owner:      'STK-104', // Commercial Manager
    source:     'monthly_summary',
  },
  {
    term:       'Customer Segment',
    definition: 'Classification of a customer into Standard, Premium, or VIP based on cumulative lifetime spend. Assigned at CRM registration.',
    domain:     'Customer',
    owner:      'STK-103', // Marketing Head
    source:     'customers.csv',
  },
  {
    term:       'Region',
    definition: 'One of five commercial territories in Spain: Madrid, Barcelona, Valencia, Sevilla, Bilbao. Each region has a designated manager.',
    domain:     'Operations',
    owner:      'STK-102', // Operations Lead
    source:     'regions.csv',
  },
  {
    term:       'Target',
    definition: 'Monthly revenue goal set by Finance per region. Used to calculate attainment and flag underperforming territories.',
    domain:     'Finance',
    owner:      'STK-101', // Finance Director
    source:     'targets.csv',
  },
  {
    term:       'Channel',
    definition: 'The sales channel through which an order was placed. Values: web, mobile, marketplace.',
    domain:     'Sales',
    owner:      'STK-103', // Marketing Head
    source:     'orders.csv',
  },
];

export const DOMAINS = ['Sales', 'Finance', 'Customer', 'Operations'];

export const DOMAIN_COLOR = {
  Sales:      '#5B9AFF',
  Finance:    '#10B981',
  Customer:   '#F59E0B',
  Operations: '#8B5CF6',
};