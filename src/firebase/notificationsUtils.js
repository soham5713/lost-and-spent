import { addDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { startOfWeek, endOfWeek, subDays, isAfter } from 'date-fns';

// Constants for notification settings
const NOTIFICATION_SETTINGS = {
  LARGE_EXPENSE_THRESHOLD: 5000,
  BUDGET_WARNING_THRESHOLD: 90,
  WEEKLY_REMINDER_DAY: 0, // Sunday
  RECURRING_BILLS_REMINDER_DAYS: 3,
  MAX_NOTIFICATIONS_PER_TYPE: 3,
  CURRENCY_OPTIONS: {
    style: 'currency',
    currency: 'INR'
  }
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return amount.toLocaleString('en-IN', NOTIFICATION_SETTINGS.CURRENCY_OPTIONS);
};

// Helper function to check for duplicate notifications
const hasDuplicateNotification = async (userId, type, timeframe = 24) => {
  try {
    const notificationsRef = collection(db, `users/${userId}/notifications`);
    const timeframeDate = subDays(new Date(), timeframe);
    
    const q = query(
      notificationsRef,
      where('type', '==', type),
      where('createdAt', '>=', timeframeDate),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking for duplicate notifications:', error);
    return false;
  }
};

export const createNotification = async (userId, notification) => {
  try {
    // Basic validation
    if (!userId || !notification.type || !notification.title || !notification.message) {
      throw new Error('Invalid notification data');
    }

    const notificationData = {
      ...notification,
      createdAt: new Date(),
      read: false,
      priority: notification.priority || 'normal',
      metadata: {
        ...notification.metadata,
        deviceInfo: {
          userAgent: window.navigator.userAgent,
          platform: window.navigator.platform
        }
      }
    };
    
    await addDoc(collection(db, `users/${userId}/notifications`), notificationData);
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const checkBudgetAndNotify = async (userId, category, spent, budget, options = {}) => {
  try {
    const percentage = (spent / budget) * 100;
    const warningThreshold = options.warningThreshold || NOTIFICATION_SETTINGS.BUDGET_WARNING_THRESHOLD;
    
    // Check for warning threshold
    if (percentage >= warningThreshold && percentage < 100) {
      const remainingBudget = budget - spent;
      await createNotification(userId, {
        type: 'budget_warning',
        title: 'Budget Alert',
        message: `You've used ${percentage.toFixed(1)}% of your ${category} budget. You have ${formatCurrency(remainingBudget)} remaining.`,
        priority: 'high',
        metadata: {
          category,
          spent,
          budget,
          percentage,
          remainingBudget
        }
      });
    } 
    // Check for budget exceeded
    else if (percentage >= 100) {
      const overBudgetAmount = spent - budget;
      const hasRecentNotification = await hasDuplicateNotification(userId, 'budget_exceeded');
      
      if (!hasRecentNotification) {
        await createNotification(userId, {
          type: 'budget_exceeded',
          title: 'Budget Exceeded',
          message: `You've exceeded your ${category} budget by ${formatCurrency(overBudgetAmount)}. Consider adjusting your budget or reducing expenses.`,
          priority: 'urgent',
          metadata: {
            category,
            spent,
            budget,
            percentage,
            overBudgetAmount
          }
        });
      }
    }
  } catch (error) {
    console.error('Error in checkBudgetAndNotify:', error);
    throw error;
  }
};

export const notifyLargeExpense = async (userId, expense, options = {}) => {
  try {
    const threshold = options.threshold || NOTIFICATION_SETTINGS.LARGE_EXPENSE_THRESHOLD;
    
    if (expense.amount >= threshold) {
      const percentageOfIncome = options.monthlyIncome 
        ? ((expense.amount / options.monthlyIncome) * 100).toFixed(1)
        : null;

      await createNotification(userId, {
        type: 'expense_reminder',
        title: 'Large Expense Added',
        message: `A large expense of ${formatCurrency(expense.amount)} was added in ${expense.category}${
          percentageOfIncome ? ` (${percentageOfIncome}% of monthly income)` : ''
        }.`,
        priority: 'high',
        metadata: {
          expenseId: expense.id,
          amount: expense.amount,
          category: expense.category,
          percentageOfIncome: percentageOfIncome
        }
      });
    }
  } catch (error) {
    console.error('Error in notifyLargeExpense:', error);
    throw error;
  }
};

export const createWeeklySpendingReminder = async (userId, weeklyData) => {
  try {
    const { totalSpent, topCategory, comparisonWithLastWeek } = weeklyData;
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    let message = `You've spent ${formatCurrency(totalSpent)} this week`;
    
    if (topCategory) {
      message += `, with ${topCategory.name} being your highest spending category (${formatCurrency(topCategory.amount)})`;
    }
    
    if (comparisonWithLastWeek) {
      const changePercentage = ((totalSpent - comparisonWithLastWeek) / comparisonWithLastWeek * 100).toFixed(1);
      message += `. This is ${changePercentage}% ${totalSpent > comparisonWithLastWeek ? 'more' : 'less'} than last week`;
    }

    await createNotification(userId, {
      type: 'weekly_spending',
      title: 'Weekly Spending Summary',
      message: message + '.',
      priority: 'normal',
      metadata: {
        weekStart,
        weekEnd,
        totalSpent,
        topCategory,
        comparisonWithLastWeek
      }
    });
  } catch (error) {
    console.error('Error in createWeeklySpendingReminder:', error);
    throw error;
  }
};

export const notifyRecurringBillsDue = async (userId, bills) => {
  try {
    const upcomingBills = bills.filter(bill => {
      const dueDate = new Date(bill.dueDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= NOTIFICATION_SETTINGS.RECURRING_BILLS_REMINDER_DAYS && daysUntilDue > 0;
    });

    if (upcomingBills.length > 0) {
      const totalAmount = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);
      const billsList = upcomingBills
        .map(bill => `${bill.name} (${formatCurrency(bill.amount)})`)
        .join(', ');

      await createNotification(userId, {
        type: 'bills_reminder',
        title: 'Upcoming Bills Reminder',
        message: `You have ${upcomingBills.length} bills due soon totaling ${formatCurrency(totalAmount)}: ${billsList}.`,
        priority: 'high',
        metadata: {
          bills: upcomingBills,
          totalAmount
        }
      });
    }
  } catch (error) {
    console.error('Error in notifyRecurringBillsDue:', error);
    throw error;
  }
};

export const notifyUnusualSpending = async (userId, category, amount, averageAmount) => {
  try {
    const percentageIncrease = ((amount - averageAmount) / averageAmount * 100).toFixed(1);
    
    if (percentageIncrease > 50) { // Threshold for unusual spending
      await createNotification(userId, {
        type: 'unusual_spending',
        title: 'Unusual Spending Pattern Detected',
        message: `Your spending in ${category} is ${percentageIncrease}% higher than your 3-month average. Consider reviewing your expenses.`,
        priority: 'medium',
        metadata: {
          category,
          currentAmount: amount,
          averageAmount,
          percentageIncrease
        }
      });
    }
  } catch (error) {
    console.error('Error in notifyUnusualSpending:', error);
    throw error;
  }
};