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

const SKIP_DOM_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'CODE',
  'PRE',
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
      menu: {
        ariaLabel: 'Menú de cuenta de usuario',
        defaultAdmin: 'Administrador',
        viewProfile: 'Ver tu perfil',
        myProfile: 'Mi perfil',
        codePrefix: 'Código',
        accessibility: 'Accesibilidad',
      },
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
        defaultRole: 'ADMINISTRADOR',
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
        themeLight: 'Modo Claro',
        themeDark: 'Modo Oscuro',
        fontSection: 'Tamaño de letra',
        fonts: {
          pequeno: 'Pequeño',
          normal: 'Normal',
          grande: 'Grande',
          extra: 'Extra grande',
        },
        languageSection: 'Idioma de visualización',
        languages: {
          es: 'Español',
          en: 'English',
          pt: 'Português',
          fr: 'Français',
        },
        colorblindSection: 'Adaptación para daltonismo',
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
        operationSection: 'Preferencias de operación',
        soundSection: 'Sonido de confirmación en acciones',
        soundDesc: 'Sonido de confirmación en acciones',
        soundActive: 'Activado',
        soundMuted: 'Desactivado',
        testSound: 'Probar sonido',
        securitySection: 'Seguridad y contraseña',
        passwordSection: 'Seguridad y contraseña',
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
        logoutSection: 'Sesión activa',
        logoutBtn: 'Cerrar sesión',
        logoutConfirmTitle: '¿Cerrar sesión?',
        logoutConfirmMessage:
          '¿Estás seguro de que deseas salir de tu cuenta actual en Aureus Manager? Tendrás que ingresar tus credenciales nuevamente para volver a entrar.',
        logoutConfirmCancel: 'Cancelar',
        logoutConfirmAction: 'Sí, cerrar sesión',
        logoutConfirmWorking: 'Cerrando sesión...',
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
      notificationsTitle: 'View today collection alerts',
      profileAria: 'Open executive profile and preferences',
    },
    profile: {
      modalTitle: 'Executive Profile',
      closeAria: 'Close profile',
      codeLabel: 'PERSONAL CODE',
      copyCode: 'Copy',
      copiedCode: 'Copied',
      menu: {
        ariaLabel: 'User account menu',
        defaultAdmin: 'Administrator',
        viewProfile: 'View your profile',
        myProfile: 'My profile',
        codePrefix: 'Code',
        accessibility: 'Accessibility',
      },
      tabs: {
        info: 'Information',
        accesibilidad: 'Accessibility',
        configuracion: 'Settings',
      },
      photo: {
        change: 'Change photo',
        remove: 'Remove photo',
        hint: 'Instantly optimized square format',
        invalidFile: 'Select a valid image file.',
        processError: 'Could not process the selected picture.',
      },
      fields: {
        fullName: 'Full name',
        username: 'Username',
        email: 'Email address',
        role: 'Assigned role',
        defaultRole: 'ADMINISTRATOR',
        status: 'Account status',
        createdAt: 'Registration date',
        lastAccess: 'Last login',
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
        themeLight: 'Light Mode',
        themeDark: 'Dark Mode',
        fontSection: 'Font size',
        fonts: {
          pequeno: 'Small',
          normal: 'Normal',
          grande: 'Large',
          extra: 'Extra large',
        },
        languageSection: 'Display language',
        languages: {
          es: 'Español',
          en: 'English',
          pt: 'Português',
          fr: 'Français',
        },
        colorblindSection: 'Colorblind adaptation',
        colorblindModes: {
          ninguno: {
            title: 'Standard',
            desc: 'Original palette without visual filter',
          },
          protanopia: {
            title: 'Protanopia',
            desc: 'Complete absence of red photoreceptors',
          },
          deuteranopia: {
            title: 'Deuteranopia',
            desc: 'Complete absence of green photoreceptors',
          },
          tritanopia: {
            title: 'Tritanopia',
            desc: 'Complete absence of blue photoreceptors',
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
        reset: 'Reset values',
      },
      settings: {
        operationSection: 'Operation preferences',
        soundSection: 'Action confirmation sound',
        soundDesc: 'Action confirmation sound',
        soundActive: 'Enabled',
        soundMuted: 'Disabled',
        testSound: 'Test sound',
        securitySection: 'Security and password',
        passwordSection: 'Security and password',
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
        logoutSection: 'Active session',
        logoutBtn: 'Sign out',
        logoutConfirmTitle: 'Sign out?',
        logoutConfirmMessage:
          'Are you sure you want to leave your current account in Aureus Manager? You will need to enter your credentials again to sign back in.',
        logoutConfirmCancel: 'Cancel',
        logoutConfirmAction: 'Yes, sign out',
        logoutConfirmWorking: 'Signing out...',
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
      notificationsTitle: 'Ver avisos de cobrança de hoje',
      profileAria: 'Abrir perfil executivo e preferências',
    },
    profile: {
      modalTitle: 'Perfil Executivo',
      closeAria: 'Fechar perfil',
      codeLabel: 'CÓDIGO PESSOAL',
      copyCode: 'Copiar',
      copiedCode: 'Copiado',
      menu: {
        ariaLabel: 'Menu da conta do usuário',
        defaultAdmin: 'Administrador',
        viewProfile: 'Ver seu perfil',
        myProfile: 'Meu perfil',
        codePrefix: 'Código',
        accessibility: 'Acessibilidade',
      },
      tabs: {
        info: 'Informação',
        accesibilidad: 'Acessibilidade',
        configuracion: 'Configurações',
      },
      photo: {
        change: 'Alterar foto',
        remove: 'Remover foto',
        hint: 'Formato quadrado otimizado instantaneamente',
        invalidFile: 'Selecione um arquivo de imagem válido.',
        processError: 'Não foi possível processar a imagem selecionada.',
      },
      fields: {
        fullName: 'Nome completo',
        username: 'Nome de usuário',
        email: 'E-mail',
        role: 'Função atribuída',
        defaultRole: 'ADMINISTRADOR',
        status: 'Status da conta',
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
        themeLight: 'Modo Claro',
        themeDark: 'Modo Escuro',
        fontSection: 'Tamanho da fonte',
        fonts: {
          pequeno: 'Pequeno',
          normal: 'Normal',
          grande: 'Grande',
          extra: 'Extra grande',
        },
        languageSection: 'Idioma de exibição',
        languages: {
          es: 'Español',
          en: 'English',
          pt: 'Português',
          fr: 'Français',
        },
        colorblindSection: 'Adaptação para daltonismo',
        colorblindModes: {
          ninguno: {
            title: 'Padrão',
            desc: 'Paleta original sem filtro visual',
          },
          protanopia: {
            title: 'Protanopia',
            desc: 'Ausência total de receptores de vermelho',
          },
          deuteranopia: {
            title: 'Deuteranopia',
            desc: 'Ausência total de receptores de verde',
          },
          tritanopia: {
            title: 'Tritanopia',
            desc: 'Ausência total de receptores de azul',
          },
          protanomalia: {
            title: 'Protanomalia',
            desc: 'Sensibilidade reduzida a tons vermelhos',
          },
          deuteranomalia: {
            title: 'Deuteranomalia',
            desc: 'Sensibilidade reduzida a tons verdes',
          },
          tritanomalia: {
            title: 'Tritanomalia',
            desc: 'Sensibilidade reduzida a tons azuis',
          },
          acromatopsia: {
            title: 'Acromatopsia',
            desc: 'Visão monocromática em escala de cinza',
          },
        },
        reset: 'Restaurar padrões',
      },
      settings: {
        operationSection: 'Preferências de operação',
        soundSection: 'Som de confirmação em ações',
        soundDesc: 'Som de confirmação em ações',
        soundActive: 'Ativado',
        soundMuted: 'Desativado',
        testSound: 'Testar som',
        securitySection: 'Segurança e senha',
        passwordSection: 'Segurança e senha',
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
        logoutSection: 'Sessão ativa',
        logoutBtn: 'Sair da conta',
        logoutConfirmTitle: 'Sair da conta?',
        logoutConfirmMessage:
          'Tem certeza de que deseja sair da sua conta atual no Aureus Manager? Será necessário inserir suas credenciais novamente para entrar.',
        logoutConfirmCancel: 'Cancelar',
        logoutConfirmAction: 'Sim, sair',
        logoutConfirmWorking: 'Saindo...',
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
      notificationsTitle: 'Voir les alertes de recouvrement du jour',
      profileAria: 'Ouvrir le profil exécutif et les réglages',
    },
    profile: {
      modalTitle: 'Profil Exécutif',
      closeAria: 'Fermer le profil',
      codeLabel: 'CODE PERSONNEL',
      copyCode: 'Copier',
      copiedCode: 'Copié',
      menu: {
        ariaLabel: 'Menu du compte utilisateur',
        defaultAdmin: 'Administrateur',
        viewProfile: 'Voir votre profil',
        myProfile: 'Mon profil',
        codePrefix: 'Code',
        accessibility: 'Accessibilité',
      },
      tabs: {
        info: 'Information',
        accesibilidad: 'Accessibilité',
        configuracion: 'Paramètres',
      },
      photo: {
        change: 'Changer la photo',
        remove: 'Supprimer la photo',
        hint: 'Format carré optimisé instantanément',
        invalidFile: 'Sélectionnez un fichier image valide.',
        processError: 'Impossible de traiter la photo sélectionnée.',
      },
      fields: {
        fullName: 'Nom complet',
        username: "Nom d'utilisateur",
        email: 'Adresse e-mail',
        role: 'Rôle attribué',
        defaultRole: 'ADMINISTRATEUR',
        status: 'État du compte',
        createdAt: "Date d'inscription",
        lastAccess: 'Dernier accès',
        noRecord: 'Aucun accès récent',
        activeStatus: 'Active',
        suspendedStatus: 'Suspendue',
        save: 'Enregistrer les modifications',
        saving: 'Enregistrement...',
        savedOk: 'Profil mis à jour avec succès.',
        saveError: 'Impossible de mettre à jour le profil.',
      },
      accessibility: {
        themeSection: 'Apparence visuelle',
        themeLight: 'Mode Clair',
        themeDark: 'Mode Sombre',
        fontSection: 'Taille de police',
        fonts: {
          pequeno: 'Petit',
          normal: 'Normal',
          grande: 'Grand',
          extra: 'Très grand',
        },
        languageSection: "Langue d'affichage",
        languages: {
          es: 'Español',
          en: 'English',
          pt: 'Português',
          fr: 'Français',
        },
        colorblindSection: 'Adaptation daltonisme',
        colorblindModes: {
          ninguno: {
            title: 'Standard',
            desc: 'Palette originale sans filtre visuel',
          },
          protanopia: {
            title: 'Protanopie',
            desc: 'Absence totale de récepteurs du rouge',
          },
          deuteranopia: {
            title: 'Deutéranopie',
            desc: 'Absence totale de récepteurs du vert',
          },
          tritanopia: {
            title: 'Tritanopie',
            desc: 'Absence totale de récepteurs du bleu',
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
        reset: 'Réinitialiser les valeurs',
      },
      settings: {
        operationSection: "Préférences d'opération",
        soundSection: 'Son de confirmation des actions',
        soundDesc: 'Son de confirmation des actions',
        soundActive: 'Activé',
        soundMuted: 'Désactivé',
        testSound: 'Tester le son',
        securitySection: 'Sécurité et mot de passe',
        passwordSection: 'Sécurité et mot de passe',
        currentPassword: 'Mot de passe actuel',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le nouveau mot de passe',
        updatePassword: 'Mettre à jour le mot de passe',
        updatingPassword: 'Mise à jour...',
        passwordMismatch: 'La confirmation ne correspond pas au nouveau mot de passe.',
        passwordTooShort: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
        passwordFieldsRequired: 'Complétez tous les champs de mot de passe.',
        passwordUpdated: 'Mot de passe mis à jour avec succès.',
        passwordError: 'Impossible de modifier le mot de passe.',
        logoutSection: 'Session active',
        logoutBtn: 'Se déconnecter',
        logoutConfirmTitle: 'Se déconnecter ?',
        logoutConfirmMessage:
          'Voulez-vous vraiment quitter votre compte actuel dans Aureus Manager ? Vous devrez saisir vos identifiants à nouveau pour vous reconnecter.',
        logoutConfirmCancel: 'Annuler',
        logoutConfirmAction: 'Oui, se déconnecter',
        logoutConfirmWorking: 'Déconnexion...',
      },
    },
  },
};

/* ============================================================================
   CAPA 1: DICCIONARIO EXHAUSTIVO DE TRADUCCIONES EXACTAS (ES -> EN, PT, FR)
   ============================================================================ */
export const EXACT_TEXT_MAP = {
  // Cabecera, Cuenta y Perfil
  'Administrador': { en: 'Administrator', pt: 'Administrador', fr: 'Administrateur' },
  'ADMINISTRADOR': { en: 'ADMINISTRATOR', pt: 'ADMINISTRADOR', fr: 'ADMINISTRATEUR' },
  'Ver tu perfil': { en: 'View your profile', pt: 'Ver seu perfil', fr: 'Voir votre profil' },
  'Mi perfil': { en: 'My profile', pt: 'Meu perfil', fr: 'Mon profil' },
  'Mi Perfil': { en: 'My Profile', pt: 'Meu Perfil', fr: 'Mon Profil' },
  'MI PERFIL': { en: 'MY PROFILE', pt: 'MEU PERFIL', fr: 'MON PROFIL' },
  'Accesibilidad': { en: 'Accessibility', pt: 'Acessibilidade', fr: 'Accessibilité' },
  'ACCESIBILIDAD': { en: 'ACCESSIBILITY', pt: 'ACESSIBILIDADE', fr: 'ACCESSIBILITÉ' },
  'Configuración': { en: 'Settings', pt: 'Configurações', fr: 'Paramètres' },
  'CONFIGURACIÓN': { en: 'SETTINGS', pt: 'CONFIGURAÇÕES', fr: 'PARAMÈTRES' },
  'Cerrar sesión': { en: 'Sign out', pt: 'Sair da conta', fr: 'Se déconnecter' },
  '¿Cerrar sesión?': { en: 'Sign out?', pt: 'Sair da conta?', fr: 'Se déconnecter ?' },
  'Sí, cerrar sesión': { en: 'Yes, sign out', pt: 'Sim, sair', fr: 'Oui, se déconnecter' },
  'Cerrando sesión...': { en: 'Signing out...', pt: 'Saindo...', fr: 'Déconnexion...' },
  'Cerrar perfil': { en: 'Close profile', pt: 'Fechar perfil', fr: 'Fermer le profil' },
  'Menú de cuenta de usuario': { en: 'User account menu', pt: 'Menu da conta do usuário', fr: 'Menu du compte utilisateur' },
  'Ver página informativa de Aureus Manager': { en: 'View Aureus Manager information portal', pt: 'Ver portal informativo do Aureus Manager', fr: "Voir le portail d'information Aureus Manager" },
  'APARIENCIA VISUAL': { en: 'VISUAL APPEARANCE', pt: 'APARÊNCIA VISUAL', fr: 'APPARENCE VISUELLE' },
  'Apariencia visual': { en: 'Visual appearance', pt: 'Aparência visual', fr: 'Apparence visuelle' },
  'Modo Claro': { en: 'Light Mode', pt: 'Modo Claro', fr: 'Mode Clair' },
  'Modo claro': { en: 'Light Mode', pt: 'Modo Claro', fr: 'Mode Clair' },
  'Modo Oscuro': { en: 'Dark Mode', pt: 'Modo Escuro', fr: 'Mode Sombre' },
  'Modo oscuro': { en: 'Dark Mode', pt: 'Modo Escuro', fr: 'Mode Sombre' },
  'TAMAÑO DE LETRA': { en: 'FONT SIZE', pt: 'TAMANHO DA FONTE', fr: 'TAILLE DE POLICE' },
  'Tamaño de letra': { en: 'Font size', pt: 'Tamanho da fonte', fr: 'Taille de police' },
  'Pequeño': { en: 'Small', pt: 'Pequeno', fr: 'Petit' },
  'Normal': { en: 'Normal', pt: 'Normal', fr: 'Normal' },
  'Grande': { en: 'Large', pt: 'Grande', fr: 'Grand' },
  'Extra grande': { en: 'Extra large', pt: 'Extra grande', fr: 'Très grand' },
  'IDIOMA DE VISUALIZACIÓN': { en: 'DISPLAY LANGUAGE', pt: 'IDIOMA DE EXIBIÇÃO', fr: "LANGUE D'AFFICHAGE" },
  'Idioma de visualización': { en: 'Display language', pt: 'Idioma de exibição', fr: "Langue d'affichage" },
  'IDIOMA DE LA INTERFAZ': { en: 'DISPLAY LANGUAGE', pt: 'IDIOMA DE EXIBIÇÃO', fr: "LANGUE D'AFFICHAGE" },
  'ADAPTACIÓN PARA DALTONISMO': { en: 'COLORBLIND ADAPTATION', pt: 'ADAPTAÇÃO PARA DALTONISMO', fr: 'ADAPTATION DALTONISME' },
  'Adaptación para daltonismo': { en: 'Colorblind adaptation', pt: 'Adaptação para daltonismo', fr: 'Adaptation daltonisme' },
  'Estándar': { en: 'Standard', pt: 'Padrão', fr: 'Standard' },
  'Paleta original sin filtro visual': { en: 'Original palette without visual filter', pt: 'Paleta original sem filtro visual', fr: 'Palette originale sans filtre visuel' },
  'Protanopia': { en: 'Protanopia', pt: 'Protanopia', fr: 'Protanopie' },
  'Protanopía': { en: 'Protanopia', pt: 'Protanopia', fr: 'Protanopie' },
  'Ausencia total de receptores del rojo': { en: 'Complete absence of red photoreceptors', pt: 'Ausência total de receptores de vermelho', fr: 'Absence totale de récepteurs du rouge' },
  'Deuteranopia': { en: 'Deuteranopia', pt: 'Deuteranopia', fr: 'Deutéranopie' },
  'Deuteranopía': { en: 'Deuteranopia', pt: 'Deuteranopia', fr: 'Deutéranopie' },
  'Ausencia total de receptores del verde': { en: 'Complete absence of green photoreceptors', pt: 'Ausência total de receptores de verde', fr: 'Absence totale de récepteurs du vert' },
  'Tritanopia': { en: 'Tritanopia', pt: 'Tritanopia', fr: 'Tritanopie' },
  'Tritanopía': { en: 'Tritanopia', pt: 'Tritanopia', fr: 'Tritanopie' },
  'Ausencia total de receptores del azul': { en: 'Complete absence of blue photoreceptors', pt: 'Ausência total de receptores de azul', fr: 'Absence totale de récepteurs du bleu' },
  'Protanomalía': { en: 'Protanomaly', pt: 'Protanomalia', fr: 'Protanomalie' },
  'Sensibilidad reducida hacia tonos rojos': { en: 'Reduced sensitivity to red tones', pt: 'Sensibilidade reduzida a tons vermelhos', fr: 'Sensibilité réduite aux tons rouges' },
  'Deuteranomalía': { en: 'Deuteranomaly', pt: 'Deuteranomalia', fr: 'Deutéranomalie' },
  'Sensibilidad reducida hacia tonos verdes': { en: 'Reduced sensitivity to green tones', pt: 'Sensibilidade reduzida a tons verdes', fr: 'Sensibilité réduite aux tons verts' },
  'Tritanomalía': { en: 'Tritanomaly', pt: 'Tritanomalia', fr: 'Tritanomalie' },
  'Sensibilidad reducida hacia tonos azules': { en: 'Reduced sensitivity to blue tones', pt: 'Sensibilidade reduzida a tons azuis', fr: 'Sensibilité réduite aux tons bleus' },
  'Acromatopsia': { en: 'Achromatopsia', pt: 'Acromatopsia', fr: 'Achromatopsie' },
  'Visión monocromática en escala de grises': { en: 'Monochrome vision in grayscale', pt: 'Visão monocromática em escala de cinza', fr: 'Vision monochrome en niveaux de gris' },
  'Restablecer valores': { en: 'Reset values', pt: 'Restaurar padrões', fr: 'Réinitialiser les valeurs' },
  'Cambiar foto': { en: 'Change photo', pt: 'Alterar foto', fr: 'Changer la photo' },
  'Quitar foto': { en: 'Remove photo', pt: 'Remover foto', fr: 'Supprimer la photo' },
  'Formato cuadrado optimizado al instante': { en: 'Instantly optimized square format', pt: 'Formato quadrado otimizado instantaneamente', fr: 'Format carré optimisé instantanément' },
  'CÓDIGO PERSONAL': { en: 'PERSONAL CODE', pt: 'CÓDIGO PESSOAL', fr: 'CODE PERSONNEL' },
  'Código personal': { en: 'Personal code', pt: 'Código pessoal', fr: 'Code personnel' },
  'Copiar': { en: 'Copy', pt: 'Copiar', fr: 'Copier' },
  'Copiado': { en: 'Copied', pt: 'Copiado', fr: 'Copié' },
  'Rol asignado': { en: 'Assigned role', pt: 'Função atribuída', fr: 'Rôle attribué' },
  'Estado de cuenta': { en: 'Account status', pt: 'Status da conta', fr: 'État du compte' },
  'Activa': { en: 'Active', pt: 'Ativa', fr: 'Active' },
  'Suspendida': { en: 'Suspended', pt: 'Suspensa', fr: 'Suspendue' },
  'Fecha de registro': { en: 'Registration date', pt: 'Data de registro', fr: "Date d'inscription" },
  'Último acceso': { en: 'Last login', pt: 'Último acesso', fr: 'Dernier accès' },
  'Sin registro reciente': { en: 'No recent record', pt: 'Sem registro recente', fr: 'Aucun accès récent' },
  'Nombre completo': { en: 'Full name', pt: 'Nome completo', fr: 'Nom complet' },
  'Nombre de usuario': { en: 'Username', pt: 'Nome de usuário', fr: "Nom d'utilisateur" },
  'Correo electrónico': { en: 'Email address', pt: 'E-mail', fr: 'Adresse e-mail' },
  'Guardar cambios': { en: 'Save changes', pt: 'Salvar alterações', fr: 'Enregistrer les modifications' },
  'Guardando cambios...': { en: 'Saving changes...', pt: 'Salvando alterações...', fr: 'Enregistrement...' },
  'PREFERENCIAS DE OPERACIÓN': { en: 'OPERATION PREFERENCES', pt: 'PREFERÊNCIAS DE OPERAÇÃO', fr: "PRÉFÉRENCES D'OPÉRATION" },
  'Preferencias de operación': { en: 'Operation preferences', pt: 'Preferências de operação', fr: "Préférences d'opération" },
  'Sonido de confirmación en acciones': { en: 'Action confirmation sound', pt: 'Som de confirmação em ações', fr: 'Son de confirmation des actions' },
  'Activado': { en: 'Enabled', pt: 'Ativado', fr: 'Activé' },
  'Desactivado': { en: 'Disabled', pt: 'Desativado', fr: 'Désactivé' },
  'Probar sonido': { en: 'Test sound', pt: 'Testar som', fr: 'Tester le son' },
  'SEGURIDAD Y CONTRASEÑA': { en: 'SECURITY AND PASSWORD', pt: 'SEGURANÇA E SENHA', fr: 'SÉCURITÉ ET MOT DE PASSE' },
  'Seguridad y contraseña': { en: 'Security and password', pt: 'Segurança e senha', fr: 'Sécurité et mot de passe' },
  'Contraseña actual': { en: 'Current password', pt: 'Senha atual', fr: 'Mot de passe actuel' },
  'Nueva contraseña': { en: 'New password', pt: 'Nova senha', fr: 'Nouveau mot de passe' },
  'Confirmar nueva contraseña': { en: 'Confirm new password', pt: 'Confirmar nova senha', fr: 'Confirmer le nouveau mot de passe' },
  'Actualizar contraseña': { en: 'Update password', pt: 'Atualizar senha', fr: 'Mettre à jour le mot de passe' },
  'Actualizando...': { en: 'Updating...', pt: 'Atualizando...', fr: 'Mise à jour...' },
  'SESIÓN ACTIVA': { en: 'ACTIVE SESSION', pt: 'SESSÃO ATIVA', fr: 'SESSION ACTIVE' },
  'Sesión activa': { en: 'Active session', pt: 'Sessão ativa', fr: 'Session active' },

  // Botones y acciones comunes
  'Cancelar': { en: 'Cancel', pt: 'Cancelar', fr: 'Annuler' },
  'Confirmar': { en: 'Confirm', pt: 'Confirmar', fr: 'Confirmer' },
  'Confirmar cambio': { en: 'Confirm change', pt: 'Confirmar alteração', fr: 'Confirmer la modification' },
  'Confirmar cambios': { en: 'Confirm changes', pt: 'Confirmar alterações', fr: 'Confirmer les modifications' },
  'Atrás': { en: 'Back', pt: 'Voltar', fr: 'Retour' },
  'Regresar': { en: 'Go back', pt: 'Voltar', fr: 'Retour' },
  'Cerrar': { en: 'Close', pt: 'Fechar', fr: 'Fermer' },
  'Cerrar modal': { en: 'Close modal', pt: 'Fechar modal', fr: 'Fermer la fenêtre' },
  'Cerrar ventana': { en: 'Close window', pt: 'Fechar janela', fr: 'Fermer la fenêtre' },
  'Entendido': { en: 'Got it', pt: 'Entendido', fr: 'Compris' },
  'Guardando...': { en: 'Saving...', pt: 'Salvando...', fr: 'Enregistrement...' },
  'Eliminar': { en: 'Delete', pt: 'Excluir', fr: 'Supprimer' },
  'Sí, eliminar': { en: 'Yes, delete', pt: 'Sim, excluir', fr: 'Oui, supprimer' },
  'Actualizar datos': { en: 'Refresh data', pt: 'Atualizar dados', fr: 'Actualiser les données' },
  'Información': { en: 'Information', pt: 'Informação', fr: 'Information' },
  'Atención': { en: 'Attention', pt: 'Atenção', fr: 'Attention' },
  'Buscar por nombre, cédula, teléfono o ubicación': {
    en: 'Search by name, ID, phone, or location',
    pt: 'Buscar por nome, documento, telefone ou localização',
    fr: "Rechercher par nom, pièce d'identité, téléphone ou lieu",
  },
  'Cargando información...': { en: 'Loading information...', pt: 'Carregando informações...', fr: 'Chargement des informations...' },

  // Módulo I: Cobros
  'Cobros': { en: 'Collections', pt: 'Cobranças', fr: 'Recouvrements' },
  'Compartir': { en: 'Share', pt: 'Compartilhar', fr: 'Partager' },
  'Compartir cobros del día': { en: 'Share daily collections', pt: 'Compartilhar cobranças do dia', fr: 'Partager les recouvrements du jour' },
  'Abrir selector de calendario mensual': { en: 'Open monthly calendar picker', pt: 'Abrir seletor de calendário mensal', fr: 'Ouvrir le sélecteur de calendrier mensuel' },
  'Semana anterior': { en: 'Previous week', pt: 'Semana anterior', fr: 'Semaine précédente' },
  'Semana siguiente': { en: 'Next week', pt: 'Próxima semana', fr: 'Semaine suivante' },
  'TOTAL PRESTADO': { en: 'TOTAL LOANED', pt: 'TOTAL EMPRESTADO', fr: 'TOTAL PRÊTÉ' },
  'ESTA SEMANA': { en: 'THIS WEEK', pt: 'ESTA SEMANA', fr: 'CETTE SEMAINE' },
  'HOY': { en: 'TODAY', pt: 'HOJE', fr: "AUJOURD'HUI" },
  'Hoy': { en: 'Today', pt: 'Hoje', fr: "Aujourd'hui" },
  'COBRADO HOY': { en: 'COLLECTED TODAY', pt: 'COBRADO HOJE', fr: "ENCAISSÉ AUJOURD'HUI" },
  'Mañana': { en: 'Tomorrow', pt: 'Amanhã', fr: 'Demain' },
  'LUN': { en: 'MON', pt: 'SEG', fr: 'LUN' },
  'MAR': { en: 'TUE', pt: 'TER', fr: 'MAR' },
  'MIÉ': { en: 'WED', pt: 'QUA', fr: 'MER' },
  'JUE': { en: 'THU', pt: 'QUI', fr: 'JEU' },
  'VIE': { en: 'FRI', pt: 'SEX', fr: 'VEN' },
  'SÁB': { en: 'SAT', pt: 'SÁB', fr: 'SAM' },
  'DOM': { en: 'SUN', pt: 'DOM', fr: 'DIM' },
  'Lunes': { en: 'Monday', pt: 'Segunda-feira', fr: 'Lundi' },
  'Martes': { en: 'Tuesday', pt: 'Terça-feira', fr: 'Mardi' },
  'Miércoles': { en: 'Wednesday', pt: 'Quarta-feira', fr: 'Mercredi' },
  'Jueves': { en: 'Thursday', pt: 'Quinta-feira', fr: 'Jeudi' },
  'Viernes': { en: 'Friday', pt: 'Sexta-feira', fr: 'Vendredi' },
  'Sábado': { en: 'Saturday', pt: 'Sábado', fr: 'Samedi' },
  'Domingo': { en: 'Sunday', pt: 'Domingo', fr: 'Dimanche' },
  'LUNES': { en: 'MONDAY', pt: 'SEGUNDA', fr: 'LUNDI' },
  'MARTES': { en: 'TUESDAY', pt: 'TERÇA', fr: 'MARDI' },
  'MIÉRCOLES': { en: 'WEDNESDAY', pt: 'QUARTA', fr: 'MERCREDI' },
  'JUEVES': { en: 'THURSDAY', pt: 'QUINTA', fr: 'JEUDI' },
  'VIERNES': { en: 'FRIDAY', pt: 'SEXTA', fr: 'VENDREDI' },
  'SÁBADO': { en: 'SATURDAY', pt: 'SÁBADO', fr: 'SAMEDI' },
  'DOMINGO': { en: 'SUNDAY', pt: 'DOMINGO', fr: 'DIMANCHE' },
  'Selector de día de cobro': { en: 'Collection day selector', pt: 'Seletor de dia de cobrança', fr: 'Sélecteur de jour de recouvrement' },
  'Días de la semana': { en: 'Days of the week', pt: 'Dias da semana', fr: 'Jours de la semaine' },
  'Día con cobros pendientes sin cerrar': { en: 'Day with unclosed pending collections', pt: 'Dia com cobranças pendentes não encerradas', fr: 'Jour avec recouvrements en attente non clôturés' },
  'Día actual': { en: 'Current day', pt: 'Dia atual', fr: 'Jour actuel' },
  'Pendientes': { en: 'Pending', pt: 'Pendentes', fr: 'En attente' },
  'Registrados': { en: 'Recorded', pt: 'Registrados', fr: 'Enregistrés' },
  'Atrasados': { en: 'Overdue', pt: 'Atrasados', fr: 'En retard' },
  'Sin cobros pendientes': { en: 'No pending collections', pt: 'Sem cobranças pendentes', fr: 'Aucun recouvrement en attente' },
  'SIN COBROS PENDIENTES': { en: 'NO PENDING COLLECTIONS', pt: 'SEM COBRANÇAS PENDENTES', fr: 'AUCUN RECOUVREMENT EN ATTENTE' },
  'Sin cobros registrados': { en: 'No recorded collections', pt: 'Sem cobranças registradas', fr: 'Aucun recouvrement enregistré' },
  'SIN COBROS REGISTRADOS': { en: 'NO RECORDED COLLECTIONS', pt: 'SEM COBRANÇAS REGISTRADAS', fr: 'AUCUN RECOUVREMENT ENREGISTRÉ' },
  'Sin cobros atrasados': { en: 'No overdue collections', pt: 'Sem cobranças atrasadas', fr: 'Aucun recouvrement en retard' },
  'SIN COBROS ATRASADOS': { en: 'NO OVERDUE COLLECTIONS', pt: 'SEM COBRANÇAS ATRASADAS', fr: 'AUCUN RECOUVREMENT EN RETARD' },
  'Sin atrasos críticos': { en: 'No critical delays', pt: 'Sem atrasos críticos', fr: 'Aucun retard critique' },
  'No hay clientes con atrasos críticos acumulados.': {
    en: 'There are no clients with accumulated critical overdue payments.',
    pt: 'Não há clientes com atrasos críticos acumulados.',
    fr: "Il n'y a aucun client présentant des retards critiques cumulés.",
  },
  'Sin resultados': { en: 'No results', pt: 'Sem resultados', fr: 'Aucun résultat' },
  'No se encontraron cobros que coincidan con la búsqueda.': {
    en: 'No collections matched your search.',
    pt: 'Nenhuma cobrança corresponde à pesquisa.',
    fr: 'Aucun recouvrement ne correspond à votre recherche.',
  },
  'Indica si el cliente pagó, pasó de día o no pagó para actualizar su estado.': {
    en: 'Select whether the client paid, rescheduled, or missed payment to update their status.',
    pt: 'Indique se o cliente pagou, adiou ou não pagou para atualizar seu status.',
    fr: 'Indiquez si le client a payé, reporté ou non payé pour mettre à jour son statut.',
  },
  'Pagó': { en: 'Paid', pt: 'Pagou', fr: 'Payé' },
  'Pasar': { en: 'Reschedule', pt: 'Adiar', fr: 'Reporter' },
  'No Pagó': { en: 'Unpaid', pt: 'Não Pagou', fr: 'Impayé' },
  'Retirar envio': { en: 'Remove dispatch', pt: 'Retirar envio', fr: "Retirer l'envoi" },
  'Cobro temporal reprogramado': { en: 'Temporarily rescheduled collection', pt: 'Cobrança temporária reagendada', fr: 'Recouvrement temporairement reporté' },
  'Cobro registrado': { en: 'Collection recorded', pt: 'Cobrança registrada', fr: 'Recouvrement enregistré' },
  'Cuota': { en: 'Installment', pt: 'Parcela', fr: 'Échéance' },
  'CUOTA': { en: 'INSTALLMENT', pt: 'PARCELA', fr: 'ÉCHÉANCE' },
  'Cuota regular': { en: 'Regular installment', pt: 'Parcela regular', fr: 'Échéance régulière' },
  'Saldo del préstamo': { en: 'Loan balance', pt: 'Saldo do empréstimo', fr: 'Solde du prêt' },
  'Total financiado': { en: 'Total financed', pt: 'Total financiado', fr: 'Total financé' },
  'Registrar Pago': { en: 'Record Payment', pt: 'Registrar Pagamento', fr: 'Enregistrer le Paiement' },
  'semana sin pagar': { en: 'week unpaid', pt: 'semana sem pagar', fr: 'semaine impayée' },
  'semanas sin pagar': { en: 'weeks unpaid', pt: 'semanas sem pagar', fr: 'semaines impayées' },
  'SEMANAS SIN PAGAR': { en: 'WEEKS UNPAID', pt: 'SEMANAS SEM PAGAR', fr: 'SEMAINES IMPAYÉES' },
  'Buscar cobros del día': { en: 'Search today collections', pt: 'Buscar cobranças do dia', fr: 'Rechercher les recouvrements du jour' },
  'Buscar cobro': { en: 'Search collection', pt: 'Buscar cobrança', fr: 'Rechercher un recouvrement' },
  'Cerrar búsqueda': { en: 'Close search', pt: 'Fechar pesquisa', fr: 'Fermer la recherche' },
  'Limpiar búsqueda': { en: 'Clear search', pt: 'Limpar pesquisa', fr: 'Effacer la recherche' },

  // Modales de Cobro y Calendario
  'Ir a hoy': { en: 'Go to today', pt: 'Ir para hoje', fr: "Aller à aujourd'hui" },
  'Seleccionar la fecha de hoy y cerrar el calendario': {
    en: 'Select today date and close calendar',
    pt: 'Selecionar a data de hoje e fechar o calendário',
    fr: "Sélectionner la date d'aujourd'hui et fermer le calendrier",
  },
  'Mes anterior': { en: 'Previous month', pt: 'Mês anterior', fr: 'Mois précédent' },
  'Mes siguiente': { en: 'Next month', pt: 'Próximo mês', fr: 'Mois suivant' },
  'Año anterior': { en: 'Previous year', pt: 'Ano anterior', fr: 'Année précédente' },
  'Año siguiente': { en: 'Next year', pt: 'Próximo ano', fr: 'Année suivante' },
  'Restar una cuota': { en: 'Subtract one installment', pt: 'Subtrair uma parcela', fr: 'Soustraire une échéance' },
  'Sumar una cuota': { en: 'Add one installment', pt: 'Somar uma parcela', fr: 'Ajouter une échéance' },
  'realizó el pago de': { en: 'made a payment of', pt: 'realizou o pagamento de', fr: 'a effectué le paiement de' },
  'Saldo actual:': { en: 'Current balance:', pt: 'Saldo atual:', fr: 'Solde actuel :' },
  '· Nuevo saldo:': { en: '· New balance:', pt: '· Novo saldo:', fr: '· Nouveau solde :' },
  'Cálculo de Atraso Acumulado': { en: 'Accumulated Delay Calculation', pt: 'Cálculo de Atraso Acumulado', fr: 'Calcul du Retard Cumulé' },
  'CUOTA DE HOY': { en: 'TODAY INSTALLMENT', pt: 'PARCELA DE HOJE', fr: "ÉCHÉANCE D'AUJOURD'HUI" },
  'más': { en: 'plus', pt: 'mais', fr: 'plus' },
  'de moratoria para un total de': { en: 'late fee for a total of', pt: 'de multa por um total de', fr: 'de pénalité pour un total de' },
  'Continuar a confirmación': { en: 'Continue to confirmation', pt: 'Continuar para confirmação', fr: 'Continuer vers confirmation' },
  'Se limpiará el atraso acumulado de este período y el cliente pasará a Cobros ya registrados.': {
    en: 'Accumulated delay for this period will be cleared and the client will move to Recorded Collections.',
    pt: 'O atraso acumulado deste período será limpo e o cliente passará para Cobranças registradas.',
    fr: 'Le retard cumulé de cette période sera effacé et le client passera en Recouvrements enregistrés.',
  },
  'Día fijo habitual pactado:': { en: 'Agreed regular fixed day:', pt: 'Dia fixo habitual combinado:', fr: 'Jour fixe habituel convenu :' },
  'FECHA DE REPROGRAMACIÓN ELEGIDA': { en: 'CHOSEN RESCHEDULE DATE', pt: 'DATA DE REAGENDAMENTO ESCOLHIDA', fr: 'DATE DE REPORT CHOISIE' },
  'Reprogramación confirmada': { en: 'Reschedule confirmed', pt: 'Reagendamento confirmado', fr: 'Report confirmé' },
  'Sí, confirmar reprogramación': { en: 'Yes, confirm reschedule', pt: 'Sim, confirmar reagendamento', fr: 'Oui, confirmer le report' },
  'no realizó el pago de hoy por': { en: 'did not make today payment of', pt: 'não realizou o pagamento de hoje de', fr: "n'a pas effectué le paiement d'aujourd'hui de" },
  'PRÓXIMO COBRO': { en: 'NEXT COLLECTION', pt: 'PRÓXIMA COBRANÇA', fr: 'PROCHAIN RECOUVREMENT' },

  // Módulo II: Clientes
  'Clientes': { en: 'Clients', pt: 'Clientes', fr: 'Clients' },
  'Clientes registrados': { en: 'Registered clients', pt: 'Clientes registrados', fr: 'Clients enregistrés' },
  'CLIENTES REGISTRADOS': { en: 'REGISTERED CLIENTS', pt: 'CLIENTES REGISTRADOS', fr: 'CLIENTS ENREGISTRÉS' },
  '+ Nuevo': { en: '+ New', pt: '+ Novo', fr: '+ Nouveau' },
  'Nuevo': { en: 'New', pt: 'Novo', fr: 'Nouveau' },
  'Registrar nuevo cliente': { en: 'Register new client', pt: 'Cadastrar novo cliente', fr: 'Enregistrer un nouveau client' },
  'Buscar clientes': { en: 'Search clients', pt: 'Buscar clientes', fr: 'Rechercher des clients' },
  'No hay clientes registrados': { en: 'No registered clients', pt: 'Não há clientes registrados', fr: 'Aucun client enregistré' },
  'NO HAY CLIENTES REGISTRADOS': { en: 'NO REGISTERED CLIENTS', pt: 'NÃO HÁ CLIENTES REGISTRADOS', fr: 'AUCUN CLIENT ENREGISTRÉ' },
  'No se encontraron clientes': { en: 'No clients found', pt: 'Nenhum cliente encontrado', fr: 'Aucun client trouvé' },
  'Intenta con otro nombre, teléfono, cédula o ubicación.': {
    en: 'Try another name, phone, ID, or location.',
    pt: 'Tente outro nome, telefone, documento ou localização.',
    fr: "Essayez un autre nom, téléphone, pièce d'identité ou lieu.",
  },
  'Presiona el botón "Nuevo" arriba para registrar el primer cliente.': {
    en: 'Press the "New" button above to register your first client.',
    pt: 'Pressione o botão "Novo" acima para cadastrar o primeiro cliente.',
    fr: 'Appuyez sur le bouton « Nouveau » ci-dessus pour enregistrer le premier client.',
  },
  'Nuevo Cliente': { en: 'New Client', pt: 'Novo Cliente', fr: 'Nouveau Client' },
  'Editar Cliente': { en: 'Edit Client', pt: 'Editar Cliente', fr: 'Modifier le Client' },
  'Editar cliente': { en: 'Edit client', pt: 'Editar cliente', fr: 'Modifier le client' },
  'Enviar a Lista Negra': { en: 'Send to Blacklist', pt: 'Enviar para Lista Restrita', fr: 'Envoyer en Liste Noire' },
  'Eliminar cliente': { en: 'Delete client', pt: 'Excluir cliente', fr: 'Supprimer le client' },
  'Eliminar Cliente': { en: 'Delete Client', pt: 'Excluir Cliente', fr: 'Supprimer le Client' },
  'Confirmar Lista Negra': { en: 'Confirm Blacklist', pt: 'Confirmar Lista Restrita', fr: 'Confirmer Liste Noire' },
  'Opciones del cliente': { en: 'Client options', pt: 'Opções do cliente', fr: 'Options du client' },
  'Sin cédula': { en: 'No ID', pt: 'Sem documento', fr: 'Sans ID' },
  'Costarricense': { en: 'Costa Rican', pt: 'Costarriquenho', fr: 'Costaricien' },
  'Extranjero': { en: 'Foreigner', pt: 'Estrangeiro', fr: 'Étranger' },
  'CÉDULA *': { en: 'NATIONAL ID *', pt: 'DOCUMENTO *', fr: "PIÈCE D'IDENTITÉ *" },
  'Cédula': { en: 'ID', pt: 'Documento', fr: 'ID' },
  'Cédula:': { en: 'ID:', pt: 'Documento:', fr: 'ID :' },
  'Foto': { en: 'Photo', pt: 'Foto', fr: 'Photo' },
  'NOMBRE *': { en: 'FIRST NAME *', pt: 'NOME *', fr: 'PRÉNOM *' },
  'Nombre': { en: 'First name', pt: 'Nome', fr: 'Prénom' },
  'Nombre:': { en: 'First name:', pt: 'Nome:', fr: 'Prénom :' },
  'APELLIDOS': { en: 'LAST NAMES', pt: 'SOBRENOMES', fr: 'NOMS DE FAMILLE' },
  'Apellidos': { en: 'Last names', pt: 'Sobrenomes', fr: 'Noms de famille' },
  'TELÉFONO *': { en: 'PHONE *', pt: 'TELEFONE *', fr: 'TÉLÉPHONE *' },
  'Teléfono': { en: 'Phone', pt: 'Telefone', fr: 'Téléphone' },
  'Teléfono:': { en: 'Phone:', pt: 'Telefone:', fr: 'Téléphone :' },
  'TELÉFONO SECUNDARIO': { en: 'SECONDARY PHONE', pt: 'TELEFONE SECUNDÁRIO', fr: 'TÉLÉPHONE SECONDAIRE' },
  'Teléfono secundario:': { en: 'Secondary phone:', pt: 'Telefone secundário:', fr: 'Téléphone secondaire :' },
  'País': { en: 'Country', pt: 'País', fr: 'Pays' },
  'Buscar país...': { en: 'Search country...', pt: 'Buscar país...', fr: 'Rechercher un pays...' },
  'Cambiar país del teléfono': { en: 'Change phone country', pt: 'Alterar país do telefone', fr: 'Changer le pays du téléphone' },
  'Cambiar país del teléfono secundario': { en: 'Change secondary phone country', pt: 'Alterar país do telefone secundário', fr: 'Changer le pays du téléphone secondaire' },
  'UBICACIÓN *': { en: 'LOCATION *', pt: 'LOCALIZAÇÃO *', fr: 'LOCALISATION *' },
  'Ubicación': { en: 'Location', pt: 'Localização', fr: 'Lieu' },
  'Ubicación:': { en: 'Location:', pt: 'Localização:', fr: 'Lieu :' },
  'Ubicación o señas': { en: 'Location or address notes', pt: 'Localização ou referências', fr: 'Lieu ou indications' },
  'DETALLES': { en: 'DETAILS', pt: 'DETALHES', fr: 'DÉTAILS' },
  'Detalles': { en: 'Details', pt: 'Detalhes', fr: 'Détails' },
  'Guardar Cliente': { en: 'Save Client', pt: 'Salvar Cliente', fr: 'Enregistrer le Client' },
  'Escanear cédula desde foto de la galería': { en: 'Scan ID from gallery photo', pt: 'Escanear documento da galeria', fr: "Numériser la pièce d'identité depuis la galerie" },
  'Consultando identificación': { en: 'Checking identification', pt: 'Consultando identificação', fr: "Vérification de l'identité" },
  'Leyendo...': { en: 'Reading...', pt: 'Lendo...', fr: 'Lecture...' },
  'Autocompletar datos anteriores': { en: 'Autofill previous details', pt: 'Preencher dados anteriores', fr: 'Remplir les données précédentes' },
  'Antecedente registrado · Dejó saldo pendiente': { en: 'Recorded history · Left unpaid balance', pt: 'Histórico registrado · Deixou saldo pendente', fr: 'Antécédent enregistré · Solde impayé' },

  // Módulo III: Préstamos
  'Préstamos': { en: 'Loans', pt: 'Empréstimos', fr: 'Prêts' },
  'PRÉSTAMOS PENDIENTES': { en: 'PENDING LOANS', pt: 'EMPRÉSTIMOS PENDENTES', fr: 'PRÊTS EN ATTENTE' },
  'Préstamos pendientes': { en: 'Pending loans', pt: 'Empréstimos pendentes', fr: 'Prêts en attente' },
  'PRÉSTAMOS REGISTRADOS': { en: 'RECORDED LOANS', pt: 'EMPRÉSTIMOS REGISTRADOS', fr: 'PRÊTS ENREGISTRÉS' },
  'Préstamos registrados': { en: 'Recorded loans', pt: 'Empréstimos registrados', fr: 'Prêts enregistrés' },
  'PRÉSTAMOS ATRASADOS': { en: 'OVERDUE LOANS', pt: 'EMPRÉSTIMOS ATRASADOS', fr: 'PRÊTS EN RETARD' },
  'Préstamos atrasados': { en: 'Overdue loans', pt: 'Empréstimos atrasados', fr: 'Prêts en retard' },
  'Seleccionar': { en: 'Select', pt: 'Selecionar', fr: 'Sélectionner' },
  'Seleccionar todos': { en: 'Select all', pt: 'Selecionar todos', fr: 'Tout sélectionner' },
  'Deseleccionar todos': { en: 'Deselect all', pt: 'Desmarcar todos', fr: 'Tout désélectionner' },
  'Eliminar seleccionados': { en: 'Delete selected', pt: 'Excluir selecionados', fr: 'Supprimer la sélection' },
  'Seleccionar préstamos para eliminar en lote': { en: 'Select loans for batch deletion', pt: 'Selecionar empréstimos para exclusão em lote', fr: 'Sélectionner des prêts à supprimer par lot' },
  'Crear un nuevo préstamo': { en: 'Create a new loan', pt: 'Criar um novo empréstimo', fr: 'Créer un nouveau prêt' },
  'NO HAY PRÉSTAMOS PENDIENTES': { en: 'NO PENDING LOANS', pt: 'NÃO HÁ EMPRÉSTIMOS PENDENTES', fr: 'AUCUN PRÊT EN ATTENTE' },
  'No hay préstamos pendientes': { en: 'No pending loans', pt: 'Não há empréstimos pendentes', fr: 'Aucun prêt en attente' },
  'No tienes préstamos pendientes de cobro en este momento.': {
    en: 'You have no pending loans for collection at this moment.',
    pt: 'Você não tem empréstimos pendentes de cobrança neste momento.',
    fr: "Vous n'avez aucun prêt en attente de recouvrement pour le moment.",
  },
  'NO HAY PRÉSTAMOS REGISTRADOS': { en: 'NO RECORDED LOANS', pt: 'NÃO HÁ EMPRÉSTIMOS REGISTRADOS', fr: 'AUCUN PRÊT ENREGISTRÉ' },
  'No hay préstamos registrados': { en: 'No recorded loans', pt: 'Não há empréstimos registrados', fr: 'Aucun prêt enregistré' },
  'Los préstamos finiquitados y pagados al 100 % se mostrarán aquí.': {
    en: 'Settled and 100% paid loans will appear here.',
    pt: 'Empréstimos quitados e pagos 100% serão exibidos aqui.',
    fr: 'Les prêts soldés et payés à 100 % seront affichés ici.',
  },
  'NO HAY PRÉSTAMOS ATRASADOS': { en: 'NO OVERDUE LOANS', pt: 'NÃO HÁ EMPRÉSTIMOS ATRASADOS', fr: 'AUCUN PRÊT EN RETARD' },
  'No hay préstamos atrasados': { en: 'No overdue loans', pt: 'Não há empréstimos atrasados', fr: 'Aucun prêt en retard' },
  'Excelente, todos los préstamos se encuentran al día.': {
    en: 'Great, all loans are up to date.',
    pt: 'Excelente, todos os empréstimos estão em dia.',
    fr: 'Excellent, tous les prêts sont à jour.',
  },
  'Sin resultados para la búsqueda': { en: 'No search results', pt: 'Sem resultados para a pesquisa', fr: 'Aucun résultat pour la recherche' },
  'INTERÉS': { en: 'INTEREST', pt: 'JUROS', fr: 'INTÉRÊT' },
  'MODALIDAD': { en: 'FREQUENCY', pt: 'MODALIDADE', fr: 'MODALITÉ' },
  'COBRO': { en: 'COLLECTION DAY', pt: 'COBRANÇA', fr: 'COLLECTE' },
  'MONTO PRESTADO': { en: 'AMOUNT LOANED', pt: 'VALOR EMPRESTADO', fr: 'MONTANT PRÊTÉ' },
  'CALENDARIO DE PAGOS': { en: 'PAYMENT CALENDAR', pt: 'CALENDÁRIO DE PAGAMENTOS', fr: 'CALENDRIER DES PAIEMENTS' },
  'Calendario de pagos': { en: 'Payment calendar', pt: 'Calendário de pagamentos', fr: 'Calendrier des paiements' },
  'Semanal': { en: 'Weekly', pt: 'Semanal', fr: 'Hebdomadaire' },
  'SEMANAL': { en: 'WEEKLY', pt: 'SEMANAL', fr: 'HEBDOMADAIRE' },
  'Quincenal': { en: 'Biweekly', pt: 'Quinzenal', fr: 'Bimensuel' },
  'QUINCENAL': { en: 'BIWEEKLY', pt: 'QUINZENAL', fr: 'BIMENSUEL' },
  'Mensual': { en: 'Monthly', pt: 'Mensal', fr: 'Mensuel' },
  'MENSUAL': { en: 'MONTHLY', pt: 'MENSUAL', fr: 'MENSUEL' },
  'Día 15 y fin de mes': { en: '15th and month end', pt: 'Dia 15 e fim do mês', fr: 'Le 15 et fin de mois' },
  'Pagado': { en: 'Paid', pt: 'Pago', fr: 'Payé' },
  'PAGADO': { en: 'PAID', pt: 'PAGO', fr: 'PAYÉ' },
  'Falta pagar': { en: 'Remaining', pt: 'Falta pagar', fr: 'Reste à payer' },
  'Cuotas': { en: 'Installments', pt: 'Parcelas', fr: 'Échéances' },
  'Renovar': { en: 'Renew', pt: 'Renovar', fr: 'Renouveler' },
  'Renovado': { en: 'Renewed', pt: 'Renovado', fr: 'Renouvelé' },
  'Arreglo': { en: 'Agreement', pt: 'Acordo', fr: 'Accord' },
  'Arreglo de pago': { en: 'Payment agreement', pt: 'Acordo de pagamento', fr: 'Accord de paiement' },
  'Pendiente': { en: 'Pending', pt: 'Pendente', fr: 'En attente' },
  'Registrado': { en: 'Recorded', pt: 'Registrado', fr: 'Enregistré' },
  'REGISTRADO': { en: 'RECORDED', pt: 'REGISTRADO', fr: 'ENREGISTRÉ' },
  'Atrasado': { en: 'Overdue', pt: 'Atrasado', fr: 'En retard' },
  'ATRASADO': { en: 'OVERDUE', pt: 'ATRASADO', fr: 'EN RETARD' },
  'Nuevo Préstamo': { en: 'New Loan', pt: 'Novo Empréstimo', fr: 'Nouveau Prêt' },
  'Confirmar Préstamo': { en: 'Confirm Loan', pt: 'Confirmar Empréstimo', fr: 'Confirmer le Prêt' },
  'Guardar Préstamo': { en: 'Save Loan', pt: 'Salvar Empréstimo', fr: 'Enregistrer le Prêt' },
  'Confirmar Renovación': { en: 'Confirm Renewal', pt: 'Confirmar Renovação', fr: 'Confirmer le Renouvellement' },
  'Confirmar Arreglo de Pago': { en: 'Confirm Payment Agreement', pt: 'Confirmar Acordo de Pagamento', fr: "Confirmer l'Accord de Paiement" },
  'Eliminar préstamo': { en: 'Delete loan', pt: 'Excluir empréstimo', fr: 'Supprimer le prêt' },
  'Eliminar préstamos': { en: 'Delete loans', pt: 'Excluir empréstimos', fr: 'Supprimer les prêts' },
  'Préstamo con atraso': { en: 'Overdue loan', pt: 'Empréstimo em atraso', fr: 'Prêt en retard' },
  'Renovar este préstamo': { en: 'Renew this loan', pt: 'Renovar este empréstimo', fr: 'Renouveler ce prêt' },
  'Realizar acuerdo de pago': { en: 'Set up payment agreement', pt: 'Realizar acordo de pagamento', fr: 'Créer un accord de paiement' },
  'TOTAL A PAGAR': { en: 'TOTAL TO PAY', pt: 'TOTAL A PAGAR', fr: 'TOTAL À PAYER' },
  'MODALIDAD DE COBRO': { en: 'COLLECTION FREQUENCY', pt: 'MODALIDADE DE COBRANÇA', fr: 'FRÉQUENCE DE COLLECTE' },
  'ESQUEMA QUINCENAL': { en: 'BIWEEKLY SCHEDULE', pt: 'ESQUEMA QUINZENAL', fr: 'CALENDRIER BIMENSUEL' },
  'FECHAS DE COBRO QUINCENAL': { en: 'BIWEEKLY COLLECTION DATES', pt: 'DATAS DE COBRANÇA QUINZENAL', fr: 'DATES DE COLLECTE BIMENSUELLE' },
  'FECHA DE INICIO': { en: 'START DATE', pt: 'DATA DE INÍCIO', fr: 'DATE DE DÉBUT' },
  'PRIMER COBRO': { en: 'FIRST COLLECTION', pt: 'PRIMEIRA COBRANÇA', fr: 'PREMIER RECOUVREMENT' },
  'ÚLTIMO COBRO': { en: 'FINAL COLLECTION', pt: 'ÚLTIMA COBRANÇA', fr: 'DERNIER RECOUVREMENT' },
  'Seleccionar Fecha de Inicio': { en: 'Select Start Date', pt: 'Selecionar Data de Início', fr: 'Sélectionner la date de début' },
  'Seleccionar hoy': { en: 'Select today', pt: 'Selecionar hoje', fr: "Sélectionner aujourd'hui" },
  'Préstamo avanzado': { en: 'In-progress loan', pt: 'Empréstimo em andamento', fr: 'Prêt déjà entamé' },
  'CONDICIONES ACTUALES': { en: 'CURRENT TERMS', pt: 'CONDIÇÕES ATUAIS', fr: 'CONDITIONS ACTUELLES' },

  // Módulo IV: Resumen
  'Resumen': { en: 'Summary', pt: 'Resumo', fr: 'Résumé' },
  'RESUMEN Y ESTADÍSTICAS': { en: 'SUMMARY AND STATISTICS', pt: 'RESUMO E ESTATÍSTICAS', fr: 'RÉSUMÉ ET STATISTIQUES' },
  'Resumen y Estadísticas': { en: 'Summary and Statistics', pt: 'Resumo e Estatísticas', fr: 'Résumé et Statistiques' },
  'Actualizar datos en tiempo real': { en: 'Refresh real-time data', pt: 'Atualizar dados em tempo real', fr: 'Actualiser les données en temps réel' },
  'CON LOS QUE SE COBRARON HOY': { en: 'COLLECTED TODAY', pt: 'ARRECADADO HOJE', fr: "ENCAISSÉ AUJOURD'HUI" },
  'COBRADO ESTE MES': { en: 'COLLECTED THIS MONTH', pt: 'COBRADO NESTE MÊS', fr: 'ENCAISSÉ CE MOIS-CI' },
  'Respecto al mes anterior': { en: 'Compared to last month', pt: 'Em relação ao mês anterior', fr: 'Par rapport au mois dernier' },
  'GANANCIA PROYECTADA': { en: 'PROJECTED PROFIT', pt: 'LUCRO PROJETADO', fr: 'BÉNÉFICE PROJETÉ' },
  'Saldo por cobrar': { en: 'Balance to collect', pt: 'Saldo a cobrar', fr: 'Solde à encaisser' },
  'Saldo por cobrar:': { en: 'Balance to collect:', pt: 'Saldo a cobrar:', fr: 'Solde à encaisser :' },
  'TOTAL EN MORATORIAS': { en: 'TOTAL LATE FEES', pt: 'TOTAL EM MULTAS', fr: 'TOTAL DES PÉNALITÉS' },
  'CAPITAL EN ARREGLOS': { en: 'CAPITAL IN AGREEMENTS', pt: 'CAPITAL EM ACORDOS', fr: 'CAPITAL EN ACCORDS' },
  'EFECTIVIDAD DE COBRO SEMANAL Y QUINCENAL': { en: 'WEEKLY AND BIWEEKLY COLLECTION EFFECTIVENESS', pt: 'EFETIVIDADE DE COBRANÇA SEMANAL E QUINZENAL', fr: 'EFFICACITÉ DE RECOUVREMENT HEBDOMADAIRE ET BIMENSUEL' },
  'EFECTIVIDAD EN COBRO SEMANAL Y QUINCENAL': { en: 'WEEKLY AND BIWEEKLY COLLECTION EFFECTIVENESS', pt: 'EFETIVIDADE DE COBRANÇA SEMANAL E QUINZENAL', fr: 'EFFICACITÉ DE RECOUVREMENT HEBDOMADAIRE ET BIMENSUEL' },
  'Modalidad Semanal': { en: 'Weekly Frequency', pt: 'Modalidade Semanal', fr: 'Modalité Hebdomadaire' },
  'Modalidad Quincenal': { en: 'Biweekly Frequency', pt: 'Modalidade Quinzenal', fr: 'Modalité Bimensuelle' },
  'TENDENCIA DE COBROS': { en: 'COLLECTION TREND', pt: 'TENDÊNCIA DE COBRANÇAS', fr: 'TENDANCE DES RECOUVREMENTS' },
  'Historial de subidas y caídas de recaudación': { en: 'History of collection rises and falls', pt: 'Histórico de altas e quedas de arrecadação', fr: 'Historique des hausses et baisses de recouvrement' },
  'Día': { en: 'Day', pt: 'Dia', fr: 'Jour' },
  'Semana': { en: 'Week', pt: 'Semana', fr: 'Semaine' },
  'Mes': { en: 'Month', pt: 'Mês', fr: 'Mois' },
  'Año': { en: 'Year', pt: 'Ano', fr: 'Année' },
  'Desde el inicio': { en: 'Since the beginning', pt: 'Desde o início', fr: 'Depuis le début' },
  'Todo el historial registrado': { en: 'All recorded history', pt: 'Todo o histórico registrado', fr: "Tout l'historique enregistré" },
  'Disminuir período': { en: 'Decrease period', pt: 'Diminuir período', fr: 'Diminuer la période' },
  'Aumentar período': { en: 'Increase period', pt: 'Aumentar período', fr: 'Augmenter la période' },
  'PUNTO MÁS ALTO': { en: 'HIGHEST POINT', pt: 'PONTO MAIS ALTO', fr: 'POINT LE PLUS HAUT' },
  'PUNTO MÁS BAJO': { en: 'LOWEST POINT', pt: 'PONTO MAIS BAIXO', fr: 'POINT LE PLUS BAS' },
  'PROMEDIO': { en: 'AVERAGE', pt: 'MÉDIA', fr: 'MOYENNE' },
  'variación': { en: 'variation', pt: 'variação', fr: 'variation' },
  'Sin datos': { en: 'No data', pt: 'Sem dados', fr: 'Aucune donnée' },
  'ESTADO DE CLIENTES ACTIVOS': { en: 'ACTIVE CLIENTS STATUS', pt: 'STATUS DOS CLIENTES ATIVOS', fr: 'ÉTAT DES CLIENTS ACTIFS' },
  'Proporción actual según cumplimiento de pago': { en: 'Current proportion by payment compliance', pt: 'Proporção atual segundo cumprimento de pagamento', fr: 'Proportion actuelle selon le respect des paiements' },
  'CLIENTES': { en: 'CLIENTS', pt: 'CLIENTES', fr: 'CLIENTS' },
  'Clientes al día': { en: 'Up-to-date clients', pt: 'Clientes em dia', fr: 'Clients à jour' },
  'Pasados de día esta semana': { en: 'Rescheduled this week', pt: 'Adiados nesta semana', fr: 'Reportés cette semaine' },
  'Atrasados y arreglo de pago': { en: 'Overdue and payment agreement', pt: 'Atrasados e acordo de pagamento', fr: 'En retard et accord de paiement' },

  // Módulo V: Lista Negra
  'LISTA NEGRA': { en: 'BLACKLIST', pt: 'LISTA RESTRITA', fr: 'LISTE NOIRE' },
  'Lista Negra': { en: 'Blacklist', pt: 'Lista Restrita', fr: 'Liste Noire' },
  'Lista negra': { en: 'Blacklist', pt: 'Lista restrita', fr: 'Liste noire' },
  'Control de morosidad y restricciones': { en: 'Delinquency and restriction control', pt: 'Controle de inadimplência e restrições', fr: 'Contrôle des impayés et restrictions' },
  'Espacio para registrar y consultar a personas que no son buenas pagadoras o han incumplido con sus pagos, evitando otorgarles nuevos préstamos.': {
    en: 'Space to register and look up people with payment defaults, preventing new loans from being granted to them.',
    pt: 'Espaço para registrar e consultar pessoas inadimplentes ou que descumpriram seus pagamentos, evitando conceder novos empréstimos.',
    fr: "Espace pour enregistrer et consulter les personnes ayant manqué à leurs paiements, afin d'éviter de leur accorder de nouveaux prêts.",
  },
  '+ Registrar': { en: '+ Register', pt: '+ Registrar', fr: '+ Enregistrer' },
  'Registrar': { en: 'Register', pt: 'Registrar', fr: 'Enregistrer' },
  'Registrar persona en Lista Negra': { en: 'Register person on Blacklist', pt: 'Registrar pessoa na Lista Restrita', fr: 'Inscrire une personne sur la Liste Noire' },
  'Actualizar Lista Negra': { en: 'Refresh Blacklist', pt: 'Atualizar Lista Restrita', fr: 'Actualiser la Liste Noire' },
  'CONSULTAR PERSONA': { en: 'LOOK UP PERSON', pt: 'CONSULTAR PESSOA', fr: 'CONSULTER UNE PERSONNE' },
  'Consultar Persona': { en: 'Look Up Person', pt: 'Consultar Pessoa', fr: 'Consulter une Personne' },
  'PERSONAS EN LISTA NEGRA': { en: 'PEOPLE ON BLACKLIST', pt: 'PESSOAS NA LISTA RESTRITA', fr: 'PERSONNES SUR LISTE NOIRE' },
  'Personas en Lista Negra': { en: 'People on Blacklist', pt: 'Pessoas na Lista Restrita', fr: 'Personnes sur Liste Noire' },
  'Personas con restricción activa para nuevos créditos': { en: 'People with active restriction for new loans', pt: 'Pessoas com restrição ativa para novos créditos', fr: 'Personnes avec restriction active pour de nouveaux crédits' },
  'Lista Negra Limpia': { en: 'Blacklist Clear', pt: 'Lista Restrita Limpa', fr: 'Liste Noire Vide' },
  'Actualmente no hay ninguna persona registrada con reporte en la lista negra.': {
    en: 'There are currently no people registered on the blacklist.',
    pt: 'Atualmente não há nenhuma pessoa registrada na lista restrita.',
    fr: "Il n'y a actuellement aucune personne enregistrée sur la liste noire.",
  },
  'Actualmente no hay ninguna persona registrada con reporte en la Lista Negra.': {
    en: 'There are currently no people registered on the Blacklist.',
    pt: 'Atualmente não há nenhuma pessoa registrada na Lista Restrita.',
    fr: "Il n'y a actuellement aucune personne enregistrée sur la Liste Noire.",
  },
  'Cargando lista...': { en: 'Loading list...', pt: 'Carregando lista...', fr: 'Chargement de la liste...' },
  'Sin coincidencias': { en: 'No matches', pt: 'Sem correspondências', fr: 'Aucune correspondance' },
  'Sacar de Lista Negra': { en: 'Remove from Blacklist', pt: 'Retirar da Lista Restrita', fr: 'Retirer de la Liste Noire' },
  'Registrar en Lista Negra': { en: 'Add to Blacklist', pt: 'Registrar na Lista Restrita', fr: 'Ajouter à la Liste Noire' },
  'Sí, Retirar': { en: 'Yes, Remove', pt: 'Sim, Retirar', fr: 'Oui, Retirer' },
  'Sacar': { en: 'Remove', pt: 'Retirar', fr: 'Retirer' },
  'Retirar a esta persona de la Lista Negra y enviarla a Clientes': {
    en: 'Remove this person from Blacklist and send back to Clients',
    pt: 'Retirar esta pessoa da Lista Restrita e enviá-la para Clientes',
    fr: 'Retirer cette personne de la Liste Noire et la renvoyer aux Clients',
  },
  'Ingreso:': { en: 'Added:', pt: 'Registro:', fr: 'Ajouté :' },
  'Borrar texto': { en: 'Clear text', pt: 'Apagar texto', fr: 'Effacer le texte' },
  'Borrar filtro': { en: 'Clear filter', pt: 'Limpar filtro', fr: 'Effacer le filtre' },

  // Módulo VI: Papelera
  'Papelera': { en: 'Trash', pt: 'Lixeira', fr: 'Corbeille' },
  'PAPELERA UNIFICADA': { en: 'UNIFIED TRASH', pt: 'LIXEIRA UNIFICADA', fr: 'CORBEILLE UNIFIÉE' },
  'Papelera unificada': { en: 'Unified trash', pt: 'Lixeira unificada', fr: 'Corbeille unifiée' },
  'Vaciar Papelera': { en: 'Empty Trash', pt: 'Esvaziar Lixeira', fr: 'Vider la Corbeille' },
  'Los clientes y préstamos enviados a la papelera se conservan por 30 días antes de su archivo definitivo automático. Aquí puedes restaurarlos de forma individual o conjunta.': {
    en: 'Clients and loans sent to the trash are kept for 30 days before automatic permanent archiving. Here you can restore them individually or together.',
    pt: 'Clientes e empréstimos enviados para a lixeira são mantidos por 30 dias antes do arquivamento definitivo automático. Aqui você pode restaurá-los individualmente ou em conjunto.',
    fr: 'Les clients et prêts envoyés à la corbeille sont conservés pendant 30 jours avant leur archivage définitif automatique. Ici vous pouvez les restaurer individuellement ou ensemble.',
  },
  'Filtrar registros en papelera': { en: 'Filter trash records', pt: 'Filtrar registros na lixeira', fr: 'Filtrer les éléments de la corbeille' },
  'Todos': { en: 'All', pt: 'Todos', fr: 'Tous' },
  'Clientes eliminados': { en: 'Deleted clients', pt: 'Clientes excluídos', fr: 'Clients supprimés' },
  'Préstamos eliminados': { en: 'Deleted loans', pt: 'Empréstimos excluídos', fr: 'Prêts supprimés' },
  'Cargando papelera...': { en: 'Loading trash...', pt: 'Carregando lixeira...', fr: 'Chargement de la corbeille...' },
  'LA PAPELERA ESTÁ VACÍA': { en: 'TRASH IS EMPTY', pt: 'A LIXEIRA ESTÁ VAZIA', fr: 'LA CORBEILLE EST VIDE' },
  'La papelera está vacía': { en: 'Trash is empty', pt: 'A lixeira está vazia', fr: 'La corbeille est vide' },
  'Sin clientes eliminados': { en: 'No deleted clients', pt: 'Sem clientes excluídos', fr: 'Aucun client supprimé' },
  'Sin préstamos eliminados': { en: 'No deleted loans', pt: 'Sem empréstimos excluídos', fr: 'Aucun prêt supprimé' },
  'No se encontraron coincidencias': { en: 'No matches found', pt: 'Nenhuma correspondência encontrada', fr: 'Aucune correspondance trouvée' },
  'Ningún registro en la papelera coincide con tu búsqueda.': {
    en: 'No trash record matches your search.',
    pt: 'Nenhum registro na lixeira corresponde à sua pesquisa.',
    fr: 'Aucun élément de la corbeille ne correspond à votre recherche.',
  },
  'No hay clientes ni préstamos pendientes de eliminación definitiva en esta vista.': {
    en: 'There are no clients or loans pending permanent deletion in this view.',
    pt: 'Não há clientes nem empréstimos pendentes de exclusão definitiva nesta visualização.',
    fr: "Il n'y a aucun client ni prêt en attente de suppression définitive dans cette vue.",
  },
  'Cliente en papelera': { en: 'Client in trash', pt: 'Cliente na lixeira', fr: 'Client dans la corbeille' },
  'Cliente activo': { en: 'Active client', pt: 'Cliente ativo', fr: 'Client actif' },
  'Vence hoy': { en: 'Expires today', pt: 'Expira hoje', fr: "Expire aujourd'hui" },
  'Falta 1 día': { en: '1 day left', pt: 'Falta 1 dia', fr: '1 jour restant' },
  'Préstamo en papelera': { en: 'Loan in trash', pt: 'Empréstimo na lixeira', fr: 'Prêt dans la corbeille' },
  'Eliminado por separado': { en: 'Deleted individually', pt: 'Excluído separadamente', fr: 'Supprimé séparément' },
  'Restaurar': { en: 'Restore', pt: 'Restaurar', fr: 'Restaurer' },
  'Restaurar cliente': { en: 'Restore client', pt: 'Restaurar cliente', fr: 'Restaurer le client' },
  'Restaurar Cliente': { en: 'Restore Client', pt: 'Restaurar Cliente', fr: 'Restaurer le Client' },
  'Restaurar préstamo': { en: 'Restore loan', pt: 'Restaurar empréstimo', fr: 'Restaurer le prêt' },
  'Restaurar Préstamo': { en: 'Restore Loan', pt: 'Restaurar Empréstimo', fr: 'Restaurer le Prêt' },
  'Restaurar todos': { en: 'Restore all', pt: 'Restaurar todos', fr: 'Tout restaurer' },
  'Restaurar Todos': { en: 'Restore All', pt: 'Restaurar Todos', fr: 'Tout Restaurer' },
  'Restaurar Todos los Préstamos': { en: 'Restore All Loans', pt: 'Restaurar Todos os Empréstimos', fr: 'Restaurer Tous les Prêts' },
  'Eliminar definitivo': { en: 'Delete permanently', pt: 'Excluir definitivamente', fr: 'Supprimer définitivement' },
  'Eliminar Definitivamente': { en: 'Delete Permanently', pt: 'Excluir Definitivamente', fr: 'Supprimer Définitivement' },
  'Eliminar Préstamo Definitivamente': { en: 'Delete Loan Permanently', pt: 'Excluir Empréstimo Definitivamente', fr: 'Supprimer le Prêt Définitivement' },
  'Eliminar todos': { en: 'Delete all', pt: 'Excluir todos', fr: 'Tout supprimer' },
  'Eliminar Todos': { en: 'Delete All', pt: 'Excluir Todos', fr: 'Tout Supprimer' },
  'Eliminar Todos los Préstamos': { en: 'Delete All Loans', pt: 'Excluir Todos os Empréstimos', fr: 'Supprimer Tous les Prêts' },

  // Notificaciones, Compartir Cobros y Navegación
  'Notificaciones': { en: 'Notifications', pt: 'Notificações', fr: 'Notifications' },
  'Sin avisos por revisar': { en: 'No alerts to review', pt: 'Sem avisos para revisar', fr: 'Aucune alerte à vérifier' },
  'Por revisar': { en: 'To review', pt: 'Para revisar', fr: 'À vérifier' },
  'Revisadas': { en: 'Reviewed', pt: 'Revisadas', fr: 'Vérifiées' },
  'Revisada': { en: 'Reviewed', pt: 'Revisada', fr: 'Vérifiée' },
  'Todo al día': { en: 'All caught up', pt: 'Tudo em dia', fr: 'Tout est à jour' },
  'Sin notificaciones revisadas': { en: 'No reviewed notifications', pt: 'Sem notificações revisadas', fr: 'Aucune notification vérifiée' },
  'Las notificaciones que confirmes aparecerán archivadas en esta sección.': {
    en: 'Notifications you confirm will be archived in this section.',
    pt: 'As notificações que você confirmar aparecerão arquivadas nesta seção.',
    fr: 'Les notifications confirmées seront archivées dans cette section.',
  },
  'Marcar como revisada': { en: 'Mark as reviewed', pt: 'Marcar como revisada', fr: 'Marquer comme vérifiée' },
  'MARCAR COMO REVISADA': { en: 'MARK AS REVIEWED', pt: 'MARCAR COMO REVISADA', fr: 'MARQUER COMME VÉRIFIÉE' },
  'Marcar todas como revisadas': { en: 'Mark all as reviewed', pt: 'Marcar todas como revisadas', fr: 'Tout marquer comme vérifié' },
  'MARCAR TODAS COMO REVISADAS': { en: 'MARK ALL AS REVIEWED', pt: 'MARCAR TODAS COMO REVISADAS', fr: 'TOUT MARQUER COMME VÉRIFIÉ' },
  'Cerrar panel de notificaciones': { en: 'Close notifications panel', pt: 'Fechar painel de notificações', fr: 'Fermer le panneau des notifications' },
  'Cerrar notificación web': { en: 'Close notification', pt: 'Fechar notificação', fr: 'Fermer la notification' },
  'Compartir Cobros del Día': { en: 'Share Daily Collections', pt: 'Compartilhar Cobranças do Dia', fr: 'Partager les Recouvrements du Jour' },
  'Enviar a persona': { en: 'Send to person', pt: 'Enviar para pessoa', fr: 'Envoyer à une personne' },
  'Descargar PDF': { en: 'Download PDF', pt: 'Baixar PDF', fr: 'Télécharger PDF' },
  'Descargar PDF del día': { en: 'Download daily PDF', pt: 'Baixar PDF do dia', fr: 'Télécharger le PDF du jour' },
  'Agregar persona': { en: 'Add person', pt: 'Adicionar pessoa', fr: 'Ajouter une personne' },
  'Desvincular persona': { en: 'Unlink person', pt: 'Desvincular pessoa', fr: 'Dissocier la personne' },
  'Buscar por nombre de usuario o código...': { en: 'Search by username or code...', pt: 'Buscar por usuário ou código...', fr: "Rechercher par nom d'utilisateur ou code..." },
  'Ej. usuario_cobrador': { en: 'E.g. collector_user', pt: 'Ex. usuario_cobrador', fr: 'Ex. agent_collecte' },
  'Ej. CF-8A4F29B1': { en: 'E.g. CF-8A4F29B1', pt: 'Ex. CF-8A4F29B1', fr: 'Ex. CF-8A4F29B1' },
  'Buscar y vincular': { en: 'Search and link', pt: 'Buscar e vincular', fr: 'Rechercher et lier' },
  'Resultados de búsqueda': { en: 'Search results', pt: 'Resultados da pesquisa', fr: 'Résultats de recherche' },
  'Fecha del documento:': { en: 'Document date:', pt: 'Data do documento:', fr: 'Date du document :' },
  'Clientes a incluir:': { en: 'Clients to include:', pt: 'Clientes a incluir:', fr: 'Clients à inclure :' },
  'Total a cobrar:': { en: 'Total to collect:', pt: 'Total a cobrar:', fr: 'Total à encaisser :' },
  'Seleccionar fecha': { en: 'Select date', pt: 'Selecionar data', fr: 'Sélectionner une date' },
  'Sin ubicación': { en: 'No location', pt: 'Sem localização', fr: 'Sans lieu' },
  'Soltar a la izquierda': { en: 'Drop on left', pt: 'Soltar à esquerda', fr: 'Déposer à gauche' },
  'Soltar a la derecha': { en: 'Drop on right', pt: 'Soltar à direita', fr: 'Déposer à droite' },
  'Soltar abajo': { en: 'Drop at bottom', pt: 'Soltar embaixo', fr: 'Déposer en bas' },
  'Desplegar menú de módulos': { en: 'Expand modules menu', pt: 'Expandir menu de módulos', fr: 'Déplier le menu des modules' },
  'Minimizar o mover menú de módulos': { en: 'Minimize or move modules menu', pt: 'Minimizar ou mover menu de módulos', fr: 'Réduire ou déplacer le menu des modules' },
  'Clic para desplegar menú · Arrastra para mover': { en: 'Click to expand menu · Drag to move', pt: 'Clique para expandir menu · Arraste para mover', fr: 'Cliquer pour déplier · Glisser pour déplacer' },
  'Clic para minimizar menú · Arrastra para mover': { en: 'Click to minimize menu · Drag to move', pt: 'Clique para minimizar menu · Arraste para mover', fr: 'Cliquer pour réduire · Glisser pour déplacer' },

  // Séneca IA
  'SÉNECA': { en: 'SENECA', pt: 'SÊNECA', fr: 'SÉNÈQUE' },
  'Séneca': { en: 'Seneca', pt: 'Sêneca', fr: 'Sénèque' },
  'Asesor informativo de cobros, zonas y deudas': { en: 'Informative advisor for collections, zones, and debts', pt: 'Consultor informativo de cobranças, zonas e dívidas', fr: 'Conseiller informatif en recouvrements, zones et créances' },
  'COBROS HOY': { en: 'COLLECTIONS TODAY', pt: 'COBRANÇAS HOJE', fr: "RECOUVREMENTS AUJOURD'HUI" },
  'Cobros hoy': { en: 'Collections today', pt: 'Cobranças hoje', fr: "Recouvrements aujourd'hui" },
  'ZONAS ACTIVAS': { en: 'ACTIVE ZONES', pt: 'ZONAS ATIVAS', fr: 'ZONES ACTIVES' },
  'Zonas activas': { en: 'Active zones', pt: 'Zonas ativas', fr: 'Zones actives' },
  'TOTAL POR COBRAR': { en: 'TOTAL TO COLLECT', pt: 'TOTAL A COBRAR', fr: 'TOTAL À ENCAISSER' },
  'Total por cobrar': { en: 'Total to collect', pt: 'Total a cobrar', fr: 'Total à encaisser' },
  'Pregúntame cuántos cobros hay en cualquier ubicación, cuánto debe una persona específica o quiénes tienen pagos pendientes hoy.': {
    en: 'Ask me how many collections exist in any location, how much a specific person owes, or who has pending payments today.',
    pt: 'Pergunte-me quantas cobranças existem em qualquer localidade, quanto uma pessoa específica deve ou quem tem pagamentos pendentes hoje.',
    fr: "Demandez-moi combien de recouvrements sont prévus dans n'importe quel lieu, combien doit une personne précise ou qui a des paiements en attente aujourd'hui.",
  },
  'PREGUNTAS RECOMENDADAS': { en: 'RECOMMENDED QUESTIONS', pt: 'PERGUNTAS RECOMENDADAS', fr: 'QUESTIONS RECOMMANDÉES' },
  '¿Cuántos cobros y cuánto dinero hay por ubicación?': { en: 'How many collections and how much money per location?', pt: 'Quantas cobranças e quanto dinheiro há por localização?', fr: "Combien de recouvrements et d'argent y a-t-il par lieu ?" },
  '¿Cuánto dinero me debe actualmente cada cliente?': { en: 'How much money does each client currently owe me?', pt: 'Quanto dinheiro cada cliente me deve atualmente?', fr: 'Combien chaque client me doit-il actuellement ?' },
  '¿Cuáles clientes tienen cobros hoy o atrasos acumulados?': { en: 'Which clients have collections today or accumulated delays?', pt: 'Quais clientes têm cobranças hoje ou atrasos acumulados?', fr: "Quels clients ont des recouvrements aujourd'hui ou des retards cumulés ?" },
  'Pregunta por una zona, el nombre de un cliente o cobros de hoy...': {
    en: 'Ask about a zone, a client name, or today collections...',
    pt: 'Pergunte sobre uma zona, o nome de um cliente ou cobranças de hoje...',
    fr: "Demandez une zone, le nom d'un client ou les recouvrements du jour...",
  },
  'Consultando tus registros en tiempo real...': { en: 'Querying your records in real time...', pt: 'Consultando seus registros em tempo real...', fr: 'Consultation de vos registres en temps réel...' },
  'Limpiar conversación': { en: 'Clear conversation', pt: 'Limpar conversa', fr: 'Effacer la conversation' },
  'Cerrar panel de Séneca': { en: 'Close Seneca panel', pt: 'Fechar painel de Sêneca', fr: 'Fermer le panneau de Sénèque' },
  'Enviar consulta': { en: 'Send query', pt: 'Enviar consulta', fr: 'Envoyer la question' },

  // Login y Página Informativa
  'Volver a Inicio': { en: 'Back to Home', pt: 'Voltar ao Início', fr: "Retour à l'Accueil" },
  'BÓVEDA DE ACCESO': { en: 'ACCESS VAULT', pt: 'COFRE DE ACESSO', fr: "COFFRE D'ACCÈS" },
  'REGISTRO EJECUTIVO': { en: 'EXECUTIVE REGISTRATION', pt: 'CADASTRO EXECUTIVO', fr: 'INSCRIPTION EXÉCUTIVE' },
  'Iniciar sesión': { en: 'Sign in', pt: 'Entrar', fr: 'Se connecter' },
  'Iniciando sesión...': { en: 'Signing in...', pt: 'Entrando...', fr: 'Connexion...' },
  'Registrarse': { en: 'Register', pt: 'Cadastrar-se', fr: "S'inscrire" },
  'Creando cuenta...': { en: 'Creating account...', pt: 'Criando conta...', fr: 'Création du compte...' },
  'Crear cuenta': { en: 'Create account', pt: 'Criar conta', fr: 'Créer un compte' },
  'Crea tu cuenta personal para administrar tus préstamos y cobros': {
    en: 'Create your personal account to manage your loans and collections',
    pt: 'Crie sua conta pessoal para gerenciar seus empréstimos e cobranças',
    fr: 'Créez votre compte personnel pour gérer vos prêts et recouvrements',
  },
  'Ingresa tu usuario o correo': { en: 'Enter your username or email', pt: 'Digite seu usuário ou e-mail', fr: "Saisissez votre nom d'utilisateur ou e-mail" },
  'Ingresa tu contraseña': { en: 'Enter your password', pt: 'Digite sua senha', fr: 'Saisissez votre mot de passe' },
  'Ingresa tu nombre y apellidos': { en: 'Enter your full name', pt: 'Digite seu nome e sobrenome', fr: 'Saisissez votre nom complet' },
  'Ingresa un nombre de usuario': { en: 'Enter a username', pt: 'Digite um nome de usuário', fr: "Saisissez un nom d'utilisateur" },
  'Mínimo 8 caracteres': { en: 'Minimum 8 characters', pt: 'Mínimo de 8 caracteres', fr: 'Minimum 8 caractères' },
  'Repite tu contraseña': { en: 'Repeat your password', pt: 'Repita sua senha', fr: 'Répétez votre mot de passe' },
  'Mostrar contraseña': { en: 'Show password', pt: 'Mostrar senha', fr: 'Afficher le mot de passe' },
  'Ocultar contraseña': { en: 'Hide password', pt: 'Ocultar senha', fr: 'Masquer le mot de passe' },
  'Control diario de cobros, préstamos y agenda semanal de Lunes a Domingo.': {
    en: 'Daily control of collections, loans, and weekly schedule from Monday to Sunday.',
    pt: 'Controle diário de cobranças, empréstimos e agenda semanal de Segunda a Domingo.',
    fr: 'Contrôle quotidien des recouvrements, prêts et agenda hebdomadaire du lundi au dimanche.',
  },
  'Asesor financiero Séneca IA con análisis en vivo por zonas y deudores.': {
    en: 'Seneca AI financial advisor with live analysis by zones and debtors.',
    pt: 'Consultor financeiro Sêneca IA com análise ao vivo por zonas e devedores.',
    fr: 'Conseiller financier Sénèque IA avec analyse en direct par zones et débiteurs.',
  },
  'Bóveda de datos con respaldo de 30 días y delegación segura en ruta.': {
    en: 'Data vault with 30-day backup and secure field route delegation.',
    pt: 'Cofre de dados com backup de 30 dias e delegação segura em rota.',
    fr: 'Coffre de données avec sauvegarde de 30 jours et délégation sécurisée sur le terrain.',
  },
  'Tu sesión se cerró automáticamente porque transcurrieron 25 minutos sin actividad en la página.': {
    en: 'Your session closed automatically after 25 minutes of inactivity on the page.',
    pt: 'Sua sessão foi encerrada automaticamente após 25 minutos sem atividade na página.',
    fr: "Votre session s'est fermée automatiquement après 25 minutes d'inactivité sur la page.",
  },
  'Inicio': { en: 'Home', pt: 'Início', fr: 'Accueil' },
  'Módulos': { en: 'Modules', pt: 'Módulos', fr: 'Modules' },
  'Séneca IA': { en: 'Seneca AI', pt: 'Sêneca IA', fr: 'Sénèque IA' },
  'Beneficios': { en: 'Benefits', pt: 'Benefícios', fr: 'Avantages' },
  'Entrar a Aureus Manager': { en: 'Enter Aureus Manager', pt: 'Entrar no Aureus Manager', fr: 'Entrer dans Aureus Manager' },
  'Explorar los 6 Módulos': { en: 'Explore the 6 Modules', pt: 'Explorar os 6 Módulos', fr: 'Explorer les 6 Modules' },
  'Conocer a Séneca IA': { en: 'Meet Seneca AI', pt: 'Conhecer o Sêneca IA', fr: 'Découvrir Sénèque IA' },
  'Ver Beneficios y Seguridad': { en: 'View Benefits and Security', pt: 'Ver Benefícios e Segurança', fr: 'Voir Avantages et Sécurité' },
  'Planteamiento del Problema y Solución Digital': {
    en: 'Problem Statement and Digital Solution',
    pt: 'Diagnóstico do Problema e Solução Digital',
    fr: 'Problématique et Solution Numérique',
  },
  'PLATAFORMA DE GESTIÓN DE PRÉSTAMOS Y COBROS': {
    en: 'LOAN AND COLLECTION MANAGEMENT PLATFORM',
    pt: 'PLATAFORMA DE GESTÃO DE EMPRÉSTIMOS E COBRANÇAS',
    fr: 'PLATEFORME DE GESTION DES PRÊTS ET RECOUVREMENTS',
  },
  'ARQUITECTURA DE 6 MÓDULOS': { en: '6-MODULE ARCHITECTURE', pt: 'ARQUITETURA DE 6 MÓDULOS', fr: 'ARCHITECTURE EN 6 MODULES' },
  'VENTAJAS EJECUTIVAS Y SEGURIDAD': { en: 'EXECUTIVE ADVANTAGES AND SECURITY', pt: 'VANTAGENS EXECUTIVAS E SEGURANÇA', fr: 'AVANTAGES EXÉCUTIFS ET SÉCURITÉ' },
  'DIAGNÓSTICO Y TRANSFORMACIÓN OPERATIVA': { en: 'DIAGNOSIS AND OPERATIONAL TRANSFORMATION', pt: 'DIAGNÓSTICO E TRANSFORMAÇÃO OPERACIONAL', fr: 'DIAGNOSTIC ET TRANSFORMATION OPÉRATIONNELLE' },
  'Ir al panel': { en: 'Go to dashboard', pt: 'Ir ao painel', fr: 'Aller au tableau de bord' },
  'Apartados del portal informativo': { en: 'Information portal sections', pt: 'Seções do portal informativo', fr: 'Sections du portail informatif' },
  'Tu dinero, tus préstamos y tus operaciones': {
    en: 'Your money, your loans, and your operations',
    pt: 'Seu dinheiro, seus empréstimos e suas operações',
    fr: 'Votre argent, vos prêts et vos opérations',
  },
  'bajo control': { en: 'under control', pt: 'sob controle', fr: 'sous contrôle' },
  'evoluciona la administración tradicional de préstamos desde las libretas de papel hacia el control digital en tiempo real. Organiza tus cobros diarios, clientes, préstamos semanales o quincenales y estadísticas financieras desde cualquier lugar con precisión ejecutiva.': {
    en: 'transforms traditional loan management from paper notebooks into real-time digital control. Organize your daily collections, clients, weekly or biweekly loans, and financial statistics from anywhere with executive precision.',
    pt: 'evolui a administração tradicional de empréstimos dos cadernos de papel para o controle digital em tempo real. Organize suas cobranças diárias, clientes, empréstimos semanais ou quinzenais e estatísticas financeiras de qualquer lugar com precisão executiva.',
    fr: 'fait évoluer la gestion traditionnelle des prêts des carnets papier vers un contrôle numérique en temps réel. Organisez vos recouvrements quotidiens, clients, prêts hebdomadaires ou bimensuels et statistiques financières de partout avec une précision exécutive.',
  },
  'SÉNECA IA — CONTROL FINANCIERO EN VIVO': {
    en: 'SENECA AI — LIVE FINANCIAL CONTROL',
    pt: 'SÊNECA IA — CONTROLE FINANCEIRO AO VIVO',
    fr: 'SÉNÈQUE IA — CONTRÔLE FINANCIER EN DIRECT',
  },
  'Esparza · Cuota ₡30,000': {
    en: 'Esparza · Installment ₡30,000',
    pt: 'Esparza · Parcela ₡30,000',
    fr: 'Esparza · Échéance ₡30,000',
  },
  'Al día': { en: 'Up to date', pt: 'Em dia', fr: 'À jour' },
  'Resumen Operativo del Día': { en: 'Daily Operational Summary', pt: 'Resumo Operacional do Dia', fr: 'Résumé Opérationnel du Jour' },
  'Comprende por qué las anotaciones físicas frenan el crecimiento del prestamista y cómo Aureus Manager resuelve de raíz cada punto crítico.': {
    en: 'Understand why manual paper notes hold lenders back and how Aureus Manager solves every critical pain point at its root.',
    pt: 'Entenda por que as anotações físicas freiam o crescimento do credor e como o Aureus Manager resolve cada ponto crítico pela raiz.',
    fr: 'Comprenez pourquoi les notes papier freinent la croissance du prêteur et comment Aureus Manager résout chaque point critique à la source.',
  },
  'El Problema: Libretas de Papel y Descontrol': {
    en: 'The Problem: Paper Notebooks and Loss of Control',
    pt: 'O Problema: Cadernos de Papel e Descontrole',
    fr: 'Le Problème : Carnets Papier et Manque de Contrôle',
  },
  'El Planteamiento: Riesgo Operativo': {
    en: 'The Challenge: Operational Risk',
    pt: 'O Cenário: Risco Operacional',
    fr: "L'Enjeu : Risque Opérationnel",
  },
  'La Solución: Aureus Manager en Tiempo Real': {
    en: 'The Solution: Real-Time Aureus Manager',
    pt: 'A Solução: Aureus Manager em Tempo Real',
    fr: 'La Solution : Aureus Manager en Temps Réel',
  },
  'Pérdida de horas buscando clientes hoja por hoja y sumando saldos manualmente.': {
    en: 'Hours wasted flipping page by page to find clients and adding balances manually.',
    pt: 'Horas perdidas procurando clientes página por página e somando saldos manualmente.',
    fr: 'Des heures perdues à chercher des clients page par page et à additionner les soldes à la main.',
  },
  'Anotaciones tachadas y confusión sobre cuántas cuotas reales lleva pagadas cada persona.': {
    en: 'Crossed-out notes and confusion over how many installments each person has actually paid.',
    pt: 'Anotações riscadas e confusão sobre quantas parcelas reais cada pessoa já pagou.',
    fr: "Notes raturées et confusion sur le nombre réel d'échéances payées par chaque personne.",
  },
  'Falta de claridad sobre cuánto efectivo debe recogerse exactamente en el día.': {
    en: 'Lack of clarity on the exact amount of cash to collect during the day.',
    pt: 'Falta de clareza sobre quanto dinheiro exato deve ser recolhido no dia.',
    fr: 'Manque de visibilité sur le montant exact à encaisser dans la journée.',
  },
  'Descontrol al aplazar cuotas cuando un cliente pide pasar su cobro para otro día de la semana.': {
    en: 'Disorder when deferring installments if a client asks to move collection to another day of the week.',
    pt: 'Descontrole ao adiar parcelas quando um cliente pede para mudar a cobrança para outro dia da semana.',
    fr: "Désorganisation lors du report d'échéances quand un client demande de décaler son paiement.",
  },
  'Riesgo crítico de extravío, humedad o deterioro físico de la libreta con todas las deudas.': {
    en: 'Critical risk of losing the notebook or physical damage from water and wear containing all debts.',
    pt: 'Risco crítico de perda, umidade ou dano físico do caderno com todas as dívidas.',
    fr: 'Risque critique de perte, humidité ou détérioration physique du carnet contenant toutes les dettes.',
  },
  'Dificultad para delegar cobros en ruta sin perder el rastro de quién cobró cada cuota.': {
    en: 'Difficulty delegating route collections without losing track of who collected each installment.',
    pt: 'Dificuldade para delegar cobranças na rota sem perder o rastro de quem cobrou cada parcela.',
    fr: 'Difficulté à déléguer les recouvrements sur le terrain sans perdre la trace de chaque encaissement.',
  },
  'Agenda semanal inteligente de Lunes a Domingo con cálculo automático de saldos y atrasos.': {
    en: 'Smart weekly schedule from Monday to Sunday with automatic balance and arrears calculation.',
    pt: 'Agenda semanal inteligente de Segunda a Domingo com cálculo automático de saldos e atrasos.',
    fr: 'Agenda hebdomadaire intelligent du lundi au dimanche avec calcul automatique des soldes et retards.',
  },
  'Reprogramación limpia de fechas, delegación de cobros por día y hojas de ruta en PDF.': {
    en: 'Clean date rescheduling, daily collection delegation, and PDF route sheets.',
    pt: 'Reagendamento limpo de datas, delegação de cobranças por dia e rotas em PDF.',
    fr: 'Reprogrammation propre des dates, délégation quotidienne et feuilles de route PDF.',
  },
  'Asesor financiero con inteligencia artificial y respaldo seguro de clientes y préstamos.': {
    en: 'AI financial advisor and secure backup for clients and loans.',
    pt: 'Consultor financeiro com inteligência artificial e backup seguro de clientes e empréstimos.',
    fr: 'Conseiller financier par intelligence artificielle et sauvegarde sécurisée des clients et prêts.',
  },
  'Seis módulos diseñados para el trabajo diario del prestamista': {
    en: 'Six modules designed for daily lending operations',
    pt: 'Seis módulos projetados para o trabalho diário do credor',
    fr: 'Six modules conçus pour le travail quotidien du prêteur',
  },
  'Selecciona cualquier módulo para inspeccionar sus herramientas operativas o explora la cuadrícula ejecutiva completa.': {
    en: 'Select any module to inspect its operational tools or explore the complete executive grid.',
    pt: 'Selecione qualquer módulo para inspecionar suas ferramentas operacionais ou explore toda a grade executiva.',
    fr: 'Sélectionnez un module pour inspecter ses outils opérationnels ou explorez la grille exécutive complète.',
  },
  'Operación diaria': { en: 'Daily operation', pt: 'Operação diária', fr: 'Opération quotidienne' },
  'Agenda interactiva de 7 días con acciones rápidas de Pagó, Pasar de día y No Pagó, delegación de cobros a otros cobradores y descarga de hoja de ruta en PDF.': {
    en: 'Interactive 7-day agenda with quick Paid, Reschedule, and Unpaid actions, collector delegation, and PDF route download.',
    pt: 'Agenda interativa de 7 dias com ações rápidas de Pagou, Adiar e Não Pagou, delegação entre cobradores e PDF da rota.',
    fr: 'Agenda interactif sur 7 jours avec actions Payé, Reporter et Impayé, délégation entre agents et feuille de route PDF.',
  },
  'Tarjetas con botones Pagó en verde, Pasar en anaranjado ámbar y No Pagó en rojo alerta': {
    en: 'Cards with Paid in green, Reschedule in amber orange, and Unpaid in alert red',
    pt: 'Cartões com botões Pagou em verde, Adiar em laranja âmbar e Não Pagou em vermelho alerta',
    fr: 'Cartes avec boutons Payé en vert, Reporter en ambre et Impayé en rouge alerte',
  },
  'Delegación sincronizada de cobros del día entre cobradores vinculados': {
    en: 'Synchronized daily collection delegation between linked collectors',
    pt: 'Delegação sincronizada de cobranças do dia entre cobradores vinculados',
    fr: 'Délégation synchronisée des recouvrements du jour entre agents liés',
  },
  'Selector semanal de Lunes a Domingo con avisos de cobros pendientes sin cerrar': {
    en: 'Monday to Sunday weekly selector with alerts for unclosed pending collections',
    pt: 'Seletor semanal de Segunda a Domingo com avisos de cobranças pendentes em aberto',
    fr: 'Sélecteur hebdomadaire du lundi au dimanche avec alertes de recouvrements ouverts',
  },
  'Efectividad en ruta': { en: 'Route effectiveness', pt: 'Efetividade em rota', fr: 'Efficacité sur le terrain' },
  'Control diario de cuotas y rezagados': {
    en: 'Daily tracking of installments and overdue accounts',
    pt: 'Controle diário de parcelas e atrasados',
    fr: 'Suivi quotidien des échéances et retards',
  },
  'Directorio verificado': { en: 'Verified directory', pt: 'Diretório verificado', fr: 'Répertoire vérifié' },
  'Directorio de clientes nacionales y extranjeros con lectura automática de cédula por foto, consulta de morosidad tributaria y detector de antecedentes históricos.': {
    en: 'Directory of local and foreign clients with photo ID OCR scanning, tax delinquency check, and historical record detection.',
    pt: 'Diretório de clientes nacionais e estrangeiros com leitura automática de documento por foto, consulta fiscal e detector de histórico.',
    fr: 'Répertoire de clients nationaux et étrangers avec lecture photo de pièce d’identité, contrôle fiscal et détecteur d’historique.',
  },
  'Captura fotográfica de cédula con autocompletado automático de nombre y apellidos': {
    en: 'Photo ID capture with automatic full name autofill',
    pt: 'Captura fotográfica de documento com preenchimento automático de nome completo',
    fr: "Capture photo de pièce d'identité avec saisie automatique du nom complet",
  },
  'Consulta en vivo de situación tributaria y morosidad ante Hacienda': {
    en: 'Live check of tax status and delinquency records',
    pt: 'Consulta ao vivo de situação fiscal e inadimplência tributária',
    fr: 'Vérification en direct de la situation fiscale et des impayés',
  },
  'Detector automático de historial previo si la persona estuvo antes en el registro': {
    en: 'Automatic prior history detector if the person was previously registered',
    pt: 'Detector automático de histórico prévio se a pessoa já esteve cadastrada',
    fr: 'Détecteur automatique d’historique si la personne figurait déjà au registre',
  },
  'Verificación de identidad': { en: 'Identity verification', pt: 'Verificação de identidade', fr: "Vérification d'identité" },
  'Lectura óptica y validación en segundos': {
    en: 'Optical reading and validation in seconds',
    pt: 'Leitura óptica e validação em segundos',
    fr: 'Lecture optique et validation en quelques secondes',
  },
  'Financiamiento flexible': { en: 'Flexible financing', pt: 'Financiamento flexível', fr: 'Financement flexible' },
  'Creación de préstamos semanales o quincenales, agrupamiento inteligente por cliente con pestañas de cambio rápido, renovaciones y arreglos de pago.': {
    en: 'Weekly or biweekly loan creation, smart per-client grouping with quick-switch tabs, renewals, and payment agreements.',
    pt: 'Criação de empréstimos semanais ou quinzenais, agrupamento inteligente por cliente com abas rápidas, renovações e acordos.',
    fr: 'Création de prêts hebdomadaires ou bimensuels, regroupement intelligent par client, renouvellements et accords de paiement.',
  },
  'Cálculo inmediato de interés, monto total a financiar y cuota por período': {
    en: 'Instant calculation of interest, total financed amount, and installment per period',
    pt: 'Cálculo imediato de juros, valor total financiado e parcela por período',
    fr: "Calcul immédiat de l'intérêt, du total financé et de l'échéance par période",
  },
  'Agrupación ordenada por cliente cuando una persona mantiene varios préstamos': {
    en: 'Orderly per-client grouping when a person holds multiple loans',
    pt: 'Agrupamento organizado por cliente quando uma pessoa possui vários empréstimos',
    fr: 'Regroupement ordonné par client lorsqu’une personne détient plusieurs prêts',
  },
  'Renovaciones con liquidación de saldo anterior y arreglos de pago formales': {
    en: 'Renewals settling previous balance and formal payment agreements',
    pt: 'Renovações com liquidação do saldo anterior e acordos formais de pagamento',
    fr: 'Renouvellements avec solde antérieur réglé et accords de paiement formels',
  },
  'Modalidades activas': { en: 'Active plans', pt: 'Modalidades ativas', fr: 'Formules actives' },
  'Semanal y quincenal con agenda automática': {
    en: 'Weekly and biweekly with automatic scheduling',
    pt: 'Semanal e quinzenal com agenda automática',
    fr: 'Hebdomadaire et bimensuel avec agenda automatique',
  },
  'Métricas en tiempo real': { en: 'Real-time metrics', pt: 'Métricas em tempo real', fr: 'Indicateurs en temps réel' },
  'Panel de métricas financieras en vivo, efectividad de cobro, gráfico de tendencias por período y distribución del estado de tus clientes.': {
    en: 'Live financial metrics panel, collection effectiveness, trend chart by period, and client status breakdown.',
    pt: 'Painel de métricas financeiras ao vivo, efetividade de cobrança, gráfico de tendências e distribuição de clientes.',
    fr: 'Tableau de bord financier en direct, efficacité de recouvrement, graphique de tendance et répartition des clients.',
  },
  'Tarjetas ejecutivas de Cobrado Hoy, Cobrado Este Mes, Total Prestado y Ganancia Proyectada': {
    en: 'Executive cards for Collected Today, Collected This Month, Total Lent, and Projected Profit',
    pt: 'Cartões executivos de Arrecadado Hoje, Arrecadado no Mês, Total Emprestado e Lucro Projetado',
    fr: 'Cartes exécutives Encaissé Aujourd’hui, Ce Mois, Total Prêté et Profit Projeté',
  },
  'Gráfico de tendencia interactivo por día, semana, mes y año': {
    en: 'Interactive trend chart by day, week, month, and year',
    pt: 'Gráfico de tendência interativo por dia, semana, mês e ano',
    fr: 'Graphique de tendance interactif par jour, semaine, mois et année',
  },
  'Distribución visual de clientes al día, reprogramados y con atraso': {
    en: 'Visual distribution of up-to-date, rescheduled, and overdue clients',
    pt: 'Distribuição visual de clientes em dia, reagendados e em atraso',
    fr: 'Répartition visuelle des clients à jour, reportés et en retard',
  },
  'Visibilidad financiera': { en: 'Financial visibility', pt: 'Visibilidade financeira', fr: 'Visibilité financière' },
  'Sincronización exacta entre módulos': {
    en: 'Exact synchronization across modules',
    pt: 'Sincronização exata entre módulos',
    fr: 'Synchronisation exacte entre les modules',
  },
  'Antecedentes': {
    en: 'Prior Records',
    pt: 'Antecedentes',
    fr: 'Antécédents',
  },
  'Eliminar antecedente': {
    en: 'Delete prior record',
    pt: 'Excluir antecedente',
    fr: 'Supprimer l’antécédent',
  },
  'Eliminar antecedente completo': {
    en: 'Delete full prior record',
    pt: 'Excluir antecedente completo',
    fr: 'Supprimer tout l’antécédent',
  },
  'Sí, eliminar antecedente y préstamos': {
    en: 'Yes, delete prior record and loans',
    pt: 'Sim, excluir antecedente e empréstimos',
    fr: 'Oui, supprimer l’antécédent et les prêts',
  },
  '¿Confirmas eliminar este antecedente y sus préstamos archivados?': {
    en: 'Do you confirm deleting this prior record and its archived loans?',
    pt: 'Confirma excluir este antecedente e seus empréstimos arquivados?',
    fr: 'Confirmez-vous la suppression de cet antécédent et de ses prêts archivés ?',
  },
  'Sin antecedentes archivados': {
    en: 'No archived prior records',
    pt: 'Sem antecedentes arquivados',
    fr: 'Aucun antécédent archivé',
  },
  'No tienes antecedentes ni préstamos no finiquitados archivados en tu cartera.': {
    en: 'You have no archived prior records or unfinished loans in your portfolio.',
    pt: 'Você não possui antecedentes nem empréstimos não quitados arquivados em sua carteira.',
    fr: 'Vous n’avez aucun antécédent ni prêt non soldé archivé dans votre portefeuille.',
  },
  'ADMINISTRADOR ÚNICO': {
    en: 'SOLE ADMINISTRATOR',
    pt: 'ADMINISTRADOR ÚNICO',
    fr: 'ADMINISTRATEUR UNIQUE',
  },
  'Consola de Gobernanza y Gestión de Prestamistas': {
    en: 'Governance & Lender Management Console',
    pt: 'Console de Governança e Gestão de Credores',
    fr: 'Console de Gouvernance et Gestion des Prêteurs',
  },
  'Centro de Mando': {
    en: 'Command Center',
    pt: 'Centro de Comando',
    fr: 'Centre de Commandement',
  },
  'Prestamistas': {
    en: 'Lenders',
    pt: 'Credores',
    fr: 'Prêteurs',
  },
  'Depuración y Operaciones': {
    en: 'Purging & Operations',
    pt: 'Depuração e Operações',
    fr: 'Purge et Opérations',
  },
  'Gobernanza y Auditoría': {
    en: 'Governance & Audit',
    pt: 'Governança e Auditoria',
    fr: 'Gouvernance et Audit',
  },
  'Registrar nuevo prestamista': {
    en: 'Register new lender',
    pt: 'Registrar novo credor',
    fr: 'Enregistrer un nouveau prêteur',
  },
  'Purgar antecedentes': {
    en: 'Purge prior records',
    pt: 'Depurar antecedentes',
    fr: 'Purger les antécédents',
  },
  'Vaciar papelera': {
    en: 'Empty trash',
    pt: 'Esvaziar lixeira',
    fr: 'Vider la corbeille',
  },
  'Privacidad de Datos Garantizada · Ley N.° 8968': {
    en: 'Data Privacy Guaranteed · Law N.° 8968',
    pt: 'Privacidade de Dados Garantida · Lei N.° 8968',
    fr: 'Confidentialité des Données Garantie · Loi N.° 8968',
  },
  'Esta cuenta es el único Administrador de la plataforma y está desvinculada de cualquier operación de cobros. Gestiona el acceso de los prestamistas sin exponer datos privados de sus clientes.': {
    en: 'This account is the sole platform Administrator and is detached from any collection operations. Manage lender access without exposing private client data.',
    pt: 'Esta conta é o único Administrador da plataforma e está desvinculada de qualquer operação de cobrança. Gerencie o acesso dos credores sem expor dados privados de seus clientes.',
    fr: 'Ce compte est le seul Administrateur de la plateforme et est dissocié de toute opération de recouvrement. Gérez l’accès des prêteurs sans exposer les données privées de leurs clients.',
  },
  'Registros protegidos en bitácora': {
    en: 'Protected records in audit log',
    pt: 'Registros protegidos no registro de auditoria',
    fr: "Enregistrements protégés dans le journal d'audit",
  },
  'Prestamista registrado': {
    en: 'Lender registered',
    pt: 'Credor registrado',
    fr: 'Prêteur enregistré',
  },
  'Cuenta habilitada en la plataforma': {
    en: 'Account enabled on the platform',
    pt: 'Conta habilitada na plataforma',
    fr: 'Compte activé sur la plateforme',
  },
  'Prestamista actualizado': {
    en: 'Lender updated',
    pt: 'Credor atualizado',
    fr: 'Prêteur mis à jour',
  },
  'Datos de la cuenta guardados': {
    en: 'Account details saved',
    pt: 'Dados da conta salvos',
    fr: 'Données du compte enregistrées',
  },
  'Cuenta suspendida': {
    en: 'Account suspended',
    pt: 'Conta suspensa',
    fr: 'Compte suspendu',
  },
  'Acceso temporalmente deshabilitado': {
    en: 'Access temporarily disabled',
    pt: 'Acesso temporariamente desativado',
    fr: 'Accès temporairement désactivé',
  },
  'Cuenta reactivada': {
    en: 'Account reactivated',
    pt: 'Conta reativada',
    fr: 'Compte réactivé',
  },
  'Acceso restablecido correctamente': {
    en: 'Access successfully restored',
    pt: 'Acesso restabelecido corretamente',
    fr: 'Accès rétabli avec succès',
  },
  'Contraseña actualizada': {
    en: 'Password updated',
    pt: 'Senha atualizada',
    fr: 'Mot de passe mis à jour',
  },
  'Credencial de acceso renovada': {
    en: 'Access credential renewed',
    pt: 'Credencial de acesso renovada',
    fr: "Identifiant d'accès renouvelé",
  },
  'Prestamista eliminado': {
    en: 'Lender deleted',
    pt: 'Credor excluído',
    fr: 'Prêteur supprimé',
  },
  'Cuenta retirada permanentemente': {
    en: 'Account permanently removed',
    pt: 'Conta removida permanentemente',
    fr: 'Compte supprimé définitivement',
  },
  'Registros depurados': {
    en: 'Records purged',
    pt: 'Registros depurados',
    fr: 'Enregistrements purgés',
  },
  'Saneamiento completado': {
    en: 'Cleanup completed',
    pt: 'Saneamento concluído',
    fr: 'Assainissement terminé',
  },
  'PRESTAMISTAS REGISTRADOS': {
    en: 'REGISTERED LENDERS',
    pt: 'CREDORES REGISTRADOS',
    fr: 'PRÊTEURS ENREGISTRÉS',
  },
  'VOLUMEN GLOBAL EN PLATAFORMA': {
    en: 'GLOBAL PLATFORM VOLUME',
    pt: 'VOLUME GLOBAL NA PLATAFORMA',
    fr: 'VOLUME GLOBAL DE LA PLATEFORME',
  },
  'ANTECEDENTES Y PAPELERA GLOBAL': {
    en: 'GLOBAL PRIOR RECORDS AND TRASH',
    pt: 'ANTECEDENTES E LIXEIRA GLOBAL',
    fr: 'ANTÉCÉDENTS ET CORBEILLE GLOBALE',
  },
  'EVENTOS DE AUDITORÍA INMUTABLE': {
    en: 'IMMUTABLE AUDIT EVENTS',
    pt: 'EVENTOS DE AUDITORIA IMUTÁVEL',
    fr: "ÉVÉNEMENTS D'AUDIT IMMUABLE",
  },
  'Gestionar Cuentas de Prestamistas': {
    en: 'Manage Lender Accounts',
    pt: 'Gerenciar Contas de Credores',
    fr: 'Gérer les Comptes des Prêteurs',
  },
  'Dar de alta, editar, suspender, reactivar o restablecer credenciales de cobradores.': {
    en: 'Register, edit, suspend, reactivate, or reset lender credentials.',
    pt: 'Cadastrar, editar, suspender, reativar ou redefinir credenciais de credores.',
    fr: 'Créer, modifier, suspendre, réactiver ou réinitialiser les accès des prêteurs.',
  },
  'Depuración de Antecedentes y Papelera': {
    en: 'Prior Records and Trash Cleanup',
    pt: 'Depuração de Antecedentes e Lixeira',
    fr: 'Purge des Antécédents et Corbeille',
  },
  'Limpiar registros históricos archivados o vaciar papeleras por cuenta de prestamista.': {
    en: 'Clean archived historical records or empty trash per lender account.',
    pt: 'Limpar registros históricos arquivados ou esvaziar lixeiras por conta de credor.',
    fr: 'Nettoyer les archives historiques ou vider la corbeille par compte prêteur.',
  },
  'Bitácora de Gobernanza y Auditoría': {
    en: 'Governance and Audit Log',
    pt: 'Registro de Governança e Auditoria',
    fr: 'Journal de Gouvernance et Audit',
  },
  'Inspeccionar eventos técnicos sanitizados bajo el estándar de privacidad Ley 8968.': {
    en: 'Inspect sanitized technical events under the Law 8968 privacy standard.',
    pt: 'Inspecionar eventos técnicos sanitizados sob o padrão de privacidade Lei 8968.',
    fr: 'Inspecter les événements techniques assainis selon la norme de confidentialité Loi 8968.',
  },
  'Sincronizar métricas administrativas': {
    en: 'Sync administrative metrics',
    pt: 'Sincronizar métricas administrativas',
    fr: 'Synchroniser les métriques administratives',
  },
  'Buscar prestamista por nombre, correo o teléfono...': {
    en: 'Search lender by name, email, or phone...',
    pt: 'Buscar credor por nome, e-mail ou telefone...',
    fr: 'Rechercher un prêteur par nom, e-mail ou téléphone...',
  },
  'Filtrar eventos por acción, entidad o actor...': {
    en: 'Filter events by action, entity, or actor...',
    pt: 'Filtrar eventos por ação, entidade ou ator...',
    fr: 'Filtrer les événements par action, entité ou acteur...',
  },
  'No se encontraron cuentas de prestamistas con el filtro actual.': {
    en: 'No lender accounts were found matching the current filter.',
    pt: 'Nenhuma conta de credor encontrada com o filtro atual.',
    fr: 'Aucun compte de prêteur trouvé avec le filtre actuel.',
  },
  'ARCHIVO': {
    en: 'ARCHIVE',
    pt: 'ARQUIVO',
    fr: 'ARCHIVE',
  },
  'Editar cuenta': {
    en: 'Edit account',
    pt: 'Editar conta',
    fr: 'Modifier le compte',
  },
  'Restablecer clave': {
    en: 'Reset password',
    pt: 'Redefinir senha',
    fr: 'Réinitialiser le mot de passe',
  },
  'Suspender cuenta': {
    en: 'Suspend account',
    pt: 'Suspender conta',
    fr: 'Suspendre le compte',
  },
  'Reactivar cuenta': {
    en: 'Reactivate account',
    pt: 'Reativar conta',
    fr: 'Réactiver le compte',
  },
  'Eliminar cuenta': {
    en: 'Delete account',
    pt: 'Excluir conta',
    fr: 'Supprimer le compte',
  },
  'Saneamiento de Antecedentes y Papeleras por Prestamista': {
    en: 'Prior Records and Trash Cleanup per Lender',
    pt: 'Saneamento de Antecedentes e Lixeiras por Credor',
    fr: 'Assainissement des Antécédents et Corbeilles par Prêteur',
  },
  'Permite depurar antecedentes y préstamos no finiquitados en archivo histórico o vaciar papeleras acumuladas sin exponer la identidad privada de los deudores.': {
    en: 'Allows purging archived prior records and unfinished loans or emptying accumulated trash without exposing private debtor identities.',
    pt: 'Permite depurar antecedentes e empréstimos não quitados no arquivo histórico ou esvaziar lixeiras sem expor a identidade privada dos devedores.',
    fr: 'Permet de purger les antécédents et prêts archivés ou de vider les corbeilles sans exposer l’identité privée des débiteurs.',
  },
  'ANTECEDENTES ARCHIVADOS': {
    en: 'ARCHIVED PRIOR RECORDS',
    pt: 'ANTECEDENTES ARQUIVADOS',
    fr: 'ANTÉCÉDENTS ARCHIVÉS',
  },
  'REGISTROS EN PAPELERA': {
    en: 'RECORDS IN TRASH',
    pt: 'REGISTROS NA LIXEIRA',
    fr: 'ENREGISTREMENTS EN CORBEILLE',
  },
  'Retención temporal 30 días': {
    en: '30-day temporary retention',
    pt: 'Retenção temporária de 30 dias',
    fr: 'Rétention temporaire 30 jours',
  },
  'PII Redactada Automáticamente · Ley N.° 8968': {
    en: 'PII Automatically Redacted · Law N.° 8968',
    pt: 'PII Ocultada Automaticamente · Lei N.° 8968',
    fr: 'Données Personnelles Masquées · Loi N.° 8968',
  },
  'Mando': {
    en: 'Command',
    pt: 'Comando',
    fr: 'Commande',
  },
  'Depuración': {
    en: 'Cleanup',
    pt: 'Depuração',
    fr: 'Purge',
  },
  'Auditoría': {
    en: 'Audit',
    pt: 'Auditoria',
    fr: 'Audit',
  },
  'Editar Cuenta de Prestamista': {
    en: 'Edit Lender Account',
    pt: 'Editar Conta de Credor',
    fr: 'Modifier le Compte Prêteur',
  },
  'Registrar Nuevo Prestamista': {
    en: 'Register New Lender',
    pt: 'Registrar Novo Credor',
    fr: 'Enregistrer un Nouveau Prêteur',
  },
  'Teléfono de Costa Rica': {
    en: 'Costa Rica Phone',
    pt: 'Telefone da Costa Rica',
    fr: 'Téléphone du Costa Rica',
  },
  'Contraseña inicial': {
    en: 'Initial password',
    pt: 'Senha inicial',
    fr: 'Mot de passe initial',
  },
  'Guardar cuenta': {
    en: 'Save account',
    pt: 'Salvar conta',
    fr: 'Enregistrer le compte',
  },
  'Restablecer Clave de Prestamista': {
    en: 'Reset Lender Password',
    pt: 'Redefinir Senha do Credor',
    fr: 'Réinitialiser le Mot de Passe',
  },
  'NUEVA CONTRASEÑA · MÍNIMO 8 CARACTERES O DEJAR VACÍO PARA GENERAR CLAVE AUTOMÁTICA': {
    en: 'NEW PASSWORD · MINIMUM 8 CHARACTERS OR LEAVE BLANK TO AUTO-GENERATE',
    pt: 'NOVA SENHA · MÍNIMO 8 CARACTERES OU DEIXE EM BRANCO PARA GERAR AUTOMATICAMENTE',
    fr: 'NOUVEAU MOT DE PASSE · 8 CARACTÈRES MINIMUM OU LAISSER VIDE POUR GÉNÉRER',
  },
  'Restablecer contraseña': {
    en: 'Reset password',
    pt: 'Redefinir senha',
    fr: 'Réinitialiser le mot de passe',
  },
  'CREDENCIAL TEMPORAL ACTIVA': {
    en: 'ACTIVE TEMPORARY CREDENTIAL',
    pt: 'CREDENCIAL TEMPORÁRIA ATIVA',
    fr: 'IDENTIFIANT TEMPORAIRE ACTIF',
  },
  'Listo': {
    en: 'Done',
    pt: 'Pronto',
    fr: 'Terminé',
  },
  'Blindaje preventivo': { en: 'Preventive protection', pt: 'Blindagem preventiva', fr: 'Protection préventive' },
  'Control preventivo para registrar y consultar personas que han incumplido con sus pagos, protegiendo tu dinero antes de otorgar un nuevo préstamo.': {
    en: 'Preventive control to record and query people who defaulted on payments, protecting your capital before granting a new loan.',
    pt: 'Controle preventivo para registrar e consultar pessoas inadimplentes, protegendo seu capital antes de conceder novo empréstimo.',
    fr: 'Contrôle préventif pour enregistrer et consulter les débiteurs défaillants et protéger votre capital avant tout nouveau prêt.',
  },
  'Suspensión inmediata de préstamos activos al bloquear un cliente moroso': {
    en: 'Immediate suspension of active loans when blocking a delinquent client',
    pt: 'Suspensão imediata de empréstimos ativos ao bloquear um cliente inadimplente',
    fr: 'Suspension immédiate des prêts actifs lors du blocage d’un client défaillant',
  },
  'Bloqueo preventivo automático si se intenta crear un préstamo a una cédula restringida': {
    en: 'Automatic preventive block if attempting to grant a loan to a restricted ID',
    pt: 'Bloqueio preventivo automático ao tentar criar empréstimo para documento restrito',
    fr: 'Blocage préventif automatique en cas de tentative de prêt à un document restreint',
  },
  'Restauración controlada al directorio activo cuando el cliente regulariza su deuda': {
    en: 'Controlled restoration to the active directory once the client settles their debt',
    pt: 'Restauração controlada ao diretório ativo quando o cliente regulariza a dívida',
    fr: 'Restauration contrôlée au répertoire actif dès que le client régularise sa dette',
  },
  'Protección de capital': { en: 'Capital protection', pt: 'Proteção de capital', fr: 'Protection du capital' },
  'Prevención de reincidencia morosa': {
    en: 'Prevention of repeat default',
    pt: 'Prevenção de reincidência inadimplente',
    fr: 'Prévention des récidives de défaut',
  },
  'Respaldo de 30 días': { en: '30-day backup', pt: 'Backup de 30 dias', fr: 'Sauvegarde 30 jours' },
  'Respaldo de seguridad por 30 días con clientes y préstamos agrupados ordenadamente por persona para restaurar en segundos cualquier borrado accidental.': {
    en: '30-day safety backup with clients and loans grouped cleanly per person to restore any accidental deletion in seconds.',
    pt: 'Backup de segurança de 30 dias com clientes e empréstimos agrupados por pessoa para restaurar qualquer exclusão acidental em segundos.',
    fr: 'Sauvegarde de sécurité de 30 jours avec clients et prêts regroupés par personne pour restaurer toute suppression accidentelle en secondes.',
  },
  'Retención segura por 30 días antes del borrado definitivo': {
    en: 'Safe 30-day retention before permanent deletion',
    pt: 'Retenção segura por 30 dias antes da exclusão definitiva',
    fr: 'Rétention sécurisée de 30 jours avant suppression définitive',
  },
  'Restauración íntegra de clientes junto con sus préstamos y cuotas asociadas': {
    en: 'Full restoration of clients together with their loans and linked installments',
    pt: 'Restauração integral de clientes junto com seus empréstimos e parcelas associadas',
    fr: 'Restauration intégrale des clients avec leurs prêts et échéances associées',
  },
  'Conservación de resumen histórico para detectar reincidencias futuras': {
    en: 'Retention of historical summary to detect future repeat cases',
    pt: 'Conservação de resumo histórico para detectar reincidências futuras',
    fr: 'Conservation du résumé historique pour détecter de futures récidives',
  },
  'Recuperación inmediata': { en: 'Immediate recovery', pt: 'Recuperação imediata', fr: 'Récupération immédiate' },
  'Cero pérdida por eliminaciones accidentales': {
    en: 'Zero loss from accidental deletions',
    pt: 'Zero perda por exclusões acidentais',
    fr: 'Zéro perte due aux suppressions accidentelles',
  },
  'ASESOR FINANCIERO CON INTELIGENCIA ARTIFICIAL': {
    en: 'ARTIFICIAL INTELLIGENCE FINANCIAL ADVISOR',
    pt: 'CONSULTOR FINANCEIRO COM INTELIGÊNCIA ARTIFICIAL',
    fr: 'CONSEILLER FINANCIER PAR INTELLIGENCE ARTIFICIELLE',
  },
  'Conoce a': { en: 'Meet', pt: 'Conheça o', fr: 'Découvrez' },
  ', tu consultor operativo en tiempo real': {
    en: ', your real-time operational advisor',
    pt: ', seu consultor operacional em tempo real',
    fr: ', votre conseiller opérationnel en temps réel',
  },
  'Séneca analiza al instante tus cobros por zona como Chacarita, Puntarenas, Esparza y El Roble, el estado exacto de cada deudor y el resumen de cobros de hoy, mañana y atrasos sin tener que buscar cliente por cliente.': {
    en: 'Seneca instantly analyzes your collections by area such as Chacarita, Puntarenas, Esparza, and El Roble, the exact status of each debtor, and today, tomorrow, and overdue summaries without searching client by client.',
    pt: 'Sêneca analisa instantaneamente suas cobranças por região como Chacarita, Puntarenas, Esparza e El Roble, a situação exata de cada devedor e o resumo de hoje, amanhã e atrasos sem buscar cliente por cliente.',
    fr: 'Sénèque analyse instantanément vos recouvrements par zone comme Chacarita, Puntarenas, Esparza et El Roble, le statut exact de chaque débiteur et le résumé d’aujourd’hui, demain et retards sans chercher client par client.',
  },
  'PREGUNTA DEL COBRADOR:': {
    en: 'COLLECTOR QUESTION:',
    pt: 'PERGUNTA DO COBRADOR:',
    fr: 'QUESTION DU RECOUVREUR :',
  },
  '¿Cuántos cobros tengo hoy en Chacarita, Puntarenas, Esparza y El Roble?': {
    en: 'How many collections do I have today in Chacarita, Puntarenas, Esparza, and El Roble?',
    pt: 'Quantas cobranças tenho hoje em Chacarita, Puntarenas, Esparza e El Roble?',
    fr: 'Combien de recouvrements ai-je aujourd’hui à Chacarita, Puntarenas, Esparza et El Roble ?',
  },
  'Cobros por zona o ubicación': {
    en: 'Collections by zone or location',
    pt: 'Cobranças por região ou localidade',
    fr: 'Recouvrements par zone ou localité',
  },
  'Te informa cuántos cobros tienes en cada lugar, como Chacarita, Puntarenas, Esparza o El Roble, y cuánto dinero suman en total.': {
    en: 'Reports how many collections you have in each area, such as Chacarita, Puntarenas, Esparza, or El Roble, and their total amount.',
    pt: 'Informa quantas cobranças você tem em cada local, como Chacarita, Puntarenas, Esparza ou El Roble, e quanto somam no total.',
    fr: 'Indique combien de recouvrements vous avez par lieu, comme Chacarita, Puntarenas, Esparza ou El Roble, et leur montant total.',
  },
  'Hoy registras 4 cobros en Esparza por ₡145,000, 3 en Chacarita por ₡95,000, 2 en El Roble por ₡70,000 y 2 en Puntarenas centro por ₡65,000.': {
    en: 'Today you have 4 collections in Esparza for ₡145,000, 3 in Chacarita for ₡95,000, 2 in El Roble for ₡70,000, and 2 in central Puntarenas for ₡65,000.',
    pt: 'Hoje você registra 4 cobranças em Esparza por ₡145,000, 3 em Chacarita por ₡95,000, 2 em El Roble por ₡70,000 e 2 no centro de Puntarenas por ₡65,000.',
    fr: 'Aujourd’hui vous avez 4 recouvrements à Esparza pour ₡145,000, 3 à Chacarita pour ₡95,000, 2 à El Roble pour ₡70,000 et 2 au centre de Puntarenas pour ₡65,000.',
  },
  '¿Cuál es el estado exacto de Mateo Jiménez Navarro y cuánto le falta por pagar?': {
    en: 'What is the exact status of Mateo Jiménez Navarro and how much does he still owe?',
    pt: 'Qual é a situação exata de Mateo Jiménez Navarro e quanto falta para pagar?',
    fr: 'Quel est le statut exact de Mateo Jiménez Navarro et combien lui reste-t-il à payer ?',
  },
  'Estado exacto de cada deudor': {
    en: 'Exact status of each debtor',
    pt: 'Situação exata de cada devedor',
    fr: 'Statut exact de chaque débiteur',
  },
  'Saldo · Cuotas · Teléfono · Historial': {
    en: 'Balance · Installments · Phone · History',
    pt: 'Saldo · Parcelas · Telefone · Histórico',
    fr: 'Solde · Échéances · Téléphone · Historique',
  },
  'Te dice al instante cuánto debe una persona, cuál es su cuota, cuántas cuotas ha pagado y su teléfono de contacto.': {
    en: 'Instantly tells you how much a person owes, their installment amount, paid count, and contact phone.',
    pt: 'Mostra instantaneamente quanto uma pessoa deve, qual é sua parcela, quantas pagou e seu telefone de contato.',
    fr: 'Vous indique instantanément ce que doit une personne, le montant de son échéance, les versements effectués et son téléphone.',
  },
  'Mateo Jiménez Navarro está al día en Esparza. Tiene un préstamo semanal activo de ₡280,000, lleva 5 de 8 cuotas pagadas, su cuota es de ₡35,000 y su saldo pendiente es de ₡105,000.': {
    en: 'Mateo Jiménez Navarro is up to date in Esparza. He has an active weekly loan of ₡280,000, has paid 5 of 8 installments, his installment is ₡35,000, and his remaining balance is ₡105,000.',
    pt: 'Mateo Jiménez Navarro está em dia em Esparza. Tem um empréstimo semanal ativo de ₡280,000, pagou 5 de 8 parcelas, sua parcela é de ₡35,000 e seu saldo pendente é de ₡105,000.',
    fr: 'Mateo Jiménez Navarro est à jour à Esparza. Il a un prêt hebdomadaire actif de ₡280,000, a réglé 5 des 8 échéances, son échéance est de ₡35,000 et son solde restant est de ₡105,000.',
  },
  '¿Quiénes faltan por pagar hoy, qué cobros vienen mañana y quiénes tienen atraso?': {
    en: 'Who still needs to pay today, which collections come tomorrow, and who is overdue?',
    pt: 'Quem falta pagar hoje, quais cobranças vêm amanhã e quem está em atraso?',
    fr: 'Qui doit encore payer aujourd’hui, quels recouvrements arrivent demain et qui est en retard ?',
  },
  'Control de hoy, mañana y atrasos': {
    en: 'Today, tomorrow, and arrears control',
    pt: 'Controle de hoje, amanhã e atrasos',
    fr: 'Suivi du jour, de demain et des retards',
  },
  'Hoy · Mañana · Atrasos acumulados': {
    en: 'Today · Tomorrow · Accumulated arrears',
    pt: 'Hoje · Amanhã · Atrasos acumulados',
    fr: 'Aujourd’hui · Demain · Retards accumulés',
  },
  'Te resume quiénes faltan por pagar hoy, qué cobros vienen para mañana y cuáles clientes acumulan cuotas atrasadas.': {
    en: 'Summarizes who still owes today, tomorrow’s scheduled collections, and which clients have overdue installments.',
    pt: 'Resume quem falta pagar hoje, quais cobranças estão previstas para amanhã e quais clientes acumulam parcelas atrasadas.',
    fr: 'Résume qui doit encore payer aujourd’hui, les recouvrements de demain et les clients ayant des échéances en retard.',
  },
  'Para hoy quedan 3 cuotas pendientes por ₡110,000. Para mañana tienes 6 cobros programados por ₡215,000 y actualmente 1 cliente presenta atraso acumulado de 2 semanas.': {
    en: 'Today 3 installments remain pending for ₡110,000. Tomorrow you have 6 scheduled collections for ₡215,000, and currently 1 client has 2 weeks of accumulated arrears.',
    pt: 'Para hoje restam 3 parcelas pendentes de ₡110,000. Para amanhã você tem 6 cobranças programadas de ₡215,000 e atualmente 1 cliente apresenta atraso de 2 semanas.',
    fr: 'Pour aujourd’hui il reste 3 échéances en attente pour ₡110,000. Pour demain vous avez 6 recouvrements prévus pour ₡215,000 et 1 client présente 2 semaines de retard.',
  },
  'Blindaje operativo y respaldo total para tu actividad diaria': {
    en: 'Operational protection and complete backup for your daily work',
    pt: 'Blindagem operacional e backup completo para sua atividade diária',
    fr: 'Protection opérationnelle et sauvegarde complète pour votre activité quotidienne',
  },
  'Cada detalle de Aureus Manager protege tu capital, acelera el registro en ruta y mantiene tus cuentas claras.': {
    en: 'Every detail of Aureus Manager protects your capital, speeds up route recording, and keeps your accounts clear.',
    pt: 'Cada detalhe do Aureus Manager protege seu capital, acelera o registro em rota e mantém suas contas claras.',
    fr: 'Chaque détail d’Aureus Manager protège votre capital, accélère la saisie sur le terrain et garde vos comptes clairs.',
  },
  'Seguridad de sesiones y acceso blindado': {
    en: 'Session security and shielded access',
    pt: 'Segurança de sessões e acesso blindado',
    fr: 'Sécurité des sessions et accès renforcé',
  },
  'Protección mediante credenciales cifradas, sesiones seguras con cierre confirmado y código único de vinculación para cada cobrador.': {
    en: 'Protection with encrypted credentials, secure sessions with confirmed sign-out, and a unique linking code for each collector.',
    pt: 'Proteção por credenciais criptografadas, sessões seguras com saída confirmada e código único de vínculo para cada cobrador.',
    fr: 'Protection par identifiants chiffrés, sessions sécurisées avec confirmation de déconnexion et code de liaison unique par agent.',
  },
  'Verificación fotográfica de cédula y consulta tributaria': {
    en: 'Photo ID verification and tax status lookup',
    pt: 'Verificação fotográfica de documento e consulta tributária',
    fr: "Vérification photo de pièce d'identité et contrôle fiscal",
  },
  'Escaneo óptico de cédula desde la cámara o galería y verificación en línea ante el Ministerio de Hacienda antes de aprobar un crédito.': {
    en: 'Optical ID scanning from camera or gallery and live Ministry of Finance verification before approving a loan.',
    pt: 'Leitura óptica de documento pela câmera ou galeria e verificação on-line junto à Fazenda antes de aprovar crédito.',
    fr: "Numérisation optique de pièce d'identité par caméra ou galerie et vérification fiscale en ligne avant d'approuver un prêt.",
  },
  'Respaldo de 30 días contra borrados accidentales': {
    en: '30-day backup against accidental deletions',
    pt: 'Backup de 30 dias contra exclusões acidentais',
    fr: 'Sauvegarde 30 jours contre les suppressions accidentelles',
  },
  'Cualquier cliente o préstamo eliminado permanece resguardado durante 30 días en la Papelera para restaurarlo con un solo clic.': {
    en: 'Any deleted client or loan remains safeguarded for 30 days in Trash to restore with a single click.',
    pt: 'Qualquer cliente ou empréstimo excluído permanece guardado por 30 dias na Lixeira para restaurar com um clique.',
    fr: 'Tout client ou prêt supprimé reste protégé pendant 30 jours dans la Corbeille pour être restauré en un clic.',
  },
  'Detector de historial permanente': {
    en: 'Permanent history detector',
    pt: 'Detector de histórico permanente',
    fr: 'Détecteur d’historique permanent',
  },
  'Al registrar una cédula que ya tuvo préstamos en el pasado, se muestra un aviso ejecutivo con su comportamiento histórico de pago.': {
    en: 'When registering an ID that held past loans, an executive notice displays its historical payment behavior.',
    pt: 'Ao registrar um documento que já teve empréstimos no passado, um aviso executivo mostra o histórico de pagamento.',
    fr: 'Lors de l’enregistrement d’une pièce ayant déjà eu des prêts, un avis exécutif affiche son historique de paiement.',
  },
  'Exportación PDF horizontal de hoja de ruta': {
    en: 'Landscape PDF route sheet export',
    pt: 'Exportação de rota em PDF paisagem',
    fr: 'Export PDF paysage de feuille de route',
  },
  'Descarga en un toque la tabla ejecutiva de cobros del día en formato horizontal lista para imprimir o compartir en ruta.': {
    en: 'Download the daily executive collections table in landscape format with one tap, ready to print or share on route.',
    pt: 'Baixe em um toque a tabela executiva de cobranças do dia em formato paisagem pronta para imprimir ou compartilhar.',
    fr: 'Téléchargez d’un geste le tableau exécutif des recouvrements du jour au format paysage prêt à imprimer ou partager.',
  },
  'Delegación sincronizada de cobros por día': {
    en: 'Synchronized daily collection delegation',
    pt: 'Delegação sincronizada de cobranças por dia',
    fr: 'Délégation synchronisée des recouvrements par jour',
  },
  'Comparte cobros específicos con otro cobrador vinculado y visualiza en tiempo real quién registró cada pago, reprogramación o incumplimiento.': {
    en: 'Share specific collections with another linked collector and view in real time who recorded each payment, reschedule, or default.',
    pt: 'Compartilhe cobranças específicas com outro cobrador vinculado e veja em tempo real quem registrou cada pagamento ou atraso.',
    fr: 'Partagez des recouvrements précis avec un autre agent lié et voyez en temps réel qui a saisi chaque paiement ou report.',
  },
  'Empieza a gestionar tus préstamos con orden y seguridad': {
    en: 'Start managing your loans with order and security',
    pt: 'Comece a gerenciar seus empréstimos com ordem e segurança',
    fr: 'Commencez à gérer vos prêts avec ordre et sécurité',
  },
  'Administra tus cobros del día, clientes y préstamos desde un solo lugar.': {
    en: 'Manage your daily collections, clients, and loans from one place.',
    pt: 'Gerencie suas cobranças do dia, clientes e empréstimos em um só lugar.',
    fr: 'Gérez vos recouvrements du jour, clients et prêts en un seul endroit.',
  },
  'Aureus Manager · Gestión Ejecutiva de Préstamos y Cobros': {
    en: 'Aureus Manager · Executive Loan and Collection Management',
    pt: 'Aureus Manager · Gestão Executiva de Empréstimos e Cobranças',
    fr: 'Aureus Manager · Gestion Exécutive des Prêts et Recouvrements',
  },
  'Protección y cookies de seguridad': {
    en: 'Protection and security cookies',
    pt: 'Proteção e cookies de segurança',
    fr: 'Protection et cookies de sécurité',
  },
  'Al ingresar por primera vez a Aureus Manager, debes aceptar el uso de cookies esenciales de seguridad. Estas cookies se utilizan únicamente para cifrar tu sesión, verificar tu identidad al iniciar sesión y proteger tu cuenta contra accesos no autorizados.': {
    en: 'When entering Aureus Manager for the first time, you must accept essential security cookies. These cookies are used solely to encrypt your session, verify your identity on sign-in, and protect your account against unauthorized access.',
    pt: 'Ao entrar pela primeira vez no Aureus Manager, você deve aceitar cookies essenciais de segurança. Eles são usados apenas para criptografar sua sessão, verificar sua identidade no login e proteger sua conta contra acesso não autorizado.',
    fr: 'Lors de votre première connexion à Aureus Manager, vous devez accepter les cookies de sécurité essentiels. Ils servent uniquement à chiffrer votre session, vérifier votre identité et protéger votre compte contre tout accès non autorisé.',
  },
  'Aceptar cookies por seguridad': {
    en: 'Accept security cookies',
    pt: 'Aceitar cookies por segurança',
    fr: 'Accepter les cookies de sécurité',
  },
  'Cookies Esenciales de Seguridad y Protección de Datos Ley 8968': {
    en: 'Essential Security Cookies and Data Protection Law 8968',
    pt: 'Cookies Essenciais de Segurança e Proteção de Dados Lei 8968',
    fr: 'Cookies Essentiels de Sécurité et Protection des Données Loi 8968',
  },
  'Al ingresar a Aureus Manager aceptas el uso de cookies esenciales de seguridad y nuestra Política de Privacidad conforme a la Ley 8968 de Costa Rica. Estas cookies se emplean exclusivamente para cifrar tu sesión, verificar tu identidad y resguardar tu cuenta de forma privada.': {
    en: 'By entering Aureus Manager you accept essential security cookies and our Privacy Policy under Costa Rica Law 8968. These cookies are used solely to encrypt your session, verify your identity, and safeguard your account privately.',
    pt: 'Ao entrar no Aureus Manager você aceita cookies essenciais de segurança e nossa Política de Privacidad conforme a Lei 8968 da Costa Rica. Eles são usados exclusivamente para criptografar sua sessão, verificar sua identidade e proteger sua conta.',
    fr: 'En accédant à Aureus Manager, vous acceptez les cookies essentiels de sécurité et notre Politique de Confidentialité conforme à la Loi 8968 du Costa Rica. Ces cookies servent uniquement à chiffrer votre session, vérifier votre identité et protéger votre compte.',
  },
  'Aceptar y Continuar': {
    en: 'Accept and Continue',
    pt: 'Aceitar e Continuar',
    fr: 'Accepter et Continuer',
  },
  'Ver Términos y Privacidad': {
    en: 'View Terms and Privacy',
    pt: 'Ver Termos e Privacidade',
    fr: 'Voir Conditions et Confidentialité',
  },
  'Términos de Uso': {
    en: 'Terms of Use',
    pt: 'Termos de Uso',
    fr: "Conditions d'Utilisation",
  },
  'Privacidad y Ley 8968': {
    en: 'Privacy and Law 8968',
    pt: 'Privacidade e Lei 8968',
    fr: 'Confidentialité et Loi 8968',
  },
  'Gobernanza de IA': {
    en: 'AI Governance',
    pt: 'Governança de IA',
    fr: "Gouvernance de l'IA",
  },
  'Centro Legal y Gobernanza': {
    en: 'Legal and Governance Center',
    pt: 'Centro Legal e Governança',
    fr: 'Centre Juridique et Gouvernance',
  },
  'Versión vigente v1.0-2026 · Ley 8968 de Costa Rica': {
    en: 'Current version v1.0-2026 · Costa Rica Law 8968',
    pt: 'Versão vigente v1.0-2026 · Lei 8968 da Costa Rica',
    fr: 'Version en vigueur v1.0-2026 · Loi 8968 du Costa Rica',
  },
  'Cerrar centro legal': {
    en: 'Close legal center',
    pt: 'Fechar centro legal',
    fr: 'Fermer le centre juridique',
  },
  'Apartados legales y de gobernanza': {
    en: 'Legal and governance sections',
    pt: 'Seções legais e de governança',
    fr: 'Sections juridiques et de gouvernance',
  },
  'Términos y Uso Privado': {
    en: 'Terms and Private Use',
    pt: 'Termos e Uso Privado',
    fr: 'Conditions et Usage Privé',
  },
  'Gobernanza de Séneca IA': {
    en: 'Seneca AI Governance',
    pt: 'Governança do Sêneca IA',
    fr: 'Gouvernance de Sénèque IA',
  },
  'Herramienta Privada de Control Administrativo y Contable': {
    en: 'Private Administrative and Accounting Control Tool',
    pt: 'Ferramenta Privada de Controle Administrativo e Contábil',
    fr: 'Outil Privé de Contrôle Administratif et Comptable',
  },
  'Aureus Manager es una bitácora digital privada diseñada para organizar agendas de cobro, directorio de clientes, préstamos y resúmenes financieros. No opera como entidad bancaria, captadora de ahorro ni buró público de crédito.': {
    en: 'Aureus Manager is a private digital ledger designed to organize collection schedules, client directories, loans, and financial summaries. It does not operate as a bank, savings institution, or public credit bureau.',
    pt: 'O Aureus Manager é um registro digital privado projetado para organizar agendas de cobrança, clientes, empréstimos e resumos financeiros. Não opera como banco, instituição financeira ou birô público de crédito.',
    fr: 'Aureus Manager est un registre numérique privé conçu pour organiser les agendas de recouvrement, les clients, les prêts et les résumés financiers. Il n’agit ni comme banque ni comme bureau public de crédit.',
  },
  'Deslinde de Responsabilidad y Autonomía del Titular': {
    en: 'Liability Disclaimer and Account Holder Autonomy',
    pt: 'Isenção de Responsabilidade e Autonomia do Titular',
    fr: 'Clause de Non-Responsabilité et Autonomie du Titulaire',
  },
  'Cada usuario administra su cuenta de forma independiente y es el único responsable de la veracidad, respaldo documental y legalidad de los préstamos, tasas, plazos y apuntes que registra, eximiendo a la plataforma de disputas contractuales entre particulares.': {
    en: 'Each user independently manages their account and is solely responsible for the accuracy, supporting documentation, and legality of the loans, rates, terms, and records they enter, holding the platform harmless from private contractual disputes.',
    pt: 'Cada usuário administra sua conta de forma independente e é o único responsável pela veracidade, respaldo documental e legalidade dos empréstimos, taxas, prazos e registros que insere, isentando a plataforma de disputas entre particulares.',
    fr: 'Chaque utilisateur gère son compte de manière indépendante et est seul responsable de l’exactitude, des justificatifs et de la légalité des prêts, taux, délais et notes qu’il enregistre, dégageant la plateforme de tout litige privé.',
  },
  'Carácter Estrictamente Interno de la Lista Negra': {
    en: 'Strictly Internal Nature of the Blacklist',
    pt: 'Caráter Estritamente Interno da Lista Restrita',
    fr: 'Caractère Strictement Interne de la Liste Noire',
  },
  'El módulo de Lista Negra funciona exclusivamente como recordatorio preventivo interno dentro de la cuenta del propio usuario para evitar otorgar nuevos créditos por error a personas con incumplimientos previos comprobados.': {
    en: 'The Blacklist module serves exclusively as an internal preventive reminder within the user’s own account to avoid granting new loans by mistake to individuals with verified prior defaults.',
    pt: 'O módulo Lista Restrita funciona exclusivamente como lembrete preventivo interno na própria conta do usuário para evitar conceder novos créditos por engano a pessoas com inadimplência comprovada.',
    fr: 'Le module Liste Noire fonctionne exclusivement comme rappel préventif interne au sein du compte de l’utilisateur afin d’éviter d’accorder par erreur de nouveaux prêts à des personnes ayant des impayés avérés.',
  },
  'Aislamiento Total y Visibilidad Privada por Cuenta': {
    en: 'Total Isolation and Private Account Visibility',
    pt: 'Isolamento Total e Visibilidade Privada por Conta',
    fr: 'Isolation Totale et Visibilité Privée par Compte',
  },
  'En cumplimiento de la Ley 8968 de Costa Rica, todos tus clientes, préstamos y registros preventivos están aislados bajo tu cuenta personal y jamás se publican ni comparten con terceros sin tu acción expresa.': {
    en: 'In compliance with Costa Rica Law 8968, all your clients, loans, and preventive records are isolated under your personal account and are never published or shared with third parties without your express action.',
    pt: 'Em conformidade com a Lei 8968 da Costa Rica, todos os seus clientes, empréstimos e registros preventivos estão isolados sob sua conta pessoal e jamais são publicados ou compartilhados com terceiros sem sua ação expressa.',
    fr: 'Conformément à la Loi 8968 du Costa Rica, tous vos clients, prêts et registres préventifs sont isolés sous votre compte personnel et ne sont jamais publiés ni partagés sans votre action expresse.',
  },
  'Derechos ARCO y Retención de Seguridad de 30 Días': {
    en: 'ARCO Rights and 30-Day Safety Retention',
    pt: 'Direitos ARCO e Retenção de Segurança de 30 Dias',
    fr: 'Droits ARCO et Rétention de Sécurité de 30 Jours',
  },
  'Puedes ejercer en cualquier momento tus derechos de Acceso, Rectificación, Cancelación y Oposición: exportar tus datos personales desde Mi Perfil, actualizar registros al instante y contar con 30 días de resguardo en Papelera antes del borrado definitivo.': {
    en: 'You may exercise your Access, Rectification, Cancellation, and Opposition rights at any time: export your personal data from My Profile, update records instantly, and rely on a 30-day safety retention in Trash before permanent deletion.',
    pt: 'Você pode exercer a qualquer momento seus direitos de Acesso, Retificação, Cancelamento e Oposição: exportar seus dados pessoais em Meu Perfil, atualizar registros instantaneamente e contar com 30 dias de guarda na Lixeira antes da exclusão definitiva.',
    fr: 'Vous pouvez exercer à tout moment vos droits d’Accès, Rectification, Suppression et Opposition : exporter vos données depuis Mon Profil, modifier vos fiches instantanément et disposer de 30 jours de conservation dans la Corbeille avant suppression définitive.',
  },
  'Protección Cifrada y Enmascaramiento de Datos': {
    en: 'Encrypted Protection and Data Masking',
    pt: 'Proteção Criptografada e Mascaramento de Dados',
    fr: 'Protection Chiffrée et Masquage des Données',
  },
  'Tu sesión está protegida con cookies esenciales de seguridad con cierre automático a los 25 minutos de inactividad, contraseñas bajo cifrado irreversible y ocultamiento automático de datos personales en los registros de diagnóstico.': {
    en: 'Your session is protected with essential security cookies with automatic sign-out after 25 minutes of inactivity, irreversibly encrypted passwords, and automatic masking of personal data in diagnostic logs.',
    pt: 'Sua sessão é protegida com cookies essenciais de segurança com encerramento automático após 25 minutos de inatividade, senhas sob criptografia irreversível e ocultação automática de dados pessoais nos registros de diagnóstico.',
    fr: 'Votre session est protégée par des cookies de sécurité essentiels avec déconnexion automatique après 25 minutes d’inactivité, des mots de passe chiffrés de façon irréversible et le masquage automatique des données personnelles.',
  },
  '1. ¿Quién decide?': {
    en: '1. Who decides?',
    pt: '1. Quem decide?',
    fr: '1. Qui décide ?',
  },
  'La persona usuaria toma el 100 % de las decisiones financieras. Séneca IA y la consulta tributaria solo extraen y resumen datos objetivos; jamás puntúan, clasifican ni rechazan personas automáticamente.': {
    en: 'The human user makes 100% of financial decisions. Seneca AI and tax lookups only extract and summarize objective facts; they never score, rank, or automatically reject anyone.',
    pt: 'O usuário toma 100% das decisões financeiras. O Sêneca IA e a consulta fiscal apenas extraem e resumem dados objetivos; jamais pontuam, classificam ou rejeitam pessoas automaticamente.',
    fr: 'L’utilisateur prend 100 % des décisions financières. Sénèque IA et la vérification fiscale extraient et résument uniquement des données objectives sans jamais noter ni rejeter automatiquement une personne.',
  },
  '2. ¿Con qué datos?': {
    en: '2. With what data?',
    pt: '2. Com quais dados?',
    fr: '2. Avec quelles données ?',
  },
  'Únicamente con los registros que el propio usuario ha guardado en su cuenta, mediante consultas de solo lectura sin entrenar modelos externos con información privada.': {
    en: 'Exclusively with the records the user has stored in their own account through read-only queries without training external models on private information.',
    pt: 'Unicamente com os registros que o próprio usuário salvou em sua conta, mediante consultas somente leitura sem treinar modelos externos com informações privadas.',
    fr: 'Uniquement avec les enregistrements sauvegardés par l’utilisateur dans son propre compte, via des requêtes en lecture seule sans entraîner de modèles externes.',
  },
  '3. ¿Quién responde?': {
    en: '3. Who is accountable?',
    pt: '3. Quem responde?',
    fr: '3. Qui est responsable ?',
  },
  'El titular de la cuenta que registra y confirma cada operación mediante las etapas de doble verificación en la plataforma.': {
    en: 'The account holder who records and confirms every operation through the platform’s two-step verification stages.',
    pt: 'O titular da conta que registra e confirma cada operação por meio das etapas de dupla verificação na plataforma.',
    fr: 'Le titulaire du compte qui saisit et confirme chaque opération via les étapes de double vérification.',
  },
  '4. ¿Cómo se corrige?': {
    en: '4. How are records corrected?',
    pt: '4. Como se corrige?',
    fr: '4. Comment corriger ?',
  },
  'Todo registro cuenta con edición directa en Clientes y Préstamos, reversión de cobros compartidos, retiro inmediato de Lista Negra y restauración desde Papelera.': {
    en: 'Every record supports direct editing in Clients and Loans, reversal of shared collections, immediate removal from Blacklist, and restoration from Trash.',
    pt: 'Todo registro conta com edição direta em Clientes e Empréstimos, reversão de cobranças compartilhadas, remoção imediata da Lista Restrita e restauração da Lixeira.',
    fr: 'Chaque fiche permet une modification directe dans Clients et Prêts, l’annulation d’un recouvrement partagé, le retrait de la Liste Noire et la restauration depuis la Corbeille.',
  },
  'Custodia privada conforme a la Ley 8968 y estándares de gobernanza de IA': {
    en: 'Private custody under Law 8968 and AI governance standards',
    pt: 'Custódia privada conforme a Lei 8968 e padrões de governança de IA',
    fr: 'Garde privée conforme à la Loi 8968 et aux normes de gouvernance IA',
  },
  'Aceptar Términos y Política de Datos': {
    en: 'Accept Terms and Data Policy',
    pt: 'Aceitar Termos e Política de Dados',
    fr: 'Accepter les Conditions et la Politique de Données',
  },
  'Consentimiento Informado y Protección de Datos': {
    en: 'Informed Consent and Data Protection',
    pt: 'Consentimento Informado e Proteção de Dados',
    fr: 'Consentement Éclairé et Protection des Données',
  },
  'Requisito obligatorio conforme a la Ley 8968 de Costa Rica · Versión v1.0-2026': {
    en: 'Mandatory requirement under Costa Rica Law 8968 · Version v1.0-2026',
    pt: 'Requisito obrigatório conforme a Lei 8968 da Costa Rica · Versão v1.0-2026',
    fr: 'Exigence obligatoire selon la Loi 8968 du Costa Rica · Version v1.0-2026',
  },
  'Uso Contable Privado': {
    en: 'Private Accounting Use',
    pt: 'Uso Contábil Privado',
    fr: 'Usage Comptable Privé',
  },
  'Aureus Manager es una herramienta administrativa privada; eres el único responsable de los préstamos, cobros y registros que administras en tu cuenta.': {
    en: 'Aureus Manager is a private administrative tool; you are solely responsible for the loans, collections, and records you manage in your account.',
    pt: 'O Aureus Manager é uma ferramenta administrativa privada; você é o único responsável pelos empréstimos, cobranças e registros que administra em sua conta.',
    fr: 'Aureus Manager est un outil administratif privé ; vous êtes seul responsable des prêts, recouvrements et fiches gérés dans votre compte.',
  },
  'Protección de Datos Ley 8968': {
    en: 'Law 8968 Data Protection',
    pt: 'Proteção de Dados Lei 8968',
    fr: 'Protection des Données Loi 8968',
  },
  'Tus clientes, préstamos y apuntes son estrictamente privados, cuentas con exportación de tus propios datos desde Mi Perfil y resguardo de 30 días en Papelera.': {
    en: 'Your clients, loans, and notes are strictly private, with personal data export in My Profile and 30-day safety retention in Trash.',
    pt: 'Seus clientes, empréstimos e anotações são estritamente privados, com exportação dos seus próprios dados em Meu Perfil e guarda de 30 dias na Lixeira.',
    fr: 'Vos clients, prêts et notes sont strictement privés, avec exportation de vos données depuis Mon Profil et conservation de 30 jours dans la Corbeille.',
  },
  'Gobernanza de IA sin Decisiones Automatizadas': {
    en: 'AI Governance Without Automated Decisions',
    pt: 'Governança de IA sem Decisões Automatizadas',
    fr: 'Gouvernance IA sans Décisions Automatisées',
  },
  'Séneca IA y la consulta de cédula operan únicamente en modo de lectura informativa; nunca puntúan, clasifican ni rechazan personas automáticamente.': {
    en: 'Seneca AI and ID lookups operate strictly in informative read-only mode; they never score, rank, or automatically reject individuals.',
    pt: 'O Sêneca IA e a consulta de documento operam unicamente em modo de leitura informativa; nunca pontuam, classificam ou rejeitam pessoas automaticamente.',
    fr: 'Sénèque IA et la consultation de pièce d’identité fonctionnent uniquement en lecture informative ; ils ne notent ni ne rejettent jamais automatiquement.',
  },
  'Leer documento completo': {
    en: 'Read full document',
    pt: 'Ler documento completo',
    fr: 'Lire le document complet',
  },
  'He leído y acepto los Términos de Uso, la Política de Privacidad conforme a la Ley 8968 y las reglas de Gobernanza de Aureus Manager.': {
    en: 'I have read and accept the Terms of Use, the Privacy Policy under Law 8968, and the Governance rules of Aureus Manager.',
    pt: 'Li e aceito os Termos de Uso, a Política de Privacidade conforme a Lei 8968 e as regras de Governança do Aureus Manager.',
    fr: 'J’ai lu et j’accepte les Conditions d’Utilisation, la Politique de Confidentialité conforme à la Loi 8968 et les règles de Gouvernance d’Aureus Manager.',
  },
  'Confirmar y Continuar al Panel': {
    en: 'Confirm and Continue to Dashboard',
    pt: 'Confirmar e Continuar ao Painel',
    fr: 'Confirmer et Continuer vers le Tableau de Bord',
  },
  'Registrando consentimiento...': {
    en: 'Recording consent...',
    pt: 'Registrando consentimento...',
    fr: 'Enregistrement du consentement...',
  },
  'Acepto los Términos de Uso, la Política de Privacidad Ley 8968 y el uso responsable de la plataforma': {
    en: 'I accept the Terms of Use, the Law 8968 Privacy Policy, and responsible use of the platform',
    pt: 'Aceito os Termos de Uso, a Política de Privacidade Lei 8968 e o uso responsável da plataforma',
    fr: 'J’accepte les Conditions d’Utilisation, la Politique de Confidentialité Loi 8968 et l’usage responsable de la plateforme',
  },
  'Consultar marco legal': {
    en: 'View legal framework',
    pt: 'Consultar quadro legal',
    fr: 'Consulter le cadre juridique',
  },
  'Centro Legal, Privacidad Ley 8968 y Gobernanza de IA': {
    en: 'Legal Center, Law 8968 Privacy, and AI Governance',
    pt: 'Centro Legal, Privacidade Lei 8968 e Governança de IA',
    fr: 'Centre Juridique, Confidentialité Loi 8968 et Gouvernance IA',
  },
  'PRIVACIDAD Y DERECHOS ARCO — LEY 8968': {
    en: 'PRIVACY AND ARCO RIGHTS — LAW 8968',
    pt: 'PRIVACIDADE E DIREITOS ARCO — LEI 8968',
    fr: 'CONFIDENTIALITÉ ET DROITS ARCO — LOI 8968',
  },
  'Consultar Marco Legal': {
    en: 'View Legal Framework',
    pt: 'Consultar Quadro Legal',
    fr: 'Consulter le Cadre Juridique',
  },
  'Exportar mis datos': {
    en: 'Export my data',
    pt: 'Exportar meus dados',
    fr: 'Exporter mes données',
  },
  'Exportando...': {
    en: 'Exporting...',
    pt: 'Exportando...',
    fr: 'Exportation...',
  },
  'Datos resguardados de forma privada bajo tu custodia conforme a la Ley 8968. La consulta tributaria es informativa y nunca puntúa ni descarta personas automáticamente.': {
    en: 'Data privately safeguarded under your custody pursuant to Law 8968. Tax status lookup is informative and never scores or automatically rejects individuals.',
    pt: 'Dados resguardados de forma privada sob sua custódia conforme a Lei 8968. A consulta tributária é informativa e nunca pontua nem descarta pessoas automaticamente.',
    fr: 'Données conservées de façon privée sous votre garde conformément à la Loi 8968. La consultation fiscale est informative et ne note ni n’écarte jamais automatiquement une personne.',
  },
  'Registro de carácter estrictamente privado e interno para tu control de riesgo. Al registrar a una persona, confirmas contar con respaldo real del incumplimiento.': {
    en: 'Strictly private and internal record for your risk control. By registering a person, you confirm holding real evidence of default.',
    pt: 'Registro de caráter estritamente privado e interno para seu controle de risco. Ao registrar uma pessoa, você confirma possuir respaldo real do inadimplemento.',
    fr: 'Registre strictement privé et interne pour votre contrôle de risque. En inscrivant une personne, vous confirmez disposer d’une preuve réelle du défaut de paiement.',
  },
  'Séneca IA es un asesor de solo lectura; no toma decisiones automatizadas ni sustituye la verificación en tus módulos.': {
    en: 'Seneca AI is a read-only advisor; it makes no automated decisions and does not replace verification in your modules.',
    pt: 'O Sêneca IA é um consultor somente leitura; não toma decisões automatizadas nem substitui a verificação nos seus módulos.',
    fr: 'Sénèque IA est un conseiller en lecture seule ; il ne prend aucune décision automatisée et ne remplace pas la vérification dans vos modules.',
  },
  'Debes aceptar los Términos de Uso y la Política de Privacidad Ley 8968 para crear tu cuenta.': {
    en: 'You must accept the Terms of Use and the Law 8968 Privacy Policy to create your account.',
    pt: 'Você deve aceitar os Termos de Uso e a Política de Privacidade Lei 8968 para criar sua conta.',
    fr: 'Vous devez accepter les Conditions d’Utilisation et la Politique de Confidentialité Loi 8968 pour créer votre compte.',
  },
  'Asesor financiero y operativo': {
    en: 'Financial and operational advisor',
    pt: 'Consultor financeiro e operacional',
    fr: 'Conseiller financier et opérationnel',
  },
  'Séneca Administrativo': {
    en: 'Seneca Administrative',
    pt: 'Sêneca Administrativo',
    fr: 'Sénèque Administratif',
  },
  'Consultor documental y de plataforma': {
    en: 'Document and platform advisor',
    pt: 'Consultor documental e de plataforma',
    fr: 'Conseiller documentaire et plateforme',
  },
  'SÉNECA IA': {
    en: 'SENECA AI',
    pt: 'SÊNECA IA',
    fr: 'SÉNÈQUE IA',
  },
  'Séneca Documental': {
    en: 'Seneca Document Advisor',
    pt: 'Sêneca Documental',
    fr: 'Sénèque Documentaire',
  },
  'Consultor con respaldo en Google Drive': {
    en: 'Advisor backed by Google Drive',
    pt: 'Consultor com respaldo no Google Drive',
    fr: 'Conseiller adossé à Google Drive',
  },
  'Consultas': {
    en: 'Queries',
    pt: 'Consultas',
    fr: 'Requêtes',
  },
  'Documentos Drive': {
    en: 'Drive Documents',
    pt: 'Documentos Drive',
    fr: 'Documents Drive',
  },
  'Consumo': {
    en: 'Usage',
    pt: 'Consumo',
    fr: 'Consommation',
  },
  'Uso del Plan': {
    en: 'Plan Usage',
    pt: 'Uso do Plano',
    fr: 'Utilisation du Plan',
  },
  'Administración': {
    en: 'Administration',
    pt: 'Administração',
    fr: 'Administration',
  },
  'Consulta tus cobros del día, realiza cálculos con tus cifras o revisa las políticas y guías de uso de Aureus Manager.': {
    en: 'Check your collections for today, run calculations with your numbers, or review Aureus Manager policies and usage guides.',
    pt: 'Consulte suas cobranças do dia, faça cálculos com seus números ou revise as políticas e guias de uso do Aureus Manager.',
    fr: 'Consultez vos recouvrements du jour, effectuez des calculs avec vos chiffres ou consultez les politiques et guides d’utilisation d’Aureus Manager.',
  },
  'Consulta la arquitectura técnica, políticas de gobernanza, auditoría y matriz de roles de Aureus Manager.': {
    en: 'Check the technical architecture, governance policies, auditing, and role matrix of Aureus Manager.',
    pt: 'Consulte a arquitetura técnica, políticas de governança, auditoria e matriz de funções do Aureus Manager.',
    fr: 'Consultez l’architecture technique, les politiques de gouvernance, l’audit et la matrice des rôles d’Aureus Manager.',
  },
  'Escribe tu consulta o cálculo...': {
    en: 'Write your question or calculation...',
    pt: 'Escreva sua consulta ou cálculo...',
    fr: 'Saisissez votre question ou calcul...',
  },
  'Escribe tu consulta administrativa o técnica...': {
    en: 'Write your administrative or technical query...',
    pt: 'Escreva sua consulta administrativa ou técnica...',
    fr: 'Saisissez votre requête administrative ou technique...',
  },
  'Consultas sugeridas': {
    en: 'Suggested queries',
    pt: 'Consultas sugeridas',
    fr: 'Requêtes suggérées',
  },
  'Politica de montos y tasas': {
    en: 'Loan amounts and interest rules',
    pt: 'Política de valores e taxas',
    fr: 'Politique de montants et taux',
  },
  'Reglas de atrasos y renovacion': {
    en: 'Overdue and renewal rules',
    pt: 'Regras de atrasos e renovação',
    fr: 'Règles de retard et renouvellement',
  },
  'Reglas de atrasos y renovaciones': {
    en: 'Overdue and renewal rules',
    pt: 'Regras de atrasos e renovações',
    fr: 'Règles de retard et renouvellements',
  },
  'Políticas de privacidad y uso': {
    en: 'Privacy and usage policies',
    pt: 'Políticas de privacidade e uso',
    fr: 'Politiques de confidentialité et d’usage',
  },
  'Si presto ₡200,000 al 20% en 4 cuotas, ¿cuánto queda cada cuota?': {
    en: 'If I lend ₡200,000 at 20% in 4 installments, how much is each installment?',
    pt: 'Se eu emprestar ₡200,000 a 20% em 4 parcelas, quanto fica cada parcela?',
    fr: 'Si je prête ₡200 000 à 20 % en 4 échéances, combien coûte chaque échéance ?',
  },
  'Arquitectura técnica de la plataforma': {
    en: 'Platform technical architecture',
    pt: 'Arquitetura técnica da plataforma',
    fr: 'Architecture technique de la plateforme',
  },
  'Políticas de gobernanza y auditoría': {
    en: 'Governance and auditing policies',
    pt: 'Políticas de governança e auditoria',
    fr: 'Politiques de gouvernance et d’audit',
  },
  'Matriz de roles y permisos': {
    en: 'Roles and permissions matrix',
    pt: 'Matriz de funções e permissões',
    fr: 'Matrice des rôles et permissions',
  },
  'Viaticos y zonas de cobro': {
    en: 'Travel allowances and zones',
    pt: 'Diárias e zonas de cobrança',
    fr: 'Frais de déplacement et zones',
  },
  'Resumen operativo de hoy': {
    en: 'Today operational summary',
    pt: 'Resumo operacional de hoje',
    fr: 'Résumé opérationnel du jour',
  },
  'Consultando información de tu cartera...': {
    en: 'Checking your portfolio information...',
    pt: 'Consultando informações da sua carteira...',
    fr: 'Consultation des informations de votre portefeuille...',
  },
  'Fuentes de respaldo': {
    en: 'Supporting sources',
    pt: 'Fontes de respaldo',
    fr: 'Sources de référence',
  },
  'Copiar correo': {
    en: 'Copy email',
    pt: 'Copiar e-mail',
    fr: 'Copier l’adresse',
  },
  'Correo copiado': {
    en: 'Email copied',
    pt: 'E-mail copiado',
    fr: 'Adresse copiée',
  },
  'Conectar carpeta': {
    en: 'Connect folder',
    pt: 'Conectar pasta',
    fr: 'Connecter le dossier',
  },
  'Sincronizar ahora': {
    en: 'Sync now',
    pt: 'Sincronizar agora',
    fr: 'Synchroniser maintenant',
  },
  'Subir documento desde tu equipo': {
    en: 'Upload document from your device',
    pt: 'Enviar documento do seu dispositivo',
    fr: 'Téléverser un document depuis votre appareil',
  },
  'Formatos admitidos: TXT, Markdown, CSV, JSON, PDF o Word': {
    en: 'Supported formats: TXT, Markdown, CSV, JSON, PDF or Word',
    pt: 'Formatos compatíveis: TXT, Markdown, CSV, JSON, PDF ou Word',
    fr: 'Formats pris en charge : TXT, Markdown, CSV, JSON, PDF ou Word',
  },
  'Subir archivo': {
    en: 'Upload file',
    pt: 'Enviar arquivo',
    fr: 'Téléverser un fichier',
  },
  'Documentos indexados': {
    en: 'Indexed documents',
    pt: 'Documentos indexados',
    fr: 'Documents indexés',
  },
  'Google Drive': {
    en: 'Google Drive',
    pt: 'Google Drive',
    fr: 'Google Drive',
  },
  'Carga directa': {
    en: 'Direct upload',
    pt: 'Envio direto',
    fr: 'Téléversement direct',
  },
  'Plan activo de la cuenta': {
    en: 'Active account plan',
    pt: 'Plano ativo da conta',
    fr: 'Forfait actif du compte',
  },
  'Cambiar nivel de capacidad': {
    en: 'Change capacity tier',
    pt: 'Alterar nível de capacidade',
    fr: 'Changer le niveau de capacité',
  },
  'Consultas mensuales': {
    en: 'Monthly queries',
    pt: 'Consultas mensais',
    fr: 'Requêtes mensuelles',
  },
  'Documentos almacenados': {
    en: 'Stored documents',
    pt: 'Documentos armazenados',
    fr: 'Documents stockés',
  },
  'Plan Estandar': {
    en: 'Standard Plan',
    pt: 'Plano Padrão',
    fr: 'Forfait Standard',
  },
  'Plan Estándar': {
    en: 'Standard Plan',
    pt: 'Plano Padrão',
    fr: 'Forfait Standard',
  },
  'Plan Ejecutivo Pro': {
    en: 'Executive Pro Plan',
    pt: 'Plano Executivo Pro',
    fr: 'Forfait Exécutif Pro',
  },
  // CRM Crediticio del Prestamista (Módulo II: Clientes)
  'Directorio': {
    en: 'Directory',
    pt: 'Diretório',
    fr: 'Répertoire',
  },
  'CRM': {
    en: 'CRM',
    pt: 'CRM',
    fr: 'CRM',
  },
  'Seguimiento Comercial': {
    en: 'Commercial Tracking',
    pt: 'Acompanhamento Comercial',
    fr: 'Suivi Commercial',
  },
  'Nuevo prospecto': {
    en: 'New prospect',
    pt: 'Novo prospecto',
    fr: 'Nouveau prospect',
  },
  'Configurar tono': {
    en: 'Configure tone',
    pt: 'Configurar tom',
    fr: 'Configurer le ton',
  },
  'Embudo': {
    en: 'Funnel',
    pt: 'Funil',
    fr: 'Entonnoir',
  },
  'Tablero': {
    en: 'Board',
    pt: 'Quadro',
    fr: 'Tableau',
  },
  'Qué atender hoy': {
    en: 'What to attend today',
    pt: 'O que atender hoje',
    fr: 'À traiter aujourd\'hui',
  },
  'Pendiente de aprobación': {
    en: 'Pending approval',
    pt: 'Pendente de aprovação',
    fr: 'En attente d\'approbation',
  },
  'Aprobar y copiar': {
    en: 'Approve and copy',
    pt: 'Aprovar e copiar',
    fr: 'Approuver et copier',
  },
  'Descartar': {
    en: 'Discard',
    pt: 'Descartar',
    fr: 'Ignorer',
  },
  'Prospecto': {
    en: 'Prospect',
    pt: 'Prospecto',
    fr: 'Prospect',
  },
  'Evaluación de riesgo': {
    en: 'Risk assessment',
    pt: 'Avaliação de risco',
    fr: 'Évaluation du risque',
  },
  'Propuesta aprobada': {
    en: 'Approved proposal',
    pt: 'Proposta aprovada',
    fr: 'Proposition approuvée',
  },
  'Préstamo activo': {
    en: 'Active loan',
    pt: 'Empréstimo ativo',
    fr: 'Prêt actif',
  },
  'Alerta de atraso': {
    en: 'Overdue alert',
    pt: 'Alerta de atraso',
    fr: 'Alerte de retard',
  },
  'Finiquitado renovable': {
    en: 'Settled renewable',
    pt: 'Quitado renovável',
    fr: 'Soldé renouvelable',
  },
  'Ingresos últimos 7 días': {
    en: 'Entries last 7 days',
    pt: 'Entradas últimos 7 dias',
    fr: 'Entrées 7 derniers jours',
  },
  'Sin revisar': {
    en: 'Unreviewed',
    pt: 'Não revisados',
    fr: 'Non examinés',
  },
  'Pendientes hoy': {
    en: 'Pending today',
    pt: 'Pendentes hoje',
    fr: 'En attente aujourd\'hui',
  },
  'Mover etapa': {
    en: 'Move stage',
    pt: 'Mover etapa',
    fr: 'Déplacer l\'étape',
  },
  'Mensaje IA': {
    en: 'AI Message',
    pt: 'Mensagem IA',
    fr: 'Message IA',
  },
  'Redactar mensaje': {
    en: 'Draft message',
    pt: 'Redigir mensagem',
    fr: 'Rédiger un message',
  },
  'Confirmar movimiento': {
    en: 'Confirm move',
    pt: 'Confirmar movimento',
    fr: 'Confirmer le déplacement',
  },
  'Conversión real': {
    en: 'Actual conversion',
    pt: 'Conversão real',
    fr: 'Conversion réelle',
  },
  'Meta': {
    en: 'Target',
    pt: 'Meta',
    fr: 'Objectif',
  },
  'Días promedio': {
    en: 'Average days',
    pt: 'Dias médios',
    fr: 'Jours moyens',
  },
  'Meta cumplida': {
    en: 'Target met',
    pt: 'Meta cumprida',
    fr: 'Objectif atteint',
  },
  'Distribución por canal de origen': {
    en: 'Distribution by source channel',
    pt: 'Distribuição por canal de origem',
    fr: 'Répartition par canal d\'origine',
  },
  'Canal de origen': {
    en: 'Source channel',
    pt: 'Canal de origem',
    fr: 'Canal d\'origine',
  },
  'Monto estimado en colones': {
    en: 'Estimated amount in colones',
    pt: 'Valor estimado em colones',
    fr: 'Montant estimé en colones',
  },
  'Notas de seguimiento': {
    en: 'Follow-up notes',
    pt: 'Notas de acompanhamento',
    fr: 'Notes de suivi',
  },
  'Guardar prospecto': {
    en: 'Save prospect',
    pt: 'Salvar prospecto',
    fr: 'Enregistrer le prospect',
  },
  'Tono de redacción': {
    en: 'Writing tone',
    pt: 'Tom de redação',
    fr: 'Ton de rédaction',
  },
  'Ejecutivo cercano': {
    en: 'Approachable executive',
    pt: 'Executivo próximo',
    fr: 'Exécutif proche',
  },
  'Formal institucional': {
    en: 'Formal institutional',
    pt: 'Formal institucional',
    fr: 'Formel institutionnel',
  },
  'Directo y breve': {
    en: 'Direct and brief',
    pt: 'Direto e breve',
    fr: 'Direct et bref',
  },
  'Instrucción base *': {
    en: 'Base instruction *',
    pt: 'Instrução base *',
    fr: 'Instruction de base *',
  },
  'Mensaje guía *': {
    en: 'Guide message *',
    pt: 'Mensagem guia *',
    fr: 'Message guide *',
  },
  'Toca un dato para agregarlo al mensaje': {
    en: 'Tap a detail to add it to the message',
    pt: 'Toque em um dado para adicioná-lo à mensagem',
    fr: 'Touchez une donnée pour l’ajouter au message',
  },
  'Reglas adicionales': {
    en: 'Additional rules',
    pt: 'Regras adicionais',
    fr: 'Règles supplémentaires',
  },
  'Indicaciones adicionales': {
    en: 'Additional notes',
    pt: 'Indicações adicionais',
    fr: 'Indications supplémentaires',
  },
  'Guardar configuración': {
    en: 'Save configuration',
    pt: 'Salvar configuração',
    fr: 'Enregistrer la configuration',
  },
  'Propuesta de Séneca': {
    en: 'Seneca Proposal',
    pt: 'Proposta de Sêneca',
    fr: 'Proposition de Sénèque',
  },
  'Seguimiento al día': {
    en: 'Tracking up to date',
    pt: 'Acompanhamento em dia',
    fr: 'Suivi à jour',
  },
  'Mostrar prospectos sin avance desde': {
    en: 'Show prospects with no progress since',
    pt: 'Mostrar prospectos sem avanço desde',
    fr: 'Afficher les prospects sans progrès depuis',
  },
  'Sin prospectos en esta etapa': {
    en: 'No prospects in this stage',
    pt: 'Sem prospectos nesta etapa',
    fr: 'Aucun prospect à cette étape',
  },
  // Módulo V Administrativo: CRM y Mercadeo
  'CRM y Mercadeo': {
    en: 'CRM and Marketing',
    pt: 'CRM e Marketing',
    fr: 'CRM et Marketing',
  },
  'Crecimiento y Mercadeo': {
    en: 'Growth and Marketing',
    pt: 'Crescimento e Marketing',
    fr: 'Croissance et Marketing',
  },
  'Nuevo interesado': {
    en: 'New lead',
    pt: 'Novo interessado',
    fr: 'Nouveau prospect',
  },
  'Nueva campaña': {
    en: 'New campaign',
    pt: 'Nova campanha',
    fr: 'Nouvelle campagne',
  },
  'Campañas': {
    en: 'Campaigns',
    pt: 'Campanhas',
    fr: 'Campagnes',
  },
  'Generar 3 piezas con IA': {
    en: 'Generate 3 AI assets',
    pt: 'Gerar 3 peças com IA',
    fr: 'Générer 3 contenus avec IA',
  },
  'Costo por inscrito': {
    en: 'Cost per sign-up',
    pt: 'Custo por inscrito',
    fr: 'Coût par inscrit',
  },
  'Aprobar': {
    en: 'Approve',
    pt: 'Aprovar',
    fr: 'Approuver',
  },
  'Visitante en portada': {
    en: 'Landing visitor',
    pt: 'Visitante na página inicial',
    fr: 'Visiteur sur la page d\'accueil',
  },
  'Registro iniciado': {
    en: 'Registration started',
    pt: 'Cadastro iniciado',
    fr: 'Inscription commencée',
  },
  'Consentimiento legal': {
    en: 'Legal consent',
    pt: 'Consentimento legal',
    fr: 'Consentement légal',
  },
  'Cuenta activa': {
    en: 'Active account',
    pt: 'Conta ativa',
    fr: 'Compte actif',
  },
  'Primer préstamo': {
    en: 'First loan',
    pt: 'Primeiro empréstimo',
    fr: 'Premier prêt',
  },
  'Prestamista activo': {
    en: 'Active lender',
    pt: 'Credor ativo',
    fr: 'Prêteur actif',
  },
  'En riesgo de baja': {
    en: 'At risk of churn',
    pt: 'Em risco de saída',
    fr: 'À risque de départ',
  },
  'Objetivo': {
    en: 'Objective',
    pt: 'Objetivo',
    fr: 'Objectif',
  },
  'Ficha de campaña': {
    en: 'Campaign brief',
    pt: 'Ficha da campanha',
    fr: 'Fiche de campagne',
  },
  'Plan de piezas': {
    en: 'Asset plan',
    pt: 'Plano de peças',
    fr: 'Plan de contenus',
  },
  'En generación': {
    en: 'Generating',
    pt: 'Em geração',
    fr: 'En génération',
  },
  'Programada': {
    en: 'Scheduled',
    pt: 'Agendada',
    fr: 'Programmée',
  },
  'Publicada': {
    en: 'Published',
    pt: 'Publicada',
    fr: 'Publiée',
  },
  'Finalizada': {
    en: 'Completed',
    pt: 'Finalizada',
    fr: 'Terminée',
  },
  'Interesados últimos 7 días': {
    en: 'Leads last 7 days',
    pt: 'Interessados últimos 7 dias',
    fr: 'Intéressés 7 derniers jours',
  },
  'Campañas activas': {
    en: 'Active campaigns',
    pt: 'Campanhas ativas',
    fr: 'Campagnes actives',
  },
  'Presupuesto en campañas': {
    en: 'Campaign budget',
    pt: 'Orçamento em campanhas',
    fr: 'Budget des campagnes',
  },
  'Presupuesto': {
    en: 'Budget',
    pt: 'Orçamento',
    fr: 'Budget',
  },
  'Inscritos logrados': {
    en: 'Sign-ups achieved',
    pt: 'Inscritos alcançados',
    fr: 'Inscrits obtenus',
  },
  'Piezas aprobadas': {
    en: 'Approved assets',
    pt: 'Peças aprovadas',
    fr: 'Contenus approuvés',
  },
  'Editar campaña': {
    en: 'Edit campaign',
    pt: 'Editar campanha',
    fr: 'Modifier la campagne',
  },
  'Nombre de campaña *': {
    en: 'Campaign name *',
    pt: 'Nome da campanha *',
    fr: 'Nom de la campagne *',
  },
  'Objetivo *': {
    en: 'Objective *',
    pt: 'Objetivo *',
    fr: 'Objectif *',
  },
  'Público objetivo': {
    en: 'Target audience',
    pt: 'Público-alvo',
    fr: 'Public cible',
  },
  'Mensaje central': {
    en: 'Core message',
    pt: 'Mensagem central',
    fr: 'Message central',
  },
  'Canales': {
    en: 'Channels',
    pt: 'Canais',
    fr: 'Canaux',
  },
  'Fecha de inicio': {
    en: 'Start date',
    pt: 'Data de início',
    fr: 'Date de début',
  },
  'Fecha de fin': {
    en: 'End date',
    pt: 'Data de término',
    fr: 'Date de fin',
  },
  'Crear campaña': {
    en: 'Create campaign',
    pt: 'Criar campanha',
    fr: 'Créer la campagne',
  },
  'Guardar interesado': {
    en: 'Save lead',
    pt: 'Salvar interessado',
    fr: 'Enregistrer le prospect',
  },
  'Portada informativa': {
    en: 'Landing page',
    pt: 'Página inicial',
    fr: 'Page d\'accueil',
  },
  'Aprobada': {
    en: 'Approved',
    pt: 'Aprovada',
    fr: 'Approuvée',
  },
  'Descartada': {
    en: 'Discarded',
    pt: 'Descartada',
    fr: 'Écartée',
  },
  'Avanzar estado:': {
    en: 'Advance status:',
    pt: 'Avançar estado:',
    fr: 'Avancer l\'état :',
  },
  'Sin interesados en esta etapa': {
    en: 'No leads in this stage',
    pt: 'Sem interessados nesta etapa',
    fr: 'Aucun intéressé à cette étape',
  },
  'No hay campañas registradas': {
    en: 'No campaigns registered',
    pt: 'Não há campanhas registradas',
    fr: 'Aucune campagne enregistrée',
  },
  'Mostrar interesados sin avance desde': {
    en: 'Show leads with no progress since',
    pt: 'Mostrar interessados sem avanço desde',
    fr: 'Afficher les intéressés sans progrès depuis',
  },
  'Sin registros': {
    en: 'No records',
    pt: 'Sem registros',
    fr: 'Aucun dossier',
  },
  'Editar prospecto': {
    en: 'Edit prospect',
    pt: 'Editar prospecto',
    fr: 'Modifier le prospect',
  },
  'Editar interesado': {
    en: 'Edit lead',
    pt: 'Editar interessado',
    fr: 'Modifier l\'intéressé',
  },
  'Pasar a Clientes': {
    en: 'Move to Clients',
    pt: 'Mover para Clientes',
    fr: 'Transférer vers Clients',
  },
  'En directorio': {
    en: 'In directory',
    pt: 'No diretório',
    fr: 'Dans le répertoire',
  },
  'Copiado al portapapeles': {
    en: 'Copied to clipboard',
    pt: 'Copiado para a área de transferência',
    fr: 'Copié dans le presse-papiers',
  },
  'Eliminar prospecto': {
    en: 'Delete prospect',
    pt: 'Excluir prospecto',
    fr: 'Supprimer le prospect',
  },
  'Eliminar interesado': {
    en: 'Delete lead',
    pt: 'Excluir interessado',
    fr: 'Supprimer l\'intéressé',
  },
  // Módulo IV Administrativo: Gobernanza y Auditoría
  'Historial de auditoría': {
    en: 'Audit history',
    pt: 'Histórico de auditoria',
    fr: 'Historique d\'audit',
  },
  'Se conservan automáticamente los últimos 30 días hasta un máximo de 200 registros': {
    en: 'The last 30 days up to a maximum of 200 records are automatically retained',
    pt: 'Os últimos 30 dias até o máximo de 200 registros são mantidos automaticamente',
    fr: 'Les 30 derniers jours jusqu\'à un maximum de 200 enregistrements sont conservés automatiquement',
  },
  'Limpiar historial antiguo': {
    en: 'Clear older history',
    pt: 'Limpar histórico antigo',
    fr: 'Nettoyer l\'ancien historique',
  },
  'Sí, limpiar historial': {
    en: 'Yes, clear history',
    pt: 'Sim, limpar histórico',
    fr: 'Oui, nettoyer l\'historique',
  },
  'Limpiar todo el historial': {
    en: 'Clear full history',
    pt: 'Limpar todo o histórico',
    fr: 'Effacer tout l\'historique',
  },
  'Registros mayores a 7 días': {
    en: 'Records older than 7 days',
    pt: 'Registros com mais de 7 dias',
    fr: 'Enregistrements de plus de 7 jours',
  },
  'Anterior': {
    en: 'Previous',
    pt: 'Anterior',
    fr: 'Précédent',
  },
  'Siguiente': {
    en: 'Next',
    pt: 'Próxima',
    fr: 'Suivant',
  },
  'Sin eventos recientes': {
    en: 'No recent events',
    pt: 'Sem eventos recentes',
    fr: 'Aucun événement récent',
  },
  'Limpiar': {
    en: 'Clear',
    pt: 'Limpar',
    fr: 'Effacer',
  },
  'Cuenta actualizada': {
    en: 'Account updated',
    pt: 'Conta atualizada',
    fr: 'Compte mis à jour',
  },
  'Estado de cuenta modificado': {
    en: 'Account status updated',
    pt: 'Estado da conta alterado',
    fr: 'Statut du compte modifié',
  },
  'Contraseña restablecida': {
    en: 'Password reset',
    pt: 'Senha redefinida',
    fr: 'Mot de passe réinitialisé',
  },
  'Cuenta eliminada': {
    en: 'Account deleted',
    pt: 'Conta excluída',
    fr: 'Compte supprimé',
  },
  'Depuración ejecutada': {
    en: 'Cleanup executed',
    pt: 'Depuração executada',
    fr: 'Nettoyage exécuté',
  },
  'Papelera depurada': {
    en: 'Trash emptied',
    pt: 'Lixeira limpa',
    fr: 'Corbeille vidée',
  },
  'Historial de auditoría depurado': {
    en: 'Audit history cleaned',
    pt: 'Histórico de auditoria limpo',
    fr: 'Historique d\'audit nettoyé',
  },
  'Actividad administrativa': {
    en: 'Administrative activity',
    pt: 'Atividade administrativa',
    fr: 'Activité administrative',
  },
  'Privacidad protegida · Ley N.° 8968': {
    en: 'Privacy protected · Law No. 8968',
    pt: 'Privacidade protegida · Lei n.º 8968',
    fr: 'Confidentialité protégée · Loi n° 8968',
  },
  'Sin zona': {
    en: 'No area',
    pt: 'Sem região',
    fr: 'Sans zone',
  },
  'Ingresa un correo electrónico válido.': {
    en: 'Enter a valid email address.',
    pt: 'Digite um e-mail válido.',
    fr: 'Veuillez saisir une adresse e-mail valide.',
  },
  'O continúa con': {
    en: 'Or continue with',
    pt: 'Ou continue com',
    fr: 'Ou continuer avec',
  },
  'Continuar con Google': {
    en: 'Continue with Google',
    pt: 'Continuar com Google',
    fr: 'Continuer avec Google',
  },
  'Continuar con GitHub': {
    en: 'Continue with GitHub',
    pt: 'Continuar com GitHub',
    fr: 'Continuer avec GitHub',
  },
  'Conectando con Google...': {
    en: 'Connecting with Google...',
    pt: 'Conectando com o Google...',
    fr: 'Connexion avec Google...',
  },
  'Conectando con GitHub...': {
    en: 'Connecting with GitHub...',
    pt: 'Conectando com o GitHub...',
    fr: 'Connexion avec GitHub...',
  },
  'Cancelaste el acceso externo antes de completar la verificación.': {
    en: 'You canceled the external sign-in before completing verification.',
    pt: 'Você cancelou o acesso externo antes de concluir a verificação.',
    fr: 'Vous avez annulé la connexion externe avant la fin de la vérification.',
  },
  'Tu cuenta externa debe tener un correo electrónico verificado para ingresar.': {
    en: 'Your external account must have a verified email address to sign in.',
    pt: 'Sua conta externa deve ter um e-mail verificado para entrar.',
    fr: 'Votre compte externe doit disposer d’une adresse e-mail vérifiée pour se connecter.',
  },
  'Tu cuenta se encuentra suspendida temporalmente por la administración.': {
    en: 'Your account has been temporarily suspended by the administration.',
    pt: 'Sua conta foi suspensa temporariamente pela administração.',
    fr: 'Votre compte a été temporairement suspendu par l’administration.',
  },
  'Esta cuenta debe ingresar únicamente con sus credenciales directas.': {
    en: 'This account must sign in using only its direct credentials.',
    pt: 'Esta conta deve entrar apenas com suas credenciais diretas.',
    fr: 'Ce compte doit se connecter uniquement avec ses identifiants directs.',
  },
  'La verificación de seguridad expiró. Inténtalo nuevamente.': {
    en: 'The security verification expired. Please try again.',
    pt: 'A verificação de segurança expirou. Tente novamente.',
    fr: 'La vérification de sécurité a expiré. Veuillez réessayer.',
  },
  'Este método de acceso aún no está disponible.': {
    en: 'This sign-in method is not available yet.',
    pt: 'Este método de acesso ainda não está disponível.',
    fr: 'Cette méthode de connexion n’est pas encore disponible.',
  },
  'No fue posible completar el acceso externo. Inténtalo nuevamente.': {
    en: 'Unable to complete external sign-in. Please try again.',
    pt: 'Não foi possível concluir o acesso externo. Tente novamente.',
    fr: 'Impossible de finaliser la connexion externe. Veuillez réessayer.',
  },
};

// Construir mapa normalizado en minúsculas para capturar variantes de capitalización (CSS uppercase / Title Case)
const LOWER_EXACT_TEXT_MAP = Object.create(null);
for (const [k, v] of Object.entries(EXACT_TEXT_MAP)) {
  const lowerKey = k.trim().toLowerCase();
  if (!LOWER_EXACT_TEXT_MAP[lowerKey]) {
    LOWER_EXACT_TEXT_MAP[lowerKey] = v;
  }
}

const WEEKDAYS_I18N = {
  lunes: { en: 'Monday', pt: 'Segunda-feira', fr: 'Lundi' },
  martes: { en: 'Tuesday', pt: 'Terça-feira', fr: 'Mardi' },
  miércoles: { en: 'Wednesday', pt: 'Quarta-feira', fr: 'Mercredi' },
  miercoles: { en: 'Wednesday', pt: 'Quarta-feira', fr: 'Mercredi' },
  jueves: { en: 'Thursday', pt: 'Quinta-feira', fr: 'Jeudi' },
  viernes: { en: 'Friday', pt: 'Sexta-feira', fr: 'Vendredi' },
  sábado: { en: 'Saturday', pt: 'Sábado', fr: 'Samedi' },
  sabado: { en: 'Saturday', pt: 'Sábado', fr: 'Samedi' },
  domingo: { en: 'Sunday', pt: 'Domingo', fr: 'Dimanche' },
};

const MONTHS_I18N = {
  enero: { en: 'January', pt: 'Janeiro', fr: 'Janvier' },
  febrero: { en: 'February', pt: 'Fevereiro', fr: 'Février' },
  marzo: { en: 'March', pt: 'Março', fr: 'Mars' },
  abril: { en: 'April', pt: 'Abril', fr: 'Avril' },
  mayo: { en: 'May', pt: 'Maio', fr: 'Mai' },
  junio: { en: 'June', pt: 'Junho', fr: 'Juin' },
  julio: { en: 'July', pt: 'Julho', fr: 'Juillet' },
  agosto: { en: 'August', pt: 'Agosto', fr: 'Août' },
  setiembre: { en: 'September', pt: 'Setembro', fr: 'Septembre' },
  septiembre: { en: 'September', pt: 'Setembro', fr: 'Septembre' },
  octubre: { en: 'October', pt: 'Outubro', fr: 'Octobre' },
  noviembre: { en: 'November', pt: 'Novembro', fr: 'Novembre' },
  diciembre: { en: 'December', pt: 'Dezembro', fr: 'Décembre' },
};

const MONTHS_SHORT_I18N = {
  ene: { en: 'Jan', pt: 'Jan', fr: 'Jan' },
  feb: { en: 'Feb', pt: 'Fev', fr: 'Fév' },
  mar: { en: 'Mar', pt: 'Mar', fr: 'Mar' },
  abr: { en: 'Apr', pt: 'Abr', fr: 'Avr' },
  may: { en: 'May', pt: 'Mai', fr: 'Mai' },
  jun: { en: 'Jun', pt: 'Jun', fr: 'Juin' },
  jul: { en: 'Jul', pt: 'Jul', fr: 'Juil' },
  ago: { en: 'Aug', pt: 'Ago', fr: 'Aoû' },
  set: { en: 'Sep', pt: 'Set', fr: 'Sep' },
  sep: { en: 'Sep', pt: 'Set', fr: 'Sep' },
  oct: { en: 'Oct', pt: 'Out', fr: 'Oct' },
  nov: { en: 'Nov', pt: 'Nov', fr: 'Nov' },
  dic: { en: 'Dec', pt: 'Dez', fr: 'Déc' },
};

function translateSpanishDatePhrase(dateText, lang) {
  if (!dateText || lang === 'es') return dateText;
  const trimmed = String(dateText).trim();

  // Formato largo con día de semana: "Domingo, 15 de Noviembre de 2026"
  const fullMatch = trimmed.match(
    /^(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo),?\s+(\d{1,2})\s+de\s+(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Se(?:p)?tiembre|Octubre|Noviembre|Diciembre)\s+de\s+(\d{4})$/i
  );
  if (fullMatch) {
    const weekday = WEEKDAYS_I18N[fullMatch[1].toLowerCase()]?.[lang] || fullMatch[1];
    const dayNum = fullMatch[2];
    const month = MONTHS_I18N[fullMatch[3].toLowerCase()]?.[lang] || fullMatch[3];
    const year = fullMatch[4];
    if (lang === 'en') return `${weekday}, ${month} ${dayNum}, ${year}`;
    if (lang === 'pt') return `${weekday}, ${dayNum} de ${month} de ${year}`;
    return `${weekday} ${dayNum} ${month.toLowerCase()} ${year}`;
  }

  // Formato "15 de Noviembre de 2026" o "15 de nov de 2026, 05:30 p. m."
  const dayMonthYear = trimmed.match(
    /^(\d{1,2})\s+de\s+(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Se(?:p)?tiembre|Octubre|Noviembre|Diciembre|ene|feb|mar|abr|may|jun|jul|ago|set|sep|oct|nov|dic)\s+de\s+(\d{4})(.*)$/i
  );
  if (dayMonthYear) {
    const dayNum = dayMonthYear[1];
    const mKey = dayMonthYear[2].toLowerCase();
    const month = MONTHS_I18N[mKey]?.[lang] || MONTHS_SHORT_I18N[mKey]?.[lang] || dayMonthYear[2];
    const year = dayMonthYear[3];
    const suffix = dayMonthYear[4] || '';
    if (lang === 'en') return `${month} ${dayNum}, ${year}${suffix}`;
    if (lang === 'pt') return `${dayNum} de ${month} de ${year}${suffix}`;
    return `${dayNum} ${month.toLowerCase()} ${year}${suffix}`;
  }

  // Formato cabecera de calendario: "Noviembre de 2026"
  const monthYear = trimmed.match(
    /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Se(?:p)?tiembre|Octubre|Noviembre|Diciembre)\s+de\s+(\d{4})$/i
  );
  if (monthYear) {
    const month = MONTHS_I18N[monthYear[1].toLowerCase()]?.[lang] || monthYear[1];
    const year = monthYear[2];
    if (lang === 'pt') return `${month} de ${year}`;
    return `${month} ${year}`;
  }

  return trimmed;
}

/* ============================================================================
   CAPA 2: TRADUCTOR DE PATRONES DINÁMICOS (FECHAS, CONTADORES Y FRASES COMPUESTAS)
   ============================================================================ */
export function translateDynamicString(rawText, lang) {
  if (!rawText || lang === 'es') return rawText;
  const clean = String(rawText).replace(/\s+/g, ' ').trim();
  if (!clean) return rawText;

  // 1. Coincidencia exacta directa o por capitalización en Capa 1
  if (EXACT_TEXT_MAP[clean]?.[lang]) {
    return EXACT_TEXT_MAP[clean][lang];
  }
  const lowerHit = LOWER_EXACT_TEXT_MAP[clean.toLowerCase()]?.[lang];
  if (lowerHit) {
    const isAllCaps = clean === clean.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(clean);
    return isAllCaps ? lowerHit.toUpperCase() : lowerHit;
  }

  // 2. Fechas largas/calendario directas
  const directDate = translateSpanishDatePhrase(clean, lang);
  if (directDate !== clean) return directDate;

  // 3. Vacíos de cobros con fecha incrustada
  let m = clean.match(/^No hay cobros pendientes programados para el\s+(.+?)\.?$/i);
  if (m) {
    const d = translateSpanishDatePhrase(m[1], lang);
    if (lang === 'en') return `There are no pending collections scheduled for ${d}.`;
    if (lang === 'pt') return `Não há cobranças pendentes programadas para ${d}.`;
    return `Il n'y a aucun recouvrement en attente prévu pour le ${d}.`;
  }

  m = clean.match(/^No hay cobros registrados para el\s+(.+?)\.?$/i);
  if (m) {
    const d = translateSpanishDatePhrase(m[1], lang);
    if (lang === 'en') return `There are no recorded collections for ${d}.`;
    if (lang === 'pt') return `Não há cobranças registradas para ${d}.`;
    return `Il n'y a aucun recouvrement enregistré pour le ${d}.`;
  }

  m = clean.match(/^Fecha actual:\s*(.+?)\.\s*Toca para abrir el calendario\.$/i);
  if (m) {
    const d = translateSpanishDatePhrase(m[1], lang);
    if (lang === 'en') return `Current date: ${d}. Tap to open calendar.`;
    if (lang === 'pt') return `Data atual: ${d}. Toque para abrir o calendário.`;
    return `Date actuelle : ${d}. Touchez pour ouvrir le calendrier.`;
  }

  // 4. Tooltip del selector de días en WeekDaysSelector
  m = clean.match(
    /^(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\s+(\d{1,2})(\s*·\s*Hoy)?(\s*·\s*Con cobros pendientes sin registrar)?$/i
  );
  if (m) {
    const w = WEEKDAYS_I18N[m[1].toLowerCase()]?.[lang] || m[1];
    const todayStr = m[3]
      ? lang === 'en'
        ? ' · Today'
        : lang === 'pt'
          ? ' · Hoje'
          : " · Aujourd'hui"
      : '';
    const pendingStr = m[4]
      ? lang === 'en'
        ? ' · With unrecorded pending collections'
        : lang === 'pt'
          ? ' · Com cobranças pendentes não registradas'
          : ' · Avec recouvrements en attente non enregistrés'
      : '';
    return `${w} ${m[2]}${todayStr}${pendingStr}`;
  }

  // 5. Subtítulo compuesto de Préstamos: "X clientes · Y préstamos pendientes/registrados/atrasados/encontrados"
  m = clean.match(
    /^(\d+)\s+clientes?\s*·\s*(\d+)\s+préstamos?\s+(pendientes?|registrados?|atrasados?|encontrados?)$/i
  );
  if (m) {
    const cNum = Number(m[1]);
    const lNum = Number(m[2]);
    const statusRaw = m[3].toLowerCase();
    if (lang === 'en') {
      const cWord = cNum === 1 ? 'client' : 'clients';
      const lWord = lNum === 1 ? 'loan' : 'loans';
      const statusEn = statusRaw.startsWith('pend')
        ? 'pending'
        : statusRaw.startsWith('reg')
          ? 'recorded'
          : statusRaw.startsWith('atra')
            ? 'overdue'
            : 'found';
      return `${cNum} ${cWord} · ${lNum} ${statusEn} ${lWord}`;
    }
    if (lang === 'pt') {
      const cWord = cNum === 1 ? 'cliente' : 'clientes';
      const lWord = lNum === 1 ? 'empréstimo' : 'empréstimos';
      const statusPt = statusRaw.startsWith('pend')
        ? lNum === 1
          ? 'pendente'
          : 'pendentes'
        : statusRaw.startsWith('reg')
          ? lNum === 1
            ? 'registrado'
            : 'registrados'
          : statusRaw.startsWith('atra')
            ? lNum === 1
              ? 'atrasado'
              : 'atrasados'
            : lNum === 1
              ? 'encontrado'
              : 'encontrados';
      return `${cNum} ${cWord} · ${lNum} ${lWord} ${statusPt}`;
    }
    const cWord = cNum === 1 ? 'client' : 'clients';
    const lWord = lNum === 1 ? 'prêt' : 'prêts';
    const statusFr = statusRaw.startsWith('pend')
      ? 'en attente'
      : statusRaw.startsWith('reg')
        ? lNum === 1
          ? 'enregistré'
          : 'enregistrés'
        : statusRaw.startsWith('atra')
          ? 'en retard'
          : lNum === 1
            ? 'trouvé'
            : 'trouvés';
    return `${cNum} ${cWord} · ${lNum} ${lWord} ${statusFr}`;
  }

  // 6. Contadores de clientes y personas
  m = clean.match(/^(\d+)\s+clientes?\s+registrados?$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'registered client' : 'registered clients'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'cliente registrado' : 'clientes registrados'}`;
    return `${n} ${n === 1 ? 'client enregistré' : 'clients enregistrés'}`;
  }

  m = clean.match(/^(\d+)\s+clientes?\s+con\s+movimientos$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'client with activity' : 'clients with activity'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'cliente com movimentação' : 'clientes com movimentações'}`;
    return `${n} ${n === 1 ? 'client avec mouvement' : 'clients avec mouvements'}`;
  }

  m = clean.match(/^(\d+)\s+de\s+(\d+)\s+clientes?\s+cobrados?$/i);
  if (m) {
    if (lang === 'en') return `${m[1]} of ${m[2]} clients collected`;
    if (lang === 'pt') return `${m[1]} de ${m[2]} clientes cobrados`;
    return `${m[1]} sur ${m[2]} clients encaissés`;
  }

  m = clean.match(/^(\d+(?:\.\d+)?)%\s+de\s+efectividad\s+hoy$/i);
  if (m) {
    if (lang === 'en') return `${m[1]}% effectiveness today`;
    if (lang === 'pt') return `${m[1]}% de efetividade hoje`;
    return `${m[1]}% d'efficacité aujourd'hui`;
  }

  m = clean.match(/^(\d+)\s+de\s+(\d+)\s+cuotas?\s+cobradas?$/i);
  if (m) {
    if (lang === 'en') return `${m[1]} of ${m[2]} installments collected`;
    if (lang === 'pt') return `${m[1]} de ${m[2]} parcelas cobradas`;
    return `${m[1]} sur ${m[2]} échéances encaissées`;
  }

  m = clean.match(/^Cuotas\s+(\d+)\s+de\s+(\d+)$/i);
  if (m) {
    if (lang === 'en') return `Installments ${m[1]} of ${m[2]}`;
    if (lang === 'pt') return `Parcelas ${m[1]} de ${m[2]}`;
    return `Échéances ${m[1]} sur ${m[2]}`;
  }

  m = clean.match(/^(\d+)\s+préstamos?\s+activos?$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'active loan' : 'active loans'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'empréstimo ativo' : 'empréstimos ativos'}`;
    return `${n} ${n === 1 ? 'prêt actif' : 'prêts actifs'}`;
  }

  m = clean.match(/^(\d+)\s+préstamos?\s+con\s+atraso$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'overdue loan' : 'overdue loans'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'empréstimo em atraso' : 'empréstimos em atraso'}`;
    return `${n} ${n === 1 ? 'prêt en retard' : 'prêts en retard'}`;
  }

  m = clean.match(/^(\d+)\s+acuerdos?\s+activos?$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'active agreement' : 'active agreements'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'acordo ativo' : 'acordos ativos'}`;
    return `${n} ${n === 1 ? 'accord actif' : 'accords actifs'}`;
  }

  m = clean.match(/^Saldo por cobrar:?\s*(.+)$/i);
  if (m) {
    if (lang === 'en') return `Balance to collect: ${m[1]}`;
    if (lang === 'pt') return `Saldo a cobrar: ${m[1]}`;
    return `Solde à encaisser : ${m[1]}`;
  }

  // 7. Períodos relativos: "Hace X días/semanas/meses/años"
  m = clean.match(/^Hace\s+(\d+)\s+(día|días|semana|semanas|mes|meses|año|años)$/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (lang === 'en') {
      const enUnit = unit.startsWith('d')
        ? n === 1
          ? 'day'
          : 'days'
        : unit.startsWith('s')
          ? n === 1
            ? 'week'
            : 'weeks'
          : unit.startsWith('m')
            ? n === 1
              ? 'month'
              : 'months'
            : n === 1
              ? 'year'
              : 'years';
      return `${n} ${enUnit} ago`;
    }
    if (lang === 'pt') {
      const ptUnit = unit.startsWith('d')
        ? n === 1
          ? 'dia'
          : 'dias'
        : unit.startsWith('s')
          ? n === 1
            ? 'semana'
            : 'semanas'
          : unit.startsWith('m')
            ? n === 1
              ? 'mês'
              : 'meses'
            : n === 1
              ? 'ano'
              : 'anos';
      return `Há ${n} ${ptUnit}`;
    }
    const frUnit = unit.startsWith('d')
      ? n === 1
        ? 'jour'
        : 'jours'
      : unit.startsWith('s')
        ? n === 1
          ? 'semaine'
          : 'semaines'
        : unit.startsWith('m')
          ? 'mois'
          : n === 1
            ? 'an'
            : 'ans';
    return `Il y a ${n} ${frUnit}`;
  }

  m = clean.match(/^([+-]?\d+(?:\.\d+)?)%\s+variación$/i);
  if (m) {
    if (lang === 'en') return `${m[1]}% variation`;
    if (lang === 'pt') return `${m[1]}% variação`;
    return `${m[1]}% variation`;
  }

  m = clean.match(/^(\d+)\s+clientes?$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'client' : 'clients'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'cliente' : 'clientes'}`;
    return `${n} ${n === 1 ? 'client' : 'clients'}`;
  }

  m = clean.match(/^(\d+)\s+personas?$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'person' : 'people'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`;
    return `${n} ${n === 1 ? 'personne' : 'personnes'}`;
  }

  m = clean.match(/^Código:\s*(.+)$/i);
  if (m) {
    if (lang === 'fr') return `Code : ${m[1]}`;
    return lang === 'en' ? `Code: ${m[1]}` : `Código: ${m[1]}`;
  }

  m = clean.match(/^(\d+)\s+avisos?\s+por\s+revisar$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'alert to review' : 'alerts to review'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'aviso para revisar' : 'avisos para revisar'}`;
    return `${n} ${n === 1 ? 'alerte à vérifier' : 'alertes à vérifier'}`;
  }

  m = clean.match(/^(\d+)\s+Ver notificaciones de cobros de hoy$/i);
  if (m) {
    return `${m[1]} ${TRANSLATIONS[lang]?.header?.notificationsTitle || m[0]}`;
  }

  m = clean.match(/^Falta(?:n)?\s+(\d+)\s+días?$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'day left' : 'days left'}`;
    if (lang === 'pt') return `${n === 1 ? 'Falta 1 dia' : `Faltam ${n} dias`}`;
    return `${n} ${n === 1 ? 'jour restant' : 'jours restants'}`;
  }

  m = clean.match(/^(\d+)\s+préstamos?\s+en\s+papelera$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'loan in trash' : 'loans in trash'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'empréstimo na lixeira' : 'empréstimos na lixeira'}`;
    return `${n} ${n === 1 ? 'prêt dans la corbeille' : 'prêts dans la corbeille'}`;
  }

  m = clean.match(/^(\d+)\s+préstamos?\s+seleccionados?$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'loan selected' : 'loans selected'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'empréstimo selecionado' : 'empréstimos selecionados'}`;
    return `${n} ${n === 1 ? 'prêt sélectionné' : 'prêts sélectionnés'}`;
  }

  m = clean.match(/^Eliminar\s+(\d+)\s+préstamos?$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `Delete ${n} ${n === 1 ? 'loan' : 'loans'}`;
    if (lang === 'pt') return `Excluir ${n} ${n === 1 ? 'empréstimo' : 'empréstimos'}`;
    return `Supprimer ${n} ${n === 1 ? 'prêt' : 'prêts'}`;
  }

  m = clean.match(/^Préstamo\s+(\d+)\s*·\s*(.+)$/i);
  if (m) {
    if (lang === 'en') return `Loan ${m[1]} · ${m[2]}`;
    if (lang === 'pt') return `Empréstimo ${m[1]} · ${m[2]}`;
    return `Prêt ${m[1]} · ${m[2]}`;
  }

  m = clean.match(/^Préstamo\s+(\d+)\s+de\s+(\d+)$/i);
  if (m) {
    if (lang === 'en') return `Loan ${m[1]} of ${m[2]}`;
    if (lang === 'pt') return `Empréstimo ${m[1]} de ${m[2]}`;
    return `Prêt ${m[1]} sur ${m[2]}`;
  }

  m = clean.match(/^Préstamo\s+(\d+)$/i);
  if (m) {
    if (lang === 'en') return `Loan ${m[1]}`;
    if (lang === 'pt') return `Empréstimo ${m[1]}`;
    return `Prêt ${m[1]}`;
  }

  m = clean.match(/^(\d+)\s+cobros?\s+hoy$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'collection today' : 'collections today'}`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'cobrança hoje' : 'cobranças hoje'}`;
    return `${n} ${n === 1 ? "recouvrement aujourd'hui" : "recouvrements aujourd'hui"}`;
  }

  m = clean.match(/^(\d+)\s+registrados$/i);
  if (m) {
    if (lang === 'en') return `${m[1]} recorded`;
    if (lang === 'pt') return `${m[1]} registrados`;
    return `${m[1]} enregistrés`;
  }

  m = clean.match(/^(\d+)\s+atrasados$/i);
  if (m) {
    if (lang === 'en') return `${m[1]} overdue`;
    if (lang === 'pt') return `${m[1]} em atraso`;
    return `${m[1]} en retard`;
  }

  m = clean.match(/^Total a cobrar hoy:?\s*(.*)$/i);
  if (m) {
    const suffix = m[1] ? ` ${m[1]}` : '';
    if (lang === 'en') return `Total due today:${suffix}`;
    if (lang === 'pt') return `Total a cobrar hoje:${suffix}`;
    return `Total à encaisser aujourd'hui :${suffix}`;
  }

  m = clean.match(/^Total cobrado hoy:?\s*(.*)$/i);
  if (m) {
    const suffix = m[1] ? ` ${m[1]}` : '';
    if (lang === 'en') return `Total collected today:${suffix}`;
    if (lang === 'pt') return `Total cobrado hoje:${suffix}`;
    return `Total encaissé aujourd'hui :${suffix}`;
  }

  m = clean.match(/^Total atrasado:?\s*(.*)$/i);
  if (m) {
    const suffix = m[1] ? ` ${m[1]}` : '';
    if (lang === 'en') return `Total overdue:${suffix}`;
    if (lang === 'pt') return `Total em atraso:${suffix}`;
    return `Total en retard :${suffix}`;
  }

  m = clean.match(/^Cédula\s+([A-Za-z0-9-]+)(\s*·)?$/i);
  if (m) {
    const dot = m[2] || '';
    if (lang === 'en') return `ID ${m[1]}${dot}`;
    if (lang === 'pt') return `Documento ${m[1]}${dot}`;
    return `ID ${m[1]}${dot}`;
  }

  m = clean.match(/^Tienes\s+(\d+)\s+cobros?\s+de\s+días\s+anteriores\s+sin\s+registrar$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `You have ${n} unrecorded ${n === 1 ? 'collection' : 'collections'} from previous days`;
    if (lang === 'pt') return `Você tem ${n} ${n === 1 ? 'cobrança' : 'cobranças'} de dias anteriores sem registrar`;
    return `Vous avez ${n} ${n === 1 ? 'recouvrement' : 'recouvrements'} des jours précédents non enregistré${n === 1 ? '' : 's'}`;
  }

  m = clean.match(
    /^Día fijo:\s*(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\s*·\s*Pasado\s+(\d+)\s+ve(?:z|ces)$/i
  );
  if (m) {
    const w = WEEKDAYS_I18N[m[1].toLowerCase()]?.[lang] || m[1];
    const n = Number(m[2]);
    if (lang === 'en') return `Fixed day: ${w} · Rescheduled ${n} ${n === 1 ? 'time' : 'times'}`;
    if (lang === 'pt') return `Dia fixo: ${w} · Adiado ${n} ${n === 1 ? 'vez' : 'vezes'}`;
    return `Jour fixe : ${w} · Reporté ${n} fois`;
  }

  m = clean.match(/^(\d+)\s+semanas?\s+sin\s+pagar$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'week' : 'weeks'} unpaid`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'semana' : 'semanas'} sem pagar`;
    return `${n} ${n === 1 ? 'semaine' : 'semaines'} impayée${n === 1 ? '' : 's'}`;
  }

  m = clean.match(/^(\d+)\s+quincenas?\s+sin\s+pagar$/i);
  if (m) {
    const n = Number(m[1]);
    if (lang === 'en') return `${n} ${n === 1 ? 'biweekly period' : 'biweekly periods'} unpaid`;
    if (lang === 'pt') return `${n} ${n === 1 ? 'quinzena' : 'quinzenas'} sem pagar`;
    return `${n} ${n === 1 ? 'quinzaine' : 'quinzaines'} impayée${n === 1 ? '' : 's'}`;
  }

  m = clean.match(/^Registrado a las\s+(.+)$/i);
  if (m) {
    if (lang === 'en') return `Recorded at ${m[1]}`;
    if (lang === 'pt') return `Registrado às ${m[1]}`;
    return `Enregistré à ${m[1]}`;
  }

  m = clean.match(/^Préstamos de\s+(.+)$/i);
  if (m) {
    if (lang === 'en') return `Loans of ${m[1]}`;
    if (lang === 'pt') return `Empréstimos de ${m[1]}`;
    return `Prêts de ${m[1]}`;
  }

  m = clean.match(/^Pasar a (.+) de día$/i);
  if (m) {
    if (lang === 'en') return `Reschedule ${m[1]} to another day`;
    if (lang === 'pt') return `Adiar cobrança de ${m[1]}`;
    return `Reporter l'échéance de ${m[1]}`;
  }

  m = clean.match(/^Compartir\s+(\d+)\s+cobros\s+con\s+(.+)$/i);
  if (m) {
    if (lang === 'en') return `Share ${m[1]} collections with ${m[2]}`;
    if (lang === 'pt') return `Compartilhar ${m[1]} cobranças com ${m[2]}`;
    return `Partager ${m[1]} recouvrements avec ${m[2]}`;
  }

  m = clean.match(/^¿Estás seguro de que deseas enviar a (.+) a la Lista Negra\?$/i);
  if (m) {
    if (lang === 'en') return `Are you sure you want to send ${m[1]} to the Blacklist?`;
    if (lang === 'pt') return `Tem certeza de que deseja enviar ${m[1]} para a Lista Restrita?`;
    return `Voulez-vous vraiment envoyer ${m[1]} sur la Liste Noire ?`;
  }

  m = clean.match(
    /^¿Estás seguro de que deseas eliminar a (.+)\? Se guardará en la Papelera de Clientes durante 30 días\.$/i
  );
  if (m) {
    if (lang === 'en') return `Are you sure you want to delete ${m[1]}? They will be stored in Trash for 30 days.`;
    if (lang === 'pt') return `Tem certeza de que deseja excluir ${m[1]}? Será mantido na Lixeira por 30 dias.`;
    return `Voulez-vous vraiment supprimer ${m[1]} ? Il sera conservé dans la Corbeille pendant 30 jours.`;
  }

  // Etiquetas dinámicas del Panel Administrativo (/admin)
  m = clean.match(/^([IVX]+)\s*·\s*(Mando|Prestamistas|Depuración|Auditoría|Centro de Mando|Depuración y Operaciones|Gobernanza y Auditoría)$/i);
  if (m) {
    const labelTrans = EXACT_TEXT_MAP[m[2]]?.[lang] || LOWER_EXACT_TEXT_MAP[m[2].toLowerCase()]?.[lang] || m[2];
    return `${m[1]} · ${labelTrans}`;
  }

  m = clean.match(/^Activos:\s*(\d+)$/i);
  if (m) {
    if (lang === 'en') return `Active: ${m[1]}`;
    if (lang === 'pt') return `Ativos: ${m[1]}`;
    return `Actifs : ${m[1]}`;
  }

  m = clean.match(/^Suspendidos:\s*(\d+)$/i);
  if (m) {
    if (lang === 'en') return `Suspended: ${m[1]}`;
    if (lang === 'pt') return `Suspensos: ${m[1]}`;
    return `Suspendus : ${m[1]}`;
  }

  m = clean.match(/^Inactivos:\s*(\d+)$/i);
  if (m) {
    if (lang === 'en') return `Inactive: ${m[1]}`;
    if (lang === 'pt') return `Inativos: ${m[1]}`;
    return `Inactifs : ${m[1]}`;
  }

  m = clean.match(/^Alta registrada:\s*(.+)$/i);
  if (m) {
    if (lang === 'en') return `Registered on: ${m[1]}`;
    if (lang === 'pt') return `Cadastrado em: ${m[1]}`;
    return `Enregistré le : ${m[1]}`;
  }

  m = clean.match(/^Saldo sin pagar:\s*(.+)$/i);
  if (m) {
    if (lang === 'en') return `Unpaid balance: ${m[1]}`;
    if (lang === 'pt') return `Saldo não pago: ${m[1]}`;
    return `Solde impayé : ${m[1]}`;
  }

  m = clean.match(/^(\d+)\s+clientes?\s*·\s*(\d+)\s+préstamos?$/i);
  if (m) {
    if (lang === 'en') return `${m[1]} clients · ${m[2]} loans`;
    if (lang === 'pt') return `${m[1]} clientes · ${m[2]} empréstimos`;
    return `${m[1]} clients · ${m[2]} prêts`;
  }

  // Etiquetas de mes corto en gráficos (ej: "15 nov", "2 dic")
  m = clean.match(/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|set|sep|oct|nov|dic)$/i);
  if (m) {
    const shortM = MONTHS_SHORT_I18N[m[2].toLowerCase()]?.[lang] || m[2];
    return `${m[1]} ${shortM}`;
  }

  return rawText;
}

