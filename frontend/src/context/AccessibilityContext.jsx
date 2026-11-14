import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const AccessibilityContext = createContext(null);

export const FONT_SIZE_STORAGE_KEY = 'aureus_font_size';
export const LANGUAGE_STORAGE_KEY = 'aureus_language';
export const COLORBLIND_STORAGE_KEY = 'aureus_colorblind_mode';
export const SOUND_STORAGE_KEY = 'aureus_sound_enabled';

export const FONT_SIZE_SCALES = {
  pequeno: 0.88,
  normal: 1,
  grande: 1.12,
  extra: 1.22,
};

const FONT_SCALE_SELECTOR =
  'h1, h2, h3, h4, h5, h6, p, span, a, button, label, input, textarea, select, th, td, li, small, strong, b, div';

const TEXT_ELEMENT_TAGS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'SPAN',
  'BUTTON',
  'LABEL',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'A',
  'SMALL',
  'STRONG',
  'B',
  'TH',
  'TD',
  'LI',
]);

function applyFontScaleToDOM(scaleFactor) {
  if (typeof document === 'undefined' || !document.body) return;
  const factor = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
  const elements = document.body.querySelectorAll(FONT_SCALE_SELECTOR);
  const targets = [];

  // Paso 1 (solo lectura): registrar tamaño base antes de mutar estilos en cascada
  for (let i = 0; i < elements.length; i += 1) {
    const el = elements[i];
    if (el.closest('svg')) continue;

    const inlineFont = el.style?.fontSize ? el.style.fontSize.trim() : '';
    const hasInlineFont = Boolean(inlineFont);
    const isTextTag = TEXT_ELEMENT_TAGS.has(el.tagName);
    const hasDirectText =
      el.tagName === 'DIV' &&
      Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);

    if (!hasInlineFont && !isTextTag && !hasDirectText) continue;

    let basePx = el.dataset.aureusBaseFontPx ? Number(el.dataset.aureusBaseFontPx) : NaN;
    if (!Number.isFinite(basePx) || basePx <= 0) {
      if (inlineFont.endsWith('px')) {
        basePx = parseFloat(inlineFont);
      } else {
        basePx = parseFloat(window.getComputedStyle(el).fontSize);
      }
      if (!Number.isFinite(basePx) || basePx <= 0) continue;
      el.dataset.aureusBaseFontPx = String(basePx);
    }

    targets.push({ el, basePx });
  }

  // Paso 2 (escritura determinista)
  for (let i = 0; i < targets.length; i += 1) {
    const { el, basePx } = targets[i];
    const scaledPx = Math.round(basePx * factor * 100) / 100;
    if (factor === 1) {
      el.style.fontSize = `${basePx}px`;
    } else {
      el.style.setProperty('font-size', `${scaledPx}px`, 'important');
    }
  }
}

export const COLORBLIND_MODES = [
  'ninguno',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'protanomalia',
  'deuteranomalia',
  'tritanomalia',
  'acromatopsia',
];

export const LANGUAGES = ['es', 'en', 'pt', 'fr'];

const COLORBLIND_MATRICES = {
  protanopia:
    '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
  deuteranopia:
    '0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0',
  tritanopia:
    '0.950 0.050 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
  protanomalia:
    '0.817 0.183 0 0 0  0.333 0.667 0 0 0  0 0.125 0.875 0 0  0 0 0 1 0',
  deuteranomalia:
    '0.800 0.200 0 0 0  0.258 0.742 0 0 0  0 0.142 0.858 0 0  0 0 0 1 0',
  tritanomalia:
    '0.967 0.033 0 0 0  0 0.733 0.267 0 0  0 0.183 0.817 0 0  0 0 0 1 0',
  acromatopsia:
    '0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0',
};

