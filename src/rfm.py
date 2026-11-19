
import numpy as np
import pandas as pd


def calculate_rfm(df, snapshot_date):
    """Calculate customer-level Recency, Frequency, and Monetary."""

    data = df.drop_duplicates().copy()

    invoice_numbers = data["InvoiceNo"].astype(str).str.strip().str.upper()

    valid_mask = (
        ~invoice_numbers.str.startswith("C")
        & (data["Quantity"] > 0)
        & (data["UnitPrice"] > 0)
        & data["CustomerID"].notna()
    )

    purchases = data.loc[valid_mask].copy()

    purchases["LineRevenue"] = (
        purchases["Quantity"] * purchases["UnitPrice"]
    )

    purchases["InvoiceDate"] = pd.to_datetime(
        purchases["InvoiceDate"]
    )

    rfm = (
        purchases.groupby("CustomerID")
        .agg(
            LastPurchaseDate=("InvoiceDate", "max"),
            Frequency=("InvoiceNo", "nunique"),
            Monetary=("LineRevenue", "sum"),
        )
        .reset_index()
    )

    snapshot_date = pd.Timestamp(snapshot_date)

    rfm["Recency"] = (
        snapshot_date.normalize()
        - rfm["LastPurchaseDate"].dt.normalize()
    ).dt.days

    return rfm[
        [
            "CustomerID",
            "LastPurchaseDate",
            "Recency",
            "Frequency",
            "Monetary",
        ]
    ]


def quintile_score(series, higher_is_better=True):
    percentile_rank = series.rank(
        pct=True,
        method="average"
    )

    scores = np.ceil(percentile_rank * 5).clip(1, 5)

    if not higher_is_better:
        scores = 6 - scores

    return scores.astype(int)


def calculate_rfm_scores(rfm):
    result = rfm.copy()

    result["R_Score"] = quintile_score(
        result["Recency"],
        higher_is_better=False
    )

    result["F_Score"] = quintile_score(
        result["Frequency"],
        higher_is_better=True
    )

    result["M_Score"] = quintile_score(
        result["Monetary"],
        higher_is_better=True
    )

    result["RFM_Total_Score"] = (
        result["R_Score"]
        + result["F_Score"]
        + result["M_Score"]
    )

    return result


def assign_segments(rfm):
    result = rfm.copy()

    conditions = [
        (
            (result["R_Score"] >= 4)
            & (result["F_Score"] >= 4)
            & (result["M_Score"] >= 4)
        ),
        (
            (result["R_Score"] <= 2)
            & (result["F_Score"] <= 2)
            & (result["M_Score"] <= 2)
        ),
        result["R_Score"] <= 2,
    ]

    choices = ["Champions", "Lost", "At Risk"]

    result["Final_Segment"] = np.select(
        conditions,
        choices,
        default="Loyal"
    )

    return result
