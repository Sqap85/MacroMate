import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Stack,
  Divider,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ScaleIcon from '@mui/icons-material/Scale';
import EggIcon from '@mui/icons-material/Egg';
import type { FoodTemplate, MeasurementUnit } from '../types';

interface FoodTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  templates: FoodTemplate[];
  onAddTemplate: (template: Omit<FoodTemplate, 'id'>) => void;
  onDeleteTemplate: (id: string) => void;
  onEditTemplate: (id: string, template: Omit<FoodTemplate, 'id'>) => void;
}

export function FoodTemplatesModal({
  open,
  onClose,
  templates,
  onAddTemplate,
  onDeleteTemplate,
  onEditTemplate,
}: FoodTemplatesModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'gram' as MeasurementUnit,
    servingSize: '',
    caloriesPer100g: '',
    proteinPer100g: '',
    carbsPer100g: '',
    fatPer100g: '',
    // Adet bazında değerler
    caloriesPerPiece: '',
    proteinPerPiece: '',
    carbsPerPiece: '',
    fatPerPiece: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<FoodTemplate | null>(null);

  // Form sıfırlama yardımcı fonksiyonu
  const resetForm = () => {
    setFormData({
      name: '',
      unit: 'gram',
      servingSize: '',
      caloriesPer100g: '',
      proteinPer100g: '',
      carbsPer100g: '',
      fatPer100g: '',
      caloriesPerPiece: '',
      proteinPerPiece: '',
      carbsPerPiece: '',
      fatPerPiece: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Lütfen besin adı giriniz');
      return;
    }

    // Adet bazında girildiyse adet başına değerleri kaydet
    let caloriesPer100g: number;
    let proteinPer100g: number;
    let carbsPer100g: number;
    let fatPer100g: number;

    if (formData.unit === 'piece') {
      // Adet bazında değerler girildiyse
      if (!formData.caloriesPerPiece) {
        alert('Lütfen adet başına kalori giriniz');
        return;
      }
      
      const caloriesPerPiece = Number(formData.caloriesPerPiece);
      const proteinPerPiece = Number(formData.proteinPerPiece) || 0;
      const carbsPerPiece = Number(formData.carbsPerPiece) || 0;
      const fatPerPiece = Number(formData.fatPerPiece) || 0;

      // Adet bazında değerleri 100g yerine saklayacağız (100 birim = 1 adet kabul ederek)
      caloriesPer100g = caloriesPerPiece;
      proteinPer100g = proteinPerPiece;
      carbsPer100g = carbsPerPiece;
      fatPer100g = fatPerPiece;
    } else {
      // 100g bazında direkt girildi
      if (!formData.caloriesPer100g) {
        alert('Lütfen 100g başına kalori giriniz');
        return;
      }
      
      caloriesPer100g = Number(formData.caloriesPer100g);
      proteinPer100g = Number(formData.proteinPer100g) || 0;
      carbsPer100g = Number(formData.carbsPer100g) || 0;
      fatPer100g = Number(formData.fatPer100g) || 0;
    }

    const templateData = {
      name: formData.name,
      unit: formData.unit,
      servingSize: undefined,
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
    };

    if (editingId) {
      onEditTemplate(editingId, templateData);
      setEditingId(null);
    } else {
      onAddTemplate(templateData);
    }

    // Formu temizle
    resetForm();
  };

  const handleEdit = (template: FoodTemplate) => {
    if (template.unit === 'piece') {
      setFormData({
        name: template.name,
        unit: template.unit,
        servingSize: '',
        caloriesPer100g: '',
        proteinPer100g: '',
        carbsPer100g: '',
        fatPer100g: '',
        caloriesPerPiece: template.caloriesPer100g.toString(),
        proteinPerPiece: template.proteinPer100g.toString(),
        carbsPerPiece: template.carbsPer100g.toString(),
        fatPerPiece: template.fatPer100g.toString(),
      });
    } else {
      // Gram bazlı: 100g başına değerler
      setFormData({
        name: template.name,
        unit: template.unit,
        servingSize: '',
        caloriesPer100g: template.caloriesPer100g.toString(),
        proteinPer100g: template.proteinPer100g.toString(),
        carbsPer100g: template.carbsPer100g.toString(),
        fatPer100g: template.fatPer100g.toString(),
        caloriesPerPiece: '',
        proteinPerPiece: '',
        carbsPerPiece: '',
        fatPerPiece: '',
      });
    }
    setEditingId(template.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleDeleteClick = (template: FoodTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      onDeleteTemplate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="templates-dialog-title"
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div" id="templates-dialog-title">
          🥗 Besin Şablonlarım
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small"
          aria-label="Kapat"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>
          {/* Yeni Şablon Ekleme Formu */}
          <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight="600">
                {editingId ? 'Besin Düzenle' : 'Yeni Besin Ekle'}
              </Typography>
              {editingId && (
                <Button 
                  size="small" 
                  onClick={handleCancelEdit}
                  variant="outlined"
                  color="secondary"
                >
                  İptal
                </Button>
              )}
            </Box>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Besin Adı"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Tavuk Göğsü, Yumurta, Elma"
                  required
                  size="small"
                />

                {/* Ölçü Birimi Seçimi */}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Ölçü Birimi
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.unit}
                    exclusive
                    onChange={(_, value) => value && setFormData({ ...formData, unit: value as MeasurementUnit })}
                    fullWidth
                    size="small"
                  >
                    <ToggleButton value="gram">
                      <ScaleIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Gram
                    </ToggleButton>
                    <ToggleButton value="piece">
                      <EggIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Adet
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {formData.unit === 'piece' 
                    ? '1 adet için besin değerlerini giriniz' 
                    : '100 gram için besin değerlerini giriniz'}
                </Typography>
                
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label={formData.unit === 'piece' ? 'Kalori (1 adet)' : 'Kalori (100g)'}
                    type="number"
                    value={formData.unit === 'piece' ? formData.caloriesPerPiece : formData.caloriesPer100g}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ...(formData.unit === 'piece' 
                        ? { caloriesPerPiece: e.target.value }
                        : { caloriesPer100g: e.target.value })
                    })}
                    required
                    inputProps={{ min: 0, step: 1 }}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label={formData.unit === 'piece' ? 'Protein (1 adet)' : 'Protein (100g)'}
                    type="number"
                    value={formData.unit === 'piece' ? formData.proteinPerPiece : formData.proteinPer100g}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ...(formData.unit === 'piece' 
                        ? { proteinPerPiece: e.target.value }
                        : { proteinPer100g: e.target.value })
                    })}
                    inputProps={{ min: 0, step: 0.1 }}
                    size="small"
                  />
                </Box>
                
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label={formData.unit === 'piece' ? 'Karbonhidrat (1 adet)' : 'Karbonhidrat (100g)'}
                    type="number"
                    value={formData.unit === 'piece' ? formData.carbsPerPiece : formData.carbsPer100g}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ...(formData.unit === 'piece' 
                        ? { carbsPerPiece: e.target.value }
                        : { carbsPer100g: e.target.value })
                    })}
                    inputProps={{ min: 0, step: 0.1 }}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label={formData.unit === 'piece' ? 'Yağ (1 adet)' : 'Yağ (100g)'}
                    type="number"
                    value={formData.unit === 'piece' ? formData.fatPerPiece : formData.fatPer100g}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ...(formData.unit === 'piece' 
                        ? { fatPerPiece: e.target.value }
                        : { fatPer100g: e.target.value })
                    })}
                    inputProps={{ min: 0, step: 0.1 }}
                    size="small"
                  />
                </Box>
                
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  type="submit"
                  startIcon={editingId ? <EditIcon /> : <AddIcon />}
                >
                  {editingId ? 'Değişiklikleri Kaydet' : 'Şablon Ekle'}
                </Button>
              </Stack>
            </Box>
          </Paper>

          {/* Kayıtlı Şablonlar Listesi */}
          <Box>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Kayıtlı Besinler ({templates.length})
            </Typography>
            {templates.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                <Typography color="text.secondary">
                  Henüz kayıtlı besin yok. Yukarıdan ekleyebilirsiniz!
                </Typography>
              </Paper>
            ) : (
              <List sx={{ 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {templates.map((template) => (
                  <ListItem 
                    key={template.id}
                    divider
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {template.name}
                          </Typography>
                          <Chip 
                            label={template.unit === 'gram' ? 'Gram' : 'Adet'}
                            size="small"
                            color={template.unit === 'gram' ? 'default' : 'primary'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" component="div" color="text.secondary">
                          {template.unit === 'piece'
                            ? `1 adet: ${template.caloriesPer100g} kcal | P: ${template.proteinPer100g}g | C: ${template.carbsPer100g}g | F: ${template.fatPer100g}g`
                            : `100g: ${template.caloriesPer100g} kcal | P: ${template.proteinPer100g}g | C: ${template.carbsPer100g}g | F: ${template.fatPer100g}g`
                          }
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={0.5}>
                        <IconButton
                          aria-label="edit"
                          onClick={() => handleEdit(template)}
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDeleteClick(template)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Kapat
        </Button>
      </DialogActions>

      {/* Silme Onay Dialogu */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="delete-confirm-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: 2,
            m: 2,
          }
        }}
      >
        <DialogTitle id="delete-confirm-dialog-title">
          <Typography variant="h6">
            Besini Sil
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Bu besini silmek istediğinizden emin misiniz?
          </Typography>
          
          {templateToDelete && (
            <Box sx={{ 
              mt: 2,
              p: 1.5,
              bgcolor: 'error.50',
              borderRadius: 1,
              borderLeft: 3,
              borderColor: 'error.main'
            }}>
              <Typography variant="body2" fontWeight="medium">
                {templateToDelete.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {templateToDelete.caloriesPer100g} kcal / 100g
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            color="inherit"
          >
            İptal
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
