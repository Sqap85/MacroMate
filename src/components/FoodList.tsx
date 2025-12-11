import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Stack,
  Divider,
  Grow,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import type { Food } from '../types';

interface FoodListProps {
  foods: Food[];
  onDeleteFood: (id: string) => void;
}

export function FoodList({ foods, onDeleteFood }: FoodListProps) {
  if (foods.length === 0) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <RestaurantIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Henüz yemek eklenmedi
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Yukarıdaki formdan yemek ekleyerek başlayın
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Zamanı formatla
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card 
      elevation={3}
      sx={{
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📝 Bugünün Yemekleri ({foods.length})
        </Typography>
        
        <Stack spacing={2} mt={2}>
          {foods.map((food, index) => (
            <Grow in timeout={300 + index * 100} key={food.id}>
              <Box>
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="flex-start"
                gap={2}
              >
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {food.name}
                    </Typography>
                    {food.mealType && (
                      <Chip
                        label={
                          food.mealType === 'breakfast' ? '🌅 Kahvaltı' :
                          food.mealType === 'lunch' ? '☀️ Öğle' :
                          food.mealType === 'dinner' ? '🌙 Akşam' :
                          '🍪 Atıştırmalık'
                        }
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(food.timestamp)}
                    </Typography>
                  </Box>
                  
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip 
                      label={`${food.calories} kcal`} 
                      size="small" 
                      color="error"
                      variant="outlined"
                    />
                    {food.protein > 0 && (
                      <Chip 
                        label={`P: ${food.protein}g`} 
                        size="small" 
                        color="info"
                        variant="outlined"
                      />
                    )}
                    {food.carbs > 0 && (
                      <Chip 
                        label={`K: ${food.carbs}g`} 
                        size="small" 
                        color="success"
                        variant="outlined"
                      />
                    )}
                    {food.fat > 0 && (
                      <Chip 
                        label={`Y: ${food.fat}g`} 
                        size="small" 
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Box>
                
                <IconButton 
                  color="error" 
                  onClick={() => onDeleteFood(food.id)}
                  size="small"
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              
              {food.id !== foods[foods.length - 1].id && (
                <Divider sx={{ mt: 2 }} />
              )}
              </Box>
            </Grow>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
