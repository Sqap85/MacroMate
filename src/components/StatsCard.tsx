import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
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

interface StatsCardProps {
  stats: DailyStats;
  goal: DailyGoal;
  onOpenSettings?: () => void;
}

export function StatsCard({ stats, goal, onOpenSettings }: StatsCardProps) {
  // Yüzde hesapla
  const getPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  // Progress bar rengi
  const getColor = (percentage: number): "primary" | "warning" | "error" => {
    if (percentage < 70) return "primary";
    if (percentage < 100) return "warning";
    return "error";
  };

  const caloriePercentage = getPercentage(stats.totalCalories, goal.calories);
  const proteinPercentage = getPercentage(stats.totalProtein, goal.protein);
  const carbsPercentage = getPercentage(stats.totalCarbs, goal.carbs);
  const fatPercentage = getPercentage(stats.totalFat, goal.fat);

  // Kalan/Fazla hesapla
  const calorieRemaining = Math.round(goal.calories - stats.totalCalories);
  const proteinRemaining = Math.round(goal.protein - stats.totalProtein);
  const carbsRemaining = Math.round(goal.carbs - stats.totalCarbs);
  const fatRemaining = Math.round(goal.fat - stats.totalFat);

  return (
    <Card elevation={3}>
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center">
            <LocalFireDepartmentIcon color="error" sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Günlük Özet
            </Typography>
          </Box>
          {onOpenSettings && (
            <Tooltip title="Hedefleri Düzenle">
              <IconButton onClick={onOpenSettings} size="small" color="primary">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Kalori */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" fontWeight="600">
              Kalori
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.totalCalories} / {goal.calories} kcal
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={caloriePercentage}
            color={getColor(caloriePercentage)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Makro Besinler */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
          {/* Protein */}
          <Box flex={1}>
            <Chip
              label="Protein"
              color="info"
              size="small"
              sx={{ mb: 0.5, width: '100%', height: 22, fontSize: '0.75rem' }}
            />
            <Typography variant="caption" align="center" display="block" fontSize="0.75rem">
              {stats.totalProtein}g / {goal.protein}g
            </Typography>
            <LinearProgress
              variant="determinate"
              value={proteinPercentage}
              color={getColor(proteinPercentage)}
              sx={{ height: 5, borderRadius: 3, mt: 0.5 }}
            />
            <Typography variant="caption" align="center" display="block" fontSize="0.65rem" color="text.secondary" mt={0.5}>
              {proteinRemaining > 0 ? `Kalan: ${proteinRemaining}g` : proteinRemaining === 0 ? 'Hedefte ✓' : `Fazla: ${Math.abs(proteinRemaining)}g`}
            </Typography>
          </Box>

          {/* Karbonhidrat */}
          <Box flex={1}>
            <Chip
              label="Karbonhidrat"
              color="success"
              size="small"
              sx={{ mb: 0.5, width: '100%', height: 22, fontSize: '0.75rem' }}
            />
            <Typography variant="caption" align="center" display="block" fontSize="0.75rem">
              {stats.totalCarbs}g / {goal.carbs}g
            </Typography>
            <LinearProgress
              variant="determinate"
              value={carbsPercentage}
              color={getColor(carbsPercentage)}
              sx={{ height: 5, borderRadius: 3, mt: 0.5 }}
            />
            <Typography variant="caption" align="center" display="block" fontSize="0.65rem" color="text.secondary" mt={0.5}>
              {carbsRemaining > 0 ? `Kalan: ${carbsRemaining}g` : carbsRemaining === 0 ? 'Hedefte ✓' : `Fazla: ${Math.abs(carbsRemaining)}g`}
            </Typography>
          </Box>

          {/* Yağ */}
          <Box flex={1}>
            <Chip
              label="Yağ"
              color="warning"
              size="small"
              sx={{ mb: 0.5, width: '100%', height: 22, fontSize: '0.75rem' }}
            />
            <Typography variant="caption" align="center" display="block" fontSize="0.75rem">
              {stats.totalFat}g / {goal.fat}g
            </Typography>
            <LinearProgress
              variant="determinate"
              value={fatPercentage}
              color={getColor(fatPercentage)}
              sx={{ height: 5, borderRadius: 3, mt: 0.5 }}
            />
            <Typography variant="caption" align="center" display="block" fontSize="0.65rem" color="text.secondary" mt={0.5}>
              {fatRemaining > 0 ? `Kalan: ${fatRemaining}g` : fatRemaining === 0 ? 'Hedefte ✓' : `Fazla: ${Math.abs(fatRemaining)}g`}
            </Typography>
          </Box>
        </Stack>

        {/* Kalan Kalori veya Hedef Aşıldı */}
        {calorieRemaining > 0 ? (
          <Box p={1.5} bgcolor="primary.light" borderRadius={2} display="flex" alignItems="center" justifyContent="center" gap={1}>
            <TrendingDownIcon fontSize="small" sx={{ color: 'primary.contrastText' }} />
            <Typography variant="body2" color="primary.contrastText" fontWeight="600">
              Kalan: {calorieRemaining} kcal
            </Typography>
          </Box>
        ) : calorieRemaining === 0 ? (
          <Box p={1.5} bgcolor="success.light" borderRadius={2} display="flex" alignItems="center" justifyContent="center" gap={1}>
            <CheckCircleIcon fontSize="small" sx={{ color: 'success.contrastText' }} />
            <Typography variant="body2" color="success.contrastText" fontWeight="600">
              Hedef Tamamlandı! 🎉
            </Typography>
          </Box>
        ) : (
          <Box p={1.5} bgcolor="error.light" borderRadius={2} display="flex" alignItems="center" justifyContent="center" gap={1}>
            <TrendingUpIcon fontSize="small" sx={{ color: 'error.contrastText' }} />
            <Typography variant="body2" color="error.contrastText" fontWeight="600">
              Hedef Aşıldı: +{Math.abs(calorieRemaining)} kcal
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
