
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

const TRANSACTIONS_KEY = "expense_tracker_transactions";
const BUDGET_KEY = "expense_tracker_budget";

const today = () => new Date().toISOString().slice(0, 10);

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

function readTransactions() {
  try {
    const saved = localStorage.getItem(TRANSACTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function readBudget() {
  try {
    return localStorage.getItem(BUDGET_KEY) || "10000";
  } catch {
    return "10000";
  }
}

export default function App() {
  const [transactions, setTransactions] = useState(readTransactions);
  const [budget, setBudget] = useState(readBudget);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState(
    today().slice(0, 7)
  );
  const [appError, setAppError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(
        TRANSACTIONS_KEY,
        JSON.stringify(transactions)
      );
    } catch {
      setAppError("Browser storage is full. Export your data for backup.");
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(BUDGET_KEY, budget);
    } catch {
      setAppError("Could not save the budget in this browser.");
    }
  }, [budget]);

  const monthlyTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          (transaction.date || "").slice(0, 7) === filterMonth
      ),
    [transactions, filterMonth]
  );

  const income = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const expenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const balance = income - expenses;
  const budgetAmount = Math.max(0, Number(budget) || 0);
  const budgetPercent =
    budgetAmount > 0 ? (expenses / budgetAmount) * 100 : 0;

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...transactions]
      .filter((t) => {
        const matchesSearch =
          !query ||
          (t.title || "").toLowerCase().includes(query) ||
          (t.category || "").toLowerCase().includes(query);

        const matchesType =
          filterType === "all" || t.type === filterType;

        const matchesMonth =
          !filterMonth ||
          (t.date || "").slice(0, 7) === filterMonth;

        return matchesSearch && matchesType && matchesMonth;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [transactions, search, filterType, filterMonth]);

  const categories = [
    "Food",
    "Travel",
    "Shopping",
    "Bills",
    "Health",
    "Education",
    "Entertainment",
    "Salary",
    "Business",
    "Other",
  ];

  function addTransaction(event) {
    event.preventDefault();
    setAppError("");
    setMessage("");

    const cleanTitle = title.trim();
    const numericAmount = Number(amount);

    if (!cleanTitle) {
      setAppError("Please enter a transaction description.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setAppError("Please enter an amount greater than zero.");
      return;
    }

    if (!date) {
      setAppError("Please select a date.");
      return;
    }

    const newTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: cleanTitle,
      amount: numericAmount,
      type,
      category,
      date,
    };

    setTransactions((previous) => [newTransaction, ...previous]);
    setTitle("");
    setAmount("");
    setType("expense");
    setCategory("Food");
    setDate(today());
    setMessage("Transaction added and saved in this browser.");
  }

  function deleteTransaction(id) {
    if (!window.confirm("Delete this transaction?")) return;

    setTransactions((previous) =>
      previous.filter((transaction) => transaction.id !== id)
    );
    setMessage("Transaction deleted.");
    setAppError("");
  }

  function clearAllTransactions() {
    if (transactions.length === 0) {
      setMessage("There are no transactions to clear.");
      return;
    }

    if (
      !window.confirm(
        "Delete ALL transactions? This action cannot be undone."
      )
    ) {
      return;
    }

    setTransactions([]);
    setMessage("All transactions deleted.");
    setAppError("");
  }

  function exportCSV() {
    if (!transactions.length) {
      setAppError("No transactions available to export.");
      return;
    }

    const headers = ["Date", "Description", "Type", "Category", "Amount"];
    const rows = transactions.map((t) => [
      t.date,
      t.title,
      t.type,
      t.category,
      t.amount,
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-report-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("CSV report downloaded.");
  }

  function exportPDF() {
    if (!transactions.length) {
      setAppError("No transactions available to export.");
      return;
    }

    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("Expense Tracker Report", 14, 18);

    pdf.setFontSize(10);
    pdf.text(`Generated: ${today()}`, 14, 26);
    pdf.text(`Income: ${money(income)}`, 14, 34);
    pdf.text(`Expenses: ${money(expenses)}`, 14, 40);
    pdf.text(`Balance: ${money(balance)}`, 14, 46);

    autoTable(pdf, {
      startY: 53,
      head: [["Date", "Description", "Type", "Category", "Amount"]],
      body: [...transactions]
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .map((t) => [
          t.date,
          t.title,
          t.type,
          t.category,
          money(t.amount),
        ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 80, 140] },
    });

    pdf.save(`expense-report-${today()}.pdf`);
    setMessage("PDF report downloaded.");
  }

  function exportMonthlyReport() {
    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("Monthly Financial Report", 14, 18);
    pdf.setFontSize(11);
    pdf.text(`Month: ${filterMonth}`, 14, 28);
    pdf.text(`Total income: ${money(income)}`, 14, 38);
    pdf.text(`Total expenses: ${money(expenses)}`, 14, 46);
    pdf.text(`Net balance: ${money(balance)}`, 14, 54);
    pdf.text(`Budget: ${money(budgetAmount)}`, 14, 62);

    autoTable(pdf, {
      startY: 70,
      head: [["Date", "Description", "Type", "Category", "Amount"]],
      body: monthlyTransactions.map((t) => [
        t.date,
        t.title,
        t.type,
        t.category,
        money(t.amount),
      ]),
      styles: { fontSize: 8 },
    });

    pdf.save(`monthly-report-${filterMonth}.pdf`);
    setMessage("Monthly report downloaded.");
  }

  const expenseByCategory = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((result, t) => {
      result[t.category] =
        (result[t.category] || 0) + Number(t.amount || 0);
      return result;
    }, {});

  const categoryNames = Object.keys(expenseByCategory);

  const doughnutData = {
    labels: categoryNames,
    datasets: [
      {
        label: "Expenses",
        data: categoryNames.map((name) => expenseByCategory[name]),
        backgroundColor: [
          "#4f46e5",
          "#0d9488",
          "#f59e0b",
          "#e11d48",
          "#0284c7",
          "#9333ea",
          "#65a30d",
          "#ea580c",
          "#64748b",
          "#db2777",
        ],
        borderWidth: 1,
      },
    ],
  };

  const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - index));
    return d.toISOString().slice(0, 7);
  });

  const barData = {
    labels: lastSixMonths,
    datasets: [
      {
        label: "Income",
        data: lastSixMonths.map((month) =>
          transactions
            .filter(
              (t) => t.date?.slice(0, 7) === month && t.type === "income"
            )
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)
        ),
        backgroundColor: "#16a34a",
      },
      {
        label: "Expenses",
        data: lastSixMonths.map((month) =>
          transactions
            .filter(
              (t) => t.date?.slice(0, 7) === month && t.type === "expense"
            )
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)
        ),
        backgroundColor: "#e11d48",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  return (
    <main className="app-container">
      <header className="app-header">
        <div>
          <h1>Expense Tracker</h1>
          <p>Track your money. Manage your future.</p>
        </div>
        <span className="storage-badge">Local storage</span>
      </header>

      {appError && (
        <div className="app-alert error" role="alert">
          {appError}
          <button onClick={() => setAppError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {message && (
        <div className="app-alert success" role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <section className="summary-grid">
        <article className="summary-card">
          <h3>Monthly Income</h3>
          <p className="income-text">{money(income)}</p>
        </article>
        <article className="summary-card">
          <h3>Monthly Expenses</h3>
          <p className="expense-text">{money(expenses)}</p>
        </article>
        <article className="summary-card">
          <h3>Monthly Balance</h3>
          <p className={balance < 0 ? "expense-text" : "income-text"}>
            {money(balance)}
          </p>
        </article>
        <article className="summary-card">
          <h3>Transactions</h3>
          <p>{monthlyTransactions.length}</p>
        </article>
      </section>

      <section className="panel">
        <h2>Monthly Budget</h2>
        <div className="budget-controls">
          <label>
            Budget amount (₹)
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </label>
          <div className="budget-status">
            <span>
              Spent: {money(expenses)} / {money(budgetAmount)}
            </span>
            <span>
              {budgetAmount > 0
                ? `${Math.round(budgetPercent)}% used`
                : "Set a budget"}
            </span>
          </div>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${
              budgetPercent >= 100 ? "over-budget" : ""
            }`}
            style={{
              width: `${Math.min(budgetPercent, 100)}%`,
            }}
          />
        </div>
        {budgetAmount > 0 && expenses > budgetAmount && (
          <p className="expense-text">
            You are over budget by {money(expenses - budgetAmount)}.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Add Transaction</h2>
        <form onSubmit={addTransaction} className="transaction-form">
          <label>
            Description
            <input
              type="text"
              placeholder="e.g. Groceries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
          </label>

          <label>
            Amount (₹)
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>

          <label>
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>

          <button className="primary-button" type="submit">
            Add Transaction
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Reports & Charts</h2>
          <label>
            Select month
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </label>
        </div>

        <div className="charts-grid">
          <article className="chart-card">
            <h3>Income vs Expenses</h3>
            <div className="chart-area">
              <Bar data={barData} options={chartOptions} />
            </div>
          </article>

          <article className="chart-card">
            <h3>Expenses by Category</h3>
            <div className="chart-area">
              {categoryNames.length ? (
                <Doughnut data={doughnutData} options={chartOptions} />
              ) : (
                <p>No expense data for this month.</p>
              )}
            </div>
          </article>
        </div>

        <div className="button-row">
          <button type="button" onClick={exportMonthlyReport}>
            Download Monthly PDF
          </button>
          <button type="button" onClick={exportCSV}>
            Export CSV
          </button>
          <button type="button" onClick={exportPDF}>
            Export All PDF
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Transactions</h2>
          <span>{visibleTransactions.length} shown</span>
        </div>

        <div className="filter-row">
          <input
            type="search"
            placeholder="Search description or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
          </select>
        </div>

        {visibleTransactions.length === 0 ? (
          <p className="empty-state">No transactions found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>{transaction.title}</td>
                    <td>{transaction.category}</td>
                    <td>
                      <span
                        className={
                          transaction.type === "income"
                            ? "income-text"
                            : "expense-text"
                        }
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td>{money(transaction.amount)}</td>
                    <td>
                      <button
                        className="delete-button"
                        onClick={() => deleteTransaction(transaction.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          className="danger-button"
          type="button"
          onClick={clearAllTransactions}
        >
          Clear All Transactions
        </button>
      </section>

      <footer className="app-footer">
        <p>
          Your transactions are saved in this browser using localStorage.
          No Firebase login or cloud database is used.
        </p>
        <p>Remember to export a backup of your data regularly.</p>
      </footer>
    </main>
  );
}
