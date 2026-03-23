# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript compile + Vite production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

There is no test runner configured in this project. Always run `npm run build` after changes to verify no TypeScript or lint errors.

## Architecture

**MacroMate** is a React + TypeScript nutrition/macro tracking PWA.

### Data persistence (dual-path)

The `useFoodTracker` hook ([src/hooks/useFoodTracker.ts](src/hooks/useFoodTracker.ts)) is the central data layer. It branches on auth state:
- **Authenticated users** → Firestore via `firestoreService.ts`
- **Guest users** → `useLocalStorage` hook (JSON-serialized browser storage)

All Firestore CRUD lives in [src/services/firestoreService.ts](src/services/firestoreService.ts). Collections: `foods`, `goals`, `templates`.

### Auth

`AuthContext` ([src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)) wraps the whole app and provides email/password auth, Google OAuth, guest mode, and account management. Firebase is initialized in [src/config/firebase.ts](src/config/firebase.ts) with Firestore offline persistence and multi-tab sync enabled.

### Component structure

`App.tsx` is the shell: AppBar + landing page or main content + lazy-loaded modals. All feature logic lives in hooks; components are mostly presentational.

Key modals (all lazy-loaded): `HistoryModal`, `GoalSettingsModal`, `FoodTemplatesModal`, `AuthModal`, `ProfileModal`.

Barcode scanning uses `@zxing/browser` + OpenFoodFacts public API.

### Tech stack

- **React 19 + TypeScript** with Vite
- **MUI v7** for UI
- **Firebase 12** (Auth + Firestore)
- **Formik + Yup** for forms/validation
- **Recharts** for statistics charts
- **vite-plugin-pwa** for PWA/service worker

### Environment variables

Firebase config is injected via `VITE_*` env vars (see `.env`). Access them via `import.meta.env.VITE_*`.

---

## Design System

### Theme

- **Primary color:** `#667eea` (MUI theme primary)
- **App background:** `#e4e4e7` (zinc-200)
- **Cards/surfaces:** `#ffffff`
- **Brand dark gradient:** `linear-gradient(135deg, #18181b 0%, #3f3f46 100%)`
- **Buttons (primary):** use the brand dark gradient, not MUI default blue
- **Border radius:** cards = 3–4, buttons = 2–3, chips = 6

### Meal colors

Used consistently across `FoodForm`, `FoodList`, `BarcodeScanner`, `HistoryModal`:

```ts
const MEAL_COLORS = {
  breakfast: '#d97706', // amber-600
  lunch:     '#0284c7', // sky-600
  dinner:    '#7c3aed', // violet-600
  snack:     '#16a34a', // green-600
} as const;
```

Do NOT use neon/bright variants like `#FF6B35`, `#F7931E`, `#9D4EDD`, `#06A77D`. Keep colors muted and theme-compatible.

### Calorie progress bar system

Progress bars use CSS class names (not MUI `color` prop) defined in `App.css`:

| Class | When | Color |
|---|---|---|
| `progress-calories` | normal (≤100%) | sky blue gradient |
| `progress-calories-warning` | slightly over (100–115%) | amber gradient |
| `progress-calories-error` | way over (>115%) | red gradient |

Always use **uncapped raw percentage** for threshold checks:
```ts
const rawPct = goal.calories > 0 ? (actual / goal.calories) * 100 : 0;
// NOT: Math.min(rawPct, 100) — that breaks warning/error thresholds
```

### Circular ring color (StatsCard)

```ts
const ringColor = rawCaloriePct > 115 ? '#dc2626'
  : rawCaloriePct > 100 ? '#d97706'
  : '#0284c7';
```

### Dialogs & modals

All confirmation dialogs follow this pattern:
- `borderRadius: 3`, `overflow: hidden` on Paper
- Icon box (40×40, borderRadius 2) with semantic background color in DialogTitle
- `DialogActions` with `gap: 1`, both buttons `flex: 1`, `borderRadius: 2`
- Cancel: `variant="outlined"`, muted border/color
- Confirm: `variant="contained"`, gradient background matching severity

---

## UI Language

All user-facing text is **Turkish**. Keep labels, error messages, toast messages, tooltips, and dialog content in Turkish. Code comments can be in Turkish or English.

---

## Key Decisions (Do Not Revisit Without Reason)

### GoalSettingsModal macro logic
When the user changes the calorie slider/input, macros auto-fill using standard ratios:
```ts
function recommendMacros(calories: number) {
  return {
    protein: Math.max(10, Math.round(calories * 0.25 / 4)),
    carbs:   Math.max(10, Math.round(calories * 0.50 / 4)),
    fat:     Math.max(5,  Math.round(calories * 0.25 / 9)),
  };
}
```
User rejected: visual macro budget bar, dynamic max capping, proportional slider ranges. Keep it simple.

### MACRO_MAX values
Updated for 10,000 kcal max diet:
- `protein: 1250g`, `carbs: 2500g`, `fat: 600g`

### HistoryModal meal sections
Collapsed by default (`useState(false)`). Header shows label + total kcal + item count. User opens manually.

### Password rules (AuthModal)
Signup requires: min 8 chars, at least one letter, at least one number. Special character requirement was removed — too restrictive for users.

### Logout dialog (guest mode)
Guest logout shows a red warning variant (data will be deleted). Regular logout shows neutral dark variant.

---

## Firestore Gotchas

- **Batch limit is 500 writes.** Always use `deleteInBatches` (defined in `firestoreService.ts`) for bulk deletes — never a single batch for unknown counts.
- All write operations strip `undefined` fields via `removeUndefined()` before sending to Firestore.
- `listenToUserFoods` uses `onSnapshot` for real-time updates. Error code `failed-precondition` = missing Firestore index.
- Collections are flat (not subcollections). Each doc has a `userId` field for filtering.

---

## Deploy

- Platform: **Firebase Hosting** (or any static host — output is `dist/`)
- Build: `npm run build` → outputs to `dist/`
- PWA: Service worker is auto-generated by `vite-plugin-pwa`
- `.env` must NOT be committed — Firebase keys are restricted by domain in Firebase Console
- Firestore Security Rules must be configured separately in Firebase Console