export const TRANSLATIONS = {
  es: {
    modules: {
      cobros: 'Cobros',
      clientes: 'Clientes',
      prestamos: 'Préstamos',
      resumen: 'Resumen',
      'lista-negra': 'Lista negra',
      papelera: 'Papelera',
    },
    header: {
      senecaTitle: 'Consultar con Séneca',
      notificationsTitle: 'Ver notificaciones de cobros de hoy',
      profileAria: 'Abrir perfil ejecutivo y ajustes',
    },
    profile: {
      modalTitle: 'Perfil Ejecutivo',
      closeAria: 'Cerrar perfil',
      codeLabel: 'Código personal',
      copyCode: 'Copiar',
      copiedCode: 'Copiado',
      tabs: {
        info: 'Información',
        accesibilidad: 'Accesibilidad',
        configuracion: 'Configuración',
      },
      photo: {
        change: 'Cambiar foto',
        remove: 'Quitar foto',
        hint: 'Formato cuadrado optimizado al instante',
        invalidFile: 'Selecciona un archivo de imagen válido.',
        processError: 'No se pudo procesar la fotografía seleccionada.',
      },
      fields: {
        fullName: 'Nombre completo',
        username: 'Nombre de usuario',
        email: 'Correo electrónico',
        role: 'Rol asignado',
        status: 'Estado de cuenta',
        createdAt: 'Fecha de registro',
        lastAccess: 'Último acceso',
        noRecord: 'Sin registro reciente',
        activeStatus: 'Activa',
        suspendedStatus: 'Suspendida',
        save: 'Guardar cambios',
        saving: 'Guardando cambios...',
        savedOk: 'Perfil actualizado correctamente.',
        saveError: 'No fue posible actualizar los datos del perfil.',
      },
      accessibility: {
        themeSection: 'Apariencia visual',
        themeLight: 'Modo claro',
        themeDark: 'Modo oscuro',
        fontSection: 'Tamaño de letra',
        fonts: {
          pequeno: 'Pequeño',
          normal: 'Normal',
          grande: 'Grande',
          extra: 'Extra grande',
        },
        languageSection: 'Idioma de la plataforma',
        languages: {
          es: 'Español',
          en: 'English',
          pt: 'Português',
          fr: 'Français',
        },
        colorblindSection: 'Asistencia visual para daltonismo',
        colorblindModes: {
          ninguno: {
            title: 'Estándar',
            desc: 'Paleta original sin filtro visual',
          },
          protanopia: {
            title: 'Protanopia',
            desc: 'Ausencia total de receptores del rojo',
          },
          deuteranopia: {
            title: 'Deuteranopia',
            desc: 'Ausencia total de receptores del verde',
          },
          tritanopia: {
            title: 'Tritanopia',
            desc: 'Ausencia total de receptores del azul',
          },
          protanomalia: {
            title: 'Protanomalía',
            desc: 'Sensibilidad reducida hacia tonos rojos',
          },
          deuteranomalia: {
            title: 'Deuteranomalía',
            desc: 'Sensibilidad reducida hacia tonos verdes',
          },
          tritanomalia: {
            title: 'Tritanomalía',
            desc: 'Sensibilidad reducida hacia tonos azules',
          },
          acromatopsia: {
            title: 'Acromatopsia',
            desc: 'Visión monocromática en escala de grises',
          },
        },
        reset: 'Restablecer valores',
      },
      settings: {
        soundSection: 'Sonidos de confirmación',
        soundDesc: 'Reproduce un tono sutil al registrar pagos o acciones clave',
        soundActive: 'Activado',
        soundMuted: 'Silenciado',
        testSound: 'Probar sonido',
        securitySection: 'Seguridad de sesión',
        inactivityLabel: 'Cierre automático por inactividad',
        inactivityBadge: 'Activo cada 25 minutos',
        passwordSection: 'Cambiar contraseña',
        currentPassword: 'Contraseña actual',
        newPassword: 'Nueva contraseña',
        confirmPassword: 'Confirmar nueva contraseña',
        updatePassword: 'Actualizar contraseña',
        updatingPassword: 'Actualizando...',
        passwordMismatch: 'La confirmación no coincide con la nueva contraseña.',
        passwordTooShort: 'La nueva contraseña debe tener al menos 8 caracteres.',
        passwordFieldsRequired: 'Completa todos los campos de contraseña.',
        passwordUpdated: 'Contraseña actualizada correctamente.',
        passwordError: 'No fue posible cambiar la contraseña.',
        logoutSection: 'Sesión actual',
        logoutBtn: 'Cerrar sesión',
      },
    },
  },
  en: {
    modules: {
      cobros: 'Collections',
      clientes: 'Clients',
      prestamos: 'Loans',
      resumen: 'Summary',
      'lista-negra': 'Blacklist',
      papelera: 'Trash',
    },
    header: {
      senecaTitle: 'Ask Seneca',
      notificationsTitle: 'View today collection reminders',
      profileAria: 'Open executive profile and preferences',
    },
    profile: {
      modalTitle: 'Executive Profile',
      closeAria: 'Close profile',
      codeLabel: 'Personal code',
      copyCode: 'Copy',
      copiedCode: 'Copied',
      tabs: {
        info: 'Information',
        accesibilidad: 'Accessibility',
        configuracion: 'Settings',
      },
      photo: {
        change: 'Change photo',
        remove: 'Remove photo',
        hint: 'Square format optimized automatically',
        invalidFile: 'Select a valid image file.',
        processError: 'Could not process the selected picture.',
      },
      fields: {
        fullName: 'Full name',
        username: 'Username',
        email: 'Email address',
        role: 'Assigned role',
        status: 'Account status',
        createdAt: 'Registration date',
        lastAccess: 'Last sign in',
        noRecord: 'No recent record',
        activeStatus: 'Active',
        suspendedStatus: 'Suspended',
        save: 'Save changes',
        saving: 'Saving changes...',
        savedOk: 'Profile updated successfully.',
        saveError: 'Unable to save profile updates.',
      },
      accessibility: {
        themeSection: 'Visual appearance',
        themeLight: 'Light mode',
        themeDark: 'Dark mode',
        fontSection: 'Text size',
        fonts: {
          pequeno: 'Small',
          normal: 'Normal',
          grande: 'Large',
          extra: 'Extra large',
        },
        languageSection: 'Platform language',
        languages: {
          es: 'Español',
          en: 'English',
          pt: 'Português',
          fr: 'Français',
        },
        colorblindSection: 'Color vision assistance',
        colorblindModes: {
          ninguno: {
            title: 'Standard',
            desc: 'Original palette without visual filter',
          },
          protanopia: {
            title: 'Protanopia',
            desc: 'Complete absence of red cone perception',
          },
          deuteranopia: {
            title: 'Deuteranopia',
            desc: 'Complete absence of green cone perception',
          },
          tritanopia: {
            title: 'Tritanopia',
            desc: 'Complete absence of blue cone perception',
          },
          protanomalia: {
            title: 'Protanomaly',
            desc: 'Reduced sensitivity to red tones',
          },
          deuteranomalia: {
            title: 'Deuteranomaly',
            desc: 'Reduced sensitivity to green tones',
          },
          tritanomalia: {
            title: 'Tritanomaly',
            desc: 'Reduced sensitivity to blue tones',
          },
          acromatopsia: {
            title: 'Achromatopsia',
            desc: 'Monochrome vision in grayscale',
          },
        },
        reset: 'Reset defaults',
      },
      settings: {
        soundSection: 'Confirmation sounds',
        soundDesc: 'Plays a subtle chime when recording payments or key actions',
        soundActive: 'Enabled',
        soundMuted: 'Muted',
        testSound: 'Test sound',
        securitySection: 'Session security',
        inactivityLabel: 'Automatic lock on inactivity',
        inactivityBadge: 'Active every 25 minutes',
        passwordSection: 'Change password',
        currentPassword: 'Current password',
        newPassword: 'New password',
        confirmPassword: 'Confirm new password',
        updatePassword: 'Update password',
        updatingPassword: 'Updating...',
        passwordMismatch: 'Confirmation does not match the new password.',
        passwordTooShort: 'New password must be at least 8 characters long.',
        passwordFieldsRequired: 'Complete all password fields.',
        passwordUpdated: 'Password updated successfully.',
        passwordError: 'Unable to update password.',
        logoutSection: 'Current session',
        logoutBtn: 'Sign out',
      },
    },
  },
  pt: {
    modules: {
      cobros: 'Cobranças',
      clientes: 'Clientes',
      prestamos: 'Empréstimos',
      resumen: 'Resumo',
      'lista-negra': 'Lista restrita',
      papelera: 'Lixeira',
    },
    header: {
      senecaTitle: 'Consultar Sêneca',
      notificationsTitle: 'Ver lembretes de cobrança de hoje',
      profileAria: 'Abrir perfil executivo e preferências',
    },
    profile: {
      modalTitle: 'Perfil Executivo',
      closeAria: 'Fechar perfil',
      codeLabel: 'Código pessoal',
      copyCode: 'Copiar',
      copiedCode: 'Copiado',
      tabs: {
        info: 'Informação',
        accesibilidad: 'Acessibilidade',
        configuracion: 'Configurações',
      },
      photo: {
        change: 'Alterar foto',
        remove: 'Remover foto',
        hint: 'Formato quadrado otimizado na hora',
        invalidFile: 'Selecione um arquivo de imagem válido.',
        processError: 'Não foi possível processar a imagem selecionada.',
      },
      fields: {
        fullName: 'Nome completo',
        username: 'Nome de usuário',
        email: 'Correio eletrônico',
        role: 'Função atribuída',
        status: 'Estado da conta',
        createdAt: 'Data de registro',
        lastAccess: 'Último acesso',
        noRecord: 'Sem registro recente',
        activeStatus: 'Ativa',
        suspendedStatus: 'Suspensa',
        save: 'Salvar alterações',
        saving: 'Salvando alterações...',
        savedOk: 'Perfil atualizado com sucesso.',
        saveError: 'Não foi possível salvar os dados do perfil.',
      },
      accessibility: {
        themeSection: 'Aparência visual',
        themeLight: 'Modo claro',
        themeDark: 'Modo escuro',
        fontSection: 'Tamanho da fonte',
        fonts: {
          pequeno: 'Pequeno',
          normal: 'Normal',
          grande: 'Grande',
          extra: 'Extra grande',
        },
        languageSection: 'Idioma da plataforma',
        languages: {
          es: 'Español',
          en: 'English',
          pt: 'Português',
          fr: 'Français',
        },
        colorblindSection: 'Assistência visual para daltonismo',
        colorblindModes: {
          ninguno: {
            title: 'Padrão',
            desc: 'Paleta original sem filtro visual',
          },
          protanopia: {
            title: 'Protanopia',
            desc: 'Ausência total de receptores do vermelho',
          },
          deuteranopia: {
            title: 'Deuteranopia',
            desc: 'Ausência total de receptores do verde',
          },
          tritanopia: {
            title: 'Tritanopia',
            desc: 'Ausência total de receptores do azul',
          },
          protanomalia: {
            title: 'Protanomalia',
            desc: 'Sensibilidade reduzida para tons vermelhos',
          },
          deuteranomalia: {
            title: 'Deuteranomalia',
            desc: 'Sensibilidade reduzida para tons verdes',
          },
          tritanomalia: {
            title: 'Tritanomalia',
            desc: 'Sensibilidade reduzida para tons azuis',
          },
          acromatopsia: {
            title: 'Acromatopsia',
            desc: 'Visão monocromática em escala de cinza',
          },
        },
        reset: 'Restaurar padrões',
      },
      settings: {
        soundSection: 'Sons de confirmação',
        soundDesc: 'Reproduz um toque sutil ao registrar pagamentos ou ações',
        soundActive: 'Ativado',
        soundMuted: 'Silenciado',
        testSound: 'Testar som',
        securitySection: 'Segurança da sessão',
        inactivityLabel: 'Encerramento por inatividade',
        inactivityBadge: 'Ativo a cada 25 minutos',
        passwordSection: 'Alterar senha',
        currentPassword: 'Senha atual',
        newPassword: 'Nova senha',
        confirmPassword: 'Confirmar nova senha',
        updatePassword: 'Atualizar senha',
        updatingPassword: 'Atualizando...',
        passwordMismatch: 'A confirmação não coincide com a nova senha.',
        passwordTooShort: 'A nova senha deve ter pelo menos 8 caracteres.',
        passwordFieldsRequired: 'Preencha todos os campos de senha.',
        passwordUpdated: 'Senha atualizada com sucesso.',
        passwordError: 'Não foi possível alterar a senha.',
        logoutSection: 'Sessão atual',
        logoutBtn: 'Sair da conta',
      },
    },
  },
  fr: {
    modules: {
      cobros: 'Recouvrements',
      clientes: 'Clients',
      prestamos: 'Prêts',
      resumen: 'Résumé',
      'lista-negra': 'Liste noire',
      papelera: 'Corbeille',
    },
    header: {
      senecaTitle: 'Consulter Sénèque',
      notificationsTitle: 'Voir les rappels du jour',
      profileAria: 'Ouvrir le profil exécutif et les réglages',
    },
    profile: {
      modalTitle: 'Profil Exécutif',
      closeAria: 'Fermer le profil',
      codeLabel: 'Code personnel',
      copyCode: 'Copier',
      copiedCode: 'Copié',
      tabs: {
        info: 'Information',
        accesibilidad: 'Accessibilité',
        configuracion: 'Paramètres',
      },
      photo: {
        change: 'Changer photo',
        remove: 'Retirer photo',
        hint: 'Format carré optimisé instantanément',
        invalidFile: 'Sélectionnez un fichier image valide.',
        processError: 'Impossible de traiter la photo sélectionnée.',
      },
      fields: {
        fullName: 'Nom complet',
        username: 'Nom d utilisateur',
        email: 'Adresse e-mail',
        role: 'Rôle attribué',
        status: 'Statut du compte',
        createdAt: 'Date d inscription',
        lastAccess: 'Dernier accès',
        noRecord: 'Aucun accès récent',
        activeStatus: 'Actif',
        suspendedStatus: 'Suspendu',
        save: 'Enregistrer',
        saving: 'Enregistrement...',
        savedOk: 'Profil mis à jour avec succès.',
        saveError: 'Impossible de mettre à jour le profil.',
      },
      accessibility: {
        themeSection: 'Apparence visuelle',
        themeLight: 'Mode clair',
        themeDark: 'Mode sombre',
        fontSection: 'Taille du texte',
        fonts: {
          pequeno: 'Petit',
          normal: 'Normal',
          grande: 'Grand',
          extra: 'Très grand',
        },
        languageSection: 'Langue de la plateforme',
        languages: {
          es: 'Español',
          en: 'English',
          pt: 'Português',
          fr: 'Français',
        },
        colorblindSection: 'Assistance visuelle daltonisme',
        colorblindModes: {
          ninguno: {
            title: 'Standard',
            desc: 'Palette d origine sans filtre visuel',
          },
          protanopia: {
            title: 'Protanopie',
            desc: 'Absence totale de perception du rouge',
          },
          deuteranopia: {
            title: 'Deutéranopie',
            desc: 'Absence totale de perception du vert',
          },
          tritanopia: {
            title: 'Tritanopie',
            desc: 'Absence totale de perception du bleu',
          },
          protanomalia: {
            title: 'Protanomalie',
            desc: 'Sensibilité réduite aux tons rouges',
          },
          deuteranomalia: {
            title: 'Deutéranomalie',
            desc: 'Sensibilité réduite aux tons verts',
          },
          tritanomalia: {
            title: 'Tritanomalie',
            desc: 'Sensibilité réduite aux tons bleus',
          },
          acromatopsia: {
            title: 'Achromatopsie',
            desc: 'Vision monochrome en niveaux de gris',
          },
        },
        reset: 'Réinitialiser les réglages',
      },
      settings: {
        soundSection: 'Sons de confirmation',
        soundDesc: 'Joue une tonalité discrète lors des paiements ou actions clés',
        soundActive: 'Activé',
        soundMuted: 'Muet',
        testSound: 'Tester le son',
        securitySection: 'Sécurité de session',
        inactivityLabel: 'Fermeture par inactivité',
        inactivityBadge: 'Actif toutes les 25 minutes',
        passwordSection: 'Changer le mot de passe',
        currentPassword: 'Mot de passe actuel',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le mot de passe',
        updatePassword: 'Mettre à jour',
        updatingPassword: 'Mise à jour...',
        passwordMismatch: 'La confirmation ne correspond pas au mot de passe.',
        passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères.',
        passwordFieldsRequired: 'Complétez tous les champs de mot de passe.',
        passwordUpdated: 'Mot de passe mis à jour avec succès.',
        passwordError: 'Impossible de modifier le mot de passe.',
        logoutSection: 'Session actuelle',
        logoutBtn: 'Se déconnecter',
      },
    },
  },
};

