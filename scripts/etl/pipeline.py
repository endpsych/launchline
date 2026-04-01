"""
pipeline.py
-----------
EndFlow ETL pipeline for MadridMart sales data domain.

Stages:
  1. INGEST    — load raw CSVs into a staging layer (pandas DataFrames)
  2. VALIDATE  — schema checks, null assertions, type checks
  3. TRANSFORM — clean, type-cast, derive computed fields
  4. MODEL     — build star schema (fact_sales + dimension tables)
  5. LOAD      — write to SQLite analytics database

Usage:
  python etl/pipeline.py                        # run all stages
  python etl/pipeline.py --from-step validate   # skip ingest, resume from validate
  python etl/pipeline.py --from-step model      # skip ingest+validate+transform

Checkpoints:
  Each stage serializes its output to data/staging/*.pkl so later stages
  can resume without re-running earlier ones.
"""

import os
import sys
import json
import pickle
import sqlite3
import time
import logging
import argparse
from datetime import datetime

import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT         = os.path.join(os.path.dirname(__file__), "..")
RAW_DIR      = os.path.join(ROOT, "data", "raw")
STAGING_DIR  = os.path.join(ROOT, "data", "staging")
DB_PATH      = os.path.join(ROOT, "data", "endflow.db")
LOG_PATH     = os.path.join(os.path.dirname(__file__), "pipeline_log.json")

os.makedirs(STAGING_DIR, exist_ok=True)

STEP_ORDER = ["ingest", "validate", "transform", "model", "load"]

# Checkpoint paths per stage output
CHECKPOINTS = {
    "ingest":    os.path.join(STAGING_DIR, "checkpoint_ingest.pkl"),
    "validate":  os.path.join(STAGING_DIR, "checkpoint_validate.pkl"),
    "transform": os.path.join(STAGING_DIR, "checkpoint_transform.pkl"),
    "model":     os.path.join(STAGING_DIR, "checkpoint_model.pkl"),
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pipeline")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def save_checkpoint(stage: str, data):
    path = CHECKPOINTS[stage]
    with open(path, "wb") as f:
        pickle.dump(data, f)
    log.info(f"  💾 Checkpoint saved → {os.path.basename(path)}")


def load_checkpoint(stage: str):
    path = CHECKPOINTS[stage]
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Checkpoint for '{stage}' not found at {path}.\n"
            f"  Run the pipeline from '{stage}' or earlier to generate it."
        )
    with open(path, "rb") as f:
        data = pickle.load(f)
    log.info(f"  📂 Checkpoint loaded ← {os.path.basename(path)}")
    return data


class PipelineRun:
    """Collects step results for the UI log."""

    def __init__(self, from_step: str = "ingest"):
        self.started_at = datetime.now().isoformat()
        self.from_step  = from_step
        self.steps      = []
        self._current   = None

    def start_step(self, step_id: str, label: str, description: str):
        self._current = {
            "id":          step_id,
            "label":       label,
            "description": description,
            "status":      "running",
            "started_at":  datetime.now().isoformat(),
            "records_in":  None,
            "records_out": None,
            "duration_s":  None,
            "warnings":    [],
            "errors":      [],
        }
        self._t0 = time.perf_counter()
        log.info(f"[{label}] starting…")

    def skip_step(self, step_id: str, label: str, description: str):
        """Record a skipped step (loaded from checkpoint)."""
        self.steps.append({
            "id":          step_id,
            "label":       label,
            "description": description,
            "status":      "skipped",
            "started_at":  None,
            "finished_at": None,
            "records_in":  None,
            "records_out": None,
            "duration_s":  None,
            "warnings":    [],
            "errors":      [],
        })
        log.info(f"[{label}] ⏭  skipped (loaded from checkpoint)")

    def finish_step(self, records_in=None, records_out=None, status="success"):
        self._current["duration_s"]  = round(time.perf_counter() - self._t0, 2)
        self._current["records_in"]  = records_in
        self._current["records_out"] = records_out
        self._current["status"]      = status
        self._current["finished_at"] = datetime.now().isoformat()
        self.steps.append(self._current)
        emoji = "✅" if status == "success" else "⚠️" if status == "warning" else "❌"
        log.info(
            f"[{self._current['label']}] {emoji}  "
            f"in={records_in:,}  out={records_out:,}  "
            f"({self._current['duration_s']}s)"
        )

    def warn(self, msg: str):
        self._current["warnings"].append(msg)
        self._current["status"] = "warning"
        log.warning(f"[{self._current['label']}] ⚠  {msg}")

    def error(self, msg: str):
        self._current["errors"].append(msg)
        self._current["status"] = "error"
        log.error(f"[{self._current['label']}] ✖  {msg}")

    def save(self):
        payload = {
            "started_at":  self.started_at,
            "finished_at": datetime.now().isoformat(),
            "from_step":   self.from_step,
            "steps":       self.steps,
        }
        with open(LOG_PATH, "w") as f:
            json.dump(payload, f, indent=2)
        log.info(f"Log saved → {LOG_PATH}")


