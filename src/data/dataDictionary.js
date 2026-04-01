export const DATA_DICT = [
  // fact_sales
  { table:'fact_sales',      field:'order_item_id', type:'TEXT',    nullable:false, sensitivity:'Internal', owner:'Operations', entityId: 'ENT-ORDER',    description:'Surrogate key. Format: ORD{n}-L{n}. Unique per line item.'                        },
  { table:'fact_sales',      field:'order_id',      type:'TEXT',    nullable:false, sensitivity:'Internal', owner:'Operations', entityId: 'ENT-ORDER',    description:'FK to source order. Multiple rows per order when multi-item.'                    },
  { table:'fact_sales',      field:'date_id',       type:'TEXT',    nullable:false, sensitivity:'Internal', owner:'Analytics',  entityId: 'ENT-ORDER',    description:'FK to dim_date. Format: YYYY-MM-DD.'                                             },
  { table:'fact_sales',      field:'product_id',    type:'TEXT',    nullable:false, sensitivity:'Internal', owner:'Commercial', entityId: 'ENT-PRODUCT',  description:'FK to dim_product. Orphan records excluded during modelling step.'              },
  { table:'fact_sales',      field:'customer_id',   type:'TEXT',    nullable:true,  sensitivity:'PII',      owner:'Marketing',  entityId: 'ENT-CUSTOMER', description:'FK to dim_customer. Nullable: ~0.2% guest orders.'                             },
  { table:'fact_sales',      field:'region_id',     type:'TEXT',    nullable:false, sensitivity:'Internal', owner:'Operations', entityId: 'ENT-REGION',   description:'FK to dim_region. Derived from customer home region.'                          },
  { table:'fact_sales',      field:'channel',       type:'TEXT',    nullable:false, sensitivity:'Internal', owner:'Marketing',  entityId: 'ENT-ORDER',    description:'Sales channel: web | mobile | marketplace.'                                    },
  { table:'fact_sales',      field:'status',        type:'TEXT',    nullable:false, sensitivity:'Internal', owner:'Operations', entityId: 'ENT-ORDER',    description:'Order status: completed | returned | cancelled.'                                },
  { table:'fact_sales',      field:'quantity',      type:'INTEGER', nullable:false, sensitivity:'Internal', owner:'Operations', entityId: 'ENT-ORDER',    description:'Units purchased. ~23 records have negative quantity (return bug).'             },
  { table:'fact_sales',      field:'unit_price',    type:'REAL',    nullable:false, sensitivity:'Internal', owner:'Finance',    entityId: 'ENT-ORDER',    description:'Price per unit at time of purchase.'                                           },
  { table:'fact_sales',      field:'line_total',    type:'REAL',    nullable:false, sensitivity:'Internal', owner:'Finance',    entityId: 'ENT-ORDER',    description:'unit_price × quantity. Negative for return items.'                             },
  // dim_product
  { table:'dim_product',     field:'product_id',    type:'TEXT',    nullable:false, sensitivity:'Public',   owner:'Commercial', entityId: 'ENT-PRODUCT',  description:'Natural key from product catalog. Format: PRD{4-digit}.'                        },
  { table:'dim_product',     field:'product_name',  type:'TEXT',    nullable:false, sensitivity:'Public',   owner:'Commercial', entityId: 'ENT-PRODUCT',  description:'Display name. Max 60 chars.'                                                   },
  { table:'dim_product',     field:'category',      type:'TEXT',    nullable:false, sensitivity:'Public',   owner:'Commercial', entityId: 'ENT-PRODUCT',  description:'One of: Electronics, Clothing, Home & Garden, Sports, Beauty.'                },
  { table:'dim_product',     field:'unit_price',    type:'REAL',    nullable:false, sensitivity:'Public',   owner:'Finance',    entityId: 'ENT-PRODUCT',  description:'List price at time of catalog extraction.'                                     },
  { table:'dim_product',     field:'active',        type:'INTEGER', nullable:false, sensitivity:'Internal', owner:'Commercial', entityId: 'ENT-PRODUCT',  description:'Boolean flag (1/0). ~5% of products are inactive.'                            },
  // dim_customer
  { table:'dim_customer',    field:'customer_id',   type:'TEXT',    nullable:false, sensitivity:'PII',      owner:'Marketing',  entityId: 'ENT-CUSTOMER', description:'Surrogate key from CRM. Format: CUS{6-digit}.'                                },
  { table:'dim_customer',    field:'customer_name', type:'TEXT',    nullable:false, sensitivity:'PII',      owner:'Marketing',  entityId: 'ENT-CUSTOMER', description:'Full name. PII — do not expose in public-facing reports.'                     },
  { table:'dim_customer',    field:'email',         type:'TEXT',    nullable:false, sensitivity:'PII',      owner:'Marketing',  entityId: 'ENT-CUSTOMER', description:'Contact email. PII — encrypted at rest in production.'                        },
  { table:'dim_customer',    field:'segment',       type:'TEXT',    nullable:false, sensitivity:'Internal', owner:'Marketing',  entityId: 'ENT-CUSTOMER', description:'Customer tier: Standard | Premium | VIP.'                                      },
  // monthly_summary
  { table:'monthly_summary', field:'year_month',    type:'TEXT',    nullable:false, sensitivity:'Public',   owner:'Finance',    entityId: 'ENT-ORDER',    description:'Aggregation period. Format: YYYY-MM.'                                          },
  { table:'monthly_summary', field:'revenue',       type:'REAL',    nullable:false, sensitivity:'Internal', owner:'Finance',    entityId: 'ENT-ORDER',    description:'Sum of line_total for completed orders in the period.'                         },
  { table:'monthly_summary', field:'orders',        type:'INTEGER', nullable:false, sensitivity:'Internal', owner:'Operations', entityId: 'ENT-ORDER',    description:'Count of distinct completed orders in the period.'                             },
];

export const DB_TABLES = [...new Set(DATA_DICT.map(r => r.table))];

export const DICT_META = {};
DATA_DICT.forEach(r => { DICT_META[`${r.table}.${r.field}`] = r; });

export const SENSITIVITY_BADGE = {
  PII:      'badge-danger',
  Internal: 'badge-warning',
  Public:   'badge-success',
};