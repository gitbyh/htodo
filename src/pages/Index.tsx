import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore, doc, setDoc, collection, query, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsTYsmPAI0D1u8YsBYPNDW31M79if1OUg",
  authDomain: "hmytodo.firebaseapp.com",
  projectId: "hmytodo",
  storageBucket: "hmytodo.firebasestorage.app",
  messagingSenderId: "386833088324",
  appId: "1:386833088324:web:dc372598e9cea3866a2111"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const Index = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const validateGmailOnly = (email: string) => {
    return email.toLowerCase().endsWith('@gmail.com');
  };

  const createUserDocument = async (userId: string, userData: any) => {
    try {
      // Check if this is the first user
      const usersCollection = collection(db, "users");
      const usersQuery = query(usersCollection);
      const querySnapshot = await getDocs(usersQuery);
      
      const isFirstUser = querySnapshot.empty;

      await setDoc(doc(db, "users", userId), {
        ...userData,
        role: isFirstUser ? 'admin' : 'user', // First user becomes admin
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success!",
        description: "Signed in successfully",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.message || "Failed to sign in",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateGmailOnly(email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please use a Gmail address",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: username
      });
      
      // Create user document in Firestore
      await createUserDocument(userCredential.user.uid, {
        username,
        email,
        role: 'user'
      });

      toast({
        title: "Success!",
        description: "Registration successful",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.message || "Failed to register",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Create/update user document for Google sign-in
      await createUserDocument(result.user.uid, {
        username: result.user.displayName,
        email: result.user.email,
        role: 'user'
      });

      toast({
        title: "Success!",
        description: "Signed in with Google successfully",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.message || "Failed to sign in with Google",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md p-6 space-y-6 animate-in glass">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter">
            {isRegistering ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground">
            {isRegistering ? "Sign up to continue" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={isRegistering ? handleRegistration : handleEmailSignIn} className="space-y-4">
          {isRegistering && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : (isRegistering ? "Sign Up" : "Sign In")}
          </Button>
        </form>

        {!isRegistering && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              Sign in with Google
            </Button>
          </>
        )}

        <div className="text-center text-sm">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setEmail("");
              setPassword("");
              setUsername("");
            }}
          >
            {isRegistering ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </Card>
      <Toaster />
    </div>
  );
};

export default Index;
