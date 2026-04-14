#!/usr/bin/env python3
"""
Script de verification independant.
Compare le CA net et le nombre de commandes calcules depuis le CSV brut
avec les valeurs attendues par le dashboard.
"""
import csv
import sys
from pathlib import Path

CSV_PATH = Path(__file__).parent.parent / "data" / "hzn_mh_data_funnel.io.csv"

def main():
    if not CSV_PATH.exists():
        print(f"ERREUR: CSV introuvable a {CSV_PATH}")
        sys.exit(1)

    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Nombre total de lignes: {len(rows)}")

    # Filter PRODUCT lines only
    product_lines = [r for r in rows if r.get("Sale Line Type") == "PRODUCT"]
    print(f"Lignes PRODUCT: {len(product_lines)}")

    # Sale orders (unique Order IDs with ORDER/PURCHASE)
    sale_orders = {}
    refund_orders = set()

    for row in product_lines:
        order_id = row.get("Order ID", "")
        action_type = row.get("Order Action Type", "")
        sale_action = row.get("Sale Action Type", "")
        aov_str = row.get("Average Order Value (EUR)", "")

        try:
            aov = float(aov_str) if aov_str else 0.0
        except ValueError:
            aov = 0.0

        if action_type == "ORDER" and sale_action == "ORDER":
            if order_id not in sale_orders and aov > 0:
                sale_orders[order_id] = aov
        elif action_type == "REFUND" or sale_action == "RETURN":
            refund_orders.add(order_id)

    total_sales = sum(sale_orders.values())
    total_refunds = sum(sale_orders.get(oid, 0) for oid in refund_orders if oid in sale_orders)

    net_revenue = total_sales - total_refunds
    net_orders = len(sale_orders) - len(refund_orders & set(sale_orders.keys()))

    print(f"\n=== RESULTATS ===")
    print(f"Commandes SALE uniques:   {len(sale_orders)}")
    print(f"Commandes REFUND:         {len(refund_orders)}")
    print(f"Commandes nettes:         {net_orders}")
    print(f"CA brut (SALE):           {total_sales:.2f} EUR")
    print(f"CA rembourse:             {total_refunds:.2f} EUR")
    print(f"CA net:                   {net_revenue:.2f} EUR")
    print(f"Panier moyen net:         {net_revenue / net_orders:.2f} EUR" if net_orders > 0 else "Panier moyen: N/A")

    # Date range
    dates = []
    for row in rows:
        d = row.get("Order Created At", "")
        if d:
            dates.append(d)
    dates.sort()
    print(f"\nPlage de dates: {dates[0][:10]} a {dates[-1][:10]}")

    # New customer rate
    order_types = {}
    for row in product_lines:
        oid = row.get("Order ID", "")
        action_type = row.get("Order Action Type", "")
        sale_action = row.get("Sale Action Type", "")
        if action_type == "ORDER" and sale_action == "ORDER":
            if oid not in order_types:
                order_types[oid] = row.get("Customer Sale Type", "")

    total_typed = len(order_types)
    new_count = sum(1 for v in order_types.values() if v == "First-time")
    print(f"Taux nouveaux clients:    {new_count}/{total_typed} = {new_count/total_typed*100:.1f}%" if total_typed > 0 else "")

    # Top products
    products = {}
    for row in product_lines:
        name = row.get("Product Title", "")
        if not name:
            continue
        action_type = row.get("Order Action Type", "")
        sale_action = row.get("Sale Action Type", "")
        sign = -1 if (action_type == "REFUND" or sale_action == "RETURN") else 1
        if name not in products:
            products[name] = 0
        products[name] += sign

    top = sorted(products.items(), key=lambda x: x[1], reverse=True)[:10]
    print(f"\nTop 10 produits (par quantite):")
    for name, qty in top:
        print(f"  {qty:3d}  {name}")


if __name__ == "__main__":
    main()
