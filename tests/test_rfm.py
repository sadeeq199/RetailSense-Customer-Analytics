
import pandas as pd

from src.rfm import (
    calculate_rfm,
    calculate_rfm_scores,
    assign_segments,
    quintile_score,
)


def sample_transactions():
    return pd.DataFrame({
        "InvoiceNo": ["1001", "1002", "1002", "C1003", "1004", "1005"],
        "StockCode": ["A", "B", "C", "D", "E", "F"],
        "Quantity": [2, 3, 1, 5, -1, 2],
        "InvoiceDate": [
            "2011-12-01",
            "2011-12-05",
            "2011-12-05",
            "2011-12-06",
            "2011-12-07",
            "2011-12-08",
        ],
        "UnitPrice": [10, 5, 20, 10, 10, 0],
        "CustomerID": [1, 1, 1, 2, 3, 4],
    })


def test_calculate_rfm():
    result = calculate_rfm(
        sample_transactions(),
        snapshot_date="2011-12-10"
    )

    customer = result[result["CustomerID"] == 1].iloc[0]

    assert customer["Recency"] == 5
    assert customer["Frequency"] == 2
    assert customer["Monetary"] == 55

    assert len(result) == 1


def test_duplicate_transactions_are_removed():
    df = sample_transactions()

    df = pd.concat(
        [df, df.iloc[[0]]],
        ignore_index=True
    )

    result = calculate_rfm(
        df,
        snapshot_date="2011-12-10"
    )

    customer = result[result["CustomerID"] == 1].iloc[0]

    assert customer["Frequency"] == 2
    assert customer["Monetary"] == 55


def test_quintile_scores_are_between_one_and_five():
    values = pd.Series([10, 20, 30, 40, 50])

    result = quintile_score(values)

    assert result.between(1, 5).all()


def test_recency_score_is_reversed():
    values = pd.Series([10, 20, 30, 40, 50])

    scores = quintile_score(
        values,
        higher_is_better=False
    )

    assert scores.iloc[0] > scores.iloc[-1]


def test_total_rfm_score_is_correct():
    df = pd.DataFrame({
        "Recency": [10, 20, 30],
        "Frequency": [1, 2, 3],
        "Monetary": [100, 200, 300],
    })

    result = calculate_rfm_scores(df)

    expected = (
        result["R_Score"]
        + result["F_Score"]
        + result["M_Score"]
    )

    assert result["RFM_Total_Score"].equals(expected)


def test_segment_mapping():
    df = pd.DataFrame({
        "R_Score": [5, 1, 2, 3],
        "F_Score": [5, 1, 4, 3],
        "M_Score": [5, 1, 4, 3],
    })

    result = assign_segments(df)

    assert result["Final_Segment"].tolist() == [
        "Champions",
        "Lost",
        "At Risk",
        "Loyal",
    ]
