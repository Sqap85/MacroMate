import { useMemo } from 'react';
import type React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  useMediaQuery,
  useTheme,
  LinearProgress,
  Paper,
} from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Food, DailyGoal } from '../types';
import { formatDate } from '../utils/dateUtils';

interface StatsTabProps {
  foods: Food[];
  goal: DailyGoal;
}

interface StatsStreak {
  current: number;
  longest: number;
  thisMonth: number;
  totalActiveDays: number;
}

interface StatsRecords {
  bestDay: { date: string; calories: number } | null;
  highestProtein: { date: string; protein: number } | null;
}

interface MonthlyBarData {
  month: string;
  percentage: number;
  daysOnTarget: number;
  totalDays: number;
}

interface CalculatedStats {
  streak: StatsStreak;
  records: StatsRecords;
  monthlyBars: MonthlyBarData[];
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
}

interface DayAggregate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ── Yardımcı fonksiyonlar (küçük, tek sorumluluk) ──

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [y, mo, d] = dateKey.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

function getCurrentStreak(activeDateKeys: string[]): number {
  if (activeDateKeys.length === 0) return 0;
  const activeSet = new Set(activeDateKeys);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = getDateKey(cursor.getTime());
    if (!activeSet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ✅ Redundant assignment düzeltildi: current = 0 ile başla
function getLongestStreak(sortedDateKeys: string[]): number {
  if (sortedDateKeys.length === 0) return 0;
  let longest = 0;
  let current = 0;

  for (let i = 0; i < sortedDateKeys.length; i += 1) {
    if (i === 0) {
      current = 1;
    } else {
      const prev = parseDateKey(sortedDateKeys[i - 1]);
      const next = parseDateKey(sortedDateKeys[i]);
      const diffDays = Math.round((next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current += 1;
      } else {
        current = 1;
      }
    }
    longest = Math.max(longest, current);
  }
  return longest;
}

function buildDayMap(foods: Food[]): Map<string, DayAggregate> {
  const dayMap = new Map<string, DayAggregate>();
  for (const food of foods) {
    const key = getDateKey(food.timestamp);
    const existing = dayMap.get(key);
    if (existing) {
      existing.calories += food.calories;
      existing.protein  += food.protein;
      existing.carbs    += food.carbs;
      existing.fat      += food.fat;
    } else {
      dayMap.set(key, {
        calories: food.calories,
        protein:  food.protein,
        carbs:    food.carbs,
        fat:      food.fat,
      });
    }
  }
  return dayMap;
}

function calcRecords(
  activeDateKeys: string[],
  dayMap: Map<string, DayAggregate>,
  goal: DailyGoal,
): StatsRecords {
  let bestDay: StatsRecords['bestDay'] = null;
  let highestProtein: StatsRecords['highestProtein'] = null;

  for (const dateKey of activeDateKeys) {
    const day = dayMap.get(dateKey)!;
    if (!bestDay || Math.abs(day.calories - goal.calories) < Math.abs(bestDay.calories - goal.calories)) {
      bestDay = { date: dateKey, calories: day.calories };
    }
    if (!highestProtein || day.protein > highestProtein.protein) {
      highestProtein = { date: dateKey, protein: day.protein };
    }
  }
  return { bestDay, highestProtein };
}

function calcMonthlyBars(
  activeDateKeys: string[],
  dayMap: Map<string, DayAggregate>,
  goal: DailyGoal,
): MonthlyBarData[] {
  const now = new Date();
  const bars: MonthlyBarData[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year  = monthDate.getFullYear();
    const month = monthDate.getMonth();
    let daysOnTarget = 0;
    let totalDays = 0;

    for (const dateKey of activeDateKeys) {
      const d = parseDateKey(dateKey);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      totalDays += 1;
      const day = dayMap.get(dateKey)!;
      if (Math.abs(day.calories - goal.calories) <= goal.calories * 0.1) {
        daysOnTarget += 1;
      }
    }

    bars.push({
      month: monthDate.toLocaleDateString('tr-TR', { month: 'short' }),
      percentage: totalDays > 0 ? Math.round((daysOnTarget / totalDays) * 100) : 0,
      daysOnTarget,
      totalDays,
    });
  }
  return bars;
}

function calculateStats(foods: Food[], goal: DailyGoal): CalculatedStats {
  const dayMap = buildDayMap(foods);
  const activeDateKeys = Array.from(dayMap.keys()).sort((a, b) => a.localeCompare(b));
  const totalActiveDays = activeDateKeys.length;
  const divisor = totalActiveDays || 1;

  let totalCalories = 0;
  let totalProtein  = 0;
  let totalCarbs    = 0;
  let totalFat      = 0;

  for (const dateKey of activeDateKeys) {
    const day = dayMap.get(dateKey)!;
    totalCalories += day.calories;
    totalProtein  += day.protein;
    totalCarbs    += day.carbs;
    totalFat      += day.fat;
  }

  const now = new Date();
  const thisMonth = activeDateKeys.filter((key) => {
    const d = parseDateKey(key);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return {
    streak: {
      current: getCurrentStreak(activeDateKeys),
      longest: getLongestStreak(activeDateKeys),
      thisMonth,
      totalActiveDays,
    },
    records:     calcRecords(activeDateKeys, dayMap, goal),
    monthlyBars: calcMonthlyBars(activeDateKeys, dayMap, goal),
    averageCalories: Math.round(totalCalories / divisor),
    averageProtein:  Math.round(totalProtein  / divisor),
    averageCarbs:    Math.round(totalCarbs    / divisor),
    averageFat:      Math.round(totalFat      / divisor),
  };
}

// ✅ Nested ternary yerine fonksiyon
function getBarColor(percentage: number): string {
  if (percentage >= 70) return '#4caf50';
  if (percentage >= 40) return '#ff9800';
  return '#ef5350';
}

// ── Section header helper ──────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, isMobile }: { icon: React.ReactNode; title: string; subtitle?: string; isMobile: boolean }) {
  return (
    <Box display="flex" alignItems="center" gap={1.5} mb={isMobile ? 1.5 : 2}>
      <Box sx={{
        width: isMobile ? 32 : 36,
        height: isMobile ? 32 : 36,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #18181b22 0%, #3f3f4622 100%)',
        border: '1.5px solid rgba(24,24,27,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant={isMobile ? 'subtitle2' : 'subtitle1'} fontWeight={700} lineHeight={1.2}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.62rem' : '0.7rem'}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function StatsTab({ foods, goal }: Readonly<StatsTabProps>) {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const stats    = useMemo(() => calculateStats(foods, goal), [foods, goal]);

  if (foods.length === 0) {
    return (
      <Box textAlign="center" py={isMobile ? 4 : 8}>
        <Box sx={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #18181b22 0%, #3f3f4622 100%)',
          border: '1.5px solid rgba(24,24,27,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
        }}>
          <TrendingUpIcon sx={{ fontSize: 32, color: '#18181b' }} />
        </Box>
        <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={700} gutterBottom>
          Henüz istatistik yok
        </Typography>
        <Typography variant="body2" color="text.secondary" px={isMobile ? 2 : 0}>
          Yemek eklemeye başladığınızda burada istatistiklerinizi görebileceksiniz
        </Typography>
      </Box>
    );
  }

  const { streak, records, monthlyBars, averageCalories, averageProtein, averageCarbs, averageFat } = stats;

  const streakItems = [
    { label: 'Mevcut Seri', value: streak.current, unit: 'gün', color: streak.current > 0 ? '#ef4444' : '#94a3b8' },
    { label: 'En Uzun Seri', value: streak.longest, unit: 'gün', color: '#b45309' },
    { label: 'Bu Ay', value: streak.thisMonth, unit: 'aktif gün', color: '#15803d' },
    { label: 'Toplam', value: streak.totalActiveDays, unit: 'aktif gün', color: '#18181b' },
  ];

  const avgCalRawPct = goal.calories > 0 ? (averageCalories / goal.calories) * 100 : 0;
  const avgCalProgressClass = avgCalRawPct > 115 ? 'progress-calories-error'
    : avgCalRawPct > 100 ? 'progress-calories-warning'
    : 'progress-calories';

  const macroItems = [
    { label: 'Kalori', value: averageCalories, goal: goal.calories, unit: 'kcal', color: '#18181b', progressClass: avgCalProgressClass },
    { label: 'Protein', value: averageProtein, goal: goal.protein, unit: 'g', color: '#0369a1', progressClass: 'progress-protein' },
    { label: 'Karbonhidrat', value: averageCarbs, goal: goal.carbs, unit: 'g', color: '#15803d', progressClass: 'progress-carbs' },
    { label: 'Yağ', value: averageFat, goal: goal.fat, unit: 'g', color: '#b45309', progressClass: 'progress-fat' },
  ];

  return (
    <Stack spacing={isMobile ? 2 : 2.5}>

      {/* ── Seri & Aktivite ── */}
      <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 2.5 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
          <SectionHeader
            icon={<LocalFireDepartmentIcon sx={{ fontSize: isMobile ? 16 : 18, color: '#18181b' }} />}
            title="Seri & Aktivite"
            subtitle="Günlük takip performansınız"
            isMobile={isMobile}
          />
          <Stack direction="row" spacing={isMobile ? 1 : 1.5} flexWrap="wrap" useFlexGap>
            {streakItems.map(({ label, value, unit, color }) => (
              <Paper key={label} sx={{
                flex: '1 1 calc(50% - 8px)',
                minWidth: 0,
                p: isMobile ? 1 : 1.5,
                textAlign: 'center',
                bgcolor: `${color}0d`,
                border: `1px solid ${color}25`,
                borderRadius: 2,
              }}>
                <Typography variant="caption" display="block" fontWeight={600} fontSize={isMobile ? '0.62rem' : '0.7rem'} color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h5" fontWeight={800} fontSize={isMobile ? '1.4rem' : '1.75rem'} sx={{ color }}>
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.58rem' : '0.65rem'}>
                  {unit}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ── Genel Ortalamalar ── */}
      <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 2.5 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
          <SectionHeader
            icon={<TrendingUpIcon sx={{ fontSize: isMobile ? 16 : 18, color: '#18181b' }} />}
            title="Genel Ortalamalar"
            subtitle="Tüm zamanlar ortalaması"
            isMobile={isMobile}
          />
          <Stack spacing={isMobile ? 1.25 : 1.5}>
            {macroItems.map(({ label, value, goal: g, unit, color, progressClass }) => (
              <Box key={label}>
                <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={0.5}>
                  <Typography variant="body2" fontWeight={600} fontSize={isMobile ? '0.78rem' : '0.85rem'}>
                    {label}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ color }}>
                    {value}{unit} <Typography component="span" variant="caption" color="text.secondary" fontWeight={400}>/ {g}{unit}</Typography>
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((value / g) * 100, 100)}
                  className={progressClass}
                  sx={{ height: isMobile ? 6 : 7, borderRadius: 4, bgcolor: `${color}18` }}
                />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ── Rekorlar ── */}
      {(records.bestDay ?? records.highestProtein) && (
        <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 2.5 }}>
          <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
            <SectionHeader
              icon={<EmojiEventsIcon sx={{ fontSize: isMobile ? 16 : 18, color: '#18181b' }} />}
              title="Rekorlar"
              subtitle="En iyi performans günleri"
              isMobile={isMobile}
            />
            <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
              {records.bestDay && (
                <Paper sx={{ flex: 1, p: isMobile ? 1 : 1.5, bgcolor: 'rgba(21,128,61,0.06)', border: '1px solid rgba(21,128,61,0.2)', borderRadius: 2 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" mb={0.75}>
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(21,128,61,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <EmojiEventsIcon sx={{ fontSize: 13, color: '#15803d' }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700} fontSize={isMobile ? '0.65rem' : '0.72rem'} sx={{ color: '#15803d' }}>
                      Hedefe En Yakın Gün
                    </Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={700} fontSize={isMobile ? '0.78rem' : '0.85rem'}>{formatDate(records.bestDay.date)}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.68rem'}>{records.bestDay.calories} kcal · hedef {goal.calories}</Typography>
                </Paper>
              )}
              {records.highestProtein && (
                <Paper sx={{ flex: 1, p: isMobile ? 1 : 1.5, bgcolor: 'rgba(3,105,161,0.06)', border: '1px solid rgba(3,105,161,0.2)', borderRadius: 2 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" mb={0.75}>
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(3,105,161,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUpIcon sx={{ fontSize: 13, color: '#0369a1' }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700} fontSize={isMobile ? '0.65rem' : '0.72rem'} sx={{ color: '#0369a1' }}>
                      En Yüksek Protein
                    </Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={700} fontSize={isMobile ? '0.78rem' : '0.85rem'}>{formatDate(records.highestProtein.date)}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.68rem'}>{records.highestProtein.protein}g protein</Typography>
                </Paper>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── Aylık Bar Chart ── */}
      {monthlyBars.length > 0 && (
        <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 2.5 }}>
          <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
            <SectionHeader
              icon={<CalendarMonthIcon sx={{ fontSize: isMobile ? 16 : 18, color: '#18181b' }} />}
              title="Aylık Özet"
              subtitle="Son 6 ay — hedefe ulaşılan gün yüzdesi"
              isMobile={isMobile}
            />
            <ResponsiveContainer width="100%" height={isMobile ? 150 : 190}>
              <BarChart data={monthlyBars} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
                <XAxis dataKey="month" tick={{ fontSize: isMobile ? 11 : 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value, _name, props) => [
                    `${typeof value === 'number' ? value : 0}% (${props.payload.daysOnTarget}/${props.payload.totalDays} gün)`,
                    'Hedefe Ulaşılan',
                  ]}
                  contentStyle={{ fontSize: isMobile ? 11 : 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}
                  cursor={{ fill: 'rgba(24,24,27,0.06)' }}
                />
                <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {monthlyBars.map((entry: MonthlyBarData) => (
                    <Cell key={entry.month} fill={getBarColor(entry.percentage)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Stack direction="row" spacing={isMobile ? 1.5 : 2} justifyContent="center" mt={1}>
              {[
                { color: '#15803d', label: '≥70%' },
                { color: '#b45309', label: '40–70%' },
                { color: '#ef4444', label: '<40%' },
              ].map(({ color, label }) => (
                <Box key={label} display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: color }} />
                  <Typography variant="caption" fontSize={isMobile ? '0.6rem' : '0.68rem'} color="text.secondary">{label}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}