import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, isValid } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

const ExpenseAnalytics = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [timeframe, setTimeframe] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState({
    totalExpenses: 0,
    averageExpense: 0,
    mostExpensiveCategory: '',
    mostFrequentCategory: ''
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  const categories = {
    food: { name: "Food", icon: "🍽️" },
    stationery: { name: "Stationery", icon: "🛒" },
    transport: { name: "Transport", icon: "🚗" },
    utilities: { name: "Utilities", icon: "💡" },
    entertainment: { name: "Entertainment", icon: "🎬" },
    other: { name: "Other", icon: "📝" },
  };

  useEffect(() => {
    fetchExpenses();
  }, [timeframe, user.uid]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDate = timeframe === 'month' ? startOfMonth(new Date()) : startOfYear(new Date());
      const endDate = timeframe === 'month' ? endOfMonth(new Date()) : endOfYear(new Date());

      const expensesRef = collection(db, `users/${user.uid}/expenses`);
      const q = query(
        expensesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const querySnapshot = await getDocs(q);
      const expenseData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() || new Date(data.date),
          amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0
        };
      }).filter(expense => expense.date && isValid(expense.date));

      setExpenses(expenseData);
      calculateSummary(expenseData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setError('Failed to load expense data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    const total = data.reduce((sum, exp) => sum + exp.amount, 0);
    const average = data.length > 0 ? total / data.length : 0;

    const categoryTotals = data.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const categoryFrequency = data.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + 1;
      return acc;
    }, {});

    const mostExpensiveCategory = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    const mostFrequentCategory = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    setSummaryData({
      totalExpenses: total,
      averageExpense: average,
      mostExpensiveCategory,
      mostFrequentCategory
    });
  };

  const getCategoryData = () => {
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    return Object.entries(categoryTotals).map(([category, value]) => ({
      name: categories[category]?.name || category,
      value,
      icon: categories[category]?.icon || "📝"
    }));
  };

  const getDailyData = () => {
    const dailyTotals = expenses.reduce((acc, exp) => {
      const date = format(exp.date, 'MMM dd');
      acc[date] = (acc[date] || 0) + exp.amount;
      return acc;
    }, {});

    return Object.entries(dailyTotals)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border">
          <p className="text-lg font-semibold flex items-center gap-2">
            {data.icon} {data.name}
          </p>
          <p className="text-gray-600">₹{data.value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="flex flex-col space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Expense Analytics</h1>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryData.totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {timeframe === 'month' ? 'This month' : 'This year'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryData.averageExpense.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {categories[summaryData.mostExpensiveCategory]?.icon || "📝"}
                <span className="capitalize">
                  {categories[summaryData.mostExpensiveCategory]?.name || summaryData.mostExpensiveCategory}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">By amount spent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {categories[summaryData.mostFrequentCategory]?.icon || "📝"}
                <span className="capitalize">
                  {categories[summaryData.mostFrequentCategory]?.name || summaryData.mostFrequentCategory}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">By frequency</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getCategoryData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getCategoryData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>Daily Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getDailyData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`₹${value.toFixed(2)}`, "Amount"]}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                  />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExpenseAnalytics;