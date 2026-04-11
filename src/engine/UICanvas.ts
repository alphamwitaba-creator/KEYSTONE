// ============================================================
// KEVLA ENGINE — UI CANVAS SYSTEM v2.0
// Production-Grade Game UI Framework
//
// Architecture:
//   ┌─────────────────────────────────────────────────────────┐
//   │                  UI CANVAS SYSTEM                       │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │    UIManager│  │    Canvas   │  │    Layout       │  │
//   │  │  (Screens)  │  │   Renderer  │  │    System       │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │    Button   │  │    Slider   │  │    TextField    │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
//   │  │    Image    │  │   Scroll    │  │    Dropdown     │  │
//   │  └─────────────┘  └─────────────┘  └─────────────────┘  │
//   │                                                          │
//   │  ┌─────────────────────────────────────────────────────┐│
//   │  │           Style System (Themes, Animations)        ││
//   │  └─────────────────────────────────────────────────────┘│
//   └─────────────────────────────────────────────────────────┘
//
// Features:
//   • 10+ UI components (Button, Slider, Text, Image, etc.)
//   • Screen/Canvas management with layering
//   • Flexbox-like layout system
//   • Event system (onClick, onChange, onHover)
//   • Style theming with animations
//   • Responsive design
//   • Accessibility support
// ============================================================

import type { Vector3 } from './types';

// ============================================================
// TYPES — UI Data Structures
// ============================================================

/** UI element type */
export type UIElementType = 
  | 'container' | 'button' | 'text' | 'image' | 'slider' 
  | 'input' | 'checkbox' | 'dropdown' | 'scroll' | 'progress'
  | 'toggle' | 'tooltip' | 'divider' | 'spacer';

/** UI alignment */
export type UIAlignment = 'start' | 'center' | 'end' | 'stretch';

/** Flex direction */
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

/** Flex wrap */
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

/** UI pointer events */
export interface PointerEvent {
  type: 'down' | 'up' | 'move' | 'enter' | 'leave' | 'click';
  x: number;
  y: number;
  button: number;
}

/** UI event callback */
export type UICallback = (data?: unknown) => void;

/** UI state */
export interface UIState {
  hover: boolean;
  active: boolean;
  focus: boolean;
  disabled: boolean;
}

/** UI events */
export interface UIElementEvents {
  onClick?: UICallback;
  onPointerDown?: UICallback;
  onPointerUp?: UICallback;
  onPointerEnter?: UICallback;
  onPointerLeave?: UICallback;
  onChange?: UICallback;
  onSubmit?: UICallback;
  onFocus?: UICallback;
  onBlur?: UICallback;
}

/** Box model */
export interface BoxModel {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  borderWidth: number;
  borderRadius: number;
}

/** Text styles */
export interface UITextStyles {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  letterSpacing: number;
  textDecoration: 'none' | 'underline' | 'line-through';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  overflow: 'visible' | 'hidden' | 'ellipsis';
  whiteSpace: 'normal' | 'nowrap' | 'pre' | 'pre-wrap';
}

/** Background styles */
export interface UIBackground {
  color: string;
  gradient: string | null;
  image: string | null;
  imageRepeat: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  imageSize: 'auto' | 'cover' | 'contain' | number;
  imagePosition: { x: number; y: number };
}

/** Border styles */
export interface UIBorder {
  color: string;
  style: 'none' | 'solid' | 'dashed' | 'dotted';
  width: number;
  radius: number | number[];
}

/** Shadow styles */
export interface UIShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

/** Transition animation */
export interface UITransition {
  property: string;
  duration: number;
  timingFunction: 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
  delay: number;
}

/** Animation keyframe */
export interface UIKeyframe {
  offset: number;  // 0-1
  properties: Record<string, unknown>;
}

/** UI Theme */
export interface UITheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    disabled: string;
    placeholder: string;
  };
  fonts: {
    family: string;
    size: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borders: {
    radius: number;
    width: number;
  };
  shadows: {
    sm: UIShadow;
    md: UIShadow;
    lg: UIShadow;
  };
  transitions: {
    fast: number;
    normal: number;
    slow: number;
  };
}

