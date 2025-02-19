
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Todo {
  id: string;
  title: string;
  createdAt: Date;
  deadline: Date;
  status: "active" | "completed" | "missed";
  userId: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  const { toast } = useToast();
  const [user, setUser] = useState(auth.currentUser);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [currentFilter, setCurrentFilter] = useState<"all" | "active" | "completed" | "missed">("all");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        // Check if user is admin
        const checkAdmin = async () => {
          const userDoc = await getFirestore().collection("users").doc(user.uid).get();
          setIsAdmin(userDoc.data()?.role === "admin");
        };
        checkAdmin();
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    // Query todos for current user or all todos for admin
    const q = isAdmin 
      ? query(collection(db, "todos"))
      : query(collection(db, "todos"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTodos: Todo[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newTodos.push({
          id: doc.id,
          title: data.title,
          createdAt: data.createdAt.toDate(),
          deadline: data.deadline.toDate(),
          status: data.status,
          userId: data.userId,
        });
      });
      setTodos(newTodos);
    });

    // Check for missed deadlines every minute
    const intervalId = setInterval(() => {
      todos.forEach(async (todo) => {
        if (todo.status === "active" && new Date() > todo.deadline) {
          await updateDoc(doc(db, "todos", todo.id), {
            status: "missed"
          });
        }
      });
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [user, db, isAdmin]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;

    try {
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 24); // 24-hour deadline

      await addDoc(collection(db, "todos"), {
        title: newTodo,
        createdAt: Timestamp.now(),
        deadline: Timestamp.fromDate(deadline),
        status: "active",
        userId: user.uid,
      });

      setNewTodo("");
      toast({
        title: "Success",
        description: "Todo added successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add todo",
      });
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      await deleteDoc(doc(db, "todos", todoId));
      toast({
        title: "Success",
        description: "Todo deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete todo",
      });
    }
  };

  const updateTodoStatus = async (todoId: string, newStatus: "active" | "completed" | "missed") => {
    try {
      await updateDoc(doc(db, "todos", todoId), {
        status: newStatus
      });
      toast({
        title: "Success",
        description: "Todo status updated",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update todo status",
      });
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (currentFilter === "all") return true;
    return todo.status === currentFilter;
  });

  const getTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return "Time's up!";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user.displayName || user.email}</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Admin Dashboard" : "Your Todo Dashboard"}
            </p>
          </div>
          <Button variant="outline" onClick={() => auth.signOut()}>
            Sign Out
          </Button>
        </div>

        <form onSubmit={addTodo} className="mb-6">
          <div className="flex gap-2">
            <Input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a new todo..."
              className="flex-1"
            />
            <Button type="submit">Add Todo</Button>
          </div>
        </form>

        <Tabs value={currentFilter} onValueChange={(value: any) => setCurrentFilter(value)}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
          </TabsList>

          <TabsContent value={currentFilter}>
            <div className="space-y-4">
              {filteredTodos.map((todo) => (
                <Card key={todo.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-medium ${todo.status === "completed" ? "line-through" : ""}`}>
                        {todo.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {todo.status === "active" ? getTimeRemaining(todo.deadline) : `Status: ${todo.status}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {todo.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateTodoStatus(todo.id, "completed")}
                        >
                          Complete
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTodo(todo.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredTodos.length === 0 && (
                <p className="text-center text-muted-foreground">No todos found</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Dashboard;
