import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const STORAGE_KEY = "expense-tracker-transactions";
const BUDGET_KEY = "expense-tracker-monthly-budget";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getMonthKey = (date = "") => String(date).slice(0, 7);

const getSavedTransactions = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Entertainment",
  "Salary",
  "Business",
  "Other",
];

const panelStyle = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "14px",
  boxShadow: "0 3px 14px rgba(0,0,0,0.07)",
  minWidth: 0,
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
  fontSize: "14px",
};

const buttonStyle = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
};

export default function App() {
  const [transactions, setTransactions] = useState(getSavedTransactions);

  const [budget, setBudget] = useState(() => {
    try {
      const saved = localStorage.getItem(BUDGET_KEY);
      return saved !== null ? Math.max(0, Number(saved) || 0) : 10000;
    } catch {
      return 10000;
    }
  });

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(
    today().slice(0, 7)
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(transactions)
    );
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, String(budget));
  }, [budget]);

  const currentMonth = today().slice(0, 7);

  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [transactions]);

  const monthlyExpenses = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            item.type === "expense" &&
            getMonthKey(item.date) === currentMonth
        )
        .reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0
        ),
    [transactions, currentMonth]
  );

  const budgetRemaining = budget - monthlyExpenses;

  const budgetPercent =
    budget > 0
      ? Math.min((monthlyExpenses / budget) * 100, 100)
      : 0;

  const monthlyReport = useMemo(() => {
    const items = transactions.filter(
      (item) => getMonthKey(item.date) === selectedMonth
    );

    const income = items
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = items
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      items,
      income,
      expenses,
      savings: income - expenses,
    };
  }, [transactions, selectedMonth]);

  const monthlyData = useMemo(() => {
    const months = [];

    for (let offset = 5; offset >= 0; offset--) {
      const monthDate = new Date();
      monthDate.setDate(1);
      monthDate.setMonth(monthDate.getMonth() - offset);

      const key = `${monthDate.getFullYear()}-${String(
        monthDate.getMonth() + 1
      ).padStart(2, "0")}`;

      const label = monthDate.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });

      const items = transactions.filter(
        (item) => getMonthKey(item.date) === key
      );

      const income = items
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const expense = items
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      months.push({ key, label, income, expense });
    }

    return months;
  }, [transactions]);

  const categoryData = useMemo(() => {
    const grouped = {};

    transactions
      .filter(
        (item) =>
          item.type === "expense" &&
          getMonthKey(item.date) === selectedMonth
      )
      .forEach((item) => {
        const name = item.category || "Other";
        grouped[name] =
          (grouped[name] || 0) + Number(item.amount || 0);
      });

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          data: Object.values(grouped),
          backgroundColor: [
            "#2563eb",
            "#16a34a",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
            "#06b6d4",
            "#ec4899",
            "#64748b",
            "#84cc16",
            "#f97316",
          ],
        },
      ],
    };
  }, [transactions, selectedMonth]);

  const barChartData = {
    labels: monthlyData.map((month) => month.label),
    datasets: [
      {
        label: "Income",
        data: monthlyData.map((month) => month.income),
        backgroundColor: "#16a34a",
      },
      {
        label: "Expenses",
        data: monthlyData.map((month) => month.expense),
        backgroundColor: "#ef4444",
      },
    ],
  };

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...transactions]
      .filter(
        (item) =>
          filterType === "all" || item.type === filterType
      )
      .filter(
        (item) =>
          !query ||
          String(item.title || "").toLowerCase().includes(query) ||
          String(item.category || "").toLowerCase().includes(query)
      )
      .sort((a, b) =>
        String(b.date).localeCompare(String(a.date))
      );
  }, [transactions, search, filterType]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const cleanTitle = title.trim();
    const numericAmount = Number(amount);

    if (
      !cleanTitle ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !date
    ) {
      window.alert("Please enter valid transaction details.");
      return;
    }

    const newTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: cleanTitle,
      amount: numericAmount,
      type,
      category,
      date,
    };

    setTransactions((current) => [
      newTransaction,
      ...current,
    ]);

    setTitle("");
    setAmount("");
    setType("expense");
    setCategory("Food");
    setDate(today());
  };

  const deleteTransaction = (id) => {
    if (window.confirm("Delete this transaction?")) {
      setTransactions((current) =>
        current.filter((item) => item.id !== id)
      );
    }
  };

  const clearTransactions = () => {
    if (
      transactions.length > 0 &&
      window.confirm("Delete all transactions?")
    ) {
      setTransactions([]);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Description", "Type", "Category", "Amount"],
      ...filteredTransactions.map((item) => [
        item.date,
        item.title,
        item.type,
        item.category,
        Number(item.amount || 0).toFixed(2),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "expense-tracker-transactions.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Expense Tracker Transactions", 14, 18);

    autoTable(doc, {
      startY: 28,
      head: [["Date", "Description", "Type", "Category", "Amount"]],
      body: filteredTransactions.map((item) => [
        item.date,
        item.title,
        item.type,
        item.category,
        money(item.amount),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save("expense-tracker-transactions.pdf");
  };

  const exportMonthlyPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Monthly Report: ${selectedMonth}`, 14, 18);

    doc.setFontSize(11);
    doc.text(`Income: ${money(monthlyReport.income)}`, 14, 28);
    doc.text(`Expenses: ${money(monthlyReport.expenses)}`, 14, 35);
    doc.text(`Net savings: ${money(monthlyReport.savings)}`, 14, 42);

    autoTable(doc, {
      startY: 49,
      head: [["Date", "Description", "Type", "Category", "Amount"]],
      body: monthlyReport.items.map((item) => [
        item.date,
        item.title,
        item.type,
        item.category,
        money(item.amount),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`monthly-report-${selectedMonth}.pdf`);
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 14,
  };

  const monthLabel = new Date(
    `${selectedMonth}-01T12:00:00`
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px",
        color: "#111827",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Expense Tracker</h1>
          <p style={{ color: "#64748b" }}>
            Track your income, expenses, and monthly budget.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={buttonStyle} onClick={exportCSV}>
            Export CSV
          </button>
          <button style={buttonStyle} onClick={exportPDF}>
            Export PDF
          </button>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {[
          ["Total Income", totals.income, "#16a34a"],
          ["Total Expenses", totals.expenses, "#dc2626"],
          ["Current Balance", totals.balance, "#2563eb"],
        ].map(([label, value, color]) => (
          <article key={label} style={panelStyle}>
            <p style={{ color: "#64748b", margin: 0 }}>{label}</p>
            <h2 style={{ color, marginBottom: 0 }}>{money(value)}</h2>
          </article>
        ))}
      </section>

      <section style={{ ...panelStyle, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Monthly Budget</h2>
        <label>
          Monthly budget (₹)
          <input
            type="number"
            min="0"
            value={budget}
            onChange={(event) =>
              setBudget(Math.max(0, Number(event.target.value) || 0))
            }
            style={{ ...inputStyle, maxWidth: 220, marginLeft: 10 }}
          />
        </label>
        <p>Spent this month: {money(monthlyExpenses)}</p>
        <div
          style={{
            height: 12,
            background: "#e5e7eb",
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${budgetPercent}%`,
              height: "100%",
              background: monthlyExpenses > budget ? "#dc2626" : "#16a34a",
            }}
          />
        </div>
        <p
          style={{
            color: budgetRemaining < 0 ? "#dc2626" : "#16a34a",
            fontWeight: 700,
          }}
        >
          {budgetRemaining < 0
            ? `Over budget by ${money(Math.abs(budgetRemaining))}`
            : `Budget remaining: ${money(budgetRemaining)}`}
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <article style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Income vs Expenses</h2>
          <Bar
            data={barChartData}
            options={{
              responsive: true,
              plugins: { legend: { position: "bottom" } },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { callback: (value) => `₹${value}` },
                },
              },
            }}
          />
        </article>

        <article style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Expense Categories</h2>
          <label style={{ display: "block", marginBottom: 12 }}>
            Report month{" "}
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value || currentMonth)
              }
              style={{ ...inputStyle, maxWidth: 220, marginTop: 8 }}
            />
          </label>
          {categoryData.labels.length > 0 ? (
            <Doughnut
              data={categoryData}
              options={{
                responsive: true,
                plugins: { legend: { position: "bottom" } },
              }}
            />
          ) : (
            <p style={{ color: "#64748b" }}>
              No expenses recorded for {monthLabel}.
            </p>
          )}
        </article>
      </section>

      <section style={{ ...panelStyle, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Monthly Report</h2>
            <p style={{ color: "#64748b" }}>{monthLabel}</p>
          </div>
          <button style={buttonStyle} onClick={exportMonthlyPDF}>
            Export Monthly PDF
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <span>Income</span>
            <h3 style={{ color: "#16a34a" }}>
              {money(monthlyReport.income)}
            </h3>
          </div>
          <div>
            <span>Expenses</span>
            <h3 style={{ color: "#dc2626" }}>
              {money(monthlyReport.expenses)}
            </h3>
          </div>
          <div>
            <span>Net savings</span>
            <h3 style={{ color: "#2563eb" }}>
              {money(monthlyReport.savings)}
            </h3>
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Add Transaction</h2>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 14,
            alignItems: "end",
          }}
        >
          <label>
            <span style={labelStyle}>Description</span>
            <input
              style={inputStyle}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Grocery shopping"
              required
            />
          </label>

          <label>
            <span style={labelStyle}>Amount (₹)</span>
            <input
              style={inputStyle}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </label>

          <label>
            <span style={labelStyle}>Type</span>
            <select
              style={inputStyle}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>

          <label>
            <span style={labelStyle}>Category</span>
            <select
              style={inputStyle}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span style={labelStyle}>Date</span>
            <input
              style={inputStyle}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>

          <button style={buttonStyle} type="submit">
            Add Transaction
          </button>
        </form>
      </section>

      <section style={panelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2>Transactions</h2>
          <button
            style={{ ...buttonStyle, background: "#dc2626" }}
            onClick={clearTransactions}
          >
            Clear All
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <input
            style={inputStyle}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search description/category..."
          />
          <select
            style={inputStyle}
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
          >
            <option value="all">All types</option>
            <option value="income">Income only</option>
            <option value="expense">Expenses only</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 650,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                {["Date", "Description", "Category", "Type", "Amount", "Action"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                >
                  <td style={{ padding: 12 }}>{item.date}</td>
                  <td style={{ padding: 12 }}>{item.title}</td>
                  <td style={{ padding: 12 }}>{item.category}</td>
                  <td style={{ padding: 12 }}>{item.type}</td>
                  <td
                    style={{
                      padding: 12,
                      color: item.type === "income" ? "#16a34a" : "#dc2626",
                      fontWeight: 700,
                    }}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {money(item.amount)}
                  </td>
                  <td style={{ padding: 12 }}>
                    <button
                      style={{
                        ...buttonStyle,
                        background: "#dc2626",
                        padding: "7px 10px",
                      }}
                      onClick={() => deleteTransaction(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    No transactions found. Add a transaction to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p
        style={{
          color: "#64748b",
          fontSize: 12,
          textAlign: "center",
          marginTop: 20,
        }}
      >
        Transactions and budget are saved in this browser on this device.
      </p>
    </main>
  );
}