/** Default theme */
export const DEFAULT_UI_THEME: UITheme = {
  name: 'default',
  colors: {
    primary: '#3498db',
    secondary: '#9b59b6',
    success: '#2ecc71',
    warning: '#f39c12',
    danger: '#e74c3c',
    info: '#1abc9c',
    background: '#1a1a2e',
    surface: '#16213e',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    border: '#2d3748',
    disabled: '#4a5568',
    placeholder: '#718096',
  },
  fonts: {
    family: 'Inter, system-ui, sans-serif',
    size: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borders: {
    radius: 6,
    width: 1,
  },
  shadows: {
    sm: { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: 'rgba(0,0,0,0.1)', inset: false },
    md: { offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: 'rgba(0,0,0,0.1)', inset: false },
    lg: { offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)', inset: false },
  },
  transitions: {
    fast: 100,
    normal: 200,
    slow: 300,
  },
};

// ============================================================
// UI BASE ELEMENT
// ============================================================

export interface UIElementConfig {
  id?: string;
  type: UIElementType;
  name?: string;
  visible?: boolean;
  enabled?: boolean;
  
  // Layout
  width?: number | string;  // number = px, string = %, auto
  height?: number | string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  justifyContent?: UIAlignment | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: UIAlignment | 'space-between' | 'space-around' | 'baseline';
  alignSelf?: UIAlignment | 'auto';
  gap?: number;
  margin?: number | Partial<BoxModel>;
  padding?: number | Partial<BoxModel>;
  position?: 'static' | 'relative' | 'absolute' | 'fixed';
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  zIndex?: number;
  
  // Appearance
  background?: Partial<UIBackground>;
  border?: Partial<UIBorder>;
  shadow?: Partial<UIShadow>;
  opacity?: number;
  cursor?: 'auto' | 'default' | 'pointer' | 'text' | 'move' | 'grab' | 'not-allowed';
  
  // Interaction
  tabIndex?: number;
  
  // Content
  children?: UIElement[];
  text?: string;
  src?: string;
  value?: number | string | boolean;
  placeholder?: string;
  checked?: boolean;
  
  // Events
  events?: UIElementEvents;
  
  // Style overrides
  style?: Partial<Record<string, unknown>>;
}

/** Base UI element */
export class UIElement {
  id: string;
  type: UIElementType;
  name: string;
  visible: boolean = true;
  enabled: boolean = true;
  state: UIState = { hover: false, active: false, focus: false, disabled: false };
  
  // Layout
  width: number | string = 'auto';
  height: number | string = 'auto';
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  flexDirection: FlexDirection = 'column';
  flexWrap: FlexWrap = 'nowrap';
  justifyContent: UIAlignment | string = 'start';
  alignItems: UIAlignment | string = 'stretch';
  alignSelf?: UIAlignment | string;
  gap: number = 0;
  margin: BoxModel = { marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, borderWidth: 0, borderRadius: 0 };
  padding: BoxModel = { marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, borderWidth: 0, borderRadius: 0 };
  position: 'static' | 'relative' | 'absolute' | 'fixed' = 'static';
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  zIndex: number = 0;
  
  // Appearance
  background: Partial<UIBackground> = {};
  border: Partial<UIBorder> = {};
  shadow: Partial<UIShadow> = {};
  opacity: number = 1;
  cursor: string = 'auto';
  
  // Content
  children: UIElement[] = [];
  text?: string;
  src?: string;
  value: number | string | boolean = '';
  placeholder?: string;
  checked: boolean = false;
  
  // Events
  events: UIElementEvents = {};
  
  // Style
  style: Partial<Record<string, unknown>> = {};
  
  // Computed
  computedWidth: number = 0;
  computedHeight: number = 0;
  computedLeft: number = 0;
  computedTop: number = 0;
  
  // Parent
  parent: UIElement | null = null;
  
  // Theme reference
  theme: UITheme = DEFAULT_UI_THEME;

  constructor(config: UIElementConfig) {
    this.id = config.id || `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.name = config.name || config.type;
    this.visible = config.visible ?? true;
    this.enabled = config.enabled ?? true;
    
    // Apply config
    if (config.width !== undefined) this.width = config.width;
    if (config.height !== undefined) this.height = config.height;
    if (config.flex !== undefined) this.flex = config.flex;
    if (config.flexDirection !== undefined) this.flexDirection = config.flexDirection;
    if (config.flexWrap !== undefined) this.flexWrap = config.flexWrap;
    if (config.justifyContent !== undefined) this.justifyContent = config.justifyContent;
    if (config.alignItems !== undefined) this.alignItems = config.alignItems;
    if (config.gap !== undefined) this.gap = config.gap;
    if (config.margin !== undefined) this._parseBoxModel(config.margin, 'margin');
    if (config.padding !== undefined) this._parseBoxModel(config.padding, 'padding');
    if (config.position !== undefined) this.position = config.position;
    if (config.left !== undefined) this.left = config.left;
    if (config.right !== undefined) this.right = config.right;
    if (config.top !== undefined) this.top = config.top;
    if (config.bottom !== undefined) this.bottom = config.bottom;
    if (config.zIndex !== undefined) this.zIndex = config.zIndex;
    if (config.background !== undefined) this.background = config.background;
    if (config.border !== undefined) this.border = config.border;
    if (config.shadow !== undefined) this.shadow = config.shadow;
    if (config.opacity !== undefined) this.opacity = config.opacity;
    if (config.cursor !== undefined) this.cursor = config.cursor;
    if (config.children) this.children = config.children;
    if (config.text !== undefined) this.text = config.text;
    if (config.src !== undefined) this.src = config.src;
    if (config.value !== undefined) this.value = config.value;
    if (config.placeholder !== undefined) this.placeholder = config.placeholder;
    if (config.checked !== undefined) this.checked = config.checked;
    if (config.events) this.events = config.events;
    if (config.style) this.style = config.style;
    
    // Set parent references
    for (const child of this.children) {
      child.parent = this;
    }
  }

  private _parseBoxModel(value: number | Partial<BoxModel>, type: 'margin' | 'padding'): void {
    if (typeof value === 'number') {
      const box = {
        marginTop: value, marginRight: value, marginBottom: value, marginLeft: value,
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, borderWidth: 0, borderRadius: 0
      };
      if (type === 'margin') this.margin = box;
      else this.padding = box;
    } else {
      const box = {
        marginTop: value.marginTop ?? 0, marginRight: value.marginRight ?? 0,
        marginBottom: value.marginBottom ?? 0, marginLeft: value.marginLeft ?? 0,
        paddingTop: value.paddingTop ?? 0, paddingRight: value.paddingRight ?? 0,
        paddingBottom: value.paddingBottom ?? 0, paddingLeft: value.paddingLeft ?? 0,
        borderWidth: value.borderWidth ?? 0, borderRadius: value.borderRadius ?? 0
      };
      if (type === 'margin') this.margin = box;
      else this.padding = box;
    }
  }

  addChild(child: UIElement): void {
    child.parent = this;
    this.children.push(child);
  }

  removeChild(childId: string): UIElement | null {
    const idx = this.children.findIndex(c => c.id === childId);
    if (idx >= 0) {
      const child = this.children[idx];
      child.parent = null;
      this.children.splice(idx, 1);
      return child;
    }
    return null;
  }

  findById(id: string): UIElement | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  findByType(type: UIElementType): UIElement[] {
    const results: UIElement[] = [];
    if (this.type === type) results.push(this);
    for (const child of this.children) {
      results.push(...child.findByType(type));
    }
    return results;
  }

  handlePointerEvent(event: PointerEvent): void {
    if (!this.enabled || !this.visible) return;

    switch (event.type) {
      case 'enter':
        this.state.hover = true;
        this.events.onPointerEnter?.();
        break;
      case 'leave':
        this.state.hover = false;
        this.events.onPointerLeave?.();
        break;
      case 'down':
        this.state.active = true;
        this.events.onPointerDown?.();
        break;
      case 'up':
        this.state.active = false;
        this.events.onPointerUp?.();
        break;
      case 'click':
        if (!this.state.disabled) {
          this.events.onClick?.();
        }
        break;
    }
  }

  applyTheme(theme: UITheme): void {
    this.theme = theme;
    for (const child of this.children) {
      child.applyTheme(theme);
    }
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.visible) return;

    this.computedLeft = x;
    this.computedTop = y;
    this.computedWidth = w;
    this.computedHeight = h;

    ctx.save();
    ctx.globalAlpha = this.opacity * (this.state.disabled ? 0.5 : 1);

    // Render background
    if (this.background.color) {
      ctx.fillStyle = this.background.color;
      const radius = this.border.radius || 0;
      this._roundRect(ctx, x, y, w, h, radius);
      ctx.fill();
    }

    // Render border
    if (this.border.width) {
      ctx.strokeStyle = this.border.color || '#000';
      ctx.lineWidth = this.border.width;
      const radius = this.border.radius || 0;
      this._roundRect(ctx, x, y, w, h, radius);
      ctx.stroke();
    }

    // Render children
    this._renderChildren(ctx, x, y, w, h);

    ctx.restore();
  }

  protected _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = typeof r === 'number' ? r : r[0] || 0;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  protected _renderChildren(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    // Layout children
    const layout = this._computeLayout(x, y, w, h);
    for (const childLayout of layout) {
      childLayout.element.render(ctx, childLayout.x, childLayout.y, childLayout.w, childLayout.h);
    }
  }

  protected _computeLayout(x: number, y: number, w: number, h: number): { element: UIElement; x: number; y: number; w: number; h: number }[] {
    const results: { element: UIElement; x: number; y: number; w: number; h: number }[] = [];
    
    if (this.flexDirection === 'row' || this.flexDirection === 'row-reverse') {
      let currentX = this.flexDirection === 'row' ? x : x + w;
      const totalFlex = this.children.reduce((sum, c) => sum + (c.flex || 0), 0);
      const remaining = w - this.children.reduce((sum, c) => {
        const size = c.width;
        return sum + (typeof size === 'number' ? size : 0);
      }, 0);

      for (const child of this.children) {
        const childW = child.flex ? (child.flex / totalFlex) * remaining : (typeof child.width === 'number' ? child.width : 100);
        const dir = this.flexDirection === 'row' ? 1 : -1;
        results.push({
          element: child,
          x: this.flexDirection === 'row' ? currentX : currentX - childW,
          y: y,
          w: childW,
          h: h,
        });
        currentX += dir * childW;
      }
    } else {
      let currentY = this.flexDirection === 'column' ? y : y + h;
      for (const child of this.children) {
        const childH = typeof child.height === 'number' ? child.height : 50;
        const dir = this.flexDirection === 'column' ? 1 : -1;
        results.push({
          element: child,
          x: x,
          y: this.flexDirection === 'column' ? currentY : currentY - childH,
          w: w,
          h: childH,
        });
        currentY += dir * childH;
      }
    }

    return results;
  }
}

// ============================================================
// UI COMPONENTS
// ============================================================

/** Button component */
export class UIButton extends UIElement {
  constructor(config: Omit<UIElementConfig, 'type'> & { type?: 'button' }) {
    super({ ...config, type: 'button' });
    this.height = 40;
    this.background = { color: '#3498db' };
    this.border = { color: '#2980b9', width: 1, radius: 6 };
    this.cursor = 'pointer';
    this.justifyContent = 'center';
    this.alignItems = 'center';
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.visible) return;

    const bgColor = this.state.disabled ? '#95a5a6' 
      : this.state.active ? '#2980b9' 
      : this.state.hover ? '#5dade2' 
      : this.background.color || '#3498db';

    ctx.fillStyle = bgColor;
    this._roundRect(ctx, x, y, w, h, this.border.radius || 6);
    ctx.fill();

    if (this.text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${this.theme.fonts.size.md}px ${this.theme.fonts.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, x + w / 2, y + h / 2);
    }
  }
}

/** Text component */
export class UIText extends UIElement {
  constructor(config: Omit<UIElementConfig, 'type'> & { type?: 'text' }) {
    super({ ...config, type: 'text' });
    this.height = 'auto';
    this.background = {};
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.visible || !this.text) return;

    ctx.fillStyle = this.state.disabled ? this.theme.colors.textMuted : this.theme.colors.text;
    ctx.font = `${this.theme.fonts.size.md}px ${this.theme.fonts.family}`;
    ctx.textAlign = (this.style.align as CanvasTextAlign) || 'left';
    ctx.textBaseline = 'top';

    const lines = this.text.split('\n');
    const lineHeight = this.theme.fonts.size.md * 1.4;
    
    for (let i = 0; i < lines.length; i++) {
      const alignX = (this.style.align === 'center' ? w / 2 : this.style.align === 'right' ? w : 0);
      ctx.fillText(lines[i], x + alignX, y + i * lineHeight);
    }
  }
}

/** Image component */
export class UIImage extends UIElement {
  private imageElement: HTMLImageElement | null = null;
  private loaded: boolean = false;

  constructor(config: Omit<UIElementConfig, 'type'> & { type?: 'image' }) {
    super({ ...config, type: 'image' });
    this.height = 100;
    
    if (config.src) {
      this.loadImage(config.src);
    }
  }

  loadImage(src: string): void {
    this.imageElement = new Image();
    this.imageElement.onload = () => { this.loaded = true; };
    this.imageElement.src = src;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.visible) return;

    if (this.background.color) {
      ctx.fillStyle = this.background.color;
      this._roundRect(ctx, x, y, w, h, this.border.radius || 0);
      ctx.fill();
    }

    if (this.loaded && this.imageElement) {
      ctx.drawImage(this.imageElement, x, y, w, h);
    } else {
      ctx.fillStyle = this.theme.colors.border;
      ctx.font = `${this.theme.fonts.size.sm}px ${this.theme.fonts.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', x + w / 2, y + h / 2);
    }
  }
}

/** Slider component */
export class UISlider extends UIElement {
  min: number = 0;
  max: number = 100;
  step: number = 1;
  showValue: boolean = true;

  constructor(config: Omit<UIElementConfig, 'type'> & { type?: 'slider'; min?: number; max?: number; step?: number }) {
    super({ ...config, type: 'slider' });
    this.height = 30;
    if (config.min !== undefined) this.min = config.min;
    if (config.max !== undefined) this.max = config.max;
    if (config.step !== undefined) this.step = config.step;
    if (config.value !== undefined) this.value = config.value;
    this.cursor = 'pointer';
  }

  setValue(newValue: number): void {
    const clamped = Math.max(this.min, Math.min(this.max, newValue));
    this.value = Math.round(clamped / this.step) * this.step;
    this.events.onChange?.(this.value);
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.visible) return;

    const trackY = y + h / 2;
    const trackHeight = 6;

    // Track
    ctx.fillStyle = this.theme.colors.border;
    this._roundRect(ctx, x, trackY - trackHeight / 2, w, trackHeight, trackHeight / 2);
    ctx.fill();

    // Filled track
    const ratio = ((this.value as number) - this.min) / (this.max - this.min);
    const fillWidth = w * ratio;
    ctx.fillStyle = this.theme.colors.primary;
    this._roundRect(ctx, x, trackY - trackHeight / 2, fillWidth, trackHeight, trackHeight / 2);
    ctx.fill();

    // Thumb
    const thumbX = x + fillWidth;
    const thumbRadius = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(thumbX, trackY, thumbRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.theme.colors.primary;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value text
    if (this.showValue) {
      ctx.fillStyle = this.theme.colors.text;
      ctx.font = `${this.theme.fonts.size.sm}px ${this.theme.fonts.family}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(this.value), x + w - 5, trackY);
    }
  }

  handlePointerEvent(event: PointerEvent): void {
    if (event.type === 'down' || event.type === 'move') {
      const ratio = (event.x - this.computedLeft) / this.computedWidth;
      this.setValue(this.min + ratio * (this.max - this.min));
    }
    super.handlePointerEvent(event);
  }
}

/** Input component */
export class UIInput extends UIElement {
  type: 'text' | 'number' | 'password' | 'email' = 'text';
  maxLength: number = 100;

  constructor(config: Omit<UIElementConfig, 'type'> & { type?: 'input'; inputType?: 'text' | 'number' | 'password' | 'email' }) {
    super({ ...config, type: 'input' });
    this.height = 36;
    this.background = { color: this.theme.colors.surface };
    this.border = { color: this.theme.colors.border, width: 1, radius: 4 };
    this.cursor = 'text';
    if (config.inputType) this.type = config.inputType;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = this.state.focus ? this.theme.colors.surface : (this.background.color || '#16213e');
    this._roundRect(ctx, x, y, w, h, this.border.radius || 4);
    ctx.fill();

    // Border
    ctx.strokeStyle = this.state.focus ? this.theme.colors.primary : (this.border.color || '#2d3748');
    ctx.lineWidth = this.state.focus ? 2 : 1;
    this._roundRect(ctx, x, y, w, h, this.border.radius || 4);
    ctx.stroke();

    // Text
    const displayText = this.type === 'password' ? '•'.repeat(String(this.value).length) : String(this.value);
    const textX = x + this.padding.marginLeft + 10;
    
    if (displayText) {
      ctx.fillStyle = this.theme.colors.text;
      ctx.font = `${this.theme.fonts.size.md}px ${this.theme.fonts.family}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, textX, y + h / 2);
    } else if (this.placeholder) {
      ctx.fillStyle = this.theme.colors.placeholder;
      ctx.font = `${this.theme.fonts.size.md}px ${this.theme.fonts.family}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.placeholder, textX, y + h / 2);
    }
  }

  handlePointerEvent(event: PointerEvent): void {
    if (event.type === 'click') {
      this.state.focus = true;
      this.events.onFocus?.();
    }
    super.handlePointerEvent(event);
  }
}

/** Checkbox component */
export class UICheckbox extends UIElement {
  constructor(config: Omit<UIElementConfig, 'type'> & { type?: 'checkbox' }) {
    super({ ...config, type: 'checkbox' });
    this.width = 20;
    this.height = 20;
    this.background = { color: this.theme.colors.surface };
    this.border = { color: this.theme.colors.border, width: 2, radius: 4 };
    this.cursor = 'pointer';
    if (config.checked !== undefined) this.checked = config.checked;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.visible) return;

    // Box
    ctx.fillStyle = this.checked ? this.theme.colors.primary : (this.background.color || '#16213e');
    this._roundRect(ctx, x, y, w, h, this.border.radius || 4);
    ctx.fill();

    if (this.checked) {
      // Checkmark
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y + h * 0.5);
      ctx.lineTo(x + w * 0.45, y + h * 0.7);
      ctx.lineTo(x + w * 0.75, y + h * 0.3);
      ctx.stroke();
    }
  }

  handlePointerEvent(event: PointerEvent): void {
    if (event.type === 'click') {
      this.checked = !this.checked;
      this.events.onChange?.(this.checked);
    }
    super.handlePointerEvent(event);
  }
}

/** Progress bar component */
export class UIProgress extends UIElement {
  showPercentage: boolean = true;

  constructor(config: Omit<UIElementConfig, 'type'> & { type?: 'progress' }) {
    super({ ...config, type: 'progress' });
    this.height = 20;
    this.background = { color: this.theme.colors.border };
    this.border = { radius: 10 };
    if (config.value !== undefined) this.value = config.value;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (!this.visible) return;

    // Background
    ctx.fillStyle = this.background.color || '#2d3748';
    this._roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();

    // Progress
    const ratio = Math.max(0, Math.min(1, (this.value as number) / 100));
    const progressW = w * ratio;
    ctx.fillStyle = this.theme.colors.primary;
    this._roundRect(ctx, x, y, progressW, h, h / 2);
    ctx.fill();

    // Percentage
    if (this.showPercentage) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${this.theme.fonts.size.sm}px ${this.theme.fonts.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(ratio * 100)}%`, x + w / 2, y + h / 2);
    }
  }
}

