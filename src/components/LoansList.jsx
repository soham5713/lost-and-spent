"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Link, useNavigate } from "react-router-dom"
import {
  HandCoins,
  PlusCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const LoanCard = ({ loan, onEdit, onDelete, onToggleStatus }) => {
  const statusColor = loan.status === "pending" ? "bg-yellow-500" : "bg-green-500"
  const isLent = loan.type === "lent"

  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center sm:space-x-4 min-w-0">
            <div className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
              {isLent ? (
                <ArrowUpRight className="h-6 w-6 text-green-500" />
              ) : (
                <ArrowDownRight className="h-6 w-6 text-blue-500" />
              )}
            </div>
            <div className="space-y-1 min-w-0 ml-4">
              <h3 className="text-base sm:text-lg font-semibold truncate max-w-[150px] sm:max-w-[200px] md:max-w-[400px]">
                {isLent ? `Lent to ${loan.person}` : `Borrowed from ${loan.person}`}
              </h3>
              <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                {loan.description || "No description"}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="shrink-0 truncate max-w-[70px] sm:max-w-full">
                  {format(loan.date.toDate(), "MMM d, yyyy")}
                </span>
                <Badge
                  variant={loan.status === "pending" ? "outline" : "secondary"}
                  className={`ml-1 text-xs shrink-0 ${loan.status === "pending" ? "border-yellow-500 text-yellow-500" : "bg-green-500/20 text-green-600"}`}
                >
                  {loan.status === "pending" ? "Pending" : "Settled"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-4 ml-2 sm:ml-4 shrink-0">
            <span
              className={`text-sm sm:text-xl font-semibold whitespace-nowrap ${isLent ? "text-green-500" : "text-blue-500"}`}
            >
              ₹{loan.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10 opacity-100 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onToggleStatus(loan)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {loan.status === "pending" ? "Mark as Settled" : "Mark as Pending"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(loan)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(loan.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const LoanSummary = ({ loans }) => {
  const totalLent = loans
    .filter((loan) => loan.type === "lent" && loan.status === "pending")
    .reduce((sum, loan) => sum + loan.amount, 0)

  const totalBorrowed = loans
    .filter((loan) => loan.type === "borrowed" && loan.status === "pending")
    .reduce((sum, loan) => sum + loan.amount, 0)

  const netBalance = totalLent - totalBorrowed

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="bg-green-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Money Lent</p>
              <h3 className="text-2xl font-bold text-green-500">
                ₹{totalLent.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Money Borrowed</p>
              <h3 className="text-2xl font-bold text-blue-500">
                ₹{totalBorrowed.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <ArrowDownRight className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={`${netBalance >= 0 ? "bg-green-500/10" : "bg-blue-500/10"}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Net Balance</p>
              <h3 className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-500" : "text-blue-500"}`}>
                ₹{Math.abs(netBalance).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {netBalance >= 0 ? "You're owed money" : "You owe money"}
              </p>
            </div>
            <div
              className={`h-12 w-12 rounded-full ${netBalance >= 0 ? "bg-green-500/20" : "bg-blue-500/20"} flex items-center justify-center`}
            >
              {netBalance >= 0 ? (
                <ArrowUpRight className="h-6 w-6 text-green-500" />
              ) : (
                <ArrowDownRight className="h-6 w-6 text-blue-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const LoansList = ({ user }) => {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.uid) return

    const q = query(collection(db, `users/${user.uid}/loans`), orderBy("date", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const loanData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setLoans(loanData)
        setLoading(false)
      } catch (error) {
        console.error("Error loading loans:", error)
        toast.error("Error loading loans")
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [user?.uid])

  const handleDelete = async (loanId) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/loans`, loanId))
      toast.success("Loan record deleted successfully")
    } catch (error) {
      console.error("Error deleting loan:", error)
      toast.error("Failed to delete loan record")
    }
  }

  const handleEdit = (loan) => {
    navigate("/add-loan", {
      state: {
        loan: {
          ...loan,
          date: loan.date.toDate(),
          dueDate: loan.dueDate ? loan.dueDate.toDate() : null,
          settledDate: loan.settledDate ? loan.settledDate.toDate() : null,
        },
      },
    })
  }

  const handleToggleStatus = async (loan) => {
    try {
      const newStatus = loan.status === "pending" ? "settled" : "pending"
      const updateData = {
        status: newStatus,
      }

      // If marking as settled, add settled date
      if (newStatus === "settled") {
        updateData.settledDate = new Date()
      } else {
        // If marking back to pending, remove settled date
        updateData.settledDate = null
      }

      await updateDoc(doc(db, `users/${user.uid}/loans`, loan.id), updateData)

      toast.success(`Loan marked as ${newStatus}`)
    } catch (error) {
      console.error("Error updating loan status:", error)
      toast.error("Failed to update loan status")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl py-16 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    )
  }

  let filteredLoans = loans

  switch (activeTab) {
    case "lent":
      filteredLoans = loans.filter((loan) => loan.type === "lent")
      break
    case "borrowed":
      filteredLoans = loans.filter((loan) => loan.type === "borrowed")
      break
    case "pending":
      filteredLoans = loans.filter((loan) => loan.status === "pending")
      break
    case "settled":
      filteredLoans = loans.filter((loan) => loan.status === "settled")
      break
    default:
      filteredLoans = loans
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-2">
            <HandCoins className="h-8 w-8" />
            Loans Tracker
          </h1>
          <p className="text-lg text-muted-foreground">Track money you've borrowed or lent</p>
        </div>
        <div className="flex space-x-4">
          <Button asChild>
            <Link to="/add-loan">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Loan
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <LoanSummary loans={loans} />

      {/* Loans List */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-2xl">Loan Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 w-full justify-start space-x-2 overflow-x-auto">
              <TabsTrigger value="all" className="px-4">
                All
              </TabsTrigger>
              <TabsTrigger value="lent" className="px-4 whitespace-nowrap">
                <ArrowUpRight className="h-4 w-4 mr-2 text-green-500" />
                Lent
              </TabsTrigger>
              <TabsTrigger value="borrowed" className="px-4 whitespace-nowrap">
                <ArrowDownRight className="h-4 w-4 mr-2 text-blue-500" />
                Borrowed
              </TabsTrigger>
              <TabsTrigger value="pending" className="px-4 whitespace-nowrap">
                Pending
              </TabsTrigger>
              <TabsTrigger value="settled" className="px-4 whitespace-nowrap">
                Settled
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[600px] pr-0">
              <div className="space-y-4">
                {filteredLoans.length > 0 ? (
                  filteredLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onEdit={handleEdit}
                      onDelete={(id) => {
                        // Use the AlertDialog for confirmation
                        document.getElementById(`confirm-delete-${id}`).click()
                      }}
                      onToggleStatus={handleToggleStatus}
                    >
                      <AlertDialog>
                        <AlertDialogTrigger id={`confirm-delete-${loan.id}`} className="hidden" />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this loan record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(loan.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </LoanCard>
                  ))
                ) : (
                  <Card className="flex flex-col items-center justify-center p-16 text-center whitespace-nowrap">
                    <HandCoins className="h-16 w-16 text-muted-foreground mb-6" />
                    <h3 className="text-xl font-semibold mb-2">No loan records found</h3>
                    <p className="text-muted-foreground mb-8">
                      {activeTab === "all"
                        ? "Add your first loan record to get started"
                        : `No ${activeTab} loans found`}
                    </p>
                    <Button asChild size="lg">
                      <Link to="/add-loan">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Add Loan Record
                      </Link>
                    </Button>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>

      {/* Hidden Alert Dialogs for delete confirmation */}
      {loans.map((loan) => (
        <AlertDialog key={`dialog-${loan.id}`}>
          <AlertDialogTrigger id={`confirm-delete-${loan.id}`} className="hidden" />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete this loan record.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(loan.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
    </div>
  )
}

export default LoansList
