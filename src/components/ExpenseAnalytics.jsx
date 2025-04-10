"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  isValid,
  eachDayOfInterval,
  subDays,
  isSameMonth,
  parseISO,
} from "date-fns"
import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Calendar,
  PieChartIcon,
  LineChartIcon,
  Download,
  Search,
  Info,
  DollarSign,
  Target,
  CreditCard,
  Tag,
  ArrowRightLeft,
  Wallet,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useNavigate } from "react-router-dom"

// First, add these imports at the top of the file, after the existing imports
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import { format as formatDate } from "date-fns"

const ExpenseAnalytics = ({ user }) => {
  const [expenses, setExpenses] = useState([])
  const [timeframe, setTimeframe] = useState("month")
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [selectedTab, setSelectedTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [budgets, setBudgets] = useState(null)
  const [previousPeriodExpenses, setPreviousPeriodExpenses] = useState([])
  const [visibleCategories, setVisibleCategories] = useState(null)

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#4BC0C0"]

  const categories = {
    food: { name: "Food", icon: "🍽️", color: COLORS[0] },
    stationery: { name: "Stationery", icon: "🛒", color: COLORS[1] },
    transport: { name: "Transport", icon: "🚗", color: COLORS[2] },
    utilities: { name: "Utilities", icon: "💡", color: COLORS[3] },
    entertainment: { name: "Entertainment", icon: "🎬", color: COLORS[4] },
    other: { name: "Other", icon: "📝", color: COLORS[5] },
  }

  // Effect for date range when timeframe changes
  useEffect(() => {
    const now = new Date()
    let start, end

    if (timeframe === "month") {
      start = startOfMonth(now)
      end = endOfMonth(now)
    } else if (timeframe === "year") {
      start = startOfYear(now)
      end = endOfYear(now)
    } else if (timeframe === "quarter") {
      // Start 3 months ago
      start = startOfMonth(subMonths(now, 2))
      end = endOfMonth(now)
    } else if (timeframe === "week") {
      // Last 7 days
      start = subDays(now, 6)
      end = now
    }

    setDateRange({ from: start, to: end })
  }, [timeframe])

  // Fetch current period expenses
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return
    fetchExpenses(dateRange.from, dateRange.to, setExpenses)
  }, [dateRange, user?.uid])

  // Fetch previous period expenses for comparison
  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return

    // Calculate previous period
    const periodDuration = dateRange.to.getTime() - dateRange.from.getTime()
    const previousStart = new Date(dateRange.from.getTime() - periodDuration)
    const previousEnd = new Date(dateRange.to.getTime() - periodDuration)

    fetchExpenses(previousStart, previousEnd, setPreviousPeriodExpenses)
  }, [dateRange, user?.uid])

  // Fetch budget data
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const budgetDoc = await getDoc(doc(db, `users/${user.uid}/settings`, "budgets"))
        if (budgetDoc.exists()) {
          setBudgets(budgetDoc.data())
        }
      } catch (error) {
        console.error("Error fetching budgets:", error)
      }
    }

    if (user?.uid) {
      fetchBudgets()
    }
  }, [user?.uid])

  const fetchExpenses = async (startDate, endDate, setStateFunc) => {
    setLoading(true)
    setError(null)

    try {
      const expensesRef = collection(db, `users/${user.uid}/expenses`)
      const q = query(expensesRef, where("date", ">=", startDate), where("date", "<=", endDate))

      const querySnapshot = await getDocs(q)
      const expenseData = querySnapshot.docs
        .map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate?.() || new Date(data.date),
            amount: typeof data.amount === "number" ? data.amount : Number.parseFloat(data.amount) || 0,
          }
        })
        .filter((expense) => expense.date && isValid(expense.date))

      setStateFunc(expenseData)
    } catch (error) {
      console.error("Error fetching expenses:", error)
      setError("Failed to load expense data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Memoized calculations
  const summaryData = useMemo(() => {
    if (!expenses.length)
      return {
        totalExpenses: 0,
        averageExpense: 0,
        mostExpensiveCategory: "",
        mostFrequentCategory: "",
        dailyAverage: 0,
        dayWithHighestSpending: null,
        percentageChange: 0,
      }

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const previousTotal = previousPeriodExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const percentageChange = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0

    const average = expenses.length > 0 ? total / expenses.length : 0

    // Calculate daily average
    const days = Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)) + 1
    const dailyAverage = total / days

    // Find day with highest spending
    const dailyTotals = {}
    expenses.forEach((exp) => {
      const dateKey = format(exp.date, "yyyy-MM-dd")
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + exp.amount
    })

    let highestDay = null
    let highestAmount = 0

    Object.entries(dailyTotals).forEach(([date, amount]) => {
      if (amount > highestAmount) {
        highestAmount = amount
        highestDay = { date: parseISO(date), amount }
      }
    })

    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    }, {})

    const categoryFrequency = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + 1
      return acc
    }, {})

    const sortedByAmount = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)
    const mostExpensiveCategory = sortedByAmount.length > 0 ? sortedByAmount[0][0] : ""

    const sortedByFrequency = Object.entries(categoryFrequency).sort(([, a], [, b]) => b - a)
    const mostFrequentCategory = sortedByFrequency.length > 0 ? sortedByFrequency[0][0] : ""

    return {
      totalExpenses: total,
      previousTotal,
      percentageChange,
      averageExpense: average,
      dailyAverage,
      dayWithHighestSpending: highestDay,
      mostExpensiveCategory,
      mostFrequentCategory,
      categoryTotals,
    }
  }, [expenses, previousPeriodExpenses, dateRange])

  // Category data for charts
  const categoryData = useMemo(() => {
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    }, {})

    return Object.entries(categoryTotals)
      .map(([category, value]) => ({
        name: categories[category]?.name || category,
        value,
        categoryId: category,
        icon: categories[category]?.icon || "📝",
        color: categories[category]?.color || "#888888",
      }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  // Daily data for charts
  const dailyData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return []

    // Create an array of all days in the range
    const daysArray = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    })

    // Initialize with zero amounts
    const dailyMap = daysArray.reduce((acc, date) => {
      acc[format(date, "yyyy-MM-dd")] = {
        date: format(date, timeframe === "year" ? "MMM" : "MMM dd"),
        rawDate: new Date(date),
        amount: 0,
        expenses: [],
      }
      return acc
    }, {})

    // Fill in expense data
    expenses.forEach((expense) => {
      const dateKey = format(expense.date, "yyyy-MM-dd")
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].amount += expense.amount
        dailyMap[dateKey].expenses.push(expense)
      }
    })

    // Convert to array and sort by date
    return Object.values(dailyMap).sort((a, b) => a.rawDate - b.rawDate)
  }, [expenses, dateRange, timeframe])

  // Filtered category data (respecting visible categories)
  const filteredCategoryData = useMemo(() => {
    if (!visibleCategories) return categoryData
    return categoryData.filter((cat) => visibleCategories.includes(cat.categoryId))
  }, [categoryData, visibleCategories])

  // Budget vs. Actual data
  const budgetComparisonData = useMemo(() => {
    if (!budgets) return []

    return Object.entries(categories)
      .map(([id, category]) => {
        const spent = expenses.filter((exp) => exp.category === id).reduce((sum, exp) => sum + exp.amount, 0)

        const budget = budgets[id] || 0
        const percentage = budget > 0 ? (spent / budget) * 100 : 0

        return {
          category: category.name,
          categoryId: id,
          icon: category.icon,
          budget,
          spent,
          remaining: Math.max(0, budget - spent),
          percentage,
          color: category.color,
          status: percentage > 100 ? "exceeded" : percentage > 80 ? "warning" : "good",
        }
      })
      .filter((item) => item.budget > 0) // Only show categories with budgets
  }, [expenses, budgets])

  // Category comparison with previous period
  const categoryComparison = useMemo(() => {
    const currentTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    }, {})

    const previousTotals = previousPeriodExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    }, {})

    return Object.entries(categories)
      .map(([id, category]) => {
        const current = currentTotals[id] || 0
        const previous = previousTotals[id] || 0
        const change = previous > 0 ? ((current - previous) / previous) * 100 : 0

        return {
          category: category.name,
          categoryId: id,
          icon: category.icon,
          color: category.color,
          current,
          previous,
          change,
          trend: current > previous ? "up" : current < previous ? "down" : "same",
        }
      })
      .filter((item) => item.current > 0 || item.previous > 0) // Only show categories with data
  }, [expenses, previousPeriodExpenses])

  // Monthly trend data for charts
  const monthlyTrendData = useMemo(() => {
    // Get 6 months of data including current month
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i)
      months.push({
        month: format(month, "MMM yyyy"),
        rawMonth: month,
        amount: 0,
      })
    }

    // First, add data from current period expenses
    expenses.forEach((expense) => {
      const expMonth = expense.date
      months.forEach((monthData) => {
        if (isSameMonth(expMonth, monthData.rawMonth)) {
          monthData.amount += expense.amount
        }
      })
    })

    // Then, add data from previous period expenses
    previousPeriodExpenses.forEach((expense) => {
      const expMonth = expense.date
      months.forEach((monthData) => {
        // Check if this expense belongs to a month we're tracking
        if (isSameMonth(expMonth, monthData.rawMonth)) {
          // We already added current period expenses, no need to add previous ones again
          // This is just ensuring we have the right months
        }
      })
    })

    return months
  }, [expenses, previousPeriodExpenses])

  // Toggle category visibility in charts
  const toggleCategoryVisibility = (categoryId) => {
    if (!visibleCategories) {
      // Initialize with all categories except this one
      setVisibleCategories(Object.keys(categories).filter((id) => id !== categoryId))
    } else if (visibleCategories.includes(categoryId)) {
      // Remove this category
      setVisibleCategories(visibleCategories.filter((id) => id !== categoryId))
    } else {
      // Add this category
      setVisibleCategories([...visibleCategories, categoryId])
    }
  }

  // Reset category visibility filter
  const resetCategoryFilter = () => {
    setVisibleCategories(null)
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-4 rounded-lg shadow-lg border">
          <p className="text-lg font-semibold flex items-center gap-2">
            {data.icon} {data.name}
          </p>
          <p className="text-gray-600">₹{data.value.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            {((data.value / summaryData.totalExpenses) * 100).toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }

  // Daily tooltip
  const DailyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-4 rounded-lg shadow-lg border">
          <p className="text-sm font-semibold">{data.date}</p>
          <p className="text-lg font-bold">₹{data.amount.toFixed(2)}</p>
          {data.expenses && data.expenses.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">Top expenses:</p>
              {data.expenses
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 3)
                .map((exp, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="truncate max-w-[150px]">{exp.name}</span>
                    <span>₹{exp.amount.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Replace the existing exportToCSV function with this PDF export function
  const ExpensePdfDocument = ({ expenses, dateRange, summaryData, categoryData }) => {
    // Create styles for PDF
    const styles = StyleSheet.create({
      page: {
        padding: 40,
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica",
      },
      header: {
        fontSize: 24,
        marginBottom: 10,
        textAlign: "center",
        color: "#333",
        fontWeight: "bold",
      },
      subheader: {
        fontSize: 16,
        marginBottom: 10,
        color: "#444",
        fontWeight: "bold",
      },
      dateRange: {
        fontSize: 12,
        marginBottom: 20,
        textAlign: "center",
        color: "#666",
        fontStyle: "italic",
      },
      summaryContainer: {
        marginBottom: 25,
        padding: 15,
        backgroundColor: "#f7f7f7",
        borderRadius: 8,
        borderLeft: "4px solid #2c3e50",
      },
      summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
      },
      summaryLabel: {
        fontSize: 12,
        color: "#555",
        fontWeight: "medium",
      },
      summaryValue: {
        fontSize: 12,
        fontWeight: "bold",
        paddingLeft: 4,
        fontFamily: "Courier",
        color: "#2c3e50",
      },
      sectionTitle: {
        fontSize: 14,
        marginTop: 20,
        marginBottom: 10,
        color: "#2c3e50",
        fontWeight: "bold",
        borderBottom: "1px solid #eee",
        paddingBottom: 5,
      },
      table: {
        display: "table",
        width: "100%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 4,
        overflow: "hidden",
      },
      tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        borderBottomStyle: "solid",
        minHeight: 28,
        alignItems: "center",
      },
      tableHeader: {
        backgroundColor: "#2c3e50",
      },
      headerCell: {
        fontSize: 11,
        padding: 8,
        textAlign: "left",
        fontFamily: "Helvetica-Bold",
        color: "white",
      },
      tableCell: {
        fontSize: 10,
        padding: 8,
        textAlign: "left",
        fontFamily: "Helvetica",
        color: "#444",
      },
      alternateRow: {
        backgroundColor: "#f9f9f9",
      },
      dateCell: {
        width: "20%",
      },
      nameCell: {
        width: "35%",
      },
      categoryCell: {
        width: "25%",
      },
      amountCell: {
        width: "20%",
        textAlign: "right",
        fontFamily: "Courier",
        paddingRight: 10,
      },
      footer: {
        position: "absolute",
        bottom: 30,
        left: 30,
        right: 30,
        fontSize: 10,
        textAlign: "center",
        color: "#999",
        borderTop: "1px solid #eee",
        paddingTop: 10,
      },
      categorySection: {
        marginBottom: 25,
      },
      categoryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
        padding: 8,
        backgroundColor: "#f9f9f9",
        borderRadius: 5,
        borderLeft: "3px solid #ddd",
      },
      categoryName: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#444",
      },
      categoryAmount: {
        fontSize: 11,
        fontFamily: "Courier",
        paddingLeft: 4,
        fontWeight: "bold",
        color: "#2c3e50",
      },
      pageNumber: {
        position: "absolute",
        bottom: 30,
        right: 30,
        fontSize: 10,
        color: "#999",
      },
      divider: {
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        borderBottomStyle: "solid",
        marginVertical: 15,
      },
      tableContainer: {
        marginBottom: 25,
      },
      continueText: {
        fontSize: 9,
        fontStyle: "italic",
        color: "#999",
        marginTop: 5,
        marginBottom: 10,
        textAlign: "right",
      },
      reportInfo: {
        marginTop: 30,
        marginBottom: 20,
        padding: 15,
        backgroundColor: "#f0f7ff",
        borderRadius: 8,
        borderLeft: "4px solid #3498db",
      },
      infoRow: {
        flexDirection: "row",
        marginBottom: 5,
      },
      infoLabel: {
        fontSize: 10,
        color: "#555",
        width: "40%",
      },
      infoValue: {
        fontSize: 10,
        color: "#333",
        fontWeight: "medium",
      },
    })

    // Register fonts
    Font.register({
      family: "Courier",
      src: "https://fonts.cdnfonts.com/s/14005/CourierPrime-Regular.woff",
      fontWeight: "normal",
    })

    Font.register({
      family: "Helvetica-Bold",
      src: "https://fonts.cdnfonts.com/s/29334/Helvetica-Bold.woff",
      fontWeight: "bold",
    })

    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => b.date - a.date)

    // Set items per page to 19 as requested
    const ITEMS_PER_PAGE = 19

    // Calculate how many pages are needed for expenses
    const totalExpenses = sortedExpenses.length
    const totalPagesForExpenses = Math.ceil(totalExpenses / ITEMS_PER_PAGE)

    // Helper function to get color based on category
    const getCategoryColor = (categoryName) => {
      const colorMap = {
        Food: "#e74c3c",
        Transportation: "#3498db",
        Housing: "#2ecc71",
        Entertainment: "#9b59b6",
        Shopping: "#f39c12",
        Health: "#1abc9c",
        Education: "#34495e",
        Utilities: "#7f8c8d",
      }

      return colorMap[categoryName] || "#95a5a6" // Default color if category not found
    }

    // Create table header component for reuse across pages
    const TableHeader = () => (
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
        <Text style={[styles.headerCell, styles.nameCell]}>Description</Text>
        <Text style={[styles.headerCell, styles.categoryCell]}>Category</Text>
        <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
      </View>
    )

    // Create expense row component
    const ExpenseRow = ({ expense, index }) => (
      <View style={[styles.tableRow, index % 2 !== 0 ? styles.alternateRow : {}]}>
        <Text style={[styles.tableCell, styles.dateCell]}>{formatDate(expense.date, "MMM d, yyyy")}</Text>
        <Text style={[styles.tableCell, styles.nameCell]}>{expense.name}</Text>
        <Text style={[styles.tableCell, styles.categoryCell]}>
          {categories[expense.category]?.name || expense.category}
        </Text>
        <Text style={[styles.tableCell, styles.amountCell]}>Rs. {expense.amount.toFixed(2)}</Text>
      </View>
    )

    return (
      <Document>
        {/* First page with summary and category breakdown only */}
        <Page size="A4" style={styles.page}>
          <Text style={styles.header}>Expense Report</Text>
          <Text style={styles.dateRange}>
            {formatDate(dateRange.from, "MMMM d, yyyy")} - {formatDate(dateRange.to, "MMMM d, yyyy")}
          </Text>

          {/* Report Info Section */}
          <View style={styles.reportInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Report Generated:</Text>
              <Text style={styles.infoValue}>{formatDate(new Date(), "MMMM d, yyyy, h:mm a")}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Transactions:</Text>
              <Text style={styles.infoValue}>{expenses.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Report Period:</Text>
              <Text style={styles.infoValue}>
                {formatDate(dateRange.from, "MMMM d, yyyy")} - {formatDate(dateRange.to, "MMMM d, yyyy")}
              </Text>
            </View>
          </View>

          {/* Summary Section */}
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Expenses:</Text>
              <Text style={styles.summaryValue}>Rs. {summaryData.totalExpenses.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Daily Average:</Text>
              <Text style={styles.summaryValue}>Rs. {summaryData.dailyAverage.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average Transaction:</Text>
              <Text style={styles.summaryValue}>Rs. {summaryData.averageExpense.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Highest Expense:</Text>
              <Text style={styles.summaryValue}>Rs. {Math.max(...expenses.map((e) => e.amount)).toFixed(2)}</Text>
            </View>
            {summaryData.mostExpensiveCategory && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Top Category:</Text>
                <Text style={styles.summaryValue}>
                  {categories[summaryData.mostExpensiveCategory]?.name || summaryData.mostExpensiveCategory}
                </Text>
              </View>
            )}
          </View>

          {/* Category Breakdown */}
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.categorySection}>
            {categoryData.map((category, index) => (
              <View key={index} style={[styles.categoryRow, { borderLeftColor: getCategoryColor(category.name) }]}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryAmount}>Rs. {category.value.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>Generated on {formatDate(new Date(), "MMMM d, yyyy")} • Lost & Spent</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        </Page>

        {/* Create pages for expense details (20 items per page) */}
        {Array.from({ length: totalPagesForExpenses }).map((_, pageIndex) => {
          const startIndex = pageIndex * ITEMS_PER_PAGE
          const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sortedExpenses.length)
          const pageExpenses = sortedExpenses.slice(startIndex, endIndex)

          return (
            <Page key={pageIndex} size="A4" style={styles.page}>
              <Text style={[styles.header, { fontSize: 20 }]}>Expense Report</Text>
              <Text style={styles.dateRange}>
                {formatDate(dateRange.from, "MMMM d, yyyy")} - {formatDate(dateRange.to, "MMMM d, yyyy")}
              </Text>

              <Text style={styles.sectionTitle}>Expense Details</Text>
              <View style={styles.tableContainer}>
                <View style={styles.table}>
                  <TableHeader />
                  {pageExpenses.map((expense, index) => (
                    <ExpenseRow key={startIndex + index} expense={expense} index={startIndex + index} />
                  ))}
                </View>

                {pageIndex < totalPagesForExpenses - 1 && (
                  <Text style={styles.continueText}>Continued on next page...</Text>
                )}
              </View>

              <Text style={styles.footer}>Generated on {formatDate(new Date(), "MMMM d, yyyy")} • Lost & Spent</Text>
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                fixed
              />
            </Page>
          )
        })}
      </Document>
    )
  }

  // Replace the exportToCSV function with this new function
  const exportToPdf = () => {
    if (!expenses.length) return

    // The actual download will be handled by PDFDownloadLink component
    // This function is just a placeholder now
    console.log("Preparing PDF export...")
  }

  const navigate = useNavigate()

  if (loading && !expenses.length) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <div className="flex flex-col space-y-8">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Expense Analytics</h1>

          <div className="flex flex-wrap gap-3 items-center">
            <DateRangePicker value={dateRange} onValueChange={setDateRange} />

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="quarter">Last 3 months</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>

            <PDFDownloadLink
              document={
                <ExpensePdfDocument
                  expenses={expenses}
                  dateRange={dateRange}
                  summaryData={summaryData}
                  categoryData={categoryData}
                />
              }
              fileName={`expense-report-${formatDate(dateRange.from, "yyyy-MM-dd")}-to-${formatDate(dateRange.to, "yyyy-MM-dd")}.pdf`}
            >
              {({ blob, url, loading, error }) => (
                <Button variant="outline" disabled={loading} title="Export to PDF">
                  {loading ? (
                    <Skeleton className="h-4 w-4" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </>
                  )}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6 w-full justify-start space-x-2 overflow-x-auto">
            <TabsTrigger value="overview">
              <Search className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="categories">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="trends">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="budgets">
              <Target className="h-4 w-4 mr-2" />
              Budgets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{summaryData.totalExpenses.toFixed(2)}</div>
                  <div className="flex items-center pt-1">
                    {summaryData.percentageChange !== 0 && (
                      <>
                        <Badge className={summaryData.percentageChange > 0 ? "bg-red-500" : "bg-green-500"}>
                          {summaryData.percentageChange > 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {Math.abs(summaryData.percentageChange).toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">vs. previous period</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{summaryData.dailyAverage.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Highest:{" "}
                    {summaryData.dayWithHighestSpending ? (
                      <>
                        ₹{summaryData.dayWithHighestSpending.amount.toFixed(2)} on{" "}
                        {format(summaryData.dayWithHighestSpending.date, "MMM d")}
                      </>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {summaryData.mostExpensiveCategory ? (
                    <>
                      <div className="text-2xl font-bold flex items-center gap-2">
                        {categories[summaryData.mostExpensiveCategory]?.icon || "📝"}
                        <span>
                          {categories[summaryData.mostExpensiveCategory]?.name || summaryData.mostExpensiveCategory}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ₹{(summaryData.categoryTotals?.[summaryData.mostExpensiveCategory] || 0).toFixed(2)}
                        {summaryData.totalExpenses > 0 && (
                          <>
                            {" "}
                            (
                            {(
                              ((summaryData.categoryTotals?.[summaryData.mostExpensiveCategory] || 0) /
                                summaryData.totalExpenses) *
                              100
                            ).toFixed(1)}
                            %)
                          </>
                        )}
                      </p>
                    </>
                  ) : (
                    <div className="text-xl text-muted-foreground">No data</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{summaryData.averageExpense.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">From {expenses.length} transactions</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <Card className="min-h-[400px]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Spending by Category</span>
                    {visibleCategories && (
                      <Button variant="ghost" size="sm" onClick={resetCategoryFilter}>
                        Reset Filter
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>Click on a category to filter the chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                          onClick={(data) => toggleCategoryVisibility(data.categoryId)}
                        >
                          {filteredCategoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              opacity={visibleCategories && !visibleCategories.includes(entry.categoryId) ? 0.3 : 1}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                    {categoryData.map((category, index) => (
                      <div
                        key={index}
                        className={`flex items-center p-2 rounded cursor-pointer transition-all ${
                          visibleCategories && !visibleCategories.includes(category.categoryId)
                            ? "opacity-40"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => toggleCategoryVisibility(category.categoryId)}
                      >
                        <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                        <div className="flex-1 flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="mr-1">{category.icon}</span>
                            <span className="text-sm">{category.name}</span>
                          </div>
                          <span className="text-sm font-medium">₹{category.value.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="min-h-[400px]">
                <CardHeader>
                  <CardTitle>Spending Over Time</CardTitle>
                  <CardDescription>
                    {timeframe === "month" ? "Daily" : timeframe === "year" ? "Monthly" : "Daily"} spending pattern
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip content={<DailyTooltip />} />
                        <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Analysis</CardTitle>
                  <CardDescription>How your spending is distributed across categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Bar Chart */}
                    <div className="col-span-2 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={categoryData}
                          layout="vertical"
                          margin={{
                            top: 10,
                            right: 30,
                            left: 100,
                            bottom: 10,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={({ y, payload }) => {
                              const category = categoryData.find((c) => c.name === payload.value)
                              return (
                                <g transform={`translate(0,${y})`}>
                                  <text x={-25} y={0} dy={4} textAnchor="end" fill="#666">
                                    {category?.icon}
                                  </text>
                                  <text x={-5} y={0} dy={4} textAnchor="end" fill="#666">
                                    {payload.value}
                                  </text>
                                </g>
                              )
                            }}
                          />
                          <Tooltip
                            formatter={(value) => [`₹${value.toFixed(2)}`, "Amount"]}
                            contentStyle={{ backgroundColor: "white", border: "1px solid #ccc" }}
                          />
                          <Bar dataKey="value" name="Amount">
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Category Comparison */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Comparison with Previous Period</h3>
                      {categoryComparison.map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <span className="mr-1">{item.icon}</span>
                              <span>{item.category}</span>
                            </div>
                            <Badge
                              variant={
                                item.trend === "up" ? "destructive" : item.trend === "down" ? "success" : "secondary"
                              }
                              className="ml-2"
                            >
                              {item.trend === "up" ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : item.trend === "down" ? (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              ) : (
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                              )}
                              {Math.abs(item.change).toFixed(0)}%
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">₹{item.current.toFixed(2)}</span>
                            <span className="text-muted-foreground">vs ₹{item.previous.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {categoryData.map((category, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="bg-muted/50 pb-2">
                          <CardTitle className="text-lg flex items-center">
                            <span className="mr-2">{category.icon}</span>
                            {category.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-muted-foreground">Total Spent</span>
                            <span className="font-medium">₹{category.value.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-muted-foreground">% of Expenses</span>
                            <span className="font-medium">
                              {summaryData.totalExpenses > 0
                                ? ((category.value / summaryData.totalExpenses) * 100).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Transactions</span>
                            <span className="font-medium">
                              {expenses.filter((e) => e.category === category.categoryId).length}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Spending Trends</CardTitle>
                  <CardDescription>How your expenses have evolved over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`₹${value.toFixed(2)}`, "Amount"]}
                          contentStyle={{ backgroundColor: "white", border: "1px solid #ccc" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spending Pattern Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Key Observations</h3>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">Total for period</p>
                            <p className="text-muted-foreground text-sm">
                              You spent ₹{summaryData.totalExpenses.toFixed(2)} in this period
                              {summaryData.percentageChange !== 0 && (
                                <>
                                  , which is {Math.abs(summaryData.percentageChange).toFixed(1)}%
                                  {summaryData.percentageChange > 0 ? "higher" : "lower"} than the previous period
                                </>
                              )}
                              .
                            </p>
                          </div>
                        </li>
                        {summaryData.dayWithHighestSpending && (
                          <li className="flex items-start gap-2">
                            <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Highest spending day</p>
                              <p className="text-muted-foreground text-sm">
                                {format(summaryData.dayWithHighestSpending.date, "MMMM d, yyyy")} with ₹
                                {summaryData.dayWithHighestSpending.amount.toFixed(2)}
                              </p>
                            </div>
                          </li>
                        )}
                        {summaryData.mostExpensiveCategory && (
                          <li className="flex items-start gap-2">
                            <Tag className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Top spending category</p>
                              <p className="text-muted-foreground text-sm">
                                {categories[summaryData.mostExpensiveCategory]?.name ||
                                  summaryData.mostExpensiveCategory}{" "}
                                accounts for
                                {summaryData.totalExpenses > 0 && (
                                  <>
                                    {" "}
                                    {(
                                      ((summaryData.categoryTotals?.[summaryData.mostExpensiveCategory] || 0) /
                                        summaryData.totalExpenses) *
                                      100
                                    ).toFixed(1)}
                                    % of your total spending
                                  </>
                                )}
                              </p>
                            </div>
                          </li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-3">Week by Week</h3>
                      <div className="space-y-3">
                        {/* This would be a more detailed week-by-week analysis that we could expand in a real implementation */}
                        <p className="text-muted-foreground">
                          Your weekly average spending during this period was approximately ₹
                          {(
                            summaryData.totalExpenses /
                            Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24 * 7))
                          ).toFixed(2)}
                          .
                        </p>

                        {/* We could add more week-by-week analytics here */}
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Detailed week-by-week spending analysis would be displayed here, showing patterns and trends
                            in your spending habits.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="budgets">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Overview</CardTitle>
                  <CardDescription>Track your spending against your budget goals</CardDescription>
                </CardHeader>
                <CardContent>
                  {budgetComparisonData.length > 0 ? (
                    <div className="space-y-6">
                      {budgetComparisonData.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg">{item.icon}</span>
                              </div>
                              <span className="font-medium">{item.category}</span>
                            </div>
                            <Badge
                              variant={
                                item.status === "exceeded"
                                  ? "destructive"
                                  : item.status === "warning"
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {item.status === "exceeded" ? "Exceeded" : item.status === "warning" ? "Warning" : "Good"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Budget</p>
                              <p className="font-medium">₹{item.budget.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Spent</p>
                              <p className="font-medium">₹{item.spent.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Remaining</p>
                              <p className={`font-medium ${item.status === "exceeded" ? "text-destructive" : ""}`}>
                                {item.status === "exceeded" ? "-" : ""}₹
                                {item.status === "exceeded"
                                  ? Math.abs(item.remaining).toFixed(2)
                                  : item.remaining.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <Progress
                            value={Math.min(item.percentage, 100)}
                            className={`h-2 ${
                              item.status === "exceeded"
                                ? "bg-destructive/30"
                                : item.status === "warning"
                                  ? "bg-yellow-500/30"
                                  : "bg-emerald-500/30"
                            }`}
                          />

                          <p className="text-xs text-right text-muted-foreground">{item.percentage.toFixed(1)}% used</p>
                        </div>
                      ))}

                      <div className="pt-4">
                        <Button variant="outline" onClick={() => navigate("/settings")}>
                          <Target className="mr-2 h-4 w-4" />
                          Manage Budgets
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No budgets set</h3>
                      <p className="text-muted-foreground mb-6">
                        You haven't set any category budgets yet. Set budgets to track your spending goals.
                      </p>
                      <Button onClick={() => navigate("/settings")}>
                        <Target className="mr-2 h-4 w-4" />
                        Set Up Budgets
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default ExpenseAnalytics
