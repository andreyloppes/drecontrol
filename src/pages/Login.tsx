import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
    const navigate = useNavigate();
    const [name, setName] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Por favor, digite seu nome para continuar.");
            return;
        }

        // Simulating a "session" by saving the name, though not strictly needed for access
        localStorage.setItem("user_name", name);

        toast.success(`Bem-vindo, ${name}!`);
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-2">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">DRE Control</CardTitle>
                    <CardDescription>
                        Controle Financeiro Inteligente. <br />
                        Seus dados, seu controle.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Como gostaria de ser chamado?
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    placeholder="Seu nome"
                                    className="pl-9"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-secondary/50 p-3 rounded-md text-xs text-muted-foreground">
                            <p>
                                <strong>Privacidade:</strong> Este sistema funciona localmente no seu navegador.
                                Nenhum dado é enviado para nossos servidores.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full font-bold">
                            Acessar Plataforma
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
