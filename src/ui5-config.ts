// SAP UI5 Web Components runtime assets — MUST be imported before any UI5
// component so theming (Horizon), i18n texts and CLDR locale data register at
// load time. Keep this as the FIRST import in main.tsx.
// (Theme defaults to `sap_horizon` in @ui5/webcomponents v2 — no extra config.)
import '@ui5/webcomponents-react/dist/Assets.js';
// Brand overrides on top of Horizon (navy shell + emerald accent).
import './redesign/fiori-brand.css';

// Optional UI5 "features" (side-effect imports) that enhance components app-wide:
//  - InputSuggestions: type-ahead suggestions in ui5-input (search, autocompletes)
//  - InputElementsFormSupport: ui5-input/select/etc. participate in native <form>s
//  - F6Navigation: F6 / Shift+F6 jumps between landmark groups (shell ↔ nav ↔ content)
import '@ui5/webcomponents/dist/features/InputSuggestions.js';
import '@ui5/webcomponents-base/dist/features/InputElementsFormSupport.js';
import '@ui5/webcomponents-base/dist/features/F6Navigation.js';

import { setTheme } from '@ui5/webcomponents-base/dist/config/Theme.js';
import { setLanguage } from '@ui5/webcomponents-base/dist/config/Language.js';
import { useThemeStore } from './store/themeStore';

// Localize UI5's built-in component texts (table "No Data", dialog buttons,
// value-state messages, etc.) to Romanian to match the app.
void setLanguage('ro');

// Keep the UI5 (Horizon) theme in lockstep with the app's light/dark choice.
// themeStore toggles the Tailwind `.dark` class; without this bridge the UI5
// web components (used app-wide, e.g. the Fiori shell) would stay light in
// dark mode. Single source of truth = themeStore.
function syncUi5Theme(theme: string): void {
  void setTheme(theme === 'dark' ? 'sap_horizon_dark' : 'sap_horizon');
}
syncUi5Theme(useThemeStore.getState().theme);
useThemeStore.subscribe((s) => s.theme, syncUi5Theme);
