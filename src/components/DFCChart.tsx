import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DFCChartProps {
    data: {
        date: string;
        income: number;
        expense: number;
        balance: number;
    }[];
}

export function DFCChart({ data }: DFCChartProps) {
    // Format data for easier display
    const formattedData = data.map(item => ({
        ...item,
        day: format(new Date(item.date), 'dd', { locale: ptBR }),
        fullDate: format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR }),
    }));

    return (
        <Card className="col-span-full glass border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xl font-bold tracking-tight">Fluxo de Caixa Diário <span className="text-muted-foreground font-mono text-sm ml-2 opacity-50">(DFC PROJECTION)</span></CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={formattedData}>
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
                            dy={10}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(3, 7, 18, 0.8)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            content={({ payload }) => (
                                <div className="flex justify-end gap-4 mb-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                    {payload?.map((entry: any, index: number) => (
                                        <div key={`item-${index}`} className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span>{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        />
                        <Bar yAxisId="left" dataKey="income" name="Entradas" fill="#22d3ee" barSize={12} radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="left" dataKey="expense" name="Saídas" fill="#f87171" barSize={12} radius={[4, 4, 0, 0]} />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="balance"
                            name="Saldo"
                            stroke="#a855f7"
                            strokeWidth={4}
                            dot={false}
                            activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2, fill: '#fff' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
