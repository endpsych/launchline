"""
generate_data.py
----------------
Generates realistic raw CSV files simulating MadridMart's source systems.

Output files (data/raw/):
  - orders.csv         → from ERP / e-commerce platform
  - order_items.csv    → line items per order
  - products.csv       → product catalog
  - customers.csv      → customer master
  - regions.csv        → region / territory master
  - targets.csv        → monthly revenue targets per region (Finance)

Intentional data quality issues introduced for realism:
  - ~0.05% null customer_id  (CRM sync lag)
  - ~22 orphan product_ids   (catalog not yet updated)
  - ~7 negative quantities   (return processing bug)
"""

import random
import csv
import os
from datetime import datetime, timedelta
from faker import Faker

fake = Faker("es_ES")
random.seed(42)
Faker.seed(42)

# ── Paths ────────────────────────────────────────────────────────────────────
BASE = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
os.makedirs(BASE, exist_ok=True)

# ── Master data ───────────────────────────────────────────────────────────────
REGIONS = [
    {"region_id": "R01", "name": "Madrid",    "manager": "Laura Sánchez"},
    {"region_id": "R02", "name": "Barcelona", "manager": "Marc Puig"},
    {"region_id": "R03", "name": "Valencia",  "manager": "Inmaculada Ferri"},
    {"region_id": "R04", "name": "Sevilla",   "manager": "Antonio Ruiz"},
    {"region_id": "R05", "name": "Bilbao",    "manager": "Ane Etxebarria"},
]

CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Sports", "Beauty"]

CATEGORY_PRICE_RANGE = {
    "Electronics":   (49,  899),
    "Clothing":      (12,  149),
    "Home & Garden": (8,   299),
    "Sports":        (15,  249),
    "Beauty":        (6,   89),
}

REGION_WEIGHTS = [0.33, 0.27, 0.17, 0.13, 0.10]   # Madrid biggest market

# ── Targets ───────────────────────────────────────────────────────────────────
MONTHLY_TARGETS = {
    "R01": 135_000,
    "R02": 110_000,
    "R03": 72_000,
    "R04": 55_000,
    "R05": 40_000,
}


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"  ✓ {os.path.basename(path)}  ({len(rows):,} rows)")


# ── 1. regions.csv ────────────────────────────────────────────────────────────
def gen_regions():
    write_csv(
        os.path.join(BASE, "regions.csv"),
        REGIONS,
        ["region_id", "name", "manager"],
    )


# ── 2. products.csv ───────────────────────────────────────────────────────────
def gen_products(n=250):
    rows = []
    for i in range(1, n + 1):
        cat = random.choice(CATEGORIES)
        lo, hi = CATEGORY_PRICE_RANGE[cat]
        rows.append({
            "product_id":  f"PRD{i:04d}",
            "name":        fake.catch_phrase()[:60],
            "category":    cat,
            "unit_price":  round(random.uniform(lo, hi), 2),
            "active":      1 if random.random() > 0.05 else 0,
        })
    write_csv(
        os.path.join(BASE, "products.csv"),
        rows,
        ["product_id", "name", "category", "unit_price", "active"],
    )
    return rows


# ── 3. customers.csv ──────────────────────────────────────────────────────────
def gen_customers(n=8_000):
    rows = []
    for i in range(1, n + 1):
        rows.append({
            "customer_id": f"CUS{i:06d}",
            "name":        fake.name(),
            "email":       fake.email(),
            "region_id":   random.choices(
                               [r["region_id"] for r in REGIONS],
                               weights=REGION_WEIGHTS,
                           )[0],
            "segment":     random.choice(["Standard", "Premium", "VIP"]),
            "signup_date": fake.date_between(
                               start_date="-3y", end_date="-30d"
                           ).isoformat(),
        })
    write_csv(
        os.path.join(BASE, "customers.csv"),
        rows,
        ["customer_id", "name", "email", "region_id", "segment", "signup_date"],
    )
    return rows


