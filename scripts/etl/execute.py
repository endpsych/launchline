"""
EndFlow — Code Execution Script
Executes arbitrary Python code with a dataset pre-loaded as `df`.

Usage:
  python execute.py <db_path> <raw_path> <dataset_name> <code_b64>

The code runs in a sandboxed namespace with:
  - df        : pandas DataFrame of the dataset
  - pd        : pandas
  - np        : numpy
  - plt       : matplotlib.pyplot (configured for Agg backend)
  - sns       : seaborn
  - stats     : scipy.stats
  - KMeans    : sklearn.cluster.KMeans
  - StandardScaler : sklearn.preprocessing.StandardScaler

Output (JSON):
  {
    "ok": true,
    "outputs": [
      { "type": "text",  "content": "..." },
      { "type": "table", "columns": [...], "rows": [[...]], "shape": [rows, cols] },
      { "type": "image", "format": "png", "data": "<base64>" },
      { "type": "error", "content": "...", "traceback": "..." }
    ]
  }
"""

import sys
import os
import json
import base64
import traceback
import io
import sqlite3

# ── Setup matplotlib for headless rendering BEFORE importing pyplot ───────────
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

import pandas as pd
import numpy as np
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

try:
    import seaborn as sns
    sns.set_theme(style='darkgrid', palette='muted')
except ImportError:
    sns = None

try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
    from sklearn.linear_model import LogisticRegression, LinearRegression
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import classification_report, confusion_matrix, mean_squared_error, r2_score
except ImportError:
    KMeans = StandardScaler = RandomForestClassifier = RandomForestRegressor = None
    GradientBoostingRegressor = LogisticRegression = LinearRegression = None
    train_test_split = cross_val_score = None
    classification_report = confusion_matrix = mean_squared_error = r2_score = None

try:
    import xgboost as xgb
except ImportError:
    xgb = None

try:
    import polars as pl
except ImportError:
    pl = None

try:
    import shap
except ImportError:
    shap = None

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_dataset(name, db_path, raw_path):
    try:
        conn = sqlite3.connect(db_path)
        df   = pd.read_sql(f'SELECT * FROM {name}', conn)
        conn.close()
        return df
    except Exception:
        pass
    csv_path = os.path.join(raw_path, f'{name}.csv')
    if os.path.exists(csv_path):
        return pd.read_csv(csv_path)
    raise ValueError(f'Dataset "{name}" not found.')


def df_to_table(df, max_rows=500):
    """Convert a DataFrame to a JSON-serialisable table output."""
    truncated = len(df) > max_rows
    display   = df.head(max_rows)
    columns   = list(display.columns)
    rows      = []
    for _, row in display.iterrows():
        r = []
        for v in row:
            if v is None or (isinstance(v, float) and np.isnan(v)):
                r.append(None)
            elif isinstance(v, (np.integer,)):
                r.append(int(v))
            elif isinstance(v, (np.floating,)):
                r.append(round(float(v), 6))
            elif isinstance(v, (np.bool_,)):
                r.append(bool(v))
            else:
                r.append(str(v))
        rows.append(r)
    return {
        'type':      'table',
        'columns':   columns,
        'rows':      rows,
        'shape':     list(df.shape),
        'truncated': truncated,
        'max_rows':  max_rows,
    }


def capture_figures():
    """Capture all open matplotlib figures as base64 PNG images."""
    images = []
    for fig_num in plt.get_fignums():
        fig = plt.figure(fig_num)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=120, bbox_inches='tight',
                    facecolor='#1a1a2e', edgecolor='none')
        buf.seek(0)
        images.append({
            'type':   'image',
            'format': 'png',
            'data':   base64.b64encode(buf.read()).decode('utf-8'),
        })
        plt.close(fig)
    return images


# ── Custom stdout capture ─────────────────────────────────────────────────────
class OutputCapture:
    def __init__(self):
        self.outputs  = []
        self._buf     = []

    def write(self, text):
        self._buf.append(text)

    def flush(self):
        text = ''.join(self._buf).rstrip('\n')
        if text:
            # Append to last text block if exists, else create new
            if self.outputs and self.outputs[-1]['type'] == 'text':
                self.outputs[-1]['content'] += '\n' + text
            else:
                self.outputs.append({'type': 'text', 'content': text})
        self._buf = []

    def flush_all(self):
        self.flush()


# ── Execute ───────────────────────────────────────────────────────────────────
def execute(code, df, extra_ns=None):
    capture = OutputCapture()

    # Redirect stdout
    old_stdout = sys.stdout
    sys.stdout  = capture

    # Namespace available to user code
    ns = {
        'df':    df,
        'pd':    pd,
        'np':    np,
        'plt':   plt,
        'stats': stats,
    }
    if sns:                    ns['sns']                    = sns
    if KMeans:                 ns['KMeans']                 = KMeans
    if StandardScaler:         ns['StandardScaler']         = StandardScaler
    if RandomForestClassifier: ns['RandomForestClassifier'] = RandomForestClassifier
    if RandomForestRegressor:  ns['RandomForestRegressor']  = RandomForestRegressor
    if GradientBoostingRegressor: ns['GradientBoostingRegressor'] = GradientBoostingRegressor
    if LogisticRegression:     ns['LogisticRegression']     = LogisticRegression
    if LinearRegression:       ns['LinearRegression']       = LinearRegression
    if train_test_split:       ns['train_test_split']       = train_test_split
    if cross_val_score:        ns['cross_val_score']        = cross_val_score
    if classification_report:  ns['classification_report']  = classification_report
    if confusion_matrix:       ns['confusion_matrix']       = confusion_matrix
    if mean_squared_error:     ns['mean_squared_error']     = mean_squared_error
    if r2_score:               ns['r2_score']               = r2_score
    if xgb:                    ns['xgb']                    = xgb
    if pl:                     ns['pl']                     = pl
    if shap:                   ns['shap']                   = shap
    if extra_ns:               ns.update(extra_ns)

    outputs = []
    try:
        # Close any pre-existing figures
        plt.close('all')

        # Split into statements, execute line by line so last expression is captured
        import ast
        tree = ast.parse(code, mode='exec')

        # Check if last statement is an expression (like Jupyter does)
        last_expr = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last_expr = tree.body.pop()

        # Execute all but last
        exec(compile(tree, '<code>', 'exec'), ns)
        capture.flush_all()

        # Execute last expression and capture its repr if it's a useful object
        if last_expr:
            expr_code = compile(ast.Expression(body=last_expr.value), '<expr>', 'eval')
            result    = eval(expr_code, ns)
            capture.flush_all()

            if result is not None:
                if isinstance(result, pd.DataFrame):
                    capture.outputs.append(df_to_table(result))
                elif isinstance(result, pd.Series):
                    capture.outputs.append(df_to_table(result.reset_index()))
                else:
                    text = repr(result)
                    if capture.outputs and capture.outputs[-1]['type'] == 'text':
                        capture.outputs[-1]['content'] += '\n' + text
                    else:
                        capture.outputs.append({'type': 'text', 'content': text})

        # Capture any remaining text output
        capture.flush_all()

        # Capture any figures created, then assemble final output list
        figs = capture_figures()
        outputs = capture.outputs + figs

    except Exception as e:
        capture.flush_all()
        tb = traceback.format_exc()
        # Remove internal frames from traceback (lines referencing execute.py)
        clean_lines = []
        skip = False
        for line in tb.splitlines():
            if 'execute.py' in line and 'exec(' in tb:
                skip = False
            clean_lines.append(line)
        clean_tb = '\n'.join(clean_lines)

        outputs = capture.outputs + [{
            'type':      'error',
            'content':   str(e),
            'traceback': clean_tb,
        }]
        # Close any figures opened before the error
        plt.close('all')
    finally:
        sys.stdout = old_stdout

    return outputs


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    try:
        db_path   = sys.argv[1]
        raw_path  = sys.argv[2]
        ds_name   = sys.argv[3]
        code_b64  = sys.argv[4]

        code = base64.b64decode(code_b64).decode('utf-8')
        df   = load_dataset(ds_name, db_path, raw_path)

        outputs = execute(code, df)
        print(json.dumps({'ok': True, 'outputs': outputs}, allow_nan=False, default=str))

    except Exception as e:
        print(json.dumps({
            'ok':    False,
            'error': str(e),
            'outputs': [{'type': 'error', 'content': str(e), 'traceback': traceback.format_exc()}]
        }))