const I18N_ATTRS = ['placeholder', 'title', 'aria-label'];

function translateStringPreservingWhitespace(baseEsText, lang) {
  const leading = baseEsText.match(/^\s*/)?.[0] || '';
  const trailing = baseEsText.match(/\s*$/)?.[0] || '';
  const translated = translateDynamicString(baseEsText, lang);
  return `${leading}${translated}${trailing}`;
}

function applyLanguageToNode(node, lang) {
  if (!node || node.nodeType !== 3) return;
  const parent = node.parentElement;
  if (!parent || SKIP_DOM_TAGS.has(parent.tagName)) return;
  if (parent.closest && parent.closest('[data-no-i18n="true"]')) return;

  const raw = node.nodeValue || '';
  if (!raw.trim()) return;

  if (node.__aureusBaseEsText === undefined || raw !== node.__aureusLastWritten) {
    node.__aureusBaseEsText = raw;
    node.__aureusLastWritten = undefined;
  }

  const baseEs = node.__aureusBaseEsText;
  if (lang === 'es') {
    if (node.__aureusLastWritten !== undefined && raw !== baseEs) {
      node.nodeValue = baseEs;
    }
    node.__aureusLastWritten = undefined;
    return;
  }

  const nextText = translateStringPreservingWhitespace(baseEs, lang);
  if (nextText !== baseEs && nextText !== raw) {
    node.nodeValue = nextText;
    node.__aureusLastWritten = nextText;
  }
}

