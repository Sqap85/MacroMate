import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Chip,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useState } from 'react';
import type { Food, DailyGoal } from '../types';
import { calculateWeeklyStats, formatDate, getDayName } from '../utils/dateUtils';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  foods: Food[];
  goal: DailyGoal;
}

export function HistoryModal({ open, onClose, foods, goal }: HistoryModalProps) {
  const [tabValue, setTabValue] = useState(0);
  
  // Farklı zaman aralıkları
  const weeklyStats = calculateWeeklyStats(foods, 7);
  const monthlyStats = calculateWeeklyStats(foods, 30);
  const quarterlyStats = calculateWeeklyStats(foods, 90);
  
  // Tüm geçmiş - en eski yemekten bugüne kadar
  const allTimeStats = (() => {
    if (foods.length === 0) return calculateWeeklyStats(foods, 0);
    
    const oldestFood = foods.reduce((oldest, food) => 
      food.timestamp < oldest.timestamp ? food : oldest
    );
    
    const oldestDate = new Date(oldestFood.timestamp);
    const today = new Date();
    const daysDiff = Math.ceil((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return calculateWeeklyStats(foods, Math.max(daysDiff, 1));
  })();
  
  const statsOptions = [weeklyStats, monthlyStats, quarterlyStats, allTimeStats];
  const currentStats = statsOptions[tabValue];
  const activeDays = currentStats.days.filter(d => d.foods.length > 0).length;
  const hasAnyData = activeDays > 0;

  const getPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getColor = (percentage: number): "primary" | "success" | "warning" | "error" => {
    if (percentage < 70) return "primary";
    if (percentage < 90) return "success";
    if (percentage < 110) return "warning";
    return "error";
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarMonthIcon />
            <Typography variant="h6">Geçmiş & İstatistikler</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ mb: 3 }}
          variant="fullWidth"
        >
          <Tab label="Son 7 Gün" />
          <Tab label="Son 30 Gün" />
          <Tab label="Son 90 Gün" />
          <Tab 
            label={
              <Box>
                <Typography variant="caption" display="block">Tüm Geçmiş</Typography>
                {foods.length > 0 && (
                  <Typography variant="caption" fontSize="0.65rem" color="text.secondary">
                    {allTimeStats.totalDays} gün
                  </Typography>
                )}
              </Box>
            }
          />
        </Tabs>

        {hasAnyData ? (
          <>
            {/* Özet İstatistikler */}
            <Card sx={{ mb: 3, bgcolor: 'primary.light' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUpIcon />
                    <Typography variant="h6">
                      {tabValue === 3 ? 'Genel İstatistikler' : 'Ortalama Günlük Değerler'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip 
                      label={`${activeDays} aktif gün`}
                      size="small"
                      color="primary"
                    />
                    {tabValue === 3 && foods.length > 0 && (
                      <Chip 
                        label={`${Math.round((activeDays / currentStats.totalDays) * 100)}% tutarlılık`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Box>
            
            <Stack spacing={2}>
              {/* Kalori */}
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" fontWeight="bold">
                    Kalori
                  </Typography>
                  <Typography variant="body2">
                    {currentStats.averageCalories} / {goal.calories} kcal
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={getPercentage(currentStats.averageCalories, goal.calories)}
                  color={getColor(getPercentage(currentStats.averageCalories, goal.calories))}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              {/* Makrolar */}
              <Stack direction="row" spacing={2}>
                <Box flex={1}>
                  <Chip 
                    label={`Protein: ${currentStats.averageProtein}g`} 
                    color="info" 
                    size="small" 
                    sx={{ width: '100%' }}
                  />
                </Box>
                <Box flex={1}>
                  <Chip 
                    label={`Karb: ${currentStats.averageCarbs}g`} 
                    color="success" 
                    size="small" 
                    sx={{ width: '100%' }}
                  />
                </Box>
                <Box flex={1}>
                  <Chip 
                    label={`Yağ: ${currentStats.averageFat}g`} 
                    color="warning" 
                    size="small" 
                    sx={{ width: '100%' }}
                  />
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Günlük Detaylar */}
        <Box mb={2}>
          <Typography variant="h6" gutterBottom>
            Günlük Detaylar
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {currentStats.days.filter(d => d.foods.length > 0).length} / {currentStats.totalDays} gün aktif
          </Typography>
        </Box>
        
        <Stack spacing={2} sx={{ maxHeight: 500, overflow: 'auto', pr: 1, pb: 1 }}>
          {currentStats.days.slice().reverse().map((day) => {
            const percentage = getPercentage(day.totalCalories, goal.calories);
            const hasData = day.foods.length > 0;
            
            return (
              <Card 
                key={day.date} 
                variant="outlined"
                sx={{
                  opacity: hasData ? 1 : 0.6,
                  borderLeft: hasData ? 3 : 0,
                  borderLeftColor: hasData ? 'primary.main' : 'transparent',
                  overflow: 'visible',
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  {/* Başlık */}
                  <Box 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center" 
                    mb={1.5}
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Box minWidth={0} flex="1 1 auto">
                      <Typography variant="subtitle2" fontWeight="bold" noWrap>
                        {formatDate(day.date)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {getDayName(day.date).toUpperCase()}
                      </Typography>
                    </Box>
                    <Box flexShrink={0}>
                      {hasData ? (
                        <Chip
                          label={`${day.totalCalories} kcal`}
                          color={getColor(percentage)}
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="Veri yok"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* İçerik */}
                  {hasData ? (
                    <>
                      {/* Progress bar */}
                      <Box mb={1.5}>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          color={getColor(percentage)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      
                      {/* Makro chipler */}
                      <Box mb={1.5}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip 
                            label={`P: ${day.totalProtein}g`} 
                            size="small" 
                            variant="outlined"
                            color="info"
                          />
                          <Chip 
                            label={`K: ${day.totalCarbs}g`} 
                            size="small" 
                            variant="outlined"
                            color="success"
                          />
                          <Chip 
                            label={`Y: ${day.totalFat}g`} 
                            size="small" 
                            variant="outlined"
                            color="warning"
                          />
                        </Stack>
                      </Box>

                      <Divider />
                      
                      {/* Yemek listesi */}
                      <Box mt={1.5}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          display="block" 
                          mb={0.75}
                          fontWeight="600"
                        >
                          {day.foods.length} öğün
                        </Typography>
                        <Box>
                          {day.foods.map((food, idx) => (
                            <Box 
                              key={idx}
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 0.5,
                                mb: 0.5,
                                minWidth: 0,
                              }}
                            >
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ flexShrink: 0 }}
                              >
                                •
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  wordBreak: 'break-word',
                                  overflow: 'hidden',
                                  flex: 1,
                                  minWidth: 0,
                                }}
                              >
                                {food.name} <Box component="span" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>({food.calories} kcal)</Box>
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ py: 2 }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        fontStyle="italic"
                        textAlign="center"
                      >
                        Bu gün için henüz yemek kaydı eklenmedi
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
          </>
        ) : (
          <Box textAlign="center" py={8}>
            <CalendarMonthIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Henüz veri yok
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Yemek eklemeye başladığınızda burada geçmiş verilerinizi ve istatistiklerinizi görebileceksiniz
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
