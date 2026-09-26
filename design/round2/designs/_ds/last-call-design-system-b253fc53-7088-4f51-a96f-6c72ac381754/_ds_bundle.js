/* @ds-bundle: {"format":4,"namespace":"LastCallDesignSystem_b253fc","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"NavPair","sourcePath":"components/actions/NavPair.jsx"},{"name":"ListRow","sourcePath":"components/data/ListRow.jsx"},{"name":"StatTile","sourcePath":"components/data/StatTile.jsx"},{"name":"Timer","sourcePath":"components/data/Timer.jsx"},{"name":"BottomSheet","sourcePath":"components/feedback/BottomSheet.jsx"},{"name":"WarningBanner","sourcePath":"components/feedback/WarningBanner.jsx"},{"name":"Chip","sourcePath":"components/inputs/Chip.jsx"},{"name":"Field","sourcePath":"components/inputs/Field.jsx"},{"name":"Icon","sourcePath":"components/media/Icon.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"a0225778e3f1","components/actions/NavPair.jsx":"b2814be27484","components/data/ListRow.jsx":"7c2be41160b9","components/data/StatTile.jsx":"557dc9859ea0","components/data/Timer.jsx":"021e7ed7b3be","components/feedback/BottomSheet.jsx":"24a1ec007204","components/feedback/WarningBanner.jsx":"633b3063b2e5","components/inputs/Chip.jsx":"cb90d7f01a92","components/inputs/Field.jsx":"a546de86ae95","components/media/Icon.jsx":"9c80f13e6d9c","ui_kits/android-app/App.jsx":"523640e53ba9","ui_kits/android-app/HistoryScreens.jsx":"f274891abb1d","ui_kits/android-app/MapScreens.jsx":"4c85add8970b","ui_kits/android-app/SessionScreens.jsx":"39f631c16c0e","ui_kits/android-app/ShareScreens.jsx":"134c87dd89d2","ui_kits/android-app/Shell.jsx":"1ad077e1eb86","ui_kits/android-app/data.js":"58c84f66c550"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LastCallDesignSystem_b253fc = window.LastCallDesignSystem_b253fc || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 'var(--tap)',
  padding: '0 18px',
  borderRadius: 'var(--r-tile)',
  font: 'var(--type-button)',
  letterSpacing: 'var(--tr-button)',
  textTransform: 'uppercase',
  border: '1px solid transparent',
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'transform var(--dur-press) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out)'
};
const VARIANTS = {
  primary: {
    background: 'var(--mint)',
    color: 'var(--mint-ink)',
    boxShadow: 'var(--glow-mint)'
  },
  secondary: {
    background: 'transparent',
    color: 'var(--text)',
    borderColor: 'var(--line)'
  },
  pink: {
    background: 'transparent',
    color: 'var(--pink)',
    borderColor: 'var(--pink)'
  }
};
const SIZES = {
  md: {
    minHeight: 'var(--tap)'
  },
  lg: {
    minHeight: 'var(--tap-lg)',
    padding: '0 24px'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  icon,
  children,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    style: {
      ...BASE,
      ...VARIANTS[variant],
      ...SIZES[size],
      width: full ? '100%' : undefined,
      opacity: disabled ? 0.38 : 1,
      pointerEvents: disabled ? 'none' : undefined,
      transform: pressed ? 'scale(var(--press-scale))' : 'scale(1)',
      ...style
    }
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/NavPair.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Two secondary buttons pinned to the screen foot, respecting the safe-area inset. */
function NavPair({
  items = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, 1fr)`,
      gap: 'var(--gap-tight)',
      paddingBottom: 'var(--safe-bottom)',
      ...style
    }
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement(NavButton, _extends({
    key: i
  }, it))));
}
function NavButton({
  label,
  onClick
}) {
  const [pressed, setPressed] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    style: {
      minHeight: 'var(--tap)',
      borderRadius: 'var(--r-tile)',
      border: '1px solid var(--line)',
      background: 'transparent',
      color: 'var(--text)',
      font: 'var(--type-button)',
      letterSpacing: 'var(--tr-button)',
      textTransform: 'uppercase',
      transform: pressed ? 'scale(var(--press-scale))' : 'scale(1)',
      transition: 'transform var(--dur-press) var(--ease-out)'
    }
  }, label);
}
Object.assign(__ds_scope, { NavPair });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/NavPair.jsx", error: String((e && e.message) || e) }); }

// components/data/ListRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** History row: bold date on the left, tabular metrics on the right. */
function ListRow({
  date,
  metrics = [],
  onClick,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      width: '100%',
      minHeight: 'var(--tap)',
      padding: '11px 12px',
      textAlign: 'left',
      background: 'var(--surface)',
      borderRadius: 'var(--r-chip)',
      transform: pressed ? 'scale(var(--press-scale))' : 'scale(1)',
      transition: 'transform var(--dur-press) var(--ease-out)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text)'
    }
  }, date), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 14,
      fontVariantNumeric: 'tabular-nums'
    }
  }, metrics.map((m, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      font: 'var(--type-caption)',
      color: m.tone === 'drinks' ? 'var(--pink)' : 'var(--muted-up)'
    }
  }, m.value))));
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/data/StatTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface tile: uppercase key over a tabular value. Unavailable stats are hidden, never zeroed. */
function StatTile({
  label,
  value,
  unit,
  tone = 'default',
  unavailable = false,
  style,
  ...rest
}) {
  if (unavailable) return null;
  const valueColor = tone === 'drinks' ? 'var(--pink)' : tone === 'hydration' ? 'var(--amber)' : 'var(--text)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface)',
      borderRadius: 'var(--r-tile)',
      padding: 'var(--pad-tile)',
      display: 'grid',
      gap: 6,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      letterSpacing: 'var(--tr-label)',
      textTransform: 'uppercase',
      color: 'var(--faint)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-stat)',
      letterSpacing: 'var(--tr-stat)',
      color: valueColor,
      fontVariantNumeric: 'tabular-nums',
      display: 'flex',
      alignItems: 'baseline',
      gap: 3
    }
  }, value, unit && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--muted-up)',
      letterSpacing: 0
    }
  }, unit)));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/data/Timer.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function fmt(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600),
    m = Math.floor(t % 3600 / 60),
    s = t % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Elapsed session clock, derived from startedAt and ticking every second while running. */
function Timer({
  startedAt,
  endedAt,
  running = true,
  style,
  ...rest
}) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!running || endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running, endedAt]);
  const start = startedAt instanceof Date ? startedAt.getTime() : startedAt;
  const end = endedAt ? endedAt instanceof Date ? endedAt.getTime() : endedAt : now;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      font: 'var(--type-timer)',
      letterSpacing: 'var(--tr-timer)',
      fontVariantNumeric: 'tabular-nums',
      color: endedAt ? 'var(--muted-up)' : 'var(--text)',
      display: 'block',
      ...style
    }
  }, rest), fmt(end - start));
}
Object.assign(__ds_scope, { Timer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Timer.jsx", error: String((e && e.message) || e) }); }

// components/feedback/BottomSheet.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Bottom sheet: scrim, #0D0D0D panel, 16px top corners only, drag handle. */
function BottomSheet({
  open = false,
  title,
  onDismiss,
  children,
  footer,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: open ? 'auto' : 'none',
      zIndex: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onDismiss,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim)',
      opacity: open ? 1 : 0,
      transition: 'opacity var(--dur-sheet) var(--ease-sheet)'
    }
  }), /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--surface-2)',
      borderTopLeftRadius: 'var(--r-sheet)',
      borderTopRightRadius: 'var(--r-sheet)',
      boxShadow: 'var(--shadow-sheet)',
      padding: 'var(--pad-sheet)',
      paddingBottom: `calc(20px + var(--safe-bottom))`,
      transform: open ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform var(--dur-sheet) var(--ease-sheet)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 4,
      borderRadius: 'var(--r-pill)',
      background: 'var(--line)',
      margin: '0 auto 14px'
    }
  }), title && /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: 'var(--tr-title)',
      margin: '0 0 14px'
    }
  }, title), children, footer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--gap-loose)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { BottomSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/BottomSheet.jsx", error: String((e && e.message) || e) }); }

// components/feedback/WarningBanner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Amber-bordered banner. Renders only when hydration is actually behind. Always dismissible. */
function WarningBanner({
  heading,
  body,
  actions,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      border: '1px solid var(--amber)',
      borderRadius: 'var(--r-tile)',
      padding: '12px 12px 11px',
      background: 'rgba(239,159,39,.06)',
      display: 'grid',
      gap: 8,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--amber)'
    }
  }, heading), body && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--muted-up)',
      margin: 0
    }
  }, body), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--gap-tight)',
      marginTop: 2
    }
  }, actions));
}
Object.assign(__ds_scope, { WarningBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/WarningBanner.jsx", error: String((e && e.message) || e) }); }

// components/inputs/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Drink preset chip. Selected reads as mint border and mint text — never a mint fill. */
function Chip({
  selected = false,
  onClick,
  children,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    "aria-pressed": selected,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      minHeight: 'var(--tap)',
      padding: '0 14px',
      borderRadius: 'var(--r-chip)',
      fontSize: 12,
      whiteSpace: 'nowrap',
      border: `1px solid ${selected ? 'var(--mint)' : 'var(--line)'}`,
      color: selected ? 'var(--mint)' : 'var(--text)',
      background: 'transparent',
      transform: pressed ? 'scale(var(--press-scale))' : 'scale(1)',
      transition: 'transform var(--dur-press) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/Chip.jsx", error: String((e && e.message) || e) }); }

// components/inputs/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Underline-only text field with an uppercase label above. Focus turns the underline mint. */
function Field({
  label,
  value,
  placeholder,
  onChange,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'grid',
      gap: 7,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      letterSpacing: 'var(--tr-label)',
      textTransform: 'uppercase',
      color: 'var(--faint)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      minHeight: 'var(--tap)',
      border: 0,
      borderBottom: `1px solid ${focused ? 'var(--mint)' : 'var(--line)'}`,
      background: 'transparent',
      color: 'var(--text)',
      fontSize: 'var(--fs-body)',
      outline: 'none',
      padding: '0 0 6px',
      borderRadius: 0,
      transition: 'border-color var(--dur-fast) var(--ease-out)'
    }
  }, rest)), /*#__PURE__*/React.createElement("style", null, `input::placeholder{color:var(--placeholder)}`));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/Field.jsx", error: String((e && e.message) || e) }); }

// components/media/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Lucide glyph, tinted with currentColor via CSS mask. Loaded from the lucide-static CDN. */
function Icon({
  name,
  size = 18,
  color = 'currentColor',
  strokeWidth,
  style,
  ...rest
}) {
  const url = `https://unpkg.com/lucide-static@0.428.0/icons/${name}.svg`;
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    "data-icon": name,
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      flex: '0 0 auto',
      background: color,
      WebkitMaskImage: `url(${url})`,
      maskImage: `url(${url})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/media/Icon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/android-app/App.jsx
try { (() => {
// Click-through flow across the app's thirteen screens.
function App() {
  const [screen, setScreen] = React.useState('start');
  const [sheet, setSheet] = React.useState(null);
  const [startedAt, setStartedAt] = React.useState(() => Date.now() - 18724000);
  const [endedAt, setEndedAt] = React.useState(null);
  const [drinks, setDrinks] = React.useState(5);
  const [water, setWater] = React.useState(2);
  const [nudge, setNudge] = React.useState(true);
  const [night, setNight] = React.useState(window.LC_NIGHTS[0]);
  const go = s => {
    setSheet(null);
    setScreen(s);
  };
  const screens = {
    permission: /*#__PURE__*/React.createElement(PermissionScreen, {
      onAllow: () => go('start'),
      onSkip: () => go('start')
    }),
    start: /*#__PURE__*/React.createElement(StartScreen, {
      onStart: () => {
        setStartedAt(Date.now() - 18724000);
        setEndedAt(null);
        go('live');
      }
    }),
    live: /*#__PURE__*/React.createElement(LiveScreen, {
      startedAt: startedAt,
      drinks: drinks,
      water: water,
      nudge: nudge,
      onDismissNudge: () => setNudge(false),
      onAddDrink: () => setSheet('drink'),
      onHydrate: () => {
        setWater(w => w + 1);
        setNudge(false);
      },
      onMap: () => go('map'),
      onEnd: () => setSheet('end')
    }),
    map: /*#__PURE__*/React.createElement(MapScreen, {
      drinks: drinks,
      onPin: () => setSheet('pin'),
      onBack: () => go('live')
    }),
    recap: /*#__PURE__*/React.createElement(RecapScreen, {
      startedAt: startedAt,
      endedAt: endedAt || Date.now(),
      drinks: drinks,
      onMakeCard: () => go('builder'),
      onSave: () => go('history')
    }),
    builder: /*#__PURE__*/React.createElement(CardBuilderScreen, {
      drinks: drinks,
      onShare: () => go('share'),
      onBack: () => go('recap')
    }),
    share: /*#__PURE__*/React.createElement(ShareScreen, {
      drinks: drinks,
      onDone: () => go('history'),
      onBack: () => go('builder')
    }),
    history: /*#__PURE__*/React.createElement(HistoryScreen, {
      onBack: () => go('start'),
      onOpenNight: n => {
        setNight(n);
        go('detail');
      }
    }),
    detail: /*#__PURE__*/React.createElement(NightDetailScreen, {
      night: night,
      onBack: () => go('history'),
      onMakeCard: () => go('builder')
    })
  };
  const sheets = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DrinkSheet, {
    open: sheet === 'drink',
    onDismiss: () => setSheet(null),
    onAdd: () => {
      setDrinks(d => d + 1);
      setSheet(null);
    }
  }), /*#__PURE__*/React.createElement(DropPinSheet, {
    open: sheet === 'pin',
    onDismiss: () => setSheet(null),
    onSave: () => setSheet(null)
  }), /*#__PURE__*/React.createElement(EndSheet, {
    open: sheet === 'end',
    elapsed: "5 hours 12 minutes",
    onDismiss: () => setSheet(null),
    onConfirm: () => {
      setEndedAt(Date.now());
      go('recap');
    }
  }));
  const jump = [['permission', 'Priming'], ['start', 'Start'], ['live', 'Live'], ['map', 'Map'], ['recap', 'Recap'], ['builder', 'Card'], ['share', 'Share'], ['history', 'History']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      padding: '28px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, screens[screen], /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 44,
      overflow: 'hidden',
      pointerEvents: sheet ? 'auto' : 'none'
    }
  }, sheets)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      justifyContent: 'center',
      maxWidth: 420
    }
  }, jump.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => go(k),
    style: {
      padding: '7px 11px',
      borderRadius: 999,
      border: `1px solid ${screen === k ? 'var(--mint)' : 'var(--line)'}`,
      color: screen === k ? 'var(--mint)' : 'var(--muted)',
      font: 'var(--type-caption)',
      background: 'transparent'
    }
  }, l))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/android-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/android-app/HistoryScreens.jsx
try { (() => {
const {
  Button,
  ListRow,
  StatTile,
  Icon
} = window.LastCallDesignSystem_b253fc;

// 11 · History — stats header, eight-week bar chart, night list, export.
function HistoryScreen({
  onOpenNight,
  onBack
}) {
  const max = Math.max(...window.LC_WEEKS);
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(ScreenHead, {
    eyebrow: "History",
    title: "Eight weeks",
    right: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onBack,
      style: {
        padding: '0 12px'
      }
    }, "Back")
  }), /*#__PURE__*/React.createElement(TileGrid, null, /*#__PURE__*/React.createElement(StatTile, {
    label: "Nights out",
    value: "12"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Drinks",
    value: "48",
    tone: "drinks"
  })), /*#__PURE__*/React.createElement(GlassCard, {
    style: {
      marginTop: 'var(--gap)',
      padding: '14px 12px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 6,
      height: 92
    }
  }, window.LC_WEEKS.map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: 'grid',
      gap: 6,
      justifyItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: Math.max(3, v / max * 76),
      borderRadius: 4,
      background: v === 0 ? 'var(--line)' : 'var(--mint)',
      opacity: v === 0 ? 1 : .55 + v / max * .45
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      fontSize: 10,
      color: 'var(--faint)'
    }
  }, i + 1))))), /*#__PURE__*/React.createElement("span", {
    className: "lc-label",
    style: {
      margin: 'var(--gap-loose) 0 8px',
      display: 'block'
    }
  }, "Nights"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 6,
      overflow: 'hidden'
    }
  }, window.LC_NIGHTS.map(n => /*#__PURE__*/React.createElement(ListRow, {
    key: n.date,
    date: n.date,
    onClick: () => onOpenNight(n),
    metrics: [{
      value: n.drinks,
      tone: 'drinks'
    }, {
      value: n.time
    }, {
      value: n.dist
    }]
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    full: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "download",
      size: 15
    })
  }, "Export history"));
}

// 12 · Night detail — that night's map, stats and timeline.
function NightDetailScreen({
  night,
  onBack,
  onMakeCard
}) {
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(ScreenHead, {
    eyebrow: night.date,
    title: `${night.time} out`,
    right: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onBack,
      style: {
        padding: '0 12px'
      }
    }, "Back")
  }), /*#__PURE__*/React.createElement(GlassCard, {
    style: {
      padding: 10,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Route, {
    w: 250,
    h: 196,
    showHead: false,
    stroke: 2.5
  })), /*#__PURE__*/React.createElement(TileGrid, null, /*#__PURE__*/React.createElement(StatTile, {
    label: "Drinks",
    value: night.drinks.split(' ')[0],
    tone: "drinks",
    style: {
      marginTop: 'var(--gap)'
    }
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Distance",
    value: night.dist.replace(' km', ''),
    unit: "km",
    style: {
      marginTop: 'var(--gap)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "lc-label",
    style: {
      margin: 'var(--gap-loose) 0 8px',
      display: 'block'
    }
  }, "Timeline"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 10
    }
  }, window.LC_STOPS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.name,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 14,
    color: "var(--pink)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      fontWeight: 700
    }
  }, s.name), /*#__PURE__*/React.createElement("span", {
    className: "lc-num",
    style: {
      font: 'var(--type-caption)',
      color: 'var(--faint)',
      marginLeft: 'auto'
    }
  }, s.time)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    full: true,
    onClick: onMakeCard
  }, "Make a card"));
}

// 13 · Permission priming — Android only, shown before the system prompt.
function PermissionScreen({
  onAllow,
  onSkip
}) {
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 30,
    color: "var(--mint)"
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      letterSpacing: 'var(--tr-display)',
      margin: '18px 0 12px'
    }
  }, "Your phone will be in your pocket"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--muted-up)',
      margin: '0 0 14px'
    }
  }, "Android opens its settings screen for this one \u2014 pick \u201CAllow all the time\u201D, then come back."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--mint-dim)',
      margin: 0
    }
  }, "Your location never leaves the phone.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--gap-tight)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    full: true,
    onClick: onAllow
  }, "Open settings"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    full: true,
    onClick: onSkip
  }, "Skip \u2014 track without the map")));
}
Object.assign(window, {
  HistoryScreen,
  NightDetailScreen,
  PermissionScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/android-app/HistoryScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/android-app/MapScreens.jsx
try { (() => {
const {
  Button,
  StatTile,
  NavPair,
  Icon,
  Timer
} = window.LastCallDesignSystem_b253fc;

// The route drawing used on the map screen, recap and share card.
// Position is white, route is mint, named stops are pink.
function Route({
  w = 340,
  h = 360,
  points = window.LC_ROUTE,
  stops = window.LC_STOPS,
  showStops = true,
  showHead = true,
  showLabels = false,
  stroke = 3
}) {
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const head = points[points.length - 1];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 340 360",
    width: w,
    height: h,
    style: {
      display: 'block',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: d,
    fill: "none",
    stroke: "var(--mint)",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: ".92"
  }), showStops && stops.map((s, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("circle", {
    cx: s.at[0],
    cy: s.at[1],
    r: "6.5",
    fill: "var(--pink)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: s.at[0],
    cy: s.at[1],
    r: "12",
    fill: "none",
    stroke: "var(--pink)",
    strokeWidth: "1",
    opacity: ".35"
  }), showLabels && /*#__PURE__*/React.createElement("text", {
    x: s.at[0] + 18,
    y: s.at[1] + 4,
    fill: "var(--pink)",
    fontSize: "13",
    fontWeight: "700",
    fontFamily: "var(--font-sans)"
  }, s.name))), showHead && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: head[0],
    cy: head[1],
    r: "16",
    fill: "rgba(255,255,255,.10)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: head[0],
    cy: head[1],
    r: "5.5",
    fill: "#fff"
  })));
}

// 04 · Map — live position, route, named stops, stats strip, drop pin.
function MapScreen({
  drinks,
  onPin,
  onBack
}) {
  return /*#__PURE__*/React.createElement(Shell, {
    tracking: true,
    bloom: "foot"
  }, /*#__PURE__*/React.createElement(ScreenHead, {
    title: "Tonight",
    right: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onBack,
      style: {
        minWidth: 44,
        padding: '0 12px'
      },
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "chevron-left",
        size: 16
      })
    }, "Back")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minHeight: 0,
      borderRadius: 'var(--r-tile)',
      overflow: 'hidden',
      background: 'linear-gradient(180deg,#06120D 0%,#020604 100%)',
      border: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--bloom-mint)',
      opacity: .5
    }
  }), /*#__PURE__*/React.createElement(MapGrid, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Route, {
    w: 300,
    h: 318,
    showLabels: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: '28px 10px 10px',
      background: 'var(--protect-bottom)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement(Strip, {
    label: "Stops",
    value: "3"
  }), /*#__PURE__*/React.createElement(Strip, {
    label: "Drinks",
    value: String(drinks),
    tone: "var(--pink)"
  }), /*#__PURE__*/React.createElement(Strip, {
    label: "Distance",
    value: "4.1 km"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 8,
      top: 8,
      font: 'var(--type-caption)',
      fontSize: 10,
      color: 'var(--faint)'
    }
  }, "Offline tiles")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    full: true,
    size: "lg",
    style: {
      marginTop: 'var(--gap)'
    },
    onClick: onPin,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "map-pin",
      size: 16,
      color: "var(--mint-ink)"
    })
  }, "Drop pin"));
}
function Strip({
  label,
  value,
  tone = 'var(--text)'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lc-label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "lc-num",
    style: {
      font: 'var(--type-stat)',
      letterSpacing: 'var(--tr-stat)',
      color: tone
    }
  }, value));
}
function MapGrid() {
  return /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "100%",
    style: {
      position: 'absolute',
      inset: 0,
      opacity: .5
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: "lcgrid",
    width: "46",
    height: "46",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M46 0H0V46",
    fill: "none",
    stroke: "rgba(126,224,192,.09)",
    strokeWidth: "1"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "100%",
    height: "100%",
    fill: "url(#lcgrid)"
  }));
}

// 08 · Recap — stats and route the moment a night ends.
function RecapScreen({
  startedAt,
  endedAt,
  drinks,
  onMakeCard,
  onSave
}) {
  return /*#__PURE__*/React.createElement(Shell, {
    bloom: "hero"
  }, /*#__PURE__*/React.createElement(ScreenHead, {
    eyebrow: "Last night",
    title: "That was a night."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      margin: '2px 0 var(--gap)'
    }
  }, /*#__PURE__*/React.createElement(Timer, {
    startedAt: startedAt,
    endedAt: endedAt
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--faint)'
    }
  }, "9:12 pm \u2014 2:24 am")), /*#__PURE__*/React.createElement(GlassCard, {
    style: {
      padding: 10,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Route, {
    w: 280,
    h: 230,
    showHead: false,
    stroke: 2.5
  })), /*#__PURE__*/React.createElement(TileGrid, null, /*#__PURE__*/React.createElement(StatTile, {
    label: "Drinks",
    value: drinks,
    tone: "drinks",
    style: {
      marginTop: 'var(--gap)'
    }
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Water",
    value: "2",
    style: {
      marginTop: 'var(--gap)'
    }
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Steps",
    value: "6,412"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Stops",
    value: "3"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--gap-tight)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    full: true,
    onClick: onMakeCard
  }, "Make a card"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    full: true,
    onClick: onSave
  }, "Just save it")));
}
Object.assign(window, {
  Route,
  MapScreen,
  RecapScreen,
  MapGrid,
  Strip
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/android-app/MapScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/android-app/SessionScreens.jsx
try { (() => {
const {
  Button,
  Timer,
  StatTile,
  Chip,
  Field,
  BottomSheet,
  WarningBanner,
  NavPair,
  Icon
} = window.LastCallDesignSystem_b253fc;

// 01 · Start — no login, no email gate. One button.
function StartScreen({
  onStart
}) {
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      paddingBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lc-label",
    style: {
      color: 'var(--mint-dim)'
    }
  }, "Last Call"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-display)',
      letterSpacing: 'var(--tr-display)',
      margin: '10px 0 12px'
    }
  }, "Track the night.", /*#__PURE__*/React.createElement("br", null), "Piece it together later."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--muted-up)',
      margin: '0 0 22px',
      maxWidth: 300
    }
  }, "Steps, stops, drinks and water \u2014 kept on this phone, nowhere else."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    full: true,
    onClick: onStart
  }, "Start night")));
}

// 02 · Live session — home for the night.
function LiveScreen({
  startedAt,
  drinks,
  water,
  onAddDrink,
  onHydrate,
  onMap,
  onEnd,
  nudge,
  onDismissNudge
}) {
  return /*#__PURE__*/React.createElement(Shell, {
    tracking: true
  }, /*#__PURE__*/React.createElement(ScreenHead, {
    eyebrow: "On the night"
  }), /*#__PURE__*/React.createElement(Timer, {
    startedAt: startedAt
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--faint)',
      display: 'block',
      margin: '4px 0 var(--gap)'
    }
  }, "Started 9:12 pm"), /*#__PURE__*/React.createElement(TileGrid, null, /*#__PURE__*/React.createElement(StatTile, {
    label: "Drinks",
    value: drinks,
    tone: "drinks"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Water",
    value: water
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Steps",
    value: "6,412"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "Distance",
    value: "4.1",
    unit: "km"
  })), nudge && /*#__PURE__*/React.createElement(WarningBanner, {
    style: {
      marginTop: 'var(--gap)'
    },
    heading: "Five drinks since your last water.",
    body: "Takes ten seconds. Tomorrow says thanks.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "pink",
      onClick: onHydrate
    }, "Hydrate"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onDismissNudge
    }, "Later"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--gap-tight)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    full: true,
    onClick: onAddDrink,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16,
      color: "var(--mint-ink)"
    })
  }, "Add drink"), /*#__PURE__*/React.createElement(Button, {
    variant: "pink",
    full: true,
    onClick: onHydrate,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "droplet",
      size: 15,
      color: "var(--pink)"
    })
  }, "Hydrate"), /*#__PURE__*/React.createElement(NavPair, {
    items: [{
      label: 'Map',
      onClick: onMap
    }, {
      label: 'End night',
      onClick: onEnd
    }]
  })));
}

// 03 · Pick your poison — recents float to the top.
const PRESETS = ['Pint', 'Wine', 'Spirit + mixer', 'Shot', 'Cider', 'Cocktail', 'Low/no'];
function DrinkSheet({
  open,
  onDismiss,
  onAdd
}) {
  const [pick, setPick] = React.useState('Pint');
  const [custom, setCustom] = React.useState('');
  return /*#__PURE__*/React.createElement(BottomSheet, {
    open: open,
    title: "What are you having?",
    onDismiss: onDismiss,
    footer: /*#__PURE__*/React.createElement(Button, {
      full: true,
      onClick: () => onAdd(custom || pick)
    }, "Add drink")
  }, /*#__PURE__*/React.createElement("span", {
    className: "lc-label"
  }, "Recent"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--gap-tight)',
      margin: '8px 0 14px'
    }
  }, PRESETS.slice(0, 3).map(p => /*#__PURE__*/React.createElement(Chip, {
    key: p,
    selected: pick === p,
    onClick: () => {
      setPick(p);
      setCustom('');
    }
  }, p))), /*#__PURE__*/React.createElement("span", {
    className: "lc-label"
  }, "All"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--gap-tight)',
      margin: '8px 0 14px'
    }
  }, PRESETS.slice(3).map(p => /*#__PURE__*/React.createElement(Chip, {
    key: p,
    selected: pick === p,
    onClick: () => {
      setPick(p);
      setCustom('');
    }
  }, p))), /*#__PURE__*/React.createElement(Field, {
    label: "Something else",
    placeholder: "Negroni",
    value: custom,
    onChange: setCustom
  }));
}

// 05 · Drop pin
function DropPinSheet({
  open,
  onDismiss,
  onSave
}) {
  const [name, setName] = React.useState('');
  const [note, setNote] = React.useState('');
  return /*#__PURE__*/React.createElement(BottomSheet, {
    open: open,
    title: "Name this stop",
    onDismiss: onDismiss,
    footer: /*#__PURE__*/React.createElement(Button, {
      full: true,
      onClick: () => onSave(name || 'Unnamed stop')
    }, "Drop pin")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--gap-loose)'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name this stop",
    placeholder: "The Grapes",
    value: name,
    onChange: setName
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Anything worth remembering",
    placeholder: "Met Tom outside",
    value: note,
    onChange: setNote
  })));
}

// 07 · End night — the one destructive action, tapped at 2am.
function EndSheet({
  open,
  onDismiss,
  onConfirm,
  elapsed
}) {
  return /*#__PURE__*/React.createElement(BottomSheet, {
    open: open,
    title: "Call it a night?",
    onDismiss: onDismiss,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--gap-tight)'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      full: true,
      onClick: onConfirm
    }, "End night"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      full: true,
      onClick: onDismiss
    }, "Keep tracking"))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--muted-up)',
      margin: 0
    }
  }, "You've been out ", elapsed, ". This stops tracking and builds your recap. You can't reopen a session once it's closed."));
}
Object.assign(window, {
  StartScreen,
  LiveScreen,
  DrinkSheet,
  DropPinSheet,
  EndSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/android-app/SessionScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/android-app/ShareScreens.jsx
try { (() => {
const {
  Button,
  Chip,
  Icon
} = window.LastCallDesignSystem_b253fc;

// The share card is drawn on a canvas, never screenshotted from the DOM —
// compositing a live map would taint the canvas and make export throw.
// Everything here has to be drawable with the Canvas 2D API.
function drawCard(cv, {
  ratio = 'feed',
  show = {},
  stats,
  photo = false
}) {
  const W = 1080,
    H = ratio === 'feed' ? 1350 : 1920;
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  const M = 64;
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  if (photo) {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0A2419');
    g.addColorStop(.55, '#17553B');
    g.addColorStop(1, '#030A07');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,.34)';
    c.fillRect(0, 0, W, H);
  } else {
    const g = c.createRadialGradient(W / 2, H * .08, 0, W / 2, H * .08, W * 1.05);
    g.addColorStop(0, 'rgba(33,118,79,.62)');
    g.addColorStop(.45, 'rgba(10,36,25,.42)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  const sans = '-apple-system, system-ui, Roboto, sans-serif';

  // Route is fitted into the band above the text block, never over it.
  const blockH = 64 + (show.wordmark !== false ? 74 : 0) + (show.place !== false ? 78 : 0) + (show.stats !== false ? 150 : 0) + (show.elapsed !== false ? 110 : 0);
  if (show.route !== false) {
    const pts = window.LC_ROUTE;
    const top = H * 0.10,
      bandH = H - blockH - 48 - top;
    const s = Math.min((W - M * 2) / 340, bandH / 360);
    c.save();
    c.translate(W / 2 - 340 * s / 2, top + (bandH - 360 * s) / 2);
    c.scale(s, s);
    c.strokeStyle = '#7EE0C0';
    c.lineWidth = 11 / s;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.stroke();
    if (show.stops !== false) {
      c.fillStyle = '#F06C9B';
      window.LC_STOPS.forEach(st => {
        c.beginPath();
        c.arc(st.at[0], st.at[1], 17 / s, 0, 7);
        c.fill();
      });
    }
    c.restore();
  }
  let y = H - M;

  // Mode B locks the numbers to a solid footer — the most legible option over a busy image.
  if (photo) {
    c.fillStyle = 'rgba(0,0,0,.88)';
    c.fillRect(0, H - blockH - 8, W, blockH + 8);
  }
  if (show.wordmark !== false) {
    c.fillStyle = '#7EE0C0';
    c.font = `700 40px ${sans}`;
    c.textBaseline = 'alphabetic';
    c.fillText('Last Call', M, y);
    y -= 74;
  }
  if (show.place !== false) {
    c.fillStyle = '#8A8A8A';
    c.font = `400 30px ${sans}`;
    c.fillText('Sat 2 August · Deansgate', M, y);
    y -= 78;
  }
  if (show.stats !== false) {
    const cols = stats.length;
    const cw = (W - M * 2) / cols;
    stats.forEach((s, i) => {
      const x = M + i * cw;
      c.fillStyle = '#4D4D4D';
      c.font = `600 22px ${sans}`;
      c.fillText(s.label.toUpperCase(), x, y - 54);
      c.fillStyle = s.tone === 'drinks' ? '#F06C9B' : '#FFFFFF';
      c.font = `700 62px ${sans}`;
      c.fillText(s.value, x, y);
    });
    y -= 150;
  }
  if (show.elapsed !== false) {
    c.fillStyle = '#FFFFFF';
    c.font = `700 96px ${sans}`;
    c.fillText('5:12:04', M, y);
  }
}

// 09 · Card builder — preset / your photo, live canvas, element toggles.
function CardBuilderScreen({
  drinks,
  onShare,
  onBack
}) {
  const ref = React.useRef(null);
  const [mode, setMode] = React.useState('preset');
  const [show, setShow] = React.useState({
    route: true,
    stats: true,
    elapsed: true,
    place: true,
    stops: true,
    wordmark: true
  });
  const stats = [{
    label: 'Drinks',
    value: String(drinks),
    tone: 'drinks'
  }, {
    label: 'Stops',
    value: '3'
  }, {
    label: 'Steps',
    value: '6.4k'
  }, {
    label: 'Km',
    value: '4.1'
  }];
  React.useEffect(() => {
    if (ref.current) drawCard(ref.current, {
      ratio: 'feed',
      show,
      stats,
      photo: mode === 'photo'
    });
  }, [show, mode, drinks]);
  const toggle = k => setShow(s => ({
    ...s,
    [k]: !s[k]
  }));
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(ScreenHead, {
    title: "Your card",
    right: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onBack,
      style: {
        padding: '0 12px'
      }
    }, "Back")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--gap-tight)',
      marginBottom: 'var(--gap)'
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    selected: mode === 'preset',
    onClick: () => setMode('preset')
  }, "Preset"), /*#__PURE__*/React.createElement(Chip, {
    selected: mode === 'photo',
    onClick: () => setMode('photo')
  }, "Your photo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: ref,
    style: {
      width: 226,
      height: 282,
      borderRadius: 'var(--r-tile)',
      border: '1px solid var(--line)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "lc-label",
    style: {
      margin: 'var(--gap) 0 8px',
      display: 'block'
    }
  }, "Elements"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--gap-tight)'
    }
  }, [['route', 'Route'], ['stats', 'Stats'], ['elapsed', 'Time'], ['place', 'Date + place'], ['stops', 'Stops']].map(([k, l]) => /*#__PURE__*/React.createElement(Chip, {
    key: k,
    selected: show[k],
    onClick: () => toggle(k)
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    full: true,
    onClick: onShare
  }, "Next"));
}

// 10 · Share — feed 4:5 or story 9:16, native share sheet, save to photos.
function ShareScreen({
  drinks,
  onDone,
  onBack
}) {
  const ref = React.useRef(null);
  const [ratio, setRatio] = React.useState('feed');
  const stats = [{
    label: 'Drinks',
    value: String(drinks),
    tone: 'drinks'
  }, {
    label: 'Stops',
    value: '3'
  }, {
    label: 'Steps',
    value: '6.4k'
  }, {
    label: 'Km',
    value: '4.1'
  }];
  React.useEffect(() => {
    if (ref.current) drawCard(ref.current, {
      ratio,
      show: {},
      stats
    });
  }, [ratio, drinks]);
  const w = ratio === 'feed' ? 210 : 178;
  const h = ratio === 'feed' ? 262 : 316;
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(ScreenHead, {
    title: "Share",
    right: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onBack,
      style: {
        padding: '0 12px'
      }
    }, "Back")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--gap-tight)',
      marginBottom: 'var(--gap)'
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    selected: ratio === 'feed',
    onClick: () => setRatio('feed')
  }, "Feed 4:5"), /*#__PURE__*/React.createElement(Chip, {
    selected: ratio === 'story',
    onClick: () => setRatio('story')
  }, "Story 9:16")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: ref,
    style: {
      width: w,
      height: h,
      borderRadius: 'var(--r-tile)',
      boxShadow: 'var(--shadow-float)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--gap-tight)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    full: true,
    onClick: onDone,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "share-2",
      size: 15,
      color: "var(--mint-ink)"
    })
  }, "Share"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    full: true,
    onClick: onDone,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "download",
      size: 15
    })
  }, "Save to photos")));
}
Object.assign(window, {
  drawCard,
  CardBuilderScreen,
  ShareScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/android-app/ShareScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/android-app/Shell.jsx
try { (() => {
const {
  Button,
  NavPair,
  StatTile,
  Timer,
  ListRow,
  Chip,
  Field,
  BottomSheet,
  WarningBanner,
  Icon
} = window.LastCallDesignSystem_b253fc;

// Phone shell: black ground, forest bloom, grain, Android status bar + the
// permanent foreground-service notification that cannot be hidden while tracking.
function Shell({
  children,
  tracking = false,
  bloom = 'hero'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 'var(--screen-w)',
      height: 'var(--screen-h)',
      background: 'var(--bg)',
      borderRadius: 44,
      overflow: 'hidden',
      boxShadow: '0 0 0 10px #0b0f0d, 0 0 0 11px #1d2a24, 0 40px 90px rgba(0,0,0,.8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: bloom === 'foot' ? 'var(--bloom-foot)' : 'var(--bloom-hero)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-grain"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(StatusBar, null), tracking && /*#__PURE__*/React.createElement(ServiceNotification, null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--pad-screen-y) var(--pad-screen-x)'
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 108,
      height: 4,
      borderRadius: 999,
      background: '#2A2A2A'
    }
  }))));
}
function StatusBar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto',
      height: 30,
      padding: '0 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      font: 'var(--type-caption)',
      fontWeight: 600,
      color: 'var(--text)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lc-num"
  }, "1:42"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 5,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signal",
    size: 13
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "wifi",
    size: 13
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "battery-medium",
    size: 16
  })));
}

// Android forces this while tracking. Design around it, don't fight it.
function ServiceNotification() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto',
      margin: '0 10px 4px',
      padding: '7px 10px',
      borderRadius: 'var(--r-chip)',
      background: 'rgba(20,20,20,.72)',
      backdropFilter: 'blur(var(--blur-chrome))',
      border: '1px solid var(--line)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "circle-dot",
    size: 13,
    color: "var(--mint)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--muted-up)'
    }
  }, "Last Call is tracking your night."));
}
function ScreenHead({
  eyebrow,
  title,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 'var(--gap)'
    }
  }, /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("span", {
    className: "lc-label"
  }, eyebrow), title && /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-title)',
      letterSpacing: 'var(--tr-title)',
      margin: eyebrow ? '7px 0 0' : 0
    }
  }, title)), right);
}
function GlassCard({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--glass-3)',
      border: '1px solid var(--glass-line)',
      borderRadius: 'var(--r-card)',
      backdropFilter: 'blur(var(--blur-glass))',
      padding: 14,
      ...style
    }
  }, children);
}
function TileGrid({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--gap-tight)'
    }
  }, children);
}
Object.assign(window, {
  Shell,
  StatusBar,
  ServiceNotification,
  ScreenHead,
  GlassCard,
  TileGrid
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/android-app/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/android-app/data.js
try { (() => {
// Fake session data. One night, one device, no server.
window.LC_ROUTE = [[22, 318], [38, 300], [54, 286], [76, 272], [96, 258], [118, 250], [140, 236], [158, 214], [172, 190], [196, 178], [218, 168], [238, 150], [252, 128], [268, 104], [286, 92], [300, 74], [312, 58]];
window.LC_STOPS = [{
  at: [38, 300],
  name: 'The Grapes',
  time: '9:24 pm'
}, {
  at: [140, 236],
  name: 'Vault 33',
  time: '10:48 pm'
}, {
  at: [252, 128],
  name: 'Kiosk',
  time: '12:15 am'
}];
window.LC_NIGHTS = [{
  date: 'Sat 2 Aug',
  drinks: '5 drinks',
  time: '5h 12m',
  dist: '4.1 km'
}, {
  date: 'Fri 25 Jul',
  drinks: '7 drinks',
  time: '6h 04m',
  dist: '5.6 km'
}, {
  date: 'Sat 19 Jul',
  drinks: '3 drinks',
  time: '3h 20m',
  dist: '2.2 km'
}, {
  date: 'Thu 10 Jul',
  drinks: '4 drinks',
  time: '4h 41m',
  dist: '3.8 km'
}, {
  date: 'Sat 5 Jul',
  drinks: '6 drinks',
  time: '5h 55m',
  dist: '4.9 km'
}];
window.LC_WEEKS = [2, 0, 5, 3, 7, 4, 6, 5];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/android-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.NavPair = __ds_scope.NavPair;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.Timer = __ds_scope.Timer;

__ds_ns.BottomSheet = __ds_scope.BottomSheet;

__ds_ns.WarningBanner = __ds_scope.WarningBanner;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Icon = __ds_scope.Icon;

})();
