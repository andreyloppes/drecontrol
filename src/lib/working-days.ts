/**
 * Conta dias úteis (seg-sex, não feriados BR nacionais fixos) de um mês "YYYY-MM".
 * Subset de feriados suficiente para estimar planejamento. Usuário pode ajustar
 * manualmente sobrescrevendo o cálculo se quiser precisão cirúrgica.
 */
const BR_FIXED_HOLIDAYS_MMDD = [
  '01-01', // Confraternização
  '04-21', // Tiradentes
  '05-01', // Dia do trabalho
  '09-07', // Independência
  '10-12', // N. Sra. Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
];

export function workingDaysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return 22;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  const holidays = new Set(
    BR_FIXED_HOLIDAYS_MMDD
      .filter(d => d.startsWith(mm))
      .map(d => `${y}-${d}`)
  );
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const date = new Date(Date.UTC(y, m - 1, d));
    const dow = date.getUTCDay(); // 0=dom 6=sab
    if (dow === 0 || dow === 6) continue;
    const dd = String(d).padStart(2, '0');
    if (holidays.has(`${y}-${mm}-${dd}`)) continue;
    count++;
  }
  return count;
}
