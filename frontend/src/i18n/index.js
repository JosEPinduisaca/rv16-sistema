import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import esCommon from './locales/es/common.json';
import esEstados from './locales/es/estados.json';
import esLogin from './locales/es/login.json';
import esRestablecerPassword from './locales/es/restablecerPassword.json';
import esDashboard from './locales/es/dashboard.json';
import esArbitros from './locales/es/arbitros.json';
import esCampeonatos from './locales/es/campeonatos.json';
import esTarifas from './locales/es/tarifas.json';
import esEncuentros from './locales/es/encuentros.json';
import esDesignaciones from './locales/es/designaciones.json';
import esDesignacionGeneral from './locales/es/designacionGeneral.json';
import esAdelantos from './locales/es/adelantos.json';
import esLiquidaciones from './locales/es/liquidaciones.json';
import esLiquidacionDetalle from './locales/es/liquidacionDetalle.json';
import esMisDesignaciones from './locales/es/misDesignaciones.json';
import esMisFinanzas from './locales/es/misFinanzas.json';
import esDisponibilidad from './locales/es/disponibilidad.json';

import enCommon from './locales/en/common.json';
import enEstados from './locales/en/estados.json';
import enLogin from './locales/en/login.json';
import enRestablecerPassword from './locales/en/restablecerPassword.json';
import enDashboard from './locales/en/dashboard.json';
import enArbitros from './locales/en/arbitros.json';
import enCampeonatos from './locales/en/campeonatos.json';
import enTarifas from './locales/en/tarifas.json';
import enEncuentros from './locales/en/encuentros.json';
import enDesignaciones from './locales/en/designaciones.json';
import enDesignacionGeneral from './locales/en/designacionGeneral.json';
import enAdelantos from './locales/en/adelantos.json';
import enLiquidaciones from './locales/en/liquidaciones.json';
import enLiquidacionDetalle from './locales/en/liquidacionDetalle.json';
import enMisDesignaciones from './locales/en/misDesignaciones.json';
import enMisFinanzas from './locales/en/misFinanzas.json';
import enDisponibilidad from './locales/en/disponibilidad.json';

export const IDIOMA_STORAGE_KEY = 'rv16_idioma';
const idiomaGuardado = localStorage.getItem(IDIOMA_STORAGE_KEY);

i18n.use(initReactI18next).init({
  lng: idiomaGuardado === 'en' ? 'en' : 'es',
  fallbackLng: 'es',
  supportedLngs: ['es', 'en'],
  defaultNS: 'common',
  ns: [
    'common', 'estados', 'login', 'restablecerPassword', 'dashboard', 'arbitros',
    'campeonatos', 'tarifas', 'encuentros', 'designaciones', 'designacionGeneral',
    'adelantos', 'liquidaciones', 'liquidacionDetalle', 'misDesignaciones',
    'misFinanzas', 'disponibilidad',
  ],
  resources: {
    es: {
      common: esCommon, estados: esEstados, login: esLogin, restablecerPassword: esRestablecerPassword,
      dashboard: esDashboard, arbitros: esArbitros, campeonatos: esCampeonatos, tarifas: esTarifas,
      encuentros: esEncuentros, designaciones: esDesignaciones, designacionGeneral: esDesignacionGeneral,
      adelantos: esAdelantos, liquidaciones: esLiquidaciones, liquidacionDetalle: esLiquidacionDetalle,
      misDesignaciones: esMisDesignaciones, misFinanzas: esMisFinanzas, disponibilidad: esDisponibilidad,
    },
    en: {
      common: enCommon, estados: enEstados, login: enLogin, restablecerPassword: enRestablecerPassword,
      dashboard: enDashboard, arbitros: enArbitros, campeonatos: enCampeonatos, tarifas: enTarifas,
      encuentros: enEncuentros, designaciones: enDesignaciones, designacionGeneral: enDesignacionGeneral,
      adelantos: enAdelantos, liquidaciones: enLiquidaciones, liquidacionDetalle: enLiquidacionDetalle,
      misDesignaciones: enMisDesignaciones, misFinanzas: enMisFinanzas, disponibilidad: enDisponibilidad,
    },
  },
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(IDIOMA_STORAGE_KEY, lng);
});

export default i18n;
