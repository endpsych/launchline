"""
Endflow — Dataset Analysis Script
Handles: catalog, preview, descriptive, correlations, segmentation, libraries

Updated to support Master-Detail Inspection:
- Added Null Density and Uniqueness scoring to descriptive stats.
- Added Data Type Distribution summaries.
- Enhanced catalog grouping with lineage context support.
"""

import sys, json, os, math
import sqlite3
import warnings
import numpy as np
import pandas as pd
from scipy import stats

warnings.filterwarnings('ignore')

# ── Helpers ───────────────────────────────────────────────────────────────────
def safe(v):
    if v is None: return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)): return None
    if isinstance(v, (np.integer,)):  return int(v)
    if isinstance(v, (np.floating,)): return round(float(v), 4)
    if isinstance(v, (np.bool_,)):    return bool(v)
    return v

def safe_row(row):
    return {k: safe(v) for k, v in row.items()}

def out(obj):
    print(json.dumps(obj, allow_nan=False, default=str))

def dtype_label(s):
    """Return a readable type label for a pandas Series."""
    if pd.api.types.is_integer_dtype(s):  return 'INTEGER'
    if pd.api.types.is_float_dtype(s):    return 'REAL'
    if pd.api.types.is_bool_dtype(s):     return 'BOOLEAN'
    if pd.api.types.is_datetime64_any_dtype(s): return 'DATETIME'
    return 'TEXT'

def load_dataset(name, db_path, raw_path):
    """Load a dataset by name. Returns a DataFrame."""
    # Try SQLite table first
    try:
        conn = sqlite3.connect(db_path)
        # Verify table existence before loading
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
        if cursor.fetchone():
            df = pd.read_sql(f'SELECT * FROM "{name}"', conn)
            conn.close()
            return df, 'db'
        conn.close()
    except Exception:
        pass
        
    # Try CSV in raw folder
    csv_path = os.path.join(raw_path, f'{name}.csv')
    if not os.path.exists(csv_path) and not name.endswith('.csv'):
        csv_path = os.path.join(raw_path, f'{name}.csv')
    elif os.path.exists(os.path.join(raw_path, name)):
        csv_path = os.path.join(raw_path, name)

    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        return df, 'csv'
        
    raise ValueError(f'Dataset "{name}" not found.')

def describe_series(s, name):
    """Full descriptive stats for a numeric series."""
    total_count = len(s)
    s_numeric = pd.to_numeric(s, errors='coerce').dropna()
    
    # Base metadata regardless of type
    base_stats = {
        'column': name,
        'type': dtype_label(s),
        'null_count': int(s.isna().sum()),
        'null_density': safe(float(s.isna().mean() * 100)),
        'unique_count': int(s.nunique()),
        'uniqueness_score': safe(float((s.nunique() / total_count * 100) if total_count > 0 else 0))
    }

    if len(s_numeric) == 0:
        return base_stats

    q = np.percentile(s_numeric, [10, 25, 50, 75, 90, 95])
    iqr = q[3] - q[1]
    outliers = ((s_numeric < q[1] - 1.5*iqr) | (s_numeric > q[3] + 1.5*iqr)).sum()
    
    base_stats.update({
        'count':         int(len(s_numeric)),
        'mean':          safe(s_numeric.mean()),
        'median':        safe(float(q[2])),
        'std':           safe(s_numeric.std()),
        'min':           safe(s_numeric.min()),
        'max':           safe(s_numeric.max()),
        'p25':           safe(float(q[1])),
        'p75':           safe(float(q[3])),
        'skew':          safe(float(stats.skew(s_numeric)) if len(s_numeric) > 2 else 0),
        'outlier_count': int(outliers)
    })
    return base_stats

# ── Command: catalog ──────────────────────────────────────────────────────────
def cmd_catalog(db_path, raw_path, log_path=None):
    """Returns a grouped catalog structure."""
    libraries = {
        "pipeline": {"library": "Pipeline Assets", "items": []},
        "raw":      {"library": "Raw Data Folder", "items": []},
        "db":       {"library": "Physical Database", "items": []}
    }

    # 1. Discover from Pipeline Log (Lineage Context)
    if log_path and os.path.exists(log_path):
        try:
            with open(log_path, 'r', encoding='utf-8') as f:
                log_data = json.load(f)
                for step in log_data.get('steps', []):
                    if step.get('records_out', 0) > 0:
                        libraries["pipeline"]["items"].append({
                            "name": step['id'],
                            "type": "pipeline_asset",
                            "step_label": step.get('label'),
                            "records": step.get('records_out')
                        })
        except Exception as e:
            sys.stderr.write(f"Log Discovery Error: {str(e)}\n")

    # 2. Discover CSV files
    if os.path.isdir(raw_path):
        try:
            for fname in sorted(os.listdir(raw_path)):
                if fname.endswith('.csv'):
                    libraries["raw"]["items"].append({
                        "name": fname,
                        "type": "csv"
                    })
        except Exception: pass

    # 3. Discover SQLite tables
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cur  = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
            for (name,) in cur.fetchall():
                libraries["db"]["items"].append({
                    "name": name,
                    "type": "table"
                })
            conn.close()
        except Exception: pass

    out([lib for lib in libraries.values() if lib["items"]])

