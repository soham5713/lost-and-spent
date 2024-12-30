import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useNavigate } from "react-router-dom";
import { Receipt, PlusCircle, MoreVertical, Edit2, Trash2, Calendar, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createNotification, checkBudgetAndNotify, notifyLargeExpense, createWeeklySpendingReminder } from '..//firebase/notificationsUtils';

const BudgetProgress = ({ category, categoryInfo, spent, budget }) => {
  const progress = budget > 0 ? (spent / budget) * 100 : 0;
  const isWarning = progress >= 80;
  const isExceeded = progress > 100;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">{categoryInfo.icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{categoryInfo.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {isExceeded ? 'Over budget' : `${Math.round(progress)}% used`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-muted-foreground">of ₹{budget.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            </div>
          </div>
          <Progress
            value={Math.min(progress, 100)}
            className={`h-3 ${
              isExceeded 
                ? 'bg-destructive/20' 
                : isWarning 
                  ? 'bg-yellow-200/20' 
                  : 'bg-primary/20'
            }`}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const ExpenseCard = ({ expense, categories, onEdit, onDelete }) => (
  <Card className="group hover:shadow-md transition-all duration-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">{categories[expense.category]?.icon || "📝"}</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{expense.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(expense.date, 'MMM d, yyyy')}</span>
              <Badge variant="secondary" className="ml-2">
                {categories[expense.category]?.name || "Other"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xl font-semibold">₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(expense)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(expense.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ExpenseList = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [budgets, setBudgets] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [lastWeeklyReminder, setLastWeeklyReminder] = useState(null);
  const navigate = useNavigate();

  const categories = {
    food: { name: "Food", icon: "🍽️" },
    groceries: { name: "Stationery", icon: "🛒" },
    transport: { name: "Transport", icon: "🚗" },
    utilities: { name: "Utilities", icon: "💡" },
    entertainment: { name: "Entertainment", icon: "🎬" },
    other: { name: "Other", icon: "📝" },
  };

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const budgetDoc = await getDoc(doc(db, `users/${user.uid}/settings`, 'budgets'));
        if (budgetDoc.exists()) {
          setBudgets(budgetDoc.data());
        }
      } catch (error) {
        console.error('Error fetching budgets:', error);
        toast.error("Failed to fetch budget information");
      }
    };

    // Create weekly spending reminder if needed
    const checkWeeklyReminder = async () => {
      const now = new Date();
      const lastReminder = lastWeeklyReminder || new Date(0);
      const daysSinceLastReminder = (now - lastReminder) / (1000 * 60 * 60 * 24);

      if (daysSinceLastReminder >= 7) {
        const weeklyTotal = expenses
          .filter(exp => {
            const expDate = new Date(exp.date);
            return (now - expDate) <= 7 * 24 * 60 * 60 * 1000;
          })
          .reduce((sum, exp) => sum + exp.amount, 0);

        await createWeeklySpendingReminder(user.uid, weeklyTotal);
        setLastWeeklyReminder(now);
      }
    };

    const q = query(
      collection(db, `users/${user.uid}/expenses`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const expenseData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(doc.data().date),
          amount: parseFloat(doc.data().amount) || 0
        }));

        // Process new expenses for notifications
        const changes = snapshot.docChanges();
        for (const change of changes) {
          if (change.type === "added") {
            const expense = {
              id: change.doc.id,
              ...change.doc.data(),
              amount: parseFloat(change.doc.data().amount) || 0
            };

            // Notify for large expenses
            await notifyLargeExpense(user.uid, expense);

            // Check budget notifications
            if (budgets) {
              const categorySpent = expenseData
                .filter(exp => exp.category === expense.category)
                .reduce((sum, exp) => sum + exp.amount, 0);
              
              const categoryBudget = budgets[expense.category];
              if (categoryBudget) {
                await checkBudgetAndNotify(user.uid, expense.category, categorySpent, categoryBudget);
              }
            }
          }
        }

        setExpenses(expenseData);
        setTotalAmount(expenseData.reduce((sum, exp) => sum + exp.amount, 0));
        await checkWeeklyReminder();
        setLoading(false);
      } catch (error) {
        console.error('Error processing expenses:', error);
        toast.error("Error loading expenses");
        setLoading(false);
      }
    });

    fetchBudgets();
    return () => unsubscribe();
  }, [user.uid, lastWeeklyReminder]);

  const handleDelete = async (expenseId) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/expenses`, expenseId));
      toast.success("Expense deleted successfully");
      
      // Notify about significant deletion
      const deletedExpense = expenses.find(exp => exp.id === expenseId);
      if (deletedExpense && deletedExpense.amount >= 5000) {
        await createNotification(user.uid, {
          type: 'expense_reminder',
          title: 'Large Expense Deleted',
          message: `A large expense of ₹${deletedExpense.amount.toLocaleString('en-IN')} was deleted from ${deletedExpense.category}.`
        });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error("Failed to delete expense");
    }
  };

  const handleEdit = (expense) => {
    navigate('/add-expense', { 
      state: { 
        expense: {
          ...expense,
          date: expense.date instanceof Date ? expense.date : new Date(expense.date)
        } 
      } 
    });
  };

  const calculateCategorySpending = (category) => {
    return expenses
      .filter(expense => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl py-16 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  const filteredExpenses = activeTab === 'all' 
    ? expenses 
    : expenses.filter(expense => expense.category === activeTab);

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Your Expenses</h1>
          <p className="text-lg text-muted-foreground">Track and manage your spending</p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => navigate('/settings')}>
            Manage Budgets
          </Button>
          <Button asChild>
            <Link to="/add-expense">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-xl text-primary-foreground/60">Total Expenses</p>
                <p className="text-4xl font-bold">₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <Wallet className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {budgets && Object.entries(categories).map(([id, category]) => {
          const spent = calculateCategorySpending(id);
          const budget = budgets[id] || 0;
          if (budget > 0) {
            return (
              <BudgetProgress
                key={id}
                category={id}
                categoryInfo={category}
                spent={spent}
                budget={budget}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Expenses List */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-2xl">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 w-full justify-start space-x-2 overflow-x-auto">
              <TabsTrigger value="all" className="px-4">All</TabsTrigger>
              {Object.entries(categories).map(([id, category]) => (
                <TabsTrigger key={id} value={id} className="px-4">
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      categories={categories}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  <Card className="flex flex-col items-center justify-center p-16 text-center">
                    <Receipt className="h-16 w-16 text-muted-foreground mb-6" />
                    <h3 className="text-xl font-semibold mb-2">No expenses found</h3>
                    <p className="text-muted-foreground mb-8">
                      {activeTab === 'all'
                        ? "Add your first expense to get started"
                        : `No expenses in ${categories[activeTab].name} category`}
                    </p>
                    <Button asChild size="lg">
                      <Link to="/add-expense">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Add Expense
                      </Link>
                    </Button>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseList;