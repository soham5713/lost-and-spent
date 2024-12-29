import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { format } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useNavigate } from "react-router-dom";
import { Receipt, PlusCircle, MoreVertical, Edit2, Trash2, Calendar, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// Separate BudgetProgress component for better organization
const BudgetProgress = ({ category, categoryInfo, spent, budget }) => {
  const progress = budget > 0 ? (spent / budget) * 100 : 0;
  const isWarning = progress >= 80;
  const isExceeded = progress > 100;

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{categoryInfo.icon}</span>
            <span className="font-medium">{categoryInfo.name}</span>
          </div>
          <div className="text-sm font-medium">
            ₹{spent.toFixed(2)} / ₹{budget.toFixed(2)}
          </div>
        </div>
        <Progress
          value={Math.min(progress, 100)}
          className={`h-2 ${
            isExceeded 
              ? 'bg-red-100 dark:bg-red-900' 
              : isWarning 
                ? 'bg-yellow-100 dark:bg-yellow-900' 
                : ''
          }`}
        />
        {(isWarning || isExceeded) && (
          <Alert variant={isExceeded ? "destructive" : "warning"} className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {isExceeded
                ? `Budget exceeded by ₹${(spent - budget).toFixed(2)}`
                : `${(100 - progress).toFixed(1)}% of budget remaining`}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};

const ExpenseList = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [budgets, setBudgets] = useState(null);
  const navigate = useNavigate();

  const categories = {
    groceries: { name: "Groceries", icon: "🛒" },
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

    const q = query(
      collection(db, `users/${user.uid}/expenses`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const expenseData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Ensure date is properly handled
            date: data.date instanceof Date ? data.date : data.date?.toDate?.() || new Date(data.date),
            // Ensure amount is a number
            amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0
          };
        });
        setExpenses(expenseData);
        setTotalAmount(expenseData.reduce((sum, exp) => sum + exp.amount, 0));
      } catch (error) {
        console.error('Error processing expenses:', error);
        toast.error("Error loading expenses");
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching expenses:', error);
      toast.error("Failed to load expenses");
      setLoading(false);
    });

    fetchBudgets();
    return () => unsubscribe();
  }, [user.uid]);

  const handleDelete = async (expenseId) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/expenses`, expenseId));
      toast.success("Expense deleted successfully");
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
          // Ensure date is properly formatted
          date: expense.date instanceof Date 
            ? expense.date
            : new Date(expense.date)
        } 
      } 
    });
  };

  const calculateCategorySpending = (category) => {
    return expenses
      .filter(expense => expense.category === category)
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex flex-col space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Your Expenses</h1>
            <p className="text-muted-foreground">Track and manage your spending</p>
          </div>
          <div className="flex space-x-4">
            {/* <Button variant="outline" onClick={() => navigate('/settings')}>
              Manage Budgets
            </Button> */}
            <Button asChild>
              <Link to="/add-expense">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Expense
              </Link>
            </Button>
          </div>
        </div>

        {/* Total Expenses Card */}
        <Card className="bg-primary/10">
          <CardContent className="p-8">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <p className="text-sm font-medium">Total Expenses</p>
                <p className="text-4xl font-bold">₹{totalAmount.toFixed(2)}</p>
              </div>
              <Receipt className="h-12 w-12 text-primary opacity-75" />
            </div>
          </CardContent>
        </Card>

        {/* Budget Progress Section */}
        {budgets && (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(categories).map(([id, category]) => {
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
        )}

        {/* Expenses List */}
        <ScrollArea className="h-[calc(100vh-24rem)] pr-4">
          <div className="space-y-4">
            {expenses.length > 0 ? (
              expenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">
                          {categories[expense.category]?.icon || "📝"}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{expense.name}</h3>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {format(expense.date, 'PPP')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-xl font-bold">
                          ₹{expense.amount.toFixed(2)}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(expense)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(expense.id)}
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
              ))
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No expenses yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Add your first expense to get started
                </p>
                <Button asChild>
                  <Link to="/add-expense">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Expense
                  </Link>
                </Button>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ExpenseList;