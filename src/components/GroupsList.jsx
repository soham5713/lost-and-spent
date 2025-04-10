"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getUserGroups, createGroup } from "../firebase/groupUtils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Users, PlusCircle, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

const GroupCard = ({ group, onSelect }) => {
  return (
    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onSelect(group)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">{group.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{group.description || "No description"}</p>
            <div className="flex items-center text-sm text-muted-foreground mt-2">
              <Users className="h-4 w-4 mr-1" />
              <span>{group.members?.length || 0} members</span>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const GroupsList = ({ user }) => {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.uid) return

    const fetchGroups = async () => {
      try {
        const userGroups = await getUserGroups(user.uid)
        setGroups(userGroups)
      } catch (error) {
        console.error("Error fetching groups:", error)
        toast.error("Failed to load groups")
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [user?.uid])

  const handleCreateGroup = async (e) => {
    e.preventDefault()

    if (!newGroupName.trim()) {
      toast.error("Group name is required")
      return
    }

    setCreatingGroup(true)

    try {
      const groupId = await createGroup(user.uid, {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
      })

      toast.success("Group created successfully")
      setIsDialogOpen(false)
      setNewGroupName("")
      setNewGroupDescription("")

      // Navigate to the new group
      navigate(`/groups/${groupId}`)
    } catch (error) {
      console.error("Error creating group:", error)
      toast.error("Failed to create group")
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleSelectGroup = (group) => {
    navigate(`/groups/${group.id}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4 space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-6 w-72" />
          </div>
          <div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Groups List Skeleton */}
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Groups
          </h1>
          <p className="text-lg text-muted-foreground">Manage shared expenses with friends and family</p>
        </div>
        <div className="flex space-x-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateGroup}>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Create a group to track and split expenses with friends, roommates, or family.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g., Roommates, Trip to Paris"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="What is this group for?"
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingGroup || !newGroupName.trim()}>
                    {creatingGroup ? <Skeleton className="h-5 w-5 rounded-full" /> : "Create Group"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Groups</CardTitle>
          <CardDescription>Groups you've created or joined</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {groups.length > 0 ? (
              <div className="space-y-4">
                {groups.map((group) => (
                  <GroupCard key={group.id} group={group} onSelect={handleSelectGroup} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-16 text-center w-full">
                <Users className="h-16 w-16 text-muted-foreground mb-6" />
                <h3 className="text-xl font-semibold mb-2">No groups yet</h3>
                <p className="text-muted-foreground mb-8">Create your first group to start tracking shared expenses</p>
                <Button onClick={() => setIsDialogOpen(true)} size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create Group
                </Button>
              </Card>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default GroupsList
