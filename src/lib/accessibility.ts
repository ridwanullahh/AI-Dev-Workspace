// Accessibility utilities and helpers

export class AccessibilityManager {
  private focusTrap: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  // Trap focus within a container (for modals, dialogs)
  trapFocus(container: HTMLElement) {
    this.focusTrap = container;
    this.focusableElements = this.getFocusableElements(container);

    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    container.addEventListener('keydown', this.handleKeyDown);
  }

  releaseFocus() {
    if (this.focusTrap) {
      this.focusTrap.removeEventListener('keydown', this.handleKeyDown);
      this.focusTrap = null;
      this.focusableElements = [];
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    return Array.from(container.querySelectorAll(selectors.join(',')));
  }

  // Announce to screen readers
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcer = document.getElementById('a11y-announcer') || this.createAnnouncer();
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }

  private createAnnouncer(): HTMLElement {
    const announcer = document.createElement('div');
    announcer.id = 'a11y-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);
    return announcer;
  }

  // Skip to main content
  setupSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.position = 'absolute';
    skipLink.style.top = '-40px';
    skipLink.style.left = '0';
    skipLink.style.background = '#000';
    skipLink.style.color = '#fff';
    skipLink.style.padding = '8px';
    skipLink.style.textDecoration = 'none';
    skipLink.style.zIndex = '100';

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  // Check color contrast
  checkContrast(foreground: string, background: string): {
    ratio: number;
    passes: { aa: boolean; aaa: boolean };
  } {
    const fg = this.parseColor(foreground);
    const bg = this.parseColor(background);

    const ratio = this.getContrastRatio(fg, bg);

    return {
      ratio,
      passes: {
        aa: ratio >= 4.5,
        aaa: ratio >= 7
      }
    };
  }

  private parseColor(color: string): { r: number; g: number; b: number } {
    // Simple hex color parsing
    const hex = color.replace('#', '');
    return {
      r: parseInt(hex.substr(0, 2), 16) / 255,
      g: parseInt(hex.substr(2, 2), 16) / 255,
      b: parseInt(hex.substr(4, 2), 16) / 255
    };
  }

  private getContrastRatio(
    fg: { r: number; g: number; b: number },
    bg: { r: number; g: number; b: number }
  ): number {
    const l1 = this.getLuminance(fg);
    const l2 = this.getLuminance(bg);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private getLuminance(color: { r: number; g: number; b: number }): number {
    const { r, g, b } = color;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // Keyboard navigation helpers
  setupKeyboardShortcuts(shortcuts: Record<string, () => void>) {
    document.addEventListener('keydown', (event) => {
      const key = this.getShortcutKey(event);
      const handler = shortcuts[key];
      
      if (handler) {
        event.preventDefault();
        handler();
      }
    });
  }

  private getShortcutKey(event: KeyboardEvent): string {
    const parts = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    parts.push(event.key);
    
    return parts.join('+');
  }

  // ARIA label helpers
  setAriaLabel(element: HTMLElement, label: string) {
    element.setAttribute('aria-label', label);
  }

  setAriaDescribedBy(element: HTMLElement, descriptionId: string) {
    element.setAttribute('aria-describedby', descriptionId);
  }

  setAriaExpanded(element: HTMLElement, expanded: boolean) {
    element.setAttribute('aria-expanded', expanded.toString());
  }

  // Focus management
  saveFocus(): HTMLElement | null {
    return document.activeElement as HTMLElement;
  }

  restoreFocus(element: HTMLElement | null) {
    if (element && element.focus) {
      element.focus();
    }
  }
}

export const a11y = new AccessibilityManager();

// React hook for accessibility
export function useAccessibility() {
  const announce = (message: string, priority?: 'polite' | 'assertive') => {
    a11y.announce(message, priority);
  };

  const trapFocus = (element: HTMLElement) => {
    a11y.trapFocus(element);
    return () => a11y.releaseFocus();
  };

  return {
    announce,
    trapFocus,
    setupSkipLink: () => a11y.setupSkipLink(),
    checkContrast: (fg: string, bg: string) => a11y.checkContrast(fg, bg)
  };
}
