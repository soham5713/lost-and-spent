"use client"

import { useState } from "react"
import { auth } from "../firebase/firebase"
import { updateProfile } from "firebase/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { User, Mail, AlertCircle, Camera } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

const ProfilePage = ({ user }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName,
      })
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile. Please try again.")
      toast.error("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.photoURL} alt={user?.displayName} className="object-cover" />
                <AvatarFallback className="text-2xl">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button size="icon" variant="outline" className="absolute bottom-0 right-0 rounded-full h-8 w-8" disabled>
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <CardTitle className="text-2xl">{user?.displayName || "User Profile"}</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={user?.email} disabled className="pl-10" />
                </div>
                <p className="text-sm text-muted-foreground">Email cannot be changed as you logged in with Google</p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end space-x-4">
              <Button type="submit" disabled={loading || !displayName || displayName === user?.displayName}>
                {loading ? <Skeleton className="h-5 w-5 rounded-full" /> : "Save Changes"}
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            <Separator />
            <div className="rounded-lg border p-4 bg-muted/50">
              <h3 className="font-medium mb-2">Account Information</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Account type: Google Account</p>
                <p>Created: {user?.metadata?.creationTime}</p>
                <p>Last sign in: {user?.metadata?.lastSignInTime}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfilePage
