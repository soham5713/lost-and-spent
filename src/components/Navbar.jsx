import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { toast } from 'sonner';
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Receipt, LogOut, Settings, User, Bell, BarChart } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout. Please try again.");
    }
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link 
              to="/expenses" 
              className="flex items-center space-x-3 transition-colors hover:text-primary"
            >
              <Receipt className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg hidden sm:inline-block">Expense Tracker</span>
            </Link>
            
            <div className="hidden md:flex space-x-4">
              <Button
                variant={isActiveRoute('/expenses') ? 'default' : 'ghost'}
                className="h-9"
                onClick={() => navigate('/expenses')}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Expenses
              </Button>
              <Button
                variant={isActiveRoute('/analytics') ? 'default' : 'ghost'}
                className="h-9"
                onClick={() => navigate('/analytics')}
              >
                <BarChart className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Receipt className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/expenses')}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Expenses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/analytics')}>
                    <BarChart className="mr-2 h-4 w-4" />
                    Analytics
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button 
              variant="ghost" 
              size="icon"
              className="relative hidden sm:flex"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                2
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-10 w-10 rounded-full"
                  aria-label="User menu"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={user.photoURL} 
                      alt={user.displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10">
                      {user.displayName?.charAt(0) || user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;