QC_RESULTS = []
run = None  # set in main()


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — INGEST
# ─────────────────────────────────────────────────────────────────────────────

def ingest() -> dict:
    run.start_step("ingest", "Ingest", "Load raw CSVs into staging DataFrames")

    files = {
        "orders":      "orders.csv",
        "order_items": "order_items.csv",
        "products":    "products.csv",
        "customers":   "customers.csv",
        "regions":     "regions.csv",
        "targets":     "targets.csv",
    }

    frames = {}
    total_rows = 0
    for key, fname in files.items():
        path = os.path.join(RAW_DIR, fname)
        df = pd.read_csv(path, dtype=str)
        frames[key] = df
        total_rows += len(df)
        log.info(f"  loaded {fname}: {len(df):,} rows")

    run.finish_step(records_in=0, records_out=total_rows)
    save_checkpoint("ingest", frames)
    return frames


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — VALIDATE
# ─────────────────────────────────────────────────────────────────────────────

def _qc(name, table, rule, df, mask_failed):
    total  = len(df)
    n_fail = int(mask_failed.sum())
    n_pass = total - n_fail
    status = "success" if n_fail == 0 else ("danger" if n_fail > 10 else "warning")
    QC_RESULTS.append({
        "check_name": name, "table_name": table, "rule": rule,
        "records_in": total, "passed": n_pass, "failed": n_fail,
        "status": status, "run_at": datetime.now().isoformat(),
    })
    if n_fail:
        run.warn(f"{name}: {n_fail} failed out of {total:,}")
    return mask_failed


def validate(frames: dict) -> dict:
    run.start_step("validate", "Validate", "Schema checks and null assertions")

    orders = frames["orders"]
    items  = frames["order_items"]
    total_in = sum(len(df) for df in frames.values())

    _qc("Null order_id",    "orders",      "NOT NULL",  orders, orders["order_id"].isna() | (orders["order_id"] == ""))
    _qc("Null customer_id", "orders",      "NOT NULL",  orders, orders["customer_id"].isna() | (orders["customer_id"] == ""))
    _qc("Null product_id",  "order_items", "NOT NULL",  items,  items["product_id"].isna() | (items["product_id"] == ""))
    _qc("Duplicate order_id","orders",     "UNIQUE",    orders, orders.duplicated(subset=["order_id"], keep=False))
    _qc("Valid order status","orders",     "IN {completed,returned,cancelled}", orders, ~orders["status"].isin({"completed","returned","cancelled"}))
    _qc("Negative quantity", "order_items","quantity >= 0", items, items["quantity"].astype(float) < 0)

    orders["_date_parsed"] = pd.to_datetime(orders["order_date"], errors="coerce")
    _qc("Parseable order_date", "orders", "Valid datetime", orders, orders["_date_parsed"].isna())
    orders.drop(columns=["_date_parsed"], inplace=True)

    total_out = sum(len(df) for df in frames.values())
    status    = "warning" if any(r["failed"] > 0 for r in QC_RESULTS) else "success"
    run.finish_step(records_in=total_in, records_out=total_out, status=status)
    save_checkpoint("validate", frames)
    return frames


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — TRANSFORM
# ─────────────────────────────────────────────────────────────────────────────

