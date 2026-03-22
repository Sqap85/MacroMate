import { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
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

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getCurrentStreak(activeDateKeys: string[]): number {
  if (activeDateKeys.length === 0) return 0;

  const activeSet = new Set(activeDateKeys);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  while (true) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;

    if (!activeSet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getLongestStreak(sortedDateKeys: string[]): number {
  if (sortedDateKeys.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDateKeys.length; i += 1) {
    const prev = parseDateKey(sortedDateKeys[i - 1]);
    const next = parseDateKey(sortedDateKeys[i]);
    const diffDays = Math.round((next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function calculateStats(foods: Food[], goal: DailyGoal): CalculatedStats {
  const dayMap = new Map<string, DayAggregate>();

  for (const food of foods) {
    const key = getDateKey(food.timestamp);
    const existing = dayMap.get(key);

    if (existing) {
      existing.calories += food.calories;
      existing.protein += food.protein;
      existing.carbs += food.carbs;
      existing.fat += food.fat;
    } else {
      dayMap.set(key, {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      });
    }
  }

  const activeDateKeys = Array.from(dayMap.keys()).sort((a, b) => a.localeCompare(b));
  const totalActiveDays = activeDateKeys.length;
  const divisor = totalActiveDays || 1;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  let bestDay: { date: string; calories: number } | null = null;
  let highestProtein: { date: string; protein: number } | null = null;

  for (const dateKey of activeDateKeys) {
    const day = dayMap.get(dateKey)!;

    totalCalories += day.calories;
    totalProtein += day.protein;
    totalCarbs += day.carbs;
    totalFat += day.fat;

    if (!bestDay || Math.abs(day.calories - goal.calories) < Math.abs(bestDay.calories - goal.calories)) {
      bestDay = { date: dateKey, calories: day.calories };
    }

    if (!highestProtein || day.protein > highestProtein.protein) {
      highestProtein = { date: dateKey, protein: day.protein };
    }
  }

  const now = new Date();
  const thisMonth = activeDateKeys.filter((key) => {
    const d = parseDateKey(key);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const streak: StatsStreak = {
    current: getCurrentStreak(activeDateKeys),
    longest: getLongestStreak(activeDateKeys),
    thisMonth,
    totalActiveDays,
  };

  const monthlyBars: MonthlyBarData[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = monthDate.getFullYear();
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

    const percentage = totalDays > 0 ? Math.round((daysOnTarget / totalDays) * 100) : 0;
    monthlyBars.push({
      month: monthDate.toLocaleDateString('tr-TR', { month: 'short' }),
      percentage,
      daysOnTarget,
      totalDays,
    });
  }

  return {
    streak,
    records: {
      bestDay,
      highestProtein,
    },
    monthlyBars,
    averageCalories: Math.round(totalCalories / divisor),
    averageProtein: Math.round(totalProtein / divisor),
    averageCarbs: Math.round(totalCarbs / divisor),
    averageFat: Math.round(totalFat / divisor),
  };
}

export function StatsTab({ foods, goal }: StatsTabProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const stats = useMemo(() => calculateStats(foods, goal), [foods, goal]);

  if (foods.length === 0) {
    return (
      <Box textAlign="center" py={isMobile ? 4 : 8}>
        <TrendingUpIcon sx={{ fontSize: isMobile ? 60 : 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant={isMobile ? 'subtitle1' : 'h6'} color="text.secondary" gutterBottom>
          Henüz istatistik yok
        </Typography>
        <Typography variant="body2" color="text.secondary" px={isMobile ? 2 : 0}>
          Yemek eklemeye başladığınızda burada istatistiklerinizi görebileceksiniz
        </Typography>
      </Box>
    );
  }

  const { streak, records, monthlyBars, averageCalories, averageProtein, averageCarbs, averageFat } = stats;

  return (
    <Stack spacing={isMobile ? 2 : 3}>

      {/* Streak */}
      <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={isMobile ? 1.5 : 2}>
            <LocalFireDepartmentIcon color="error" sx={{ fontSize: isMobile ? 20 : 24 }} />
            <Typography variant={isMobile ? 'subtitle2' : 'h6'} fontWeight="bold">
              Seri & Aktivite
            </Typography>
          </Box>
          <Stack direction="row" spacing={isMobile ? 1 : 1.5} flexWrap="wrap" useFlexGap>
            <Paper sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 0, p: isMobile ? 1 : 1.5, textAlign: 'center', bgcolor: streak.current > 0 ? 'error.light' : 'background.default', border: '2px solid', borderColor: streak.current > 0 ? 'error.main' : 'divider' }}>
              <Typography variant="caption" display="block" fontWeight="700" fontSize={isMobile ? '0.65rem' : '0.75rem'} sx={{ color: streak.current > 0 ? '#b71c1c' : 'text.secondary' }}>Mevcut Seri</Typography>
              <Typography variant="h5" fontWeight="bold" fontSize={isMobile ? '1.5rem' : '2rem'}>{streak.current}</Typography>
              <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>gün</Typography>
            </Paper>
            <Paper sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 0, p: isMobile ? 1 : 1.5, textAlign: 'center', bgcolor: 'warning.light', border: '2px solid', borderColor: 'warning.main' }}>
              <Typography variant="caption" display="block" fontWeight="700" fontSize={isMobile ? '0.65rem' : '0.75rem'} sx={{ color: '#e65100' }}>En Uzun Seri</Typography>
              <Typography variant="h5" fontWeight="bold" fontSize={isMobile ? '1.5rem' : '2rem'}>{streak.longest}</Typography>
              <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>gün</Typography>
            </Paper>
            <Paper sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 0, p: isMobile ? 1 : 1.5, textAlign: 'center', bgcolor: 'success.light', border: '2px solid', borderColor: 'success.main' }}>
              <Typography variant="caption" display="block" fontWeight="700" fontSize={isMobile ? '0.65rem' : '0.75rem'} sx={{ color: '#1b5e20' }}>Bu Ay</Typography>
              <Typography variant="h5" fontWeight="bold" fontSize={isMobile ? '1.5rem' : '2rem'}>{streak.thisMonth}</Typography>
              <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>aktif gün</Typography>
            </Paper>
            <Paper sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 0, p: isMobile ? 1 : 1.5, textAlign: 'center', bgcolor: 'info.light', border: '2px solid', borderColor: 'info.main' }}>
              <Typography variant="caption" display="block" fontWeight="700" fontSize={isMobile ? '0.65rem' : '0.75rem'} sx={{ color: '#01579b' }}>Toplam</Typography>
              <Typography variant="h5" fontWeight="bold" fontSize={isMobile ? '1.5rem' : '2rem'}>{streak.totalActiveDays}</Typography>
              <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>aktif gün</Typography>
            </Paper>
          </Stack>
        </CardContent>
      </Card>

      {/* Genel Ortalamalar */}
      <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={isMobile ? 1.5 : 2}>
            <TrendingUpIcon color="primary" sx={{ fontSize: isMobile ? 20 : 24 }} />
            <Typography variant={isMobile ? 'subtitle2' : 'h6'} fontWeight="bold">Genel Ortalamalar</Typography>
            <Chip label="Tüm zamanlar" size="small" variant="outlined" />
          </Box>
          <Stack spacing={isMobile ? 1 : 1.5}>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" fontWeight="600" fontSize={isMobile ? '0.8rem' : undefined}>Kalori</Typography>
                <Typography variant="caption" color="text.secondary">{averageCalories} / {goal.calories} kcal</Typography>
              </Box>
              <LinearProgress variant="determinate" value={Math.min((averageCalories / goal.calories) * 100, 100)} color="error" sx={{ height: isMobile ? 6 : 8, borderRadius: 4 }} />
            </Box>
            <Stack direction="row" spacing={isMobile ? 1 : 2}>
              <Box flex={1}>
                <Typography variant="caption" display="block" textAlign="center" mb={0.5} fontSize={isMobile ? '0.65rem' : '0.75rem'}>Protein</Typography>
                <LinearProgress variant="determinate" value={Math.min((averageProtein / goal.protein) * 100, 100)} color="info" sx={{ height: 6, borderRadius: 3 }} />
                <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">{averageProtein}g / {goal.protein}g</Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" display="block" textAlign="center" mb={0.5} fontSize={isMobile ? '0.65rem' : '0.75rem'}>Karbonhidrat</Typography>
                <LinearProgress variant="determinate" value={Math.min((averageCarbs / goal.carbs) * 100, 100)} color="success" sx={{ height: 6, borderRadius: 3 }} />
                <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">{averageCarbs}g / {goal.carbs}g</Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" display="block" textAlign="center" mb={0.5} fontSize={isMobile ? '0.65rem' : '0.75rem'}>Yağ</Typography>
                <LinearProgress variant="determinate" value={Math.min((averageFat / goal.fat) * 100, 100)} color="warning" sx={{ height: 6, borderRadius: 3 }} />
                <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">{averageFat}g / {goal.fat}g</Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Rekorlar */}
      {(records.bestDay || records.highestProtein) && (
        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
            <Box display="flex" alignItems="center" gap={1} mb={isMobile ? 1.5 : 2}>
              <EmojiEventsIcon sx={{ color: 'warning.main', fontSize: isMobile ? 20 : 24 }} />
              <Typography variant={isMobile ? 'subtitle2' : 'h6'} fontWeight="bold">Rekorlar</Typography>
            </Box>
            <Stack spacing={1}>
              {records.bestDay && (
                <Paper sx={{ p: isMobile ? 1 : 1.5, bgcolor: 'success.light', border: '1px solid', borderColor: 'success.main' }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                    <EmojiEventsIcon sx={{ fontSize: 16, color: 'success.dark' }} />
                    <Typography variant="caption" color="success.dark" fontWeight="600" fontSize={isMobile ? '0.65rem' : '0.75rem'}>Hedefe En Yakın Gün</Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight="bold" fontSize={isMobile ? '0.75rem' : '0.85rem'}>{formatDate(records.bestDay.date)}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>{records.bestDay.calories} kcal (hedef: {goal.calories})</Typography>
                </Paper>
              )}
              {records.highestProtein && (
                <Paper sx={{ p: isMobile ? 1 : 1.5, bgcolor: 'info.light', border: '1px solid', borderColor: 'info.main' }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                    <TrendingUpIcon sx={{ fontSize: 16, color: 'info.dark' }} />
                    <Typography variant="caption" color="info.dark" fontWeight="600" fontSize={isMobile ? '0.65rem' : '0.75rem'}>En Yüksek Protein</Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight="bold" fontSize={isMobile ? '0.75rem' : '0.85rem'}>{formatDate(records.highestProtein.date)}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>{records.highestProtein.protein}g protein</Typography>
                </Paper>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Aylık Bar Chart */}
      {monthlyBars.length > 0 && (
        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <CalendarMonthIcon color="primary" sx={{ fontSize: isMobile ? 20 : 24 }} />
              <Typography variant={isMobile ? 'subtitle2' : 'h6'} fontWeight="bold">Aylık Özet</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={isMobile ? 1.5 : 2}>
              Son 6 ay — hedefe ulaşılan gün yüzdesi
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
              <BarChart data={monthlyBars} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fontSize: isMobile ? 11 : 13 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value, _name, props) => [
                    `${typeof value === 'number' ? value : 0}% (${props.payload.daysOnTarget}/${props.payload.totalDays} gün)`,
                    'Hedefe Ulaşılan',
                  ]}
                  contentStyle={{ fontSize: isMobile ? 11 : 13 }}
                />
                <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {monthlyBars.map((entry: MonthlyBarData, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage >= 70 ? '#4caf50' : entry.percentage >= 40 ? '#ff9800' : '#ef5350'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Stack direction="row" spacing={2} justifyContent="center" mt={1}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#4caf50' }} />
                <Typography variant="caption" fontSize={isMobile ? '0.6rem' : '0.7rem'}>≥70%</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#ff9800' }} />
                <Typography variant="caption" fontSize={isMobile ? '0.6rem' : '0.7rem'}>40-70%</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#ef5350' }} />
                <Typography variant="caption" fontSize={isMobile ? '0.6rem' : '0.7rem'}>{'<'}40%</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}