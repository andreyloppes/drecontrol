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
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Fluxo de Caixa Diário (DFC)</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="day" />
                        <YAxis yAxisId="left" orientation="left" stroke="#10b981" />
                        <YAxis yAxisId="right" orientation="right" stroke="#6366f1" />
                        <Tooltip
                            labelFormatter={(label) => `Dia ${label}`}
                            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="income" name="Entradas" fill="#10b981" barSize={20} />
                        <Bar yAxisId="left" dataKey="expense" name="Saídas" fill="#ef4444" barSize={20} />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="balance"
                            name="Saldo Acumulado"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