function applyLanguageToAttributes(el, lang) {
  if (!el || el.nodeType !== 1 || SKIP_DOM_TAGS.has(el.tagName)) return;
  if (el.closest && el.closest('[data-no-i18n="true"]')) return;

  for (let i = 0; i < I18N_ATTRS.length; i += 1) {
    const attr = I18N_ATTRS[i];
    if (!el.hasAttribute(attr)) continue;
    const raw = el.getAttribute(attr) || '';
    if (!raw.trim()) continue;

    if (!el.__aureusBaseAttrs) el.__aureusBaseAttrs = Object.create(null);
    if (!el.__aureusLastAttrs) el.__aureusLastAttrs = Object.create(null);

    if (el.__aureusBaseAttrs[attr] === undefined || raw !== el.__aureusLastAttrs[attr]) {
      el.__aureusBaseAttrs[attr] = raw;
      el.__aureusLastAttrs[attr] = undefined;
    }

    const baseEs = el.__aureusBaseAttrs[attr];
    if (lang === 'es') {
      if (el.__aureusLastAttrs[attr] !== undefined && raw !== baseEs) {
        el.setAttribute(attr, baseEs);
      }
      el.__aureusLastAttrs[attr] = undefined;
      continue;
    }

    const nextVal = translateDynamicString(baseEs, lang);
    if (nextVal !== baseEs && nextVal !== raw) {
      el.setAttribute(attr, nextVal);
      el.__aureusLastAttrs[attr] = nextVal;
    }
  }
}

