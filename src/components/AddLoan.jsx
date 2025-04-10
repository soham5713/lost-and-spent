"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { addDoc, collection, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { HandCoins, Save, CalendarIcon, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react"
import { Switch } from "@/components/ui/switch"

const AddLoan = ({ user }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const editingLoan = location.state?.loan

  const [type, setType] = useState("borrowed")
  const [person, setPerson] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date())
  const [hasDueDate, setHasDueDate] = useState(false)
  const [dueDate, setDueDate] = useState(new Date())
  const [status, setStatus] = useState("pending")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingLoan) {
      setType(editingLoan.type)
      setPerson(editingLoan.person)
      setAmount(editingLoan.amount.toString())
      setDescription(editingLoan.description || "")
      setDate(editingLoan.date)
      setStatus(editingLoan.status)

      if (editingLoan.dueDate) {
        setHasDueDate(true)
        setDueDate(editingLoan.dueDate)
      } else {
        setHasDueDate(false)
      }
    }
  }, [editingLoan])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const loanData = {
        type,
        person,
        amount: Number.parseFloat(amount),
        description,
        date,
        status,
        ...(hasDueDate ? { dueDate } : { dueDate: null }),
      }

      if (editingLoan) {
        // Update existing loan
        await updateDoc(doc(db, `users/${user.uid}/loans`, editingLoan.id), {
          ...loanData,
          updatedAt: new Date(),
        })
        toast.success("Loan record updated successfully!")
      } else {
        // Add new loan
        await addDoc(collection(db, `users/${user.uid}/loans`), {
          ...loanData,
          createdAt: new Date(),
        })
        toast.success("Loan record added successfully!")
      }
      navigate("/loans")
    } catch (error) {
      console.error("Error saving loan:", error)
      toast.error(editingLoan ? "Failed to update loan record" : "Failed to add loan record")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-md py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl flex items-center gap-2">
            <HandCoins className="h-6 w-6" />
            {editingLoan ? "Edit Loan Record" : "New Loan Record"}
          </CardTitle>
          <CardDescription>
            {editingLoan ? "Update your loan details" : "Track money you've borrowed or lent"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Loan Type</Label>
              <RadioGroup value={type} onValueChange={setType} className="grid grid-cols-2 gap-4">
                <Label
                  htmlFor="borrowed"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                    type === "borrowed" ? "border-blue-500 bg-blue-500/10" : ""
                  }`}
                >
                  <RadioGroupItem value="borrowed" id="borrowed" className="sr-only" />
                  <ArrowDownRight className="h-6 w-6 mb-2 text-blue-500" />
                  <span className="text-center">Borrowed</span>
                </Label>
                <Label
                  htmlFor="lent"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                    type === "lent" ? "border-green-500 bg-green-500/10" : ""
                  }`}
                >
                  <RadioGroupItem value="lent" id="lent" className="sr-only" />
                  <ArrowUpRight className="h-6 w-6 mb-2 text-green-500" />
                  <span className="text-center">Lent</span>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="person">{type === "borrowed" ? "Borrowed From" : "Lent To"}</Label>
              <Input
                id="person"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder="Enter person's name"
                className="h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-12"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this loan for?"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-12">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasDueDate" className="cursor-pointer">
                  Due Date
                </Label>
                <Switch id="hasDueDate" checked={hasDueDate} onCheckedChange={setHasDueDate} />
              </div>

              {hasDueDate && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-12">
                      <Clock className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup value={status} onValueChange={setStatus} className="grid grid-cols-2 gap-4">
                <Label
                  htmlFor="pending"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                    status === "pending" ? "border-yellow-500 bg-yellow-500/10" : ""
                  }`}
                >
                  <RadioGroupItem value="pending" id="pending" className="sr-only" />
                  <span className="text-center">Pending</span>
                </Label>
                <Label
                  htmlFor="settled"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                    status === "settled" ? "border-green-500 bg-green-500/10" : ""
                  }`}
                >
                  <RadioGroupItem value="settled" id="settled" className="sr-only" />
                  <span className="text-center">Settled</span>
                </Label>
              </RadioGroup>
            </div>

            <div className="flex space-x-4">
              <Button type="button" variant="outline" className="w-full h-12" onClick={() => navigate("/loans")}>
                Cancel
              </Button>
              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    {editingLoan ? "Update Record" : "Save Record"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AddLoan