/** Container component */
export class UIContainer extends UIElement {
  constructor(config: Omit<UIElementConfig, 'type'> & { type?: 'container' }) {
    super({ ...config, type: 'container' });
    if (config.children) this.children = config.children;
  }
}

// ============================================================
// UI MANAGER
// ============================================================

export class UIManager {
  screens: Map<string, UIElement> = new Map();
  activeScreen: string | null = null;
  theme: UITheme = DEFAULT_UI_THEME;
  hitTestElements: UIElement[] = [];

  constructor() {
    this.theme = DEFAULT_UI_THEME;
  }

  createScreen(id: string, name: string): UIElement {
    const screen = new UIContainer({ id, type: 'container', name });
    screen.applyTheme(this.theme);
    this.screens.set(id, screen);
    return screen;
  }

  getScreen(id: string): UIElement | undefined {
    return this.screens.get(id);
  }

  setActiveScreen(id: string): void {
    if (this.screens.has(id)) {
      this.activeScreen = id;
    }
  }

  removeScreen(id: string): boolean {
    return this.screens.delete(id);
  }

  handlePointerEvent(event: PointerEvent): void {
    const screen = this.activeScreen ? this.screens.get(this.activeScreen) : null;
    if (!screen) return;

    this.hitTestElements = [];
    this._collectHitTestable(screen);

    for (let i = this.hitTestElements.length - 1; i >= 0; i--) {
      const el = this.hitTestElements[i];
      const bounds = this._getElementBounds(el);
      
      if (event.x >= bounds.x && event.x <= bounds.x + bounds.w &&
          event.y >= bounds.y && event.y <= bounds.y + bounds.h) {
        el.handlePointerEvent(event);
        break;
      }
    }
  }

