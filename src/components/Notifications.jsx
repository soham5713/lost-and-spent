import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { AlertCircle, Bell, CheckCircle2, Receipt, PiggyBank } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';

const NotificationCard = ({ notification, onMarkAsRead }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'budget_warning':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'budget_exceeded':
        return <AlertCircle className="h-6 w-6 text-destructive" />;
      case 'expense_reminder':
        return <Receipt className="h-6 w-6 text-primary" />;
      default:
        return <Bell className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getBadgeVariant = () => {
    switch (notification.type) {
      case 'budget_warning':
        return 'warning';
      case 'budget_exceeded':
        return 'destructive';
      case 'expense_reminder':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className={`transition-all duration-200 ${notification.read ? 'bg-muted/50' : 'bg-background'}`}>
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="mt-1">
            {getIcon()}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{notification.title}</h4>
                <Badge variant={getBadgeVariant()}>
                  {notification.type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkAsRead(notification.id)}
                disabled={notification.read}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            <p className="text-xs text-muted-foreground">
              {format(notification.createdAt.toDate(), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Notifications = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [user.uid]);

  const fetchNotifications = async () => {
    try {
      const notificationsRef = collection(db, `users/${user.uid}/notifications`);
      const q = query(notificationsRef, where('createdAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
      const querySnapshot = await getDocs(q);
      
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setNotifications(notificationsData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/notifications`, notificationId), {
        read: true,
        readAt: new Date()
      });
      
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true, readAt: new Date() }
          : notification
      ));
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(unreadNotifications.map(notification =>
        updateDoc(doc(db, `users/${user.uid}/notifications`, notification.id), {
          read: true,
          readAt: new Date()
        })
      ));

      setNotifications(notifications.map(notification => ({
        ...notification,
        read: true,
        readAt: new Date()
      })));

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Notifications</CardTitle>
            </div>
            {notifications.some(n => !n.read) && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
          <CardDescription>
            Stay updated with your expense tracking activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-16 text-center">
                <Bell className="h-16 w-16 text-muted-foreground mb-6" />
                <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  You're all caught up! Check back later for updates on your expenses and budgets.
                </p>
              </Card>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;