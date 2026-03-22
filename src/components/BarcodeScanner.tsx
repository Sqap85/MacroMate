import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import CookieIcon from '@mui/icons-material/Cookie';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { searchByBarcode } from '../services/openFoodFactsService';
import type { OpenFoodFactsProduct } from '../services/openFoodFactsService';
import type { FoodTemplate, MealType } from '../types';
import { formatGrams } from '../utils/numberUtils';

const MEAL_COLORS = {
  breakfast: '#FF6B35',
  lunch: '#F7931E',
  dinner: '#9D4EDD',
  snack: '#06A77D',
} as const;

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  existingTemplates: FoodTemplate[];
  /**
   * 'add' — normal mod: yemeğe ekle + besinlere kaydet seçenekleri
   * 'save-only' — sadece besinlere kaydet (FoodTemplatesModal için)
   */
  mode?: 'add' | 'save-only';
  onAddFood?: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType?: MealType;
  }) => void;
  onSaveAndAdd?: (
    template: Omit<FoodTemplate, 'id'>,
    amount: number,
    mealType?: MealType
  ) => void;
  onAddFromTemplate?: (templateId: string, amount: number, mealType?: MealType) => void;
  onSaveOnly?: (template: Omit<FoodTemplate, 'id'>) => void;
}

type ScanState = 'scanning' | 'loading' | 'found' | 'existing' | 'notfound' | 'error';

