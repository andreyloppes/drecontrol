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
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Futuristic Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
                <div className="absolute inset-0 cyber-grid opacity-[0.03] dark:opacity-[0.05]" />
            </div>

            <Card className="w-full max-w-md glass border-white/5 rounded-[2rem] overflow-hidden relative z-10 shadow-2xl">
                <CardHeader className="text-center space-y-2 pt-10">
                    <div className="mx-auto w-16 h-16 glass rounded-2xl flex items-center justify-center mb-6 border border-white/10 animate-glow">
                        <Lock className="w-8 h-8 text-cyan-400" />
                    </div>
                    <CardTitle className="text-4xl font-black tracking-tighter uppercase italic">
                        DRE <span className="text-cyan-400">Control</span>
                    </CardTitle>
                    <CardDescription className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                        Intelligent Finance OS <span className="text-cyan-500/50">v2.0</span>
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-6 px-8">
                        <div className="space-y-3">
                            <label htmlFor="name" className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                [IDENTIFICATION_REQUIRED]
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-cyan-400 transition-colors" />
                                <Input
                                    id="name"
                                    placeholder="Enter identifier..."
                                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-cyan-500/30 transition-all font-mono placeholder:text-muted-foreground/30"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-[10px] text-muted-foreground font-mono leading-relaxed group hover:bg-white/10 transition-colors">
                            <p className="flex items-center gap-2 mb-1">
                                <span className="w-1 h-1 inline-block bg-cyan-400 rounded-full animate-pulse" />
                                <strong className="text-foreground/80 uppercase tracking-widest">Privacy Protocol:</strong>
                            </p>
                            This system operates on a local sandbox.
                            Zero telemetry. Zero egress. Your assets, your node.
                        </div>
                    </CardContent>
                    <CardFooter className="px-8 pb-10">
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-purple-600 to-cyan-600 bg-[length:200%_auto] animate-glow hover:bg-right transition-all duration-500 shadow-xl shadow-cyan-500/20 text-white">
                            Initialize Session
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
