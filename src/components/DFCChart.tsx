import { memo } from 'react';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface DFCChartProps {
    data: {
        date: string;
        income: number;
        expense: number;
        balance: number;
    }[];
}

const abbreviateNumber = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
};

export const DFCChart = memo(function DFCChart({ data }: DFCChartProps) {
    const isMobile = useIsMobile();

    const formattedData = data.map(item => ({
        ...item,
        day: format(parseISO(item.date), 'dd', { locale: ptBR }),
        fullDate: format(parseISO(item.date), 'dd/MM', { locale: ptBR }),
    }));

    // O saldo pode ficar negativo em algum dia do mês — esse é o sinal mais importante.
    const minBalance = Math.min(0, ...formattedData.map(d => d.balance));
    const hasNegative = minBalance < 0;

    const chartHeight = isMobile ? 300 : 400;
    const barSize = isMobile ? 6 : 12;
    const lineWidth = isMobile ? 2.5 : 3.5;
    const fontSize = isMobile ? 9 : 11;

    return (
        <Card className="col-span-full glass border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xl font-bold tracking-tight">
                    Fluxo de Caixa do Mês
                    <span className="block text-xs text-muted-foreground font-normal mt-1">
                        Entradas e saídas por dia · linha roxa = saldo acumulado
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={formattedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize }}
                            dy={10}
                            interval="preserveStartEnd"
                            minTickGap={isMobile ? 16 : 8}
                        />
                        {/* Eixo único: barras (fluxo diário) e linha (saldo) na MESMA escala —
                            assim o cruzamento do saldo com o zero é visualmente fiel. */}
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize }}
                            tickFormatter={abbreviateNumber}
                            width={isMobile ? 38 : 56}
                        />
                        {/* Linha do zero — destaca quando o saldo cruza pro vermelho */}
                        <ReferenceLine y={0} stroke={hasNegative ? '#f87171' : 'rgba(255,255,255,0.2)'} strokeWidth={hasNegative ? 1.5 : 1} strokeDasharray={hasNegative ? undefined : '4 4'} />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            contentStyle={{
                                backgroundColor: 'rgba(3, 7, 18, 0.85)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontSize: '11px' }}
                            labelFormatter={(label, payload) => {
                                const d = payload?.[0]?.payload as { fullDate?: string } | undefined;
                                return d?.fullDate ? `Dia ${d.fullDate}` : `Dia ${label}`;
                            }}
                            formatter={(value: number, name: string) => [
                                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                name,
                            ]}
                        />
                        <Bar dataKey="income" name="Entradas" fill="#34d399" barSize={barSize} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="expense" name="Saídas" fill="#f87171" barSize={barSize} radius={[3, 3, 0, 0]} />
                        <Line
                            type="monotone"
                            dataKey="balance"
                            name="Saldo acumulado"
                            stroke="#a855f7"
                            strokeWidth={lineWidth}
                            dot={false}
                            activeDot={{ r: isMobile ? 4 : 6, stroke: '#a855f7', strokeWidth: 2, fill: '#fff' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
            {/* Legenda simples em pt-BR */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-3 pb-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />Entradas</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />Saídas</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />Saldo acumulado</span>
            </div>
        </Card>
    );
});