export function BarcodeScanner({
  open,
  onClose,
  existingTemplates,
  mode = 'add',
  onAddFood,
  onSaveAndAdd,
  onAddFromTemplate,
  onSaveOnly,
}: Readonly<BarcodeScannerProps>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // ✅ stream takibi
  const scannedOnceRef = useRef(false);

  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [editedProduct, setEditedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [existingTemplate, setExistingTemplate] = useState<FoodTemplate | null>(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('100');
  const [mealType, setMealType] = useState<MealType | undefined>(undefined);

  // ✅ Kamerayı tamamen kapat — stream track'lerini da durdur
  const stopCamera = () => {
    // Barkod okumayı durdur
    controlsRef.current?.stop();
    controlsRef.current = null;

    // Video stream track'lerini kapat
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Video elementini temizle
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    readerRef.current = null;
  };

  const startScanner = async (reader: BrowserMultiFormatReader) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (!videoRef.current) {
        setError('Video bileşeni yüklenemedi. Lütfen tekrar deneyin.');
        setScanState('error');
        return;
      }

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, _err) => {
          if (result && !scannedOnceRef.current) {
            scannedOnceRef.current = true;
            // Barkod okundu — sadece okumayı durdur, stream'i koru (loading gösterimi için)
            controlsRef.current?.stop();

            const barcode = result.getText();
            setScanState('loading');

            const existing = existingTemplates.find(t => t.barcode === barcode);
            if (existing) {
              // Artık kamera gerekmez, tamamen kapat
              stopCamera();
              setExistingTemplate(existing);
              setAmount(existing.unit === 'piece' ? '1' : '100');
              setScanState('existing');
              return;
            }

            try {
              const searchResult = await searchByBarcode(barcode);
              // Sonuç geldi, kamerayı tamamen kapat
              stopCamera();
              if (searchResult.found && searchResult.product) {
                setProduct(searchResult.product);
                setEditedProduct(searchResult.product);
                setScanState('found');
              } else {
                setError(searchResult.error || 'Ürün veritabanında bulunamadı.');
                setScanState('notfound');
              }
            } catch {
              stopCamera();
              setError('İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.');
              setScanState('error');
            }
          }
        }
      );

      controlsRef.current = controls;

      // ✅ Stream'i kaydet
      if (videoRef.current?.srcObject instanceof MediaStream) {
        streamRef.current = videoRef.current.srcObject;
      }
    } catch (err: any) {
      stopCamera();
      if (err?.name === 'NotAllowedError') {
        setError('Kamera izni reddedildi. Tarayıcı ayarlarından kamera iznini açın.');
      } else if (err?.name === 'NotFoundError') {
        setError('Kamera bulunamadı. Cihazınızda kamera olduğundan emin olun.');
      } else if (err?.name === 'NotReadableError') {
        setError('Kamera başka bir uygulama tarafından kullanılıyor.');
      } else {
        setError('Kamera açılamadı. Lütfen tekrar deneyin.');
      }
      setScanState('error');
    }
  };

  useEffect(() => {
    if (!open) {
      // Modal kapandığında kamerayı tamamen durdur
      stopCamera();
      return;
    }

    setScanState('scanning');
    setProduct(null);
    setEditedProduct(null);
    setExistingTemplate(null);
    setError('');
    setAmount('100');
    setMealType(undefined);
    scannedOnceRef.current = false;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    startScanner(reader);

    // ✅ Cleanup: component unmount veya open değişince
    return () => { stopCamera(); };
  }, [open]);

  const handleClose = () => {
    stopCamera(); // ✅ kamerayı tamamen kapat
    onClose();
  };

  const handleRetry = () => {
    stopCamera(); // ✅ önce kamerayı tamamen kapat
    scannedOnceRef.current = false;
    setError('');
    setProduct(null);
    setEditedProduct(null);
    setScanState('scanning');

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    startScanner(reader);
  };

  const isAmountValid = () => {
    const n = Number(amount);
    return !isNaN(n) && n > 0;
  };

  const handleAddOnly = () => {
    if (!editedProduct || !isAmountValid() || !onAddFood) return;
    const grams = Number(amount);
    const multiplier = grams / 100;
    onAddFood({
      name: `${editedProduct.name} (${grams}g)`,
      calories: Math.round(editedProduct.calories * multiplier),
      protein: Math.round(editedProduct.protein * multiplier * 10) / 10,
      carbs: Math.round(editedProduct.carbs * multiplier * 10) / 10,
      fat: Math.round(editedProduct.fat * multiplier * 10) / 10,
      mealType,
    });
    handleClose();
  };

  const handleSaveAndAdd = () => {
    if (!editedProduct || !isAmountValid() || !onSaveAndAdd) return;
    onSaveAndAdd(
      {
        name: editedProduct.name,
        unit: 'gram',
        calories: editedProduct.calories,
        protein: editedProduct.protein,
        carbs: editedProduct.carbs,
        fat: editedProduct.fat,
        barcode: editedProduct.barcode,
      },
      Number(amount),
      mealType
    );
    handleClose();
  };

  const handleAddFromExisting = () => {
    if (!existingTemplate || !isAmountValid() || !onAddFromTemplate) return;
    onAddFromTemplate(existingTemplate.id, Number(amount), mealType);
    handleClose();
  };

  const handleSaveOnly = () => {
    if (!editedProduct || !onSaveOnly) return;
    onSaveOnly({
      name: editedProduct.name,
      unit: 'gram',
      calories: editedProduct.calories,
      protein: editedProduct.protein,
      carbs: editedProduct.carbs,
      fat: editedProduct.fat,
      barcode: editedProduct.barcode,
    });
    handleClose();
  };

  const renderMealSelector = () => (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        Öğün (opsiyonel)
      </Typography>
      <ToggleButtonGroup
        value={mealType}
        exclusive
        onChange={(_, value) => setMealType(value ?? undefined)}
        fullWidth
        size="small"
      >
        <ToggleButton value="breakfast" sx={{
          fontSize: '0.6rem', py: 0.5, px: 0.5, minWidth: 0,
          '&.Mui-selected': { bgcolor: `${MEAL_COLORS.breakfast}22`, color: MEAL_COLORS.breakfast, borderColor: MEAL_COLORS.breakfast },
          '&:hover': { bgcolor: `${MEAL_COLORS.breakfast}11` },
        }}>
          <LocalCafeIcon sx={{ fontSize: 14, mr: 0.3, color: MEAL_COLORS.breakfast }} />Kahvaltı
        </ToggleButton>
        <ToggleButton value="lunch" sx={{
          fontSize: '0.6rem', py: 0.5, px: 0.5, minWidth: 0,
          '&.Mui-selected': { bgcolor: `${MEAL_COLORS.lunch}22`, color: MEAL_COLORS.lunch, borderColor: MEAL_COLORS.lunch },
          '&:hover': { bgcolor: `${MEAL_COLORS.lunch}11` },
        }}>
          <LunchDiningIcon sx={{ fontSize: 14, mr: 0.3, color: MEAL_COLORS.lunch }} />Öğle
        </ToggleButton>
        <ToggleButton value="dinner" sx={{
          fontSize: '0.6rem', py: 0.5, px: 0.5, minWidth: 0,
          '&.Mui-selected': { bgcolor: `${MEAL_COLORS.dinner}22`, color: MEAL_COLORS.dinner, borderColor: MEAL_COLORS.dinner },
          '&:hover': { bgcolor: `${MEAL_COLORS.dinner}11` },
        }}>
          <DinnerDiningIcon sx={{ fontSize: 14, mr: 0.3, color: MEAL_COLORS.dinner }} />Akşam
        </ToggleButton>
        <ToggleButton value="snack" sx={{
          fontSize: '0.6rem', py: 0.5, px: 0.5, minWidth: 0,
          '&.Mui-selected': { bgcolor: `${MEAL_COLORS.snack}22`, color: MEAL_COLORS.snack, borderColor: MEAL_COLORS.snack },
          '&:hover': { bgcolor: `${MEAL_COLORS.snack}11` },
        }}>
          <CookieIcon sx={{ fontSize: 14, mr: 0.3, color: MEAL_COLORS.snack }} />Atıştırma
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );

  const renderAmountAndMeal = (unit: 'gram' | 'adet') => (
    <Stack spacing={2}>
      <TextField
        label={unit === 'adet' ? 'Adet' : 'Miktar (gram)'}
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputProps={{ min: 1, step: unit === 'adet' ? 1 : 10 }}
        size="small"
        fullWidth
        error={amount !== '' && !isAmountValid()}
        helperText={amount !== '' && !isAmountValid() ? 'Geçerli bir miktar girin' : ''}
      />
      {renderMealSelector()}
    </Stack>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <QrCodeScannerIcon color="primary" />
          <Typography variant="h6">
            {mode === 'save-only' ? 'Barkod ile Besin Ekle' : 'Barkod Tara'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {(scanState === 'scanning' || scanState === 'loading') && (
          <Box>
            <Box sx={{
              position: 'relative', width: '100%', borderRadius: 2,
              overflow: 'hidden', bgcolor: 'black', aspectRatio: '4/3',
            }}>
              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {scanState === 'scanning' && (
                <Box sx={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <Box sx={{
                    width: '70%', height: '30%',
                    border: '2px solid', borderColor: 'primary.main', borderRadius: 1,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                  }} />
                </Box>
              )}
              {scanState === 'loading' && (
                <Box sx={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                }}>
                  <CircularProgress color="primary" />
                  <Typography color="white" variant="body2">Ürün aranıyor...</Typography>
                </Box>
              )}
            </Box>
            {scanState === 'scanning' && (
              <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                Ürünün barkodunu çerçeve içine getirin
              </Typography>
            )}
          </Box>
        )}

        {scanState === 'existing' && existingTemplate && (
          <Stack spacing={2}>
            <Alert severity="info" icon={<CheckCircleIcon />}>
              {mode === 'save-only'
                ? 'Bu ürün zaten besinlerinizde kayıtlı!'
                : 'Bu ürünü daha önce besinlerinize kaydetmişsiniz!'}
            </Alert>
            <Box p={2} bgcolor="action.hover" borderRadius={2}>
              <Typography variant="subtitle1" fontWeight="bold">{existingTemplate.name}</Typography>
              <Stack direction="row" spacing={0.5} mt={1} useFlexGap sx={{ flexWrap: 'nowrap' }}>
                <Chip label={`${existingTemplate.calories} kcal`} size="small" color="error" variant="outlined"
                  sx={{ flex: { xs: 1, sm: '0 0 auto' }, minWidth: { xs: 0, sm: 'auto' }, height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.72rem' }, '& .MuiChip-label': { px: { xs: 0.6, sm: 1 } } }} />
                <Chip label={`P: ${formatGrams(existingTemplate.protein)}g`} size="small" color="info" variant="outlined"
                  sx={{ flex: { xs: 1, sm: '0 0 auto' }, minWidth: { xs: 0, sm: 'auto' }, height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.72rem' }, '& .MuiChip-label': { px: { xs: 0.6, sm: 1 } } }} />
                <Chip label={`K: ${formatGrams(existingTemplate.carbs)}g`} size="small" color="success" variant="outlined"
                  sx={{ flex: { xs: 1, sm: '0 0 auto' }, minWidth: { xs: 0, sm: 'auto' }, height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.72rem' }, '& .MuiChip-label': { px: { xs: 0.6, sm: 1 } } }} />
                <Chip label={`Y: ${formatGrams(existingTemplate.fat)}g`} size="small" color="warning" variant="outlined"
                  sx={{ flex: { xs: 1, sm: '0 0 auto' }, minWidth: { xs: 0, sm: 'auto' }, height: { xs: 20, sm: 24 }, fontSize: { xs: '0.62rem', sm: '0.72rem' }, '& .MuiChip-label': { px: { xs: 0.6, sm: 1 } } }} />
              </Stack>
            </Box>
            {mode === 'add' && (
              <>
                <Divider />
                {renderAmountAndMeal(existingTemplate.unit === 'piece' ? 'adet' : 'gram')}
              </>
            )}
          </Stack>
        )}

        {scanState === 'found' && product && editedProduct && (
          <Stack spacing={2}>
            <Alert severity="success">
              {mode === 'save-only'
                ? 'Ürün bulundu! Değerleri kontrol edip besinlerinize kaydedebilirsiniz.'
                : 'Ürün bulundu! Değerleri kontrol edip düzenleyebilirsiniz.'}
            </Alert>
            <Box p={2} bgcolor="action.hover" borderRadius={2}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                100g başına değerler
              </Typography>
              <TextField fullWidth label="Ürün Adı" value={editedProduct.name}
                onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                size="small" sx={{ mb: 1.5 }} />
              <Stack direction="row" spacing={1} mb={1}>
                <TextField fullWidth label="Kalori (kcal)" type="number" value={editedProduct.calories}
                  onChange={(e) => setEditedProduct({ ...editedProduct, calories: Number(e.target.value) })}
                  size="small" inputProps={{ min: 0 }} />
                <TextField fullWidth label="Protein (g)" type="number" value={editedProduct.protein}
                  onChange={(e) => setEditedProduct({ ...editedProduct, protein: Number(e.target.value) })}
                  size="small" inputProps={{ min: 0 }} />
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField fullWidth label="Karbonhidrat (g)" type="number" value={editedProduct.carbs}
                  onChange={(e) => setEditedProduct({ ...editedProduct, carbs: Number(e.target.value) })}
                  size="small" inputProps={{ min: 0 }} />
                <TextField fullWidth label="Yağ (g)" type="number" value={editedProduct.fat}
                  onChange={(e) => setEditedProduct({ ...editedProduct, fat: Number(e.target.value) })}
                  size="small" inputProps={{ min: 0 }} />
              </Stack>
            </Box>
            {mode === 'add' && (
              <>
                <Divider />
                {renderAmountAndMeal('gram')}
              </>
            )}
          </Stack>
        )}

        {scanState === 'notfound' && (
          <Stack spacing={2}>
            <Alert severity="warning">{error || 'Ürün veritabanında bulunamadı.'}</Alert>
            <Typography variant="body2" color="text.secondary">
              Manuel giriş yapabilir ya da tekrar tarayabilirsiniz.
            </Typography>
          </Stack>
        )}

        {scanState === 'error' && (
          <Alert severity="error">{error || 'Bir hata oluştu.'}</Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', gap: 1 }}>
        {mode === 'save-only' && scanState === 'found' && (
          <Button fullWidth variant="contained" startIcon={<SaveIcon />}
            onClick={handleSaveOnly} color="primary">
            Besinlerime Kaydet
          </Button>
        )}

        {mode === 'save-only' && scanState === 'existing' && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Bu ürün zaten listenizde. Başka bir ürün tarayabilirsiniz.
          </Typography>
        )}

        {mode === 'add' && scanState === 'existing' && (
          <Button fullWidth variant="contained" startIcon={<AddIcon />}
            onClick={handleAddFromExisting} disabled={!isAmountValid()}>
            Ekle ({amount} {existingTemplate?.unit === 'piece' ? 'adet' : 'g'})
          </Button>
        )}

        {mode === 'add' && scanState === 'found' && (
          <Stack direction="row" spacing={1} width="100%">
            <Button fullWidth variant="contained" startIcon={<SaveIcon />}
              onClick={handleSaveAndAdd} disabled={!isAmountValid()} color="primary"
              sx={{ flex: 1, fontSize: '0.8rem' }}>
              Kaydet ve Ekle
            </Button>
            <Button fullWidth variant="outlined" startIcon={<AddIcon />}
              onClick={handleAddOnly} disabled={!isAmountValid()}
              sx={{ flex: 1, fontSize: '0.8rem' }}>
              Sadece Ekle
            </Button>
          </Stack>
        )}

        {(scanState === 'notfound' || scanState === 'error') && (
          <Button fullWidth variant="outlined" startIcon={<QrCodeScannerIcon />} onClick={handleRetry}>
            Tekrar Tara
          </Button>
        )}

        <Button fullWidth variant="text" onClick={handleClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
}