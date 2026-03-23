# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript compile + Vite production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

There is no test runner configured in this project.

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

`App.tsx` is the shell: AppBar + tab navigation + lazy-loaded modals. All feature logic lives in hooks; components are mostly presentational. Key modals: `HistoryModal`, `GoalSettingsModal`, `FoodTemplatesModal`, `AuthModal`, `ProfileModal`.

Barcode scanning uses `@zxing/browser` to decode barcodes and fetches nutrition from the OpenFoodFacts public API.

### Tech stack

- **React 19 + TypeScript** with Vite
- **MUI v7** for UI (theme primary: `#667eea`)
- **Firebase 12** (Auth + Firestore)
- **Formik + Yup** for forms/validation
- **Recharts** for statistics charts
- **vite-plugin-pwa** for PWA/service worker

### Environment variables

Firebase config is injected via `VITE_*` env vars (see `.env`). Access them via `import.meta.env.VITE_*`.