# ── 4. orders.csv + order_items.csv ──────────────────────────────────────────
def gen_orders(customers, products, n_orders=12_000):
    customer_ids = [c["customer_id"] for c in customers]
    product_ids  = [p["product_id"]  for p in products]
    product_map  = {p["product_id"]: p for p in products}

    # Introduce orphan product_ids (quality issue)
    ghost_ids = [f"PRD{i:04d}" for i in range(9900, 9922)]   # 22 non-existent

    orders      = []
    order_items = []
    order_id    = 10_000

    start_date = datetime(2024, 8, 1)
    end_date   = datetime(2025, 1, 31)
    date_range = (end_date - start_date).days

    for _ in range(n_orders):
        order_id += 1
        oid = f"ORD{order_id}"

        order_date = start_date + timedelta(
            days=random.randint(0, date_range),
            hours=random.randint(8, 22),
            minutes=random.randint(0, 59),
        )

        # Intentional null customer_id (~0.05% of orders)
        cid = None if random.random() < 0.002 else random.choice(customer_ids)

        region = random.choices(
            [r["region_id"] for r in REGIONS],
            weights=REGION_WEIGHTS,
        )[0]

        channel = random.choices(
            ["web", "mobile", "marketplace"],
            weights=[0.55, 0.30, 0.15],
        )[0]

        # 1-4 line items per order
        n_items    = random.randint(1, 4)
        order_total = 0.0
        items_for_order = []

        for line in range(1, n_items + 1):
            # Occasionally inject ghost product_id
            if random.random() < 0.0018:
                pid = random.choice(ghost_ids)
                unit_price = round(random.uniform(10, 200), 2)
            else:
                pid = random.choice(product_ids)
                unit_price = product_map[pid]["unit_price"]

            # Intentional negative quantity (~7 total)
            quantity = -1 if random.random() < 0.0006 else random.randint(1, 5)
            line_total = round(unit_price * abs(quantity), 2)
            order_total += line_total

            items_for_order.append({
                "order_item_id": f"{oid}-L{line}",
                "order_id":      oid,
                "product_id":    pid,
                "quantity":      quantity,
                "unit_price":    unit_price,
                "line_total":    line_total if quantity > 0 else -line_total,
            })

        orders.append({
            "order_id":    oid,
            "order_date":  order_date.strftime("%Y-%m-%d %H:%M:%S"),
            "customer_id": cid if cid else "",
            "region_id":   region,
            "channel":     channel,
            "order_total": round(order_total, 2),
            "status":      random.choices(
                               ["completed", "completed", "completed", "returned", "cancelled"],
                               weights=[0.82, 0.82, 0.82, 0.10, 0.08],
                           )[0],
        })
        order_items.extend(items_for_order)

    write_csv(
        os.path.join(BASE, "orders.csv"),
        orders,
        ["order_id", "order_date", "customer_id", "region_id",
         "channel", "order_total", "status"],
    )
    write_csv(
        os.path.join(BASE, "order_items.csv"),
        order_items,
        ["order_item_id", "order_id", "product_id",
         "quantity", "unit_price", "line_total"],
    )
    return orders, order_items


# ── 5. targets.csv ────────────────────────────────────────────────────────────
def gen_targets():
    rows = []
    months = [
        "2024-08", "2024-09", "2024-10",
        "2024-11", "2024-12", "2025-01",
    ]
    for month in months:
        for region_id, base_target in MONTHLY_TARGETS.items():
            # Small seasonal variation
            multiplier = {
                "2024-08": 1.0, "2024-09": 0.95,
                "2024-10": 1.05, "2024-11": 1.15,
                "2024-12": 1.30, "2025-01": 0.90,
            }[month]
            rows.append({
                "month":       month,
                "region_id":   region_id,
                "target_eur":  round(base_target * multiplier, 2),
            })
    write_csv(
        os.path.join(BASE, "targets.csv"),
        rows,
        ["month", "region_id", "target_eur"],
    )


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🏗  Generating MadridMart raw data...\n")
    gen_regions()
    products  = gen_products(250)
    customers = gen_customers(8_000)
    gen_orders(customers, products, 12_000)
    gen_targets()
    print("\n✅ Raw data generated in data/raw/\n")