# ── Command: descriptive ──────────────────────────────────────────────────────
def cmd_descriptive(db_path, raw_path, name):
    """Calculates deep metadata for the Master-Detail Inspector."""
    df, source = load_dataset(name, db_path, raw_path)
    
    total_rows = len(df)
    total_cols = len(df.columns)

    # 1. Calculate Data Type Distribution
    type_counts = df.apply(dtype_label).value_counts().to_dict()
    type_dist = [
        {'type': t, 'count': int(c), 'pct': safe(float(c / total_cols * 100))}
        for t, c in type_counts.items()
    ]

    # 2. Detailed Column Stats (including Null Density & Uniqueness)
    column_stats = []
    for col in df.columns:
        column_stats.append(describe_series(df[col], col))

    # 3. Categorical value counts (top 10 per col)
    cat_counts = {}
    cat_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]
    for c in cat_cols[:10]: # Limit to first 10 cat columns for performance
        vc = df[c].value_counts().head(10)
        cat_counts[c] = [{'value': str(k), 'count': int(v)} for k, v in vc.items()]

    out({
        'ok': True,
        'name': name,
        'source_type': source,
        'row_count': total_rows,
        'col_count': total_cols,
        'type_distribution': type_dist,
        'columns': column_stats,
        'cat_counts': cat_counts,
        'null_summary': [
            {'column': s['column'], 'nulls': s['null_count'], 'pct': s['null_density']} 
            for s in column_stats
        ]
    })

# ── Command: preview ──────────────────────────────────────────────────────────
def cmd_preview(db_path, raw_path, name, page=0, page_size=50, sort_col=None, sort_dir='asc', search=''):
    df, source = load_dataset(name, db_path, raw_path)

    if search:
        mask = df.apply(lambda col: col.astype(str).str.contains(search, case=False, na=False))
        df = df[mask.any(axis=1)]

    total_rows = len(df)
    if sort_col and sort_col in df.columns:
        df = df.sort_values(sort_col, ascending=(sort_dir == 'asc'))

    start = page * page_size
    end = start + page_size
    page_df = df.iloc[start:end]

    columns = [{'name': c, 'type': dtype_label(df[c])} for c in df.columns]
    rows = [safe_row(dict(zip(df.columns, r))) for r in page_df.itertuples(index=False)]

    out({
        'ok': True,
        'name': name,
        'total_rows': total_rows,
        'page': page,
        'columns': columns,
        'rows': rows,
    })

# ── Command: libraries ────────────────────────────────────────────────────────
def cmd_libraries():
    libs = ['pandas', 'numpy', 'scipy', 'sklearn', 'sqlite3']
    results = []
    for lib in libs:
        try:
            mod = __import__(lib)
            ver = getattr(mod, '__version__', 'builtin')
            results.append({'name': lib, 'version': ver, 'installed': True})
        except ImportError:
            results.append({'name': lib, 'version': None, 'installed': False})
    out({'ok': True, 'libraries': results})

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    try:
        command  = sys.argv[1] if len(sys.argv) > 1 else 'catalog'
        db_path  = sys.argv[2] if len(sys.argv) > 2 else 'data/endflow.db'
        raw_path = sys.argv[3] if len(sys.argv) > 3 else 'data/raw'
        target   = sys.argv[4] if len(sys.argv) > 4 else None

        if   command == 'catalog':       cmd_catalog(db_path, raw_path, target)
        elif command == 'libraries':     cmd_libraries()
        elif command == 'preview':
            page      = int(sys.argv[5]) if len(sys.argv) > 5 else 0
            page_size = int(sys.argv[6]) if len(sys.argv) > 6 else 50
            sort_col  = sys.argv[7]      if len(sys.argv) > 7 else None
            sort_dir  = sys.argv[8]      if len(sys.argv) > 8 else 'asc'
            search    = sys.argv[9]      if len(sys.argv) > 9 else ''
            cmd_preview(db_path, raw_path, target, page, page_size, sort_col, sort_dir, search)
        elif command == 'descriptive':   cmd_descriptive(db_path, raw_path, target)
        else:
            out({'ok': False, 'error': f'Unknown command: {command}'})

    except Exception as e:
        import traceback
        out({'ok': False, 'error': str(e), 'trace': traceback.format_exc()})