def transform(frames: dict) -> dict:
    run.start_step("transform", "Transform", "Type-cast, clean, derive computed fields")

    orders    = frames["orders"].copy()
    items     = frames["order_items"].copy()
    products  = frames["products"].copy()
    customers = frames["customers"].copy()

    total_in = len(orders) + len(items) + len(products) + len(customers)

    orders["order_date"]  = pd.to_datetime(orders["order_date"], errors="coerce")
    orders["order_total"] = pd.to_numeric(orders["order_total"], errors="coerce").fillna(0)
    orders["customer_id"] = orders["customer_id"].replace("", pd.NA)
    orders["order_year"]  = orders["order_date"].dt.year
    orders["order_month"] = orders["order_date"].dt.month
    orders["order_week"]  = orders["order_date"].dt.isocalendar().week.astype(int)
    orders["order_dow"]   = orders["order_date"].dt.day_name()
    orders["year_month"]  = orders["order_date"].dt.to_period("M").astype(str)

    items["quantity"]   = pd.to_numeric(items["quantity"],   errors="coerce").fillna(0).astype(int)
    items["unit_price"] = pd.to_numeric(items["unit_price"], errors="coerce").fillna(0)
    items["line_total"] = pd.to_numeric(items["line_total"], errors="coerce").fillna(0)

    products["unit_price"] = pd.to_numeric(products["unit_price"], errors="coerce")
    products["active"]     = pd.to_numeric(products["active"],     errors="coerce").fillna(0).astype(int)
    customers["signup_date"] = pd.to_datetime(customers["signup_date"], errors="coerce")

    frames["orders"]      = orders
    frames["order_items"] = items
    frames["products"]    = products
    frames["customers"]   = customers

    total_out = len(orders) + len(items) + len(products) + len(customers)
    run.finish_step(records_in=total_in, records_out=total_out)
    save_checkpoint("transform", frames)
    return frames


# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — MODEL
# ─────────────────────────────────────────────────────────────────────────────

def model(frames: dict) -> dict:
    run.start_step("model", "Model", "Build star schema (fact + dimensions)")

    orders    = frames["orders"]
    items     = frames["order_items"]
    products  = frames["products"]
    customers = frames["customers"]
    regions   = frames["regions"]
    targets   = frames["targets"]

    dim_product  = products[["product_id","name","category","unit_price","active"]].copy()
    dim_product.columns = ["product_id","product_name","category","unit_price","active"]

    dim_customer = customers[["customer_id","name","email","region_id","segment","signup_date"]].copy()
    dim_customer.columns = ["customer_id","customer_name","email","region_id","segment","signup_date"]

    dim_region = regions[["region_id","name","manager"]].copy()
    dim_region.columns = ["region_id","region_name","manager"]

    date_range = pd.date_range("2024-08-01", "2025-01-31", freq="D")
    dim_date = pd.DataFrame({
        "date_id":     date_range.strftime("%Y-%m-%d"),
        "year":        date_range.year,
        "month":       date_range.month,
        "month_name":  date_range.strftime("%B"),
        "week":        date_range.isocalendar().week.astype(int),
        "day_of_week": date_range.day_name(),
        "year_month":  date_range.to_period("M").astype(str),
        "is_weekend":  date_range.day_of_week.isin([5, 6]).astype(int),
    })

    fact = items.merge(
        orders[["order_id","order_date","customer_id","region_id","channel","status","year_month"]],
        on="order_id", how="left",
    )

    valid_products = set(dim_product["product_id"])
    orphans = ~fact["product_id"].isin(valid_products)
    if orphans.sum() > 0:
        run.warn(f"{orphans.sum()} order items with unknown product_id excluded from fact")
    fact = fact[~orphans].copy()

    fact = fact.merge(dim_product[["product_id","category"]], on="product_id", how="left")
    fact["date_id"] = fact["order_date"].dt.strftime("%Y-%m-%d")

    fact_sales = fact[[
        "order_item_id","order_id","date_id",
        "product_id","category",
        "customer_id","region_id",
        "channel","status",
        "quantity","unit_price","line_total",
        "year_month",
    ]].copy()

    completed = fact_sales[fact_sales["status"] == "completed"].copy()
    monthly_summary = (
        completed
        .groupby(["year_month","region_id","category"])
        .agg(revenue=("line_total","sum"), orders=("order_id","nunique"), units=("quantity","sum"))
        .reset_index()
    )
    monthly_summary["revenue"] = monthly_summary["revenue"].round(2)

    targets_df = targets.copy()
    targets_df.columns = ["year_month","region_id","target_eur"]
    targets_df["target_eur"] = pd.to_numeric(targets_df["target_eur"], errors="coerce")

    modelled = {
        "fact_sales": fact_sales, "dim_product": dim_product,
        "dim_customer": dim_customer, "dim_region": dim_region,
        "dim_date": dim_date, "monthly_summary": monthly_summary,
        "targets": targets_df,
    }

    records_out = sum(len(df) for df in modelled.values())
    status = "warning" if any(s["status"] == "warning" for s in run.steps) else "success"
    run.finish_step(records_in=len(items), records_out=records_out, status=status)
    save_checkpoint("model", modelled)
    return modelled


