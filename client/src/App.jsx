
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

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

function getSavedTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [transactions, setTransactions] = useState(getSavedTransactions);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Rent");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(transactions)
      );
    } catch {
      setNotice("Unable to save data in this browser.");
    }
  }, [transactions]);

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const balance = income - expenses;

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);

        const matchesFilter =
          filter === "all" || item.type === filter;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, search, filter]);

  const monthlyData = useMemo(() => {
    const months = [];

    for (let offset = 5; offset >= 0; offset--) {
      const monthDate = new Date();
      monthDate.setDate(1);
      monthDate.setMonth(monthDate.getMonth() - offset);

      const key = `${monthDate.getFullYear()}-${String(
        monthDate.getMonth() + 1
      ).padStart(2, "0")}`;

      months.push({
        key,
        label: monthDate.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        income: 0,
        expense: 0,
      });
    }

    transactions.forEach((item) => {
      const month = months.find(
        (entry) => entry.key === item.date.slice(0, 7)
      );

      if (month) {
        if (item.type === "income") {
          month.income += item.amount;
        } else {
          month.expense += item.amount;
        }
      }
    });

    return months;
  }, [transactions]);

  const categoryData = useMemo(() => {
    const totals = {};

    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        totals[item.category] =
          (totals[item.category] || 0) + item.amount;
      });

    return Object.entries(totals);
  }, [transactions]);

  function addTransaction(event) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!title.trim()) {
      setNotice("Please enter a transaction title.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setNotice("Amount must be greater than zero.");
      return;
    }

    if (!date) {
      setNotice("Please select a date.");
      return;
    }

    const newTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      amount: numericAmount,
      type,
      category,
      date,
    };

    setTransactions((previous) => [
      ...previous,
      newTransaction,
    ]);

    setTitle("");
    setAmount("");
    setNotice("Transaction added successfully!");
  }

  function deleteTransaction(id) {
    setTransactions((previous) =>
      previous.filter((item) => item.id !== id)
    );
    setNotice("Transaction deleted.");
  }

  function exportCSV() {
    if (transactions.length === 0) {
      setNotice("No transactions available to export.");
      return;
    }

    const escapeCSV = (value) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const rows = [
      ["Title", "Type", "Category", "Date", "Amount"],
      ...transactions.map((item) => [
        item.title,
        item.type,
        item.category,
        item.date,
        item.amount,
      ]),
    ];

    const csv = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expense-tracker.csv";
    link.click();
    URL.revokeObjectURL(url);

    setNotice("CSV downloaded successfully.");
  }

  function clearAll() {
    if (!transactions.length) {
      setNotice("There are no transactions to clear.");
      return;
    }

    if (window.confirm("Delete all transactions? This cannot be undone.")) {
      setTransactions([]);
      setNotice("All transactions deleted.");
    }
  }

  const barChart = {
    labels: monthlyData.map((item) => item.label),
    datasets: [
      {
        label: "Income",
        data: monthlyData.map((item) => item.income),
        backgroundColor: "#16a779",
        borderRadius: 5,
      },
      {
        label: "Expenses",
        data: monthlyData.map((item) => item.expense),
        backgroundColor: "#ef6464",
        borderRadius: 5,
      },
    ],
  };

  const doughnutChart = {
    labels: categoryData.map(([name]) => name),
    datasets: [
      {
        data: categoryData.map(([, total]) => total),
        backgroundColor: [
          "#6366f1",
          "#16a779",
          "#f59e0b",
          "#ef6464",
          "#0ea5e9",
          "#a855f7",
          "#14b8a6",
          "#94a3b8",
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => "₹" + value,
        },
      },
    },
  };

  return (
    <main className="app">
      <header className="page-header">
        <div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Expense Tracker</h1>
          <p className="subtitle">
            Track your income, control your spending.
          </p>
        </div>

        <button className="secondary-btn" onClick={exportCSV}>
          Export CSV
        </button>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            className="notice-close"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <section className="summary-grid">
        <article className="summary-card">
          <p>Financial Overview</p>
          <h2>{money(balance)}</h2>
          <span>Current balance</span>
        </article>

        <article className="summary-card income-card">
          <p>Total Income</p>
          <h2>{money(income)}</h2>
          <span>Money received</span>
        </article>

        <article className="summary-card expense-card">
          <p>Total Expenses</p>
          <h2>{money(expenses)}</h2>
          <span>Money spent</span>
        </article>
      </section>

      <section className="charts-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Monthly Overview</h2>
              <p>Income vs expenses for the last 6 months</p>
            </div>
          </div>
          <div className="chart-container">
            <Bar data={barChart} options={chartOptions} />
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Spending</h2>
              <p>Expenses grouped by category</p>
            </div>
          </div>

          {categoryData.length ? (
            <div className="doughnut-container">
              <Doughnut
                data={doughnutChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { position: "bottom" },
                  },
                }}
              />
            </div>
          ) : (
            <div className="empty-chart">
              <div className="empty-chart-icon">◔</div>
              <p>No expenses yet</p>
              <span>Add an expense to see spending.</span>
            </div>
          )}
        </article>
      </section>

      <section className="content-grid">
        <article className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>Add Transaction</h2>
              <p>Record your income or an expense</p>
            </div>
          </div>

          <form onSubmit={addTransaction} className="transaction-form">
            <label>
              Transaction name
              <input
                type="text"
                placeholder="e.g. House Rent"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                required
              />
            </label>

            <label>
              Amount (₹)
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                min="0.01"
                step="0.01"
                required
              />
            </label>

            <label>
              Type
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>Rent</option>
                <option>Food</option>
                <option>Transport</option>
                <option>Bills</option>
                <option>Shopping</option>
                <option>Health</option>
                <option>Salary</option>
                <option>Business</option>
                <option>Education</option>
                <option>Entertainment</option>
                <option>Other</option>
              </select>
            </label>

            <label className="full-width">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>

            <button className="primary-btn full-width" type="submit">
              + Add Transaction
            </button>
          </form>
        </article>

        <article className="panel transactions-panel">
          <div className="panel-heading">
            <div>
              <h2>Transactions</h2>
              <p>{filteredTransactions.length} transaction(s)</p>
            </div>
          </div>

          <div className="toolbar">
            <input
              type="search"
              placeholder="Search transactions..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search transactions"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter transaction type"
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
          </div>

          <div className="transaction-list">
            {filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">↗</div>
                <h3>No transactions found</h3>
                <p>Add a transaction or change your search.</p>
              </div>
            ) : (
              filteredTransactions.map((item) => (
                <div className="transaction-row" key={item.id}>
                  <div className="transaction-symbol">
                    {item.type === "income" ? "↙" : "↗"}
                  </div>

                  <div className="transaction-info">
                    <strong>{item.title}</strong>
                    <span>
                      {item.category} · {item.date}
                    </span>
                  </div>

                  <div className="transaction-value">
                    <strong
                      className={
                        item.type === "income" ? "positive" : "negative"
                      }
                    >
                      {item.type === "income" ? "+" : "−"}
                      {money(item.amount)}
                    </strong>

                    <button
                      className="delete-btn"
                      onClick={() => deleteTransaction(item.id)}
                      aria-label={`Delete ${item.title}`}
                      title="Delete transaction"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="transaction-actions">
            <button className="secondary-btn" onClick={exportCSV}>
              Export CSV
            </button>
            <button className="danger-btn" onClick={clearAll}>
              Clear All
            </button>
          </div>
        </article>
      </section>

      <footer className="footer">
        <p>Expense Tracker · Manage your money with confidence.</p>
        <span>Your transactions are saved in this browser.</span>
      </footer>
    </main>
  );
}
