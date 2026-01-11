/**
 * Internationalization (i18n) Service
 * Provides multi-language support for OrbitViz AI
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Available languages
export const LANGUAGES = {
  en: { name: 'English', native: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', native: 'Français', flag: '🇫🇷' },
  de: { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  zh: { name: 'Chinese', native: '中文', flag: '🇨🇳' },
  ja: { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  ru: { name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  pt: { name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  ar: { name: 'Arabic', native: 'العربية', flag: '🇸🇦', rtl: true },
  hi: { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
}

// Translations
const translations = {
  en: {
    // App
    'app.title': 'OrbitViz AI',
    'app.subtitle': 'Space Object Tracker',
    'app.loading': 'Initializing systems...',
    'app.connecting': 'Connecting to satellite databases...',
    'app.processing': 'Processing orbital data...',
    'app.online': 'Systems online',
    'app.paused': 'SIMULATION PAUSED',
    
    // Navigation
    'nav.search': 'Search satellites by name or NORAD ID...',
    'nav.objects': 'objects',
    'nav.live': 'LIVE',
    
    // Sidebar
    'sidebar.filters': 'Filters',
    'sidebar.constellations': 'Constellations',
    'sidebar.type': 'Type',
    'sidebar.altitude': 'Altitude Range',
    'sidebar.all': 'All',
    'sidebar.satellites': 'Satellites',
    'sidebar.debris': 'Debris',
    'sidebar.rocketBodies': 'Rocket Bodies',
    'sidebar.stations': 'Stations',
    
    // Satellite Info
    'sat.info': 'Satellite Information',
    'sat.noradId': 'NORAD ID',
    'sat.altitude': 'Altitude',
    'sat.velocity': 'Velocity',
    'sat.inclination': 'Inclination',
    'sat.period': 'Orbital Period',
    'sat.type': 'Type',
    'sat.country': 'Country',
    'sat.launchDate': 'Launch Date',
    'sat.track': 'Track',
    'sat.stopTracking': 'Stop Tracking',
    'sat.favorite': 'Add to Favorites',
    'sat.unfavorite': 'Remove from Favorites',
    
    // Time Controls
    'time.realtime': 'Real-time',
    'time.simulation': 'Simulation',
    'time.speed': 'Speed',
    'time.pause': 'Pause',
    'time.resume': 'Resume',
    
    // Panels
    'panel.settings': 'Settings',
    'panel.export': 'Export Data',
    'panel.collision': 'Collision Analysis',
    'panel.flyover': 'Flyover Predictions',
    'panel.notifications': 'Notifications',
    'panel.anomaly': 'AI Anomaly Detection',
    'panel.shortcuts': 'Keyboard Shortcuts',
    
    // Settings
    'settings.display': 'Display',
    'settings.orbits': 'Show Orbits',
    'settings.labels': 'Show Labels',
    'settings.terminator': 'Day/Night Terminator',
    'settings.performance': 'Performance',
    'settings.quality': 'Graphics Quality',
    'settings.language': 'Language',
    
    // Anomaly Detection
    'anomaly.title': 'AI Anomaly Detection',
    'anomaly.subtitle': 'ML-powered orbital behavior analysis',
    'anomaly.recent': 'Recent Anomalies',
    'anomaly.fleet': 'Fleet Analysis',
    'anomaly.status': 'System Status',
    'anomaly.analyzing': 'Analyzing satellite behaviors...',
    'anomaly.clear': 'All Clear',
    'anomaly.noneFound': 'No anomalies detected in the last 24 hours',
    'anomaly.types.maneuver': 'Orbital Maneuver',
    'anomaly.types.altitude': 'Altitude Deviation',
    'anomaly.types.decay': 'Rapid Decay',
    'anomaly.types.tumbling': 'Potential Tumbling',
    'anomaly.severity.critical': 'Critical',
    'anomaly.severity.high': 'High',
    'anomaly.severity.medium': 'Medium',
    'anomaly.severity.low': 'Low',
    
    // Notifications
    'notif.title': 'Notifications',
    'notif.enable': 'Enable Notifications',
    'notif.enableDesc': 'Get alerts for satellite passes and collision warnings',
    'notif.none': 'No notifications yet',
    'notif.noneDesc': "You'll see alerts for passes and collisions here",
    'notif.markRead': 'Mark all as read',
    'notif.clear': 'Clear all',
    
    // Collision
    'collision.title': 'Collision Analysis',
    'collision.allConjunctions': 'All Conjunctions',
    'collision.selected': 'Selected Satellite',
    'collision.analyzing': 'Analyzing orbital trajectories...',
    'collision.clear': 'All Clear!',
    'collision.noneFound': 'No close approaches detected in the analyzed period.',
    'collision.distance': 'Distance',
    'collision.time': 'Time',
    'collision.probability': 'probability',
    
    // Flyover
    'flyover.title': 'Flyover Predictions',
    'flyover.subtitle': 'See when satellites pass over your location',
    'flyover.location': 'Your Location',
    'flyover.getLocation': 'Get My Location',
    'flyover.setLocation': 'Set your location to see flyover predictions',
    'flyover.calculating': 'Calculating passes...',
    'flyover.noPasses': 'No visible passes in the next 24 hours',
    'flyover.visibleNow': 'VISIBLE NOW',
    'flyover.quality.excellent': 'Excellent',
    'flyover.quality.good': 'Good',
    'flyover.quality.fair': 'Fair',
    'flyover.quality.poor': 'Poor',
    
    // Common
    'common.close': 'Close',
    'common.refresh': 'Refresh',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    'common.km': 'km',
    'common.kms': 'km/s',
    'common.degrees': 'degrees',
    'common.minutes': 'minutes',
    'common.hours': 'hours',
    'common.days': 'days',
  },
  
  es: {
    // App
    'app.title': 'OrbitViz AI',
    'app.subtitle': 'Rastreador de Objetos Espaciales',
    'app.loading': 'Inicializando sistemas...',
    'app.connecting': 'Conectando a bases de datos de satélites...',
    'app.processing': 'Procesando datos orbitales...',
    'app.online': 'Sistemas en línea',
    'app.paused': 'SIMULACIÓN PAUSADA',
    
    // Navigation
    'nav.search': 'Buscar satélites por nombre o ID NORAD...',
    'nav.objects': 'objetos',
    'nav.live': 'EN VIVO',
    
    // Sidebar
    'sidebar.filters': 'Filtros',
    'sidebar.constellations': 'Constelaciones',
    'sidebar.type': 'Tipo',
    'sidebar.altitude': 'Rango de Altitud',
    'sidebar.all': 'Todos',
    'sidebar.satellites': 'Satélites',
    'sidebar.debris': 'Escombros',
    'sidebar.rocketBodies': 'Cuerpos de Cohete',
    'sidebar.stations': 'Estaciones',
    
    // Satellite Info
    'sat.info': 'Información del Satélite',
    'sat.noradId': 'ID NORAD',
    'sat.altitude': 'Altitud',
    'sat.velocity': 'Velocidad',
    'sat.inclination': 'Inclinación',
    'sat.period': 'Período Orbital',
    'sat.type': 'Tipo',
    'sat.country': 'País',
    'sat.launchDate': 'Fecha de Lanzamiento',
    'sat.track': 'Rastrear',
    'sat.stopTracking': 'Dejar de Rastrear',
    
    // Panels
    'panel.settings': 'Configuración',
    'panel.notifications': 'Notificaciones',
    'panel.anomaly': 'Detección de Anomalías IA',
    
    // Anomaly
    'anomaly.title': 'Detección de Anomalías IA',
    'anomaly.subtitle': 'Análisis de comportamiento orbital con ML',
    'anomaly.recent': 'Anomalías Recientes',
    'anomaly.fleet': 'Análisis de Flota',
    'anomaly.status': 'Estado del Sistema',
    'anomaly.clear': '¡Todo Despejado!',
    'anomaly.noneFound': 'No se detectaron anomalías en las últimas 24 horas',
    
    // Common
    'common.close': 'Cerrar',
    'common.refresh': 'Actualizar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'common.km': 'km',
  },
  
  fr: {
    'app.title': 'OrbitViz AI',
    'app.subtitle': 'Traqueur d\'Objets Spatiaux',
    'app.loading': 'Initialisation des systèmes...',
    'app.paused': 'SIMULATION EN PAUSE',
    'nav.search': 'Rechercher des satellites par nom ou ID NORAD...',
    'nav.objects': 'objets',
    'nav.live': 'EN DIRECT',
    'sidebar.filters': 'Filtres',
    'sidebar.constellations': 'Constellations',
    'panel.settings': 'Paramètres',
    'panel.notifications': 'Notifications',
    'anomaly.title': 'Détection d\'Anomalies IA',
    'common.close': 'Fermer',
    'common.refresh': 'Actualiser',
  },
  
  de: {
    'app.title': 'OrbitViz AI',
    'app.subtitle': 'Weltraumobjekt-Tracker',
    'app.loading': 'Systeme werden initialisiert...',
    'app.paused': 'SIMULATION PAUSIERT',
    'nav.search': 'Satelliten nach Name oder NORAD-ID suchen...',
    'nav.objects': 'Objekte',
    'nav.live': 'LIVE',
    'sidebar.filters': 'Filter',
    'panel.settings': 'Einstellungen',
    'panel.notifications': 'Benachrichtigungen',
    'anomaly.title': 'KI-Anomalieerkennung',
    'common.close': 'Schließen',
    'common.refresh': 'Aktualisieren',
  },
  
  zh: {
    'app.title': 'OrbitViz AI',
    'app.subtitle': '太空物体追踪器',
    'app.loading': '正在初始化系统...',
    'app.paused': '模拟已暂停',
    'nav.search': '按名称或NORAD ID搜索卫星...',
    'nav.objects': '对象',
    'nav.live': '实时',
    'sidebar.filters': '筛选器',
    'sidebar.constellations': '星座',
    'panel.settings': '设置',
    'panel.notifications': '通知',
    'anomaly.title': 'AI异常检测',
    'anomaly.subtitle': 'ML驱动的轨道行为分析',
    'common.close': '关闭',
    'common.refresh': '刷新',
  },
  
  ja: {
    'app.title': 'OrbitViz AI',
    'app.subtitle': '宇宙物体トラッカー',
    'app.loading': 'システムを初期化中...',
    'app.paused': 'シミュレーション一時停止',
    'nav.search': '名前またはNORAD IDで衛星を検索...',
    'nav.objects': 'オブジェクト',
    'nav.live': 'ライブ',
    'sidebar.filters': 'フィルター',
    'panel.settings': '設定',
    'panel.notifications': '通知',
    'anomaly.title': 'AI異常検出',
    'common.close': '閉じる',
    'common.refresh': '更新',
  },
  
  ru: {
    'app.title': 'OrbitViz AI',
    'app.subtitle': 'Трекер Космических Объектов',
    'app.loading': 'Инициализация систем...',
    'app.paused': 'СИМУЛЯЦИЯ ПРИОСТАНОВЛЕНА',
    'nav.search': 'Поиск спутников по имени или NORAD ID...',
    'nav.objects': 'объектов',
    'nav.live': 'ПРЯМОЙ ЭФИР',
    'sidebar.filters': 'Фильтры',
    'panel.settings': 'Настройки',
    'panel.notifications': 'Уведомления',
    'anomaly.title': 'ИИ Обнаружение Аномалий',
    'common.close': 'Закрыть',
    'common.refresh': 'Обновить',
  },
  
  pt: {
    'app.title': 'OrbitViz AI',
    'app.subtitle': 'Rastreador de Objetos Espaciais',
    'app.loading': 'Inicializando sistemas...',
    'app.paused': 'SIMULAÇÃO PAUSADA',
    'nav.search': 'Pesquisar satélites por nome ou ID NORAD...',
    'nav.objects': 'objetos',
    'nav.live': 'AO VIVO',
    'sidebar.filters': 'Filtros',
    'panel.settings': 'Configurações',
    'panel.notifications': 'Notificações',
    'anomaly.title': 'Detecção de Anomalias IA',
    'common.close': 'Fechar',
    'common.refresh': 'Atualizar',
  },
}

// i18n Store with persistence
export const useI18n = create(
  persist(
    (set, get) => ({
      language: 'en',
      
      // Set language
      setLanguage: (lang) => {
        if (LANGUAGES[lang]) {
          set({ language: lang })
          // Update document direction for RTL languages
          document.documentElement.dir = LANGUAGES[lang].rtl ? 'rtl' : 'ltr'
        }
      },
      
      // Get translation
      t: (key, params = {}) => {
        const { language } = get()
        const translation = translations[language]?.[key] || translations.en[key] || key
        
        // Replace params like {name} with actual values
        return translation.replace(/\{(\w+)\}/g, (match, param) => {
          return params[param] !== undefined ? params[param] : match
        })
      },
      
      // Get current language info
      getCurrentLanguage: () => {
        const { language } = get()
        return LANGUAGES[language] || LANGUAGES.en
      },
      
      // Get all available languages
      getAvailableLanguages: () => LANGUAGES,
    }),
    {
      name: 'orbitviz-language',
      partialize: (state) => ({ language: state.language }),
    }
  )
)

// Hook for easy translation access
export function useTranslation() {
  const { t, language, setLanguage, getCurrentLanguage, getAvailableLanguages } = useI18n()
  return { t, language, setLanguage, currentLanguage: getCurrentLanguage(), languages: getAvailableLanguages() }
}

export default useI18n