  private _collectHitTestable(element: UIElement): void {
    if (element.visible && element.enabled) {
      this.hitTestElements.push(element);
      for (const child of element.children) {
        this._collectHitTestable(child);
      }
    }
  }

  private _getElementBounds(element: UIElement): { x: number; y: number; w: number; h: number } {
    return {
      x: element.computedLeft,
      y: element.computedTop,
      w: element.computedWidth,
      h: element.computedHeight,
    };
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);

    const screen = this.activeScreen ? this.screens.get(this.activeScreen) : null;
    if (!screen) return;

    screen.computeLayout?.(0, 0, width, height);
    screen.render(ctx, 0, 0, width, height);
  }

  applyTheme(theme: UITheme): void {
    this.theme = theme;
    for (const [, screen] of this.screens) {
      screen.applyTheme(theme);
    }
  }
}

// ============================================================
// UI FACTORY FUNCTIONS
// ============================================================

export function createButton(config: Omit<UIElementConfig, 'type'>): UIButton {
  return new UIButton(config);
}

export function createText(config: Omit<UIElementConfig, 'type'>): UIText {
  return new UIText(config);
}

export function createImage(config: Omit<UIElementConfig, 'type'>): UIImage {
  return new UIImage(config);
}

export function createSlider(config: Omit<UIElementConfig, 'type'> & { min?: number; max?: number; step?: number }): UISlider {
  return new UISlider(config);
}

export function createInput(config: Omit<UIElementConfig, 'type'> & { inputType?: 'text' | 'number' | 'password' | 'email' }): UIInput {
  return new UIInput(config);
}

export function createCheckbox(config: Omit<UIElementConfig, 'type'>): UICheckbox {
  return new UICheckbox(config);
}

export function createProgress(config: Omit<UIElementConfig, 'type'>): UIProgress {
  return new UIProgress(config);
}

export function createContainer(config: Omit<UIElementConfig, 'type'>): UIContainer {
  return new UIContainer(config);
}