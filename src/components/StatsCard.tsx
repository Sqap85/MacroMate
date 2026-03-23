import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SettingsIcon from '@mui/icons-material/Settings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { DailyStats, DailyGoal } from '../types';
import { formatGrams } from '../utils/numberUtils';

interface StatsCardProps {
  stats: DailyStats;
  goal: DailyGoal;
  onOpenSettings?: () => void;
}

function getMacroRemainingLabel(remaining: number): string {
  if (remaining > 0) return `${formatGrams(remaining)}g kalan`;
  if (remaining === 0) return 'Hedefte ✓';
  return `+${formatGrams(Math.abs(remaining))}g fazla`;
}

// Circular SVG progress inspired by 21st.dev Vo2MaxCard
function CircularProgress({ value, size = 120, strokeWidth = 10, color = '#18181b' }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.10)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

export function StatsCard({ stats, goal, onOpenSettings }: Readonly<StatsCardProps>) {
  const getPercentage = (current: number, target: number) =>
    Math.min((current / target) * 100, 100);

  const caloriePercentage = getPercentage(stats.totalCalories, goal.calories);
  const proteinPercentage = getPercentage(stats.totalProtein, goal.protein);
  const carbsPercentage   = getPercentage(stats.totalCarbs, goal.carbs);
  const fatPercentage     = getPercentage(stats.totalFat, goal.fat);

  const calorieRemaining = Math.round(goal.calories - stats.totalCalories);
  const rawCaloriePct = goal.calories > 0 ? (stats.totalCalories / goal.calories) * 100 : 0;

  // Circular ring color — blue when on track, amber when slightly over, red when way over
  const ringColor = rawCaloriePct > 115
    ? '#dc2626'
    : rawCaloriePct > 100
      ? '#d97706'
      : '#0284c7';

  const renderCalorieStatus = () => {
    if (calorieRemaining > 0) {
      return (
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center',
            px: 2, py: 1, borderRadius: 20,
            bgcolor: 'rgba(24,24,27,0.08)',
            border: '1px solid rgba(24,24,27,0.15)',
          }}
        >
          <TrendingDownIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600} color="primary.main">
            {calorieRemaining} kcal kalan
          </Typography>
        </Box>
      );
    }
    if (calorieRemaining === 0) {
      return (
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center',
            px: 2, py: 1, borderRadius: 20,
            bgcolor: 'rgba(21,128,61,0.08)',
            border: '1px solid rgba(21,128,61,0.2)',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="body2" fontWeight={600} color="success.main">
            Hedef Tamamlandı!
          </Typography>
        </Box>
      );
    }
    return (
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center',
          px: 2, py: 1, borderRadius: 20,
          bgcolor: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <TrendingUpIcon sx={{ fontSize: 16, color: 'error.main' }} />
        <Typography variant="body2" fontWeight={600} color="error.main">
          Hedef Aşıldı: +{Math.abs(calorieRemaining)} kcal
        </Typography>
      </Box>
    );
  };

  const macros = [
    {
      label: 'Protein',
      value: stats.totalProtein,
      goal: goal.protein,
      pct: proteinPercentage,
      remaining: goal.protein - stats.totalProtein,
      progressClass: 'progress-protein',
      color: '#0369a1',
      bg: 'rgba(3,105,161,0.08)',
      border: 'rgba(3,105,161,0.2)',
    },
    {
      label: 'Karbonhidrat',
      value: stats.totalCarbs,
      goal: goal.carbs,
      pct: carbsPercentage,
      remaining: goal.carbs - stats.totalCarbs,
      progressClass: 'progress-carbs',
      color: '#15803d',
      bg: 'rgba(21,128,61,0.08)',
      border: 'rgba(21,128,61,0.2)',
    },
    {
      label: 'Yağ',
      value: stats.totalFat,
      goal: goal.fat,
      pct: fatPercentage,
      remaining: goal.fat - stats.totalFat,
      progressClass: 'progress-fat',
      color: '#b45309',
      bg: 'rgba(180,83,9,0.08)',
      border: 'rgba(180,83,9,0.2)',
    },
  ];

  return (
    <Card elevation={2}>
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 32, height: 32, borderRadius: '9px',
                background: 'linear-gradient(135deg, #d97706, #fbbf24)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
              }}
            >
              <LocalFireDepartmentIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>Günlük Özet</Typography>
          </Box>
          {onOpenSettings && (
            <Tooltip title="Hedefleri Düzenle">
              <IconButton
                onClick={onOpenSettings}
                size="small"
                sx={{
                  color: 'text.secondary',
                  bgcolor: 'rgba(0,0,0,0.04)',
                  '&:hover': { bgcolor: 'rgba(24,24,27,0.1)', color: 'primary.main' },
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Main: Circular Calorie + Macros */}
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'center', sm: 'center' }}
          gap={{ xs: 2, sm: 3 }}
        >
          {/* Circular Progress */}
          <Box
            position="relative"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <CircularProgress value={caloriePercentage} size={130} strokeWidth={12} color={ringColor} />
            <Box
              position="absolute"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
            >
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ lineHeight: 1, color: ringColor }}
              >
                {Math.round(stats.totalCalories)}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                / {goal.calories}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                kcal
              </Typography>
            </Box>
          </Box>

          {/* Macro Bars */}
          <Box flex={1} width="100%">
            <Stack spacing={1.5}>
              {macros.map((macro) => (
                <Box key={macro.label}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: macro.color,
                          boxShadow: `0 0 6px ${macro.color}80`,
                        }}
                      />
                      <Typography variant="caption" fontWeight={600} color="text.primary">
                        {macro.label}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" color="text.secondary">
                        {formatGrams(macro.value)}g / {formatGrams(macro.goal)}g
                      </Typography>
                      <Box
                        sx={{
                          display: 'inline-flex', alignItems: 'center',
                          px: 0.75, py: 0.25, borderRadius: 6,
                          bgcolor: macro.bg, border: `1px solid ${macro.border}`,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, color: macro.color, lineHeight: 1 }}>
                          {getMacroRemainingLabel(macro.remaining)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={macro.pct}
                    className={macro.progressClass}
                    sx={{ height: 7, borderRadius: 4 }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        {/* Calorie Status */}
        <Box mt={2.5} display="flex" justifyContent="center">
          {renderCalorieStatus()}
        </Box>
      </CardContent>
    </Card>
  );
}
