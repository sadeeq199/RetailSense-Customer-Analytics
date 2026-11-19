
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Crown, AlertTriangle, UserX, Search, RefreshCw,
  LayoutDashboard, UserSearch, Layers3, ChartNoAxesCombined,
} from "lucide-react";
import "./App.css";

const COLORS = {
  Champions: "#16A36A",
  Loyal: "#3985E8",
  "At Risk": "#E9A23B",
  Lost: "#E45B66",
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-US");

const formatCurrency = (value) =>
  `£${Number(value || 0).toLocaleString("en-GB", {
    maximumFractionDigits: 2,
  })}`;

function App() {
  const [customers, setCustomers] = useState([]);
  const [segments, setSegments] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("CustomerID");
  const [sortDirection, setSortDirection] = useState("asc");

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const files = [
          "/data/customer_rfm.csv",
          "/data/customer_segments.csv",
          "/data/cohort_retention.csv",
        ];

        const responses = await Promise.all(
          files.map((file) =>
            fetch(file, { signal: controller.signal })
          )
        );

        const failedResponse = responses.find((response) => !response.ok);
        if (failedResponse) {
          throw new Error(
            `Unable to load a CSV file (HTTP ${failedResponse.status}).`
          );
        }

        const csvTexts = await Promise.all(
          responses.map((response) => response.text())
        );

        const parsed = csvTexts.map((csv) => {
          const result = Papa.parse(csv, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          });

          if (result.errors.length) {
            console.warn("CSV parsing warnings:", result.errors);
          }

          return result.data;
        });

        setCustomers(parsed[0]);
        setSegments(parsed[1]);
        setCohorts(parsed[2]);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "An unexpected error occurred.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, []);

  const kpis = useMemo(() => {
    const total = customers.length;

    const repeatCustomers = customers.filter(
      (customer) => customer.Customer_Type === "Repeat Customer"
    ).length;

    return {
      total,
      repeatCustomers,
      repeatRate: total ? (repeatCustomers / total) * 100 : 0,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch = String(customer.CustomerID ?? "")
        .toLowerCase()
        .includes(normalizedSearch);

      const matchesSegment =
        selectedSegment === "All" ||
        customer.Final_Segment === selectedSegment;

      return matchesSearch && matchesSegment;
    });
  }, [customers, search, selectedSegment]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];

      let comparison = 0;

      if (
        valueA !== null &&
        valueA !== undefined &&
        valueB !== null &&
        valueB !== undefined &&
        !Number.isNaN(Number(valueA)) &&
        !Number.isNaN(Number(valueB))
      ) {
        comparison = Number(valueA) - Number(valueB);
      } else {
        comparison = String(valueA ?? "").localeCompare(
          String(valueB ?? "")
        );
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredCustomers, sortBy, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedCustomers.length / rowsPerPage)
  );

  const startIndex = (currentPage - 1) * rowsPerPage;

  const paginatedCustomers = sortedCustomers.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedSegment, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <RefreshCw className="spin" size={30} />
        <p>Loading Customer Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Unable to load dashboard data</h2>
        <p>{error}</p>
        <p>
          Check that the CSV files exist inside frontend/public/data.
        </p>
        <button
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Layers3 size={23} />
          </div>
          <div>
            <h2>RetailSense</h2>
            <span>Customer Intelligence</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <button
            type="button"
            className="nav-item active"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <LayoutDashboard size={19} />
            <span>Customer View</span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => scrollToSection("rfm-segments")}
          >
            <ChartNoAxesCombined size={19} />
            <span>RFM Segments</span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => scrollToSection("customer-lookup")}
          >
            <UserSearch size={19} />
            <span>Customer Lookup</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Analytics Dashboard Active</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Workspace / Customer Analytics</div>
            <h1>Customer Overview</h1>
            <p>Understand customer behavior and business performance.</p>
          </div>

          <div className="data-status">
            <span className="status-dot" />
            Data Loaded
          </div>
        </header>

        <section className="kpi-grid">
          <KpiCard
            icon={<Users size={21} />}
            label="Eligible Customers"
            value={formatNumber(kpis.total)}
            note="Customers with valid purchases"
            color="blue"
          />

          <KpiCard
            icon={<Crown size={21} />}
            label="Champions"
            value={formatNumber(
              segments.find((item) => item.Final_Segment === "Champions")
                ?.Customers
            )}
            note="High-value recent customers"
            color="green"
          />

          <KpiCard
            icon={<AlertTriangle size={21} />}
            label="At Risk"
            value={formatNumber(
              segments.find((item) => item.Final_Segment === "At Risk")
                ?.Customers
            )}
            note="Customers needing attention"
            color="orange"
          />

          <KpiCard
            icon={<UserX size={21} />}
            label="Repeat Rate"
            value={`${kpis.repeatRate.toFixed(2)}%`}
            note={`${formatNumber(kpis.repeatCustomers)} repeat customers`}
            color="purple"
          />
        </section>

        <section className="charts-grid" id="rfm-segments">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Customer Segments</h2>
                <p>Distribution across RFM segments</p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segments}
                    dataKey="Customers"
                    nameKey="Final_Segment"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                  >
                    {segments.map((entry) => (
                      <Cell
                        key={entry.Final_Segment}
                        fill={COLORS[entry.Final_Segment] || "#888"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      formatNumber(value),
                      "Customers",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="legend-list">
              {segments.map((segment) => (
                <div className="legend-item" key={segment.Final_Segment}>
                  <span
                    className="legend-dot"
                    style={{
                      background: COLORS[segment.Final_Segment] || "#888",
                    }}
                  />
                  <span>{segment.Final_Segment}</span>
                  <strong>
                    {Number(segment.Percentage).toFixed(2)}%
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Segment Comparison</h2>
                <p>Number of customers in each segment</p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={segments}
                  layout="vertical"
                  margin={{ left: 15, right: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="Final_Segment"
                    width={85}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="Customers"
                    radius={[0, 6, 6, 0]}
                    barSize={23}
                  >
                    {segments.map((entry) => (
                      <Cell
                        key={entry.Final_Segment}
                        fill={COLORS[entry.Final_Segment] || "#888"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="panel cohort-panel">
          <div className="panel-heading">
            <div>
              <h2>Cohort Retention</h2>
              <p>
                Monthly customer retention percentage by acquisition cohort
              </p>
            </div>
            <span className="panel-tag">Retention %</span>
          </div>

          <div className="table-scroll">
            <table className="cohort-table">
              <thead>
                <tr>
                  <th>Cohort Month</th>
                  {Array.from({ length: 13 }, (_, index) => (
                    <th key={index}>Month {index}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort, index) => (
                  <tr key={`${cohort.CohortMonth}-${index}`}>
                    <td className="cohort-name">
                      {String(cohort.CohortMonth).slice(0, 7)}
                    </td>
                    {Array.from({ length: 13 }, (_, month) => {
                      const value = cohort[String(month)];
                      const valid =
                        value !== null &&
                        value !== undefined &&
                        value !== "";

                      return (
                        <td key={month}>
                          <span
                            className="heat-cell"
                            style={{
                              background: valid
                                ? `rgba(22, 163, 106, ${
                                    0.12 + (Number(value) / 100) * 0.78
                                  })`
                                : "#F1F3F5",
                              color:
                                valid && Number(value) > 50
                                  ? "#FFFFFF"
                                  : "#344054",
                            }}
                          >
                            {valid
                              ? `${Number(value).toFixed(1)}%`
                              : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="table-note">
            — means the cohort has no observed data for that month.
          </p>
        </section>

        <section
          className="panel customers-panel"
          id="customer-lookup"
        >
          <div className="panel-heading customer-heading">
            <div>
              <h2>Customer Lookup</h2>
              <p>Search and explore individual customer records</p>
            </div>
            <span className="result-count">
              {formatNumber(filteredCustomers.length)} customers
            </span>
          </div>

          <div className="filters">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by Customer ID..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search by customer ID"
              />
            </div>

            <select
              value={selectedSegment}
              onChange={(event) => setSelectedSegment(event.target.value)}
              aria-label="Filter by customer segment"
            >
              <option value="All">All Segments</option>
              <option value="Champions">Champions</option>
              <option value="Loyal">Loyal</option>
              <option value="At Risk">At Risk</option>
              <option value="Lost">Lost</option>
            </select>

            <div className="sort-controls">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                aria-label="Sort customers by"
              >
                <option value="CustomerID">Sort: Customer ID</option>
                <option value="Recency">Sort: Recency</option>
                <option value="Frequency">Sort: Frequency</option>
                <option value="Monetary">Sort: Monetary</option>
                <option value="RFM_Total_Score">Sort: RFM Score</option>
              </select>

              <button
                type="button"
                className="sort-direction"
                onClick={() =>
                  setSortDirection((direction) =>
                    direction === "asc" ? "desc" : "asc"
                  )
                }
              >
                {sortDirection === "asc"
                  ? "Ascending ↑"
                  : "Descending ↓"}
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Recency</th>
                  <th>Frequency</th>
                  <th>Monetary</th>
                  <th>RFM Score</th>
                  <th>Segment</th>
                  <th>Customer Type</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.CustomerID}>
                    <td>
                      <button
                        type="button"
                        className="customer-id-button"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        {customer.CustomerID}
                      </button>
                    </td>
                    <td>{customer.Recency} days</td>
                    <td>{customer.Frequency}</td>
                    <td>{formatCurrency(customer.Monetary)}</td>
                    <td>
                      {customer.R_Score}
                      {customer.F_Score}
                      {customer.M_Score}
                    </td>
                    <td>
                      <span
                        className={`segment-badge ${String(
                          customer.Final_Segment
                        )
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        {customer.Final_Segment}
                      </span>
                    </td>
                    <td>{customer.Customer_Type}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && (
              <div className="empty-state">
                No customers match your search.
              </div>
            )}
          </div>

          <div className="pagination">
            <div className="pagination-info">
              Showing{" "}
              {sortedCustomers.length === 0 ? 0 : startIndex + 1}
              {" - "}
              {Math.min(startIndex + rowsPerPage, sortedCustomers.length)}
              {" of "}
              {formatNumber(sortedCustomers.length)} customers
            </div>

            <div className="pagination-controls">
              <select
                className="rows-select"
                value={rowsPerPage}
                onChange={(event) =>
                  setRowsPerPage(Number(event.target.value))
                }
                aria-label="Rows per page"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>

              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
              >
                Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {selectedCustomer && (
          <CustomerProfile
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
        )}

        <footer className="footer">
          RetailSense Customer Analytics · RFM & Cohort Analysis
        </footer>
      </main>
    </div>
  );
}

function CustomerProfile({ customer, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const scoreItems = [
    { label: "Recency Score", value: customer.R_Score },
    { label: "Frequency Score", value: customer.F_Score },
    { label: "Monetary Score", value: customer.M_Score },
  ];

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-header">
          <div>
            <span className="profile-eyebrow">CUSTOMER PROFILE</span>
            <h2 id="profile-title">Customer #{customer.CustomerID}</h2>
            <span
              className={`segment-badge ${String(customer.Final_Segment)
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              {customer.Final_Segment}
            </span>
          </div>

          <button
            type="button"
            className="close-profile"
            onClick={onClose}
            aria-label="Close customer profile"
          >
            ×
          </button>
        </div>

        <div className="profile-section">
          <h3>Customer Information</h3>
          <div className="profile-info-grid">
            <ProfileItem label="Customer ID" value={customer.CustomerID} />
            <ProfileItem
              label="Customer Type"
              value={customer.Customer_Type}
            />
            <ProfileItem
              label="Last Purchase Date"
              value={customer.LastPurchaseDate || "N/A"}
            />
          </div>
        </div>

        <div className="profile-section">
          <h3>RFM Metrics</h3>
          <div className="profile-metrics">
            <ProfileItem
              label="Recency"
              value={`${customer.Recency} days`}
            />
            <ProfileItem
              label="Frequency"
              value={formatNumber(customer.Frequency)}
            />
            <ProfileItem
              label="Monetary"
              value={formatCurrency(customer.Monetary)}
            />
          </div>
        </div>

        <div className="profile-section">
          <h3>RFM Scores</h3>
          <div className="score-grid">
            {scoreItems.map((item) => (
              <div className="score-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>Out of 5</small>
              </div>
            ))}
          </div>

          <div className="total-score">
            <span>RFM Total Score</span>
            <strong>{customer.RFM_Total_Score}</strong>
          </div>
        </div>

        <div className="profile-footer">
          Customer analytics based on historical purchase behavior.
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="profile-info-item">
      <span>{label}</span>
      <strong>{value ?? "N/A"}</strong>
    </div>
  );
}

function KpiCard({ icon, label, value, note, color }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${color}`}>{icon}</div>
      <p className="kpi-label">{label}</p>
      <h2>{value}</h2>
      <span className="kpi-note">{note}</span>
    </div>
  );
}

export default App;
