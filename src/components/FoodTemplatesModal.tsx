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
  Checkbox,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ScaleIcon from '@mui/icons-material/Scale';
import EggIcon from '@mui/icons-material/Egg';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import type { FoodTemplate, MeasurementUnit } from '../types';
import { formatGrams } from '../utils/numberUtils';
import { BarcodeScanner } from './BarcodeScanner';

interface FoodTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  templates: FoodTemplate[];
  onAddTemplate: (template: Omit<FoodTemplate, 'id'>, suppressToast?: boolean) => void;
  onDeleteTemplate: (id: string) => void;
  onEditTemplate: (id: string, template: Omit<FoodTemplate, 'id'>) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function FoodTemplatesModal({
  open,
  onClose,
  templates,
  onAddTemplate,
  onDeleteTemplate,
  onEditTemplate,
  onBulkDelete,
}: FoodTemplatesModalProps) {
  // Barkod tarayıcı (save-only modu)
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);

  // Seçim modu
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = templates.length > 0 && selectedIds.length === templates.length;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds([]);
  };

  const handleCancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(templates.map(t => t.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Toplu silme dialog
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = () => {
    if (onBulkDelete) {
      onBulkDelete(selectedIds);
    } else {
      selectedIds.forEach(id => onDeleteTemplate(id));
      showToast({ open: true, message: `${selectedIds.length} besin silindi!`, severity: 'success' });
    }
    setSelectedIds([]);
    setBulkDeleteDialogOpen(false);
    setSelectionMode(false);
  };

  const [formData, setFormData] = useState({
    name: '',
    unit: 'gram' as MeasurementUnit,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const [editingTemplate, setEditingTemplate] = useState<FoodTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<FoodTemplate | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    unit: 'gram' as MeasurementUnit,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false, message: '', severity: 'success',
  });

  const showToast = (toastObj: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' }) => {
    setToast(t => {
      if (t.open) return { ...t, open: false };
      return t;
    });
    setTimeout(() => setToast(toastObj), 100);
  };

  const resetForm = () => {
    setFormData({ name: '', unit: 'gram', calories: '', protein: '', carbs: '', fat: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { alert('Lütfen besin adı giriniz'); return; }
    const exists = templates.some(t => t.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
    if (exists) {
      showToast({ open: true, message: 'Bu isimde bir besin zaten var.', severity: 'error' });
      return;
    }
    if (!formData.calories) { alert('Lütfen kalori bilgisini giriniz'); return; }
    onAddTemplate({
      name: formData.name,
      unit: formData.unit,
      calories: Number(formData.calories),
      protein: Number(formData.protein) || 0,
      carbs: Number(formData.carbs) || 0,
      fat: Number(formData.fat) || 0,
    });
    resetForm();
  };

  const handleEdit = (template: FoodTemplate) => {
    setEditingTemplate(template);
    setEditFormData({
      name: template.name,
      unit: template.unit,
      calories: template.calories.toString(),
      protein: template.protein.toString(),
      carbs: template.carbs.toString(),
      fat: template.fat.toString(),
    });
  };

  const handleEditSave = () => {
    if (!editingTemplate) return;
    if (!editFormData.name) { alert('Lütfen besin adı giriniz'); return; }
    if (!editFormData.calories) { alert('Lütfen kalori bilgisini giriniz'); return; }
    onEditTemplate(editingTemplate.id, {
      name: editFormData.name,
      unit: editFormData.unit,
      calories: Number(editFormData.calories),
      protein: Number(editFormData.protein) || 0,
      carbs: Number(editFormData.carbs) || 0,
      fat: Number(editFormData.fat) || 0,
    });
    setEditingTemplate(null);
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

  const handleExportCSV = () => {
    if (!templates || templates.length === 0) {
      showToast({ open: true, message: 'İndirilecek şablon yok.', severity: 'error' });
      return;
    }
    const header = ['name', 'unit', 'calories', 'protein', 'carbs', 'fat'];
    const rows = templates.map(t => [t.name, t.unit, t.calories, t.protein, t.carbs, t.fat]);
    const csv = [header, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'food_templates.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const MAX_TOTAL = 1000;
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast({ open: true, message: 'Dosya çok büyük (maksimum 2MB).', severity: 'error' });
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) { showToast({ open: true, message: 'Dosya okunamadı.', severity: 'error' }); return; }
      const lines = text.split(/\r?\n/).filter(Boolean);
      const MAX_ROWS = 1000;
      if (lines.length - 1 > MAX_ROWS) {
        showToast({ open: true, message: `Çok fazla satır var (maksimum ${MAX_ROWS} şablon).`, severity: 'error' });
        return;
      }
      if (lines.length < 2) {
        showToast({ open: true, message: 'Geçersiz veya boş CSV dosyası.', severity: 'error' });
        return;
      }
      const expectedHeader = '"name","unit","calories","protein","carbs","fat"';
      if (lines[0].trim() !== expectedHeader) {
        showToast({ open: true, message: 'CSV başlıkları hatalı. Doğru format: "name","unit","calories","protein","carbs","fat"', severity: 'error' });
        return;
      }
      const header = lines[0].split(',').map(h => h.replace(/\"/g, '').trim());
      const nameIdx = header.indexOf('name');
      const unitIdx = header.indexOf('unit');
      const calIdx = header.indexOf('calories');
      const proIdx = header.indexOf('protein');
      const carbIdx = header.indexOf('carbs');
      const fatIdx = header.indexOf('fat');

      const dangerous = (val: string) => /^[=+\-@]/.test(val);
      let validNewCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
        if (row.length < 6) continue;
        const name = row[nameIdx]?.trim() || '';
        const unit = row[unitIdx]?.trim();
        const calories = Number(row[calIdx]);
        const protein = Number(row[proIdx]);
        const carbs = Number(row[carbIdx]);
        const fat = Number(row[fatIdx]);
        if (
          !name || name.length > 50 || dangerous(name) ||
          !['piece', 'gram'].includes(unit) ||
          isNaN(calories) || isNaN(protein) || isNaN(carbs) || isNaN(fat) ||
          calories <= 0 || calories > 5000 ||
          protein < 0 || protein > 500 ||
          carbs < 0 || carbs > 1000 ||
          fat < 0 || fat > 500
        ) continue;
        const exists = templates.some(t => t.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (!exists) validNewCount++;
      }
      if (templates.length + validNewCount > MAX_TOTAL) {
        showToast({ open: true, message: `Toplam şablon limiti aşıldı (maksimum ${MAX_TOTAL}).`, severity: 'error' });
        return;
      }

      let added = 0;
      const skipped: string[] = [];
      let negativeSkipped = 0;
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
        if (row.length < 6) continue;
        const name = row[nameIdx]?.trim() || '';
        const unit = row[unitIdx]?.trim();
        const calories = Number(row[calIdx]);
        const protein = Number(row[proIdx]);
        const carbs = Number(row[carbIdx]);
        const fat = Number(row[fatIdx]);
        if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) { negativeSkipped++; continue; }
        if (
          !name || name.length > 50 || dangerous(name) ||
          !['piece', 'gram'].includes(unit) ||
          isNaN(calories) || isNaN(protein) || isNaN(carbs) || isNaN(fat) ||
          calories <= 0 || calories > 5000 || protein > 500 || carbs > 1000 || fat > 500
        ) continue;
        const exists = templates.some(t => t.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (name && calories && !exists) {
          onAddTemplate({ name, unit: unit as MeasurementUnit, calories, protein, carbs, fat }, true);
          added++;
        } else if (name && exists) {
          skipped.push(name);
        }
      }

      if (added > 0 && skipped.length === 0 && negativeSkipped === 0) {
        showToast({ open: true, message: `${added} şablon başarıyla eklendi.`, severity: 'success' });
      } else if (added > 0 && negativeSkipped > 0) {
        showToast({ open: true, message: `${added} şablon eklendi. ${negativeSkipped} satır negatif değer içerdiği için eklenmedi.`, severity: 'warning' });
      } else if (added > 0 && skipped.length > 0) {
        showToast({ open: true, message: `${added} şablon eklendi. ${skipped.length} satır isim çakıştığı için eklenmedi.`, severity: 'warning' });
      } else if (added === 0 && skipped.length > 0) {
        showToast({ open: true, message: `Hiçbir şablon eklenmedi. ${skipped.length} satır isim çakıştığı için eklenmedi.`, severity: 'error' });
      } else {
        showToast({ open: true, message: 'Uygun veri bulunamadı.', severity: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        aria-labelledby="templates-dialog-title"
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
      >
        <DialogTitle
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            pb: 1,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <RestaurantMenuIcon color="primary" />
            <Typography variant="h6" component="div" id="templates-dialog-title" sx={{ mr: 1 }}>
              Besin Şablonlarım
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Button variant="outlined" size="small" component="label" sx={{ minWidth: 0, px: 1 }}>
              CSV Yükle
              <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
            </Button>
            <Button variant="outlined" size="small" onClick={handleExportCSV} sx={{ minWidth: 0, px: 1 }}>
              CSV İndir
            </Button>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Kapat"
            sx={{ position: 'absolute', top: 8, right: 8, minWidth: 0 }}
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
                  Yeni Besin Ekle
                </Typography>
                {/* ✅ Barkod ile Ekle butonu */}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={() => setBarcodeScannerOpen(true)}
                >
                  Barkod ile Ekle
                </Button>
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
                        <ScaleIcon fontSize="small" sx={{ mr: 0.5 }} />Gram
                      </ToggleButton>
                      <ToggleButton value="piece">
                        <EggIcon fontSize="small" sx={{ mr: 0.5 }} />Adet
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {formData.unit === 'piece' ? '1 adet için besin değerlerini giriniz' : '100 gram için besin değerlerini giriniz'}
                  </Typography>
                  <Box display="flex" gap={2}>
                    <TextField fullWidth label={formData.unit === 'piece' ? 'Kalori (1 adet)' : 'Kalori (100g)'}
                      type="number" value={formData.calories}
                      onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                      required inputProps={{ min: 0, step: 1 }} size="small" />
                    <TextField fullWidth label={formData.unit === 'piece' ? 'Protein (1 adet)' : 'Protein (100g)'}
                      type="number" value={formData.protein}
                      onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                      inputProps={{ min: 0, step: 0.1 }} size="small" />
                  </Box>
                  <Box display="flex" gap={2}>
                    <TextField fullWidth label={formData.unit === 'piece' ? 'Karbonhidrat (1 adet)' : 'Karbonhidrat (100g)'}
                      type="number" value={formData.carbs}
                      onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                      inputProps={{ min: 0, step: 0.1 }} size="small" />
                    <TextField fullWidth label={formData.unit === 'piece' ? 'Yağ (1 adet)' : 'Yağ (100g)'}
                      type="number" value={formData.fat}
                      onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                      inputProps={{ min: 0, step: 0.1 }} size="small" />
                  </Box>
                  <Button fullWidth variant="contained" color="primary" type="submit" startIcon={<AddIcon />}>
                    Şablon Ekle
                  </Button>
                </Stack>
              </Box>
            </Paper>

            {/* Kayıtlı Şablonlar Listesi */}
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Kayıtlı Besinler ({templates.length})
                </Typography>

                {templates.length > 0 && (
                  <Box>
                    {!selectionMode && (
                      <Button size="small" variant="outlined" color="error"
                        startIcon={<DeleteSweepIcon />} onClick={handleEnterSelectionMode}>
                        Toplu Sil
                      </Button>
                    )}
                    {selectionMode && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" variant={allSelected ? 'contained' : 'outlined'} onClick={handleSelectAll}>
                          {allSelected ? 'Tümünü Bırak' : 'Tümünü Seç'}
                        </Button>
                        <Button size="small" variant="contained" color="error" startIcon={<DeleteIcon />}
                          disabled={selectedIds.length === 0} onClick={handleBulkDelete}>
                          Sil ({selectedIds.length})
                        </Button>
                        <Button size="small" variant="text" onClick={handleCancelSelectionMode}>İptal</Button>
                      </Stack>
                    )}
                  </Box>
                )}
              </Box>

              {/* Toplu silme onay dialogu */}
              <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}
                maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2, m: 2 } }}>
                <DialogTitle><Typography variant="h6">Seçili Besinleri Sil</Typography></DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {selectedIds.length} besini silmek istediğinizden emin misiniz?
                  </Typography>
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'error.50', borderRadius: 1, borderLeft: 3, borderColor: 'error.main' }}>
                    <Typography variant="body2" fontWeight="medium">
                      {templates.filter(t => selectedIds.includes(t.id)).map(t => t.name).join(', ')}
                    </Typography>
                  </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                  <Button onClick={() => setBulkDeleteDialogOpen(false)} variant="outlined">İptal</Button>
                  <Button onClick={handleBulkDeleteConfirm} variant="contained" color="error" startIcon={<DeleteIcon />}>Sil</Button>
                </DialogActions>
              </Dialog>

              {templates.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Typography color="text.secondary">
                    Henüz kayıtlı besin yok. Yukarıdan ekleyebilirsiniz!
                  </Typography>
                </Paper>
              ) : (
                <List sx={{
                  bgcolor: 'background.paper', borderRadius: 1,
                  border: '1px solid', borderColor: 'divider',
                  maxHeight: '300px', overflow: 'auto',
                }}>
                  {templates.map((template) => (
                    <ListItem key={template.id} divider sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      {selectionMode && (
                        <Checkbox checked={selectedIds.includes(template.id)}
                          onChange={() => handleSelectOne(template.id)}
                          size="small" sx={{ mr: 1, p: 0.5 }} />
                      )}
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1" fontWeight="medium">{template.name}</Typography>
                            <Chip label={template.unit === 'gram' ? 'Gram' : 'Adet'} size="small"
                              color={template.unit === 'gram' ? 'default' : 'primary'}
                              sx={{ height: 20, fontSize: '0.7rem' }} />
                          </Box>
                        }
                          secondary={
                            <Typography variant="caption" component="span" color="text.secondary" noWrap
                              sx={{ textOverflow: 'ellipsis', overflow: 'hidden', display: 'block', maxWidth: { xs: 180, sm: 320 } }}>
                              {template.unit === 'piece'
                                ? `1 adet: ${template.calories} kcal | P: ${formatGrams(template.protein)}g | K: ${formatGrams(template.carbs)}g | Y: ${formatGrams(template.fat)}g`
                                : `100g: ${template.calories} kcal | P: ${formatGrams(template.protein)}g | K: ${formatGrams(template.carbs)}g | Y: ${formatGrams(template.fat)}g`
                              }
                            </Typography>
                          }
                      />
                      {!selectionMode && (
                        <ListItemSecondaryAction>
                          <Box display="flex" gap={0.5}>
                            <IconButton aria-label="edit" onClick={() => handleEdit(template)} color="primary" size="small">
                              <EditIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(template)} color="error" size="small">
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined">Kapat</Button>
        </DialogActions>

        {/* Besin Düzenleme Dialogu */}
        <Dialog open={!!editingTemplate} onClose={() => setEditingTemplate(null)} maxWidth="sm" fullWidth
          PaperProps={{ sx: { borderRadius: 2, m: 2 } }}>
          <DialogTitle sx={{ pb: 3 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <EditIcon color="primary" />
              <Typography variant="h6">Besin Düzenle</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 1, px: { xs: 2, sm: 3 }, overflow: 'visible' }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField fullWidth label="Besin Adı" value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Örn: Tavuk Göğsü, Yumurta, Elma" required size="small" autoFocus />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>Ölçü Birimi</Typography>
                <ToggleButtonGroup value={editFormData.unit} exclusive fullWidth size="small"
                  onChange={(_, value) => value && setEditFormData({ ...editFormData, unit: value as MeasurementUnit })}>
                  <ToggleButton value="gram"><ScaleIcon fontSize="small" sx={{ mr: 0.5 }} />Gram</ToggleButton>
                  <ToggleButton value="piece"><EggIcon fontSize="small" sx={{ mr: 0.5 }} />Adet</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {editFormData.unit === 'piece' ? '1 adet için besin değerlerini giriniz' : '100 gram için besin değerlerini giriniz'}
              </Typography>
              <Box display="flex" gap={2}>
                <TextField fullWidth label={editFormData.unit === 'piece' ? 'Kalori (1 adet)' : 'Kalori (100g)'}
                  type="number" value={editFormData.calories}
                  onChange={(e) => setEditFormData({ ...editFormData, calories: e.target.value })}
                  required inputProps={{ min: 0, step: 1 }} size="small" />
                <TextField fullWidth label={editFormData.unit === 'piece' ? 'Protein (1 adet)' : 'Protein (100g)'}
                  type="number" value={editFormData.protein}
                  onChange={(e) => setEditFormData({ ...editFormData, protein: e.target.value })}
                  inputProps={{ min: 0, step: 0.1 }} size="small" />
              </Box>
              <Box display="flex" gap={2}>
                <TextField fullWidth label={editFormData.unit === 'piece' ? 'Karbonhidrat (1 adet)' : 'Karbonhidrat (100g)'}
                  type="number" value={editFormData.carbs}
                  onChange={(e) => setEditFormData({ ...editFormData, carbs: e.target.value })}
                  inputProps={{ min: 0, step: 0.1 }} size="small" />
                <TextField fullWidth label={editFormData.unit === 'piece' ? 'Yağ (1 adet)' : 'Yağ (100g)'}
                  type="number" value={editFormData.fat}
                  onChange={(e) => setEditFormData({ ...editFormData, fat: e.target.value })}
                  inputProps={{ min: 0, step: 0.1 }} size="small" />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditingTemplate(null)} variant="outlined">İptal</Button>
            <Button onClick={handleEditSave} color="primary" variant="contained" startIcon={<EditIcon />}>Kaydet</Button>
          </DialogActions>
        </Dialog>

        {/* Tekil Silme Onay Dialogu */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 2, m: 2 } }}>
          <DialogTitle><Typography variant="h6">Besini Sil</Typography></DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Bu besini silmek istediğinizden emin misiniz?
            </Typography>
            {templateToDelete && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'error.50', borderRadius: 1, borderLeft: 3, borderColor: 'error.main' }}>
                <Typography variant="body2" fontWeight="medium">{templateToDelete.name}</Typography>
                <Typography variant="caption" color="text.secondary">{templateToDelete.calories} kcal</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">İptal</Button>
            <Button onClick={handleDeleteConfirm} variant="contained" color="error" startIcon={<DeleteIcon />}>Sil</Button>
          </DialogActions>
        </Dialog>

        {/* Toast */}
        <Snackbar open={toast.open} autoHideDuration={6000} onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <MuiAlert elevation={6} variant="filled" onClose={() => setToast({ ...toast, open: false })}
            severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </MuiAlert>
        </Snackbar>
      </Dialog>

      {/* ✅ Barkod Tarayıcı — save-only modu */}
      <BarcodeScanner
        open={barcodeScannerOpen}
        onClose={() => setBarcodeScannerOpen(false)}
        existingTemplates={templates}
        mode="save-only"
        onSaveOnly={(template) => {
          onAddTemplate(template);
          setBarcodeScannerOpen(false);
        }}
      />
    </>
  );
}