function readSavedString(key, allowedValues, fallback) {
  try {
    if (typeof window === 'undefined') return fallback;
    const saved = window.localStorage.getItem(key);
    return allowedValues.includes(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

function readSavedBoolean(key, fallback) {
  try {
    if (typeof window === 'undefined') return fallback;
    const saved = window.localStorage.getItem(key);
    if (saved === 'false') return false;
    if (saved === 'true') return true;
    return fallback;
  } catch {
    return fallback;
  }
}

function getByPath(obj, path) {
  return String(path || '')
    .split('.')
    .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export function AccessibilityProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(() =>
    readSavedString(FONT_SIZE_STORAGE_KEY, Object.keys(FONT_SIZE_SCALES), 'normal')
  );
  const [language, setLanguageState] = useState(() =>
    readSavedString(LANGUAGE_STORAGE_KEY, LANGUAGES, 'es')
  );
  const [colorblindMode, setColorblindModeState] = useState(() =>
    readSavedString(COLORBLIND_STORAGE_KEY, COLORBLIND_MODES, 'ninguno')
  );
  const [soundEnabled, setSoundEnabledState] = useState(() =>
    readSavedBoolean(SOUND_STORAGE_KEY, true)
  );

  const activeScaleRef = useRef(FONT_SIZE_SCALES[fontSize] || 1);

  const setFontSize = useCallback((nextSize) => {
    setFontSizeState(
      Object.prototype.hasOwnProperty.call(FONT_SIZE_SCALES, nextSize) ? nextSize : 'normal'
    );
  }, []);

  const setLanguage = useCallback((nextLang) => {
    setLanguageState(LANGUAGES.includes(nextLang) ? nextLang : 'es');
  }, []);

  const setColorblindMode = useCallback((nextMode) => {
    setColorblindModeState(COLORBLIND_MODES.includes(nextMode) ? nextMode : 'ninguno');
  }, []);

  const setSoundEnabled = useCallback((enabled) => {
    setSoundEnabledState(Boolean(enabled));
  }, []);

  const resetAccessibility = useCallback(() => {
    setFontSizeState('normal');
    setLanguageState('es');
    setColorblindModeState('ninguno');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const scale = FONT_SIZE_SCALES[fontSize] || 1;
    activeScaleRef.current = scale;
    const root = document.documentElement;
    root.setAttribute('data-font-scale', fontSize);
    root.style.setProperty('--aureus-font-scale', String(scale));
    applyFontScaleToDOM(scale);
    try {
      window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
    } catch {
      // Ignorar restricciones de almacenamiento privado
    }
  }, [fontSize]);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined') {
      return undefined;
    }

    let rafId = 0;
    const scheduleScale = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyFontScaleToDOM(activeScaleRef.current);
      });
    };

    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i += 1) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
          scheduleScale();
          break;
        }
      }
    });

    const themeObserver = new MutationObserver(() => {
      scheduleScale();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    applyFontScaleToDOM(activeScaleRef.current);
  }, [language, colorblindMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', language);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignorar restricciones de almacenamiento privado
    }
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-colorblind', colorblindMode);
    try {
      window.localStorage.setItem(COLORBLIND_STORAGE_KEY, colorblindMode);
    } catch {
      // Ignorar restricciones de almacenamiento privado
    }
  }, [colorblindMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? 'true' : 'false');
    } catch {
      // Ignorar restricciones de almacenamiento privado
    }
  }, [soundEnabled]);

  const dictionary = useMemo(
    () => TRANSLATIONS[language] || TRANSLATIONS.es,
    [language]
  );

  const t = useCallback(
    (key, fallback = '') => {
      const value = getByPath(dictionary, key);
      if (value !== undefined) return value;
      const esValue = getByPath(TRANSLATIONS.es, key);
      return esValue !== undefined ? esValue : fallback;
    },
    [dictionary]
  );

  const translateModule = useCallback(
    (moduleId) => {
      return (
        dictionary?.modules?.[moduleId] ||
        TRANSLATIONS.es.modules?.[moduleId] ||
        moduleId
      );
    },
    [dictionary]
  );

  const value = useMemo(
    () => ({
      fontSize,
      fontScale: FONT_SIZE_SCALES[fontSize] || 1,
      setFontSize,
      language,
      setLanguage,
      colorblindMode,
      setColorblindMode,
      soundEnabled,
      setSoundEnabled,
      resetAccessibility,
      t,
      translateModule,
    }),
    [
      fontSize,
      setFontSize,
      language,
      setLanguage,
      colorblindMode,
      setColorblindMode,
      soundEnabled,
      setSoundEnabled,
      resetAccessibility,
      t,
      translateModule,
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <defs>
          {Object.entries(COLORBLIND_MATRICES).map(([mode, values]) => (
            <filter key={mode} id={`aureus-cb-${mode}`}>
              <feColorMatrix type="matrix" values={values} />
            </filter>
          ))}
        </defs>
      </svg>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility debe usarse dentro de AccessibilityProvider');
  }
  return ctx;
}

export default AccessibilityContext;