function applyLanguageToDOM(root, lang) {
  if (typeof document === 'undefined' || !document.body) return;
  const targetRoot = root || document.body;

  if (targetRoot.nodeType === 3) {
    applyLanguageToNode(targetRoot, lang);
    return;
  }

  if (targetRoot.nodeType === 1) {
    applyLanguageToAttributes(targetRoot, lang);
  }

  const textWalker = document.createTreeWalker(targetRoot, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();
  while (textNode) {
    applyLanguageToNode(textNode, lang);
    textNode = textWalker.nextNode();
  }

  if (targetRoot.querySelectorAll) {
    const attrEls = targetRoot.querySelectorAll('[placeholder], [title], [aria-label]');
    for (let i = 0; i < attrEls.length; i += 1) {
      applyLanguageToAttributes(attrEls[i], lang);
    }
  }
}

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
  // Todos los Hooks al inicio del componente proveedor
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
  const activeLanguageRef = useRef(language);
  const isMutatingLangRef = useRef(false);

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
      if (isMutatingLangRef.current) return;

      let hasAddedNodes = false;
      for (let i = 0; i < mutations.length; i += 1) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
          hasAddedNodes = true;
          break;
        }
      }
      if (hasAddedNodes) {
        scheduleScale();
      }

      if (activeLanguageRef.current !== 'es') {
        isMutatingLangRef.current = true;
        try {
          for (let i = 0; i < mutations.length; i += 1) {
            const mut = mutations[i];
            if (mut.type === 'childList') {
              for (let j = 0; j < mut.addedNodes.length; j += 1) {
                applyLanguageToDOM(mut.addedNodes[j], activeLanguageRef.current);
              }
            } else if (mut.type === 'characterData') {
              applyLanguageToNode(mut.target, activeLanguageRef.current);
            } else if (mut.type === 'attributes') {
              applyLanguageToAttributes(mut.target, activeLanguageRef.current);
            }
          }
        } finally {
          isMutatingLangRef.current = false;
        }
      }
    });

    const themeObserver = new MutationObserver(() => {
      scheduleScale();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: I18N_ATTRS,
    });
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
    activeLanguageRef.current = language;
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', language);

    isMutatingLangRef.current = true;
    try {
      applyLanguageToDOM(document.body, language);
    } finally {
      isMutatingLangRef.current = false;
    }

    const rafId = requestAnimationFrame(() => {
      isMutatingLangRef.current = true;
      try {
        applyLanguageToDOM(document.body, language);
      } finally {
        isMutatingLangRef.current = false;
      }
      applyFontScaleToDOM(activeScaleRef.current);
    });

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignorar restricciones de almacenamiento privado
    }

    return () => cancelAnimationFrame(rafId);
  }, [language]);

  useEffect(() => {
    applyFontScaleToDOM(activeScaleRef.current);
  }, [colorblindMode]);

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

  const translateText = useCallback(
    (text) => translateDynamicString(text, language),
    [language]
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
      translateText,
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
      translateText,
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