# ─────────────────────────────────────────────────────────────────────────────
# Stage 5 — LOAD
# ─────────────────────────────────────────────────────────────────────────────

def load(modelled: dict):
    run.start_step("load", "Load", "Write star schema to SQLite analytics database")

    total_in  = sum(len(df) for df in modelled.values())
    total_out = 0

    con = sqlite3.connect(DB_PATH)
    try:
        for table_name, df in modelled.items():
            df.to_sql(table_name, con, if_exists="replace", index=False)
            total_out += len(df)
            log.info(f"  → {table_name}: {len(df):,} rows")

        if QC_RESULTS:
            qc_df = pd.DataFrame(QC_RESULTS)
            qc_df.to_sql("data_quality_checks", con, if_exists="replace", index=False)
            log.info(f"  → data_quality_checks: {len(qc_df)} rows")

        cur = con.cursor()
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fact_date     ON fact_sales(date_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fact_region   ON fact_sales(region_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fact_product  ON fact_sales(product_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fact_customer ON fact_sales(customer_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_summary_month ON monthly_summary(year_month)")
        con.commit()
    finally:
        con.close()

    run.finish_step(records_in=total_in, records_out=total_out)
    log.info(f"\n📦 Database written → {DB_PATH}")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="EndFlow ETL Pipeline")
    parser.add_argument(
        "--from-step",
        choices=STEP_ORDER,
        default="ingest",
        help="Resume pipeline from this step (earlier steps loaded from checkpoint)",
    )
    args = parser.parse_args()
    from_step = args.from_step
    from_idx  = STEP_ORDER.index(from_step)

    global run
    run = PipelineRun(from_step=from_step)

    log.info("=" * 55)
    log.info("  EndFlow ETL Pipeline — MadridMart Sales Domain")
    if from_step != "ingest":
        log.info(f"  ⏭  Resuming from: {from_step.upper()}")
    log.info("=" * 55)

    # ── Execute or skip each stage ────────────────────────────────────────────
    frames   = None
    modelled = None

    # INGEST
    if from_idx == 0:
        frames = ingest()
    else:
        run.skip_step("ingest", "Ingest", "Load raw CSVs into staging DataFrames")
        if from_idx <= 2:  # validate or transform needs raw frames
            frames = load_checkpoint("ingest")

    # VALIDATE
    if from_idx <= 1:
        if from_idx == 1:
            frames = load_checkpoint("ingest")
        frames = validate(frames)
    else:
        run.skip_step("validate", "Validate", "Schema checks and null assertions")
        if from_idx <= 2:
            frames = load_checkpoint("validate")

    # TRANSFORM
    if from_idx <= 2:
        if from_idx == 2:
            frames = load_checkpoint("validate")
        frames = transform(frames)
    else:
        run.skip_step("transform", "Transform", "Type-cast, clean, derive computed fields")

    # MODEL
    if from_idx <= 3:
        if from_idx == 3:
            frames = load_checkpoint("transform")
        modelled = model(frames)
    else:
        run.skip_step("model", "Model", "Build star schema (fact + dimensions)")

    # LOAD
    if from_idx == 4:
        modelled = load_checkpoint("model")
    load(modelled)

    run.save()

    # Summary
    print("\n" + "=" * 55)
    print("  Pipeline Summary")
    print("=" * 55)
    for step in run.steps:
        icon = {"success":"✅","warning":"⚠️","error":"❌","skipped":"⏭ "}.get(step["status"], "?")
        rec  = f"out={step['records_out']:>8,}" if step["records_out"] is not None else "             "
        dur  = f"{step['duration_s']}s" if step["duration_s"] is not None else "skipped"
        print(f"  {icon}  {step['label']:<12} {rec}   {dur}")
    print("=" * 55)
    print(f"  Log → {LOG_PATH}")
    print(f"  DB  → {DB_PATH}\n")


if __name__ == "__main__":
    main()
