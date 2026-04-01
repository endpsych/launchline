// One live stat per glossary term.
// sql: query returning rows with a field 'n' (scalar) OR multiple rows (multi:true)
// fmt: value formatter for scalar results
// multi: if true, renders each row as a pill (expects "label: value" format)

export const TERM_STATS = {
  'Order': {
    sql:   `SELECT COUNT(DISTINCT order_id) AS n FROM fact_sales WHERE status='completed'`,
    label: 'completed orders in DB',
    fmt:   v => Number(v).toLocaleString(),
    color: '#5B9AFF',
  },
  'Order Item': {
    sql:   `SELECT COUNT(*) AS n FROM fact_sales`,
    label: 'line items in fact_sales',
    fmt:   v => Number(v).toLocaleString(),
    color: '#5B9AFF',
  },
  'Revenue': {
    sql:   `SELECT ROUND(SUM(line_total),2) AS n FROM fact_sales WHERE status='completed'`,
    label: 'total completed revenue',
    fmt:   v => `€${Number(v).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}`,
    color: '#10B981',
  },
  'Average Ticket': {
    sql:   `SELECT ROUND(SUM(line_total)/COUNT(DISTINCT order_id),2) AS n FROM fact_sales WHERE status='completed'`,
    label: 'avg ticket across all periods',
    fmt:   v => `€${Number(v).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}`,
    color: '#10B981',
  },
  'Customer Segment': {
    sql:   `SELECT segment||': '||COUNT(*) AS n FROM dim_customer GROUP BY segment ORDER BY COUNT(*) DESC`,
    label: 'customers by segment',
    fmt:   null,
    color: '#F59E0B',
    multi: true,
  },
  'Region': {
    sql:   `SELECT r.region_name||' — '||ROUND(SUM(fs.line_total),0) AS n
            FROM fact_sales fs
            JOIN dim_region r ON r.region_id = fs.region_id
            WHERE fs.status='completed'
            GROUP BY r.region_name ORDER BY SUM(fs.line_total) DESC`,
    label: 'revenue by region',
    fmt:   null,
    color: '#8B5CF6',
    multi: true,
  },
  'Target': {
    sql:   `SELECT ROUND(AVG(target_eur),0) AS n FROM targets`,
    label: 'avg monthly target per region',
    fmt:   v => `€${Number(v).toLocaleString(undefined, { maximumFractionDigits:0 })}`,
    color: '#10B981',
  },
  'Channel': {
    sql:   `SELECT channel||': '||COUNT(DISTINCT order_id) AS n
            FROM fact_sales WHERE status='completed'
            GROUP BY channel ORDER BY COUNT(DISTINCT order_id) DESC`,
    label: 'completed orders by channel',
    fmt:   null,
    color: '#EC4899',
    multi: true,
  },
};
