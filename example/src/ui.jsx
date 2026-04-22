/* global React */

// ─────────────────────────────────────────────────────────────
// Badge (shadcn-style)
// ─────────────────────────────────────────────────────────────
function Badge({ children, variant = 'default', icon }) {
  const cls = variant === 'default' ? 'rc-badge' : `rc-badge rc-badge--${variant}`;
  return (
    <span className={cls}>
      {icon ? <span style={{display:'inline-flex'}}>{icon}</span> : null}
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Status chip para equipamentos (lista)
// ─────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  if (status === 'done') return <Badge variant="success" icon={<IconCheck size={12} strokeWidth={3}/>}>Concluído</Badge>;
  if (status === 'progress') return <Badge variant="primary">Em andamento</Badge>;
  return <Badge>Pendente</Badge>;
}

// ─────────────────────────────────────────────────────────────
// Equipment icon — glifo por tipo
// ─────────────────────────────────────────────────────────────
function EquipIcon({ kind, size = 22, color }) {
  const c = color || 'var(--rc-fg-muted)';
  const props = { size, stroke: c };
  if (kind === 'printer')  return <IconPrinter {...props}/>;
  if (kind === 'scale')    return <IconScale {...props}/>;
  if (kind === 'checkout') return <IconPackage {...props}/>;
  return <IconPackage {...props}/>;
}

// ─────────────────────────────────────────────────────────────
// PhoneHeader — barra superior dentro do app (abaixo do status bar iOS)
// back + título + progresso opcional + trailing ação
// ─────────────────────────────────────────────────────────────
function PhoneHeader({ title, subtitle, onBack, trailing, tight = false }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding: tight ? '8px 14px' : '10px 14px',
      borderBottom:'1px solid var(--rc-border)',
      background:'#fff',
      minHeight: 56,
    }}>
      {onBack && (
        <button onClick={onBack}
          style={{
            width:36, height:36, borderRadius:10, border:'none',
            background:'transparent', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--rc-fg)',
          }}
          aria-label="Voltar"
        >
          <IconChevronLeft size={22}/>
        </button>
      )}
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:15, fontWeight:700, lineHeight:'18px', letterSpacing:'-0.01em',
                     whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{title}</div>
        {subtitle && (
          <div style={{fontSize:12, color:'var(--rc-fg-muted)', lineHeight:'14px', marginTop:2,
                       whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{subtitle}</div>
        )}
      </div>
      {trailing}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ProgressBar compacto
// ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, height = 6, showLabel = false, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{display:'flex', alignItems:'center', gap:8, width:'100%'}}>
      <div style={{flex:1, height, background:'var(--rc-bg-muted)', borderRadius:999, overflow:'hidden'}}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background: 'var(--rc-primary)',
          borderRadius:999,
          transition:'width 0.3s ease',
        }}/>
      </div>
      {showLabel && (
        <div style={{fontSize:12, color:'var(--rc-fg-muted)', fontWeight:600, fontVariantNumeric:'tabular-nums'}}>
          {label ?? `${Math.round(pct)}%`}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SectionLabel — cabeçalho de seção
// ─────────────────────────────────────────────────────────────
function SectionLabel({ children, right }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 4px', marginBottom:8,
    }}>
      <div style={{fontSize:11, fontWeight:700, color:'var(--rc-fg-muted)',
                   textTransform:'uppercase', letterSpacing:'0.06em'}}>{children}</div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Placeholder de foto "antes/depois" (sem render SVG elaborado)
// ─────────────────────────────────────────────────────────────
function PhotoPlaceholder({ state = 'empty', label, thumbKey }) {
  // state: 'empty' | 'filled' | 'pending'
  if (state === 'empty') {
    return (
      <div style={{
        height:120, borderRadius:12,
        border:'1.5px dashed var(--rc-border-strong)',
        background:'var(--rc-bg-muted)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:6, color:'var(--rc-fg-muted)',
      }}>
        <IconCamera size={22}/>
        <span style={{fontSize:12, fontWeight:600}}>{label || 'Tirar foto'}</span>
      </div>
    );
  }
  // filled — desenhamos um thumbnail estilizado
  return (
    <div style={{
      height:120, borderRadius:12, overflow:'hidden', position:'relative',
      border:'1px solid var(--rc-border)',
      background: thumbKey === 'before'
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    }}>
      {/* simulação: gradiente + noise + overlay label */}
      <svg width="100%" height="100%" viewBox="0 0 200 120" style={{position:'absolute',inset:0}} preserveAspectRatio="none">
        <defs>
          <pattern id={`noise-${thumbKey}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="rgba(255,255,255,0.03)"/>
            <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.08)"/>
          </pattern>
        </defs>
        <rect width="200" height="120" fill={`url(#noise-${thumbKey})`}/>
        {/* silhueta estilizada de equipamento */}
        <rect x="60" y="30" width="80" height="60" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)"/>
        <rect x="72" y="42" width="56" height="22" fill="rgba(255,255,255,0.15)"/>
        <rect x="72" y="70" width="20" height="6" rx="2" fill="rgba(255,255,255,0.25)"/>
        <rect x="96" y="70" width="20" height="6" rx="2" fill="rgba(255,255,255,0.25)"/>
        <rect x="120" y="70" width="8" height="6" rx="2" fill="rgba(255,255,255,0.25)"/>
      </svg>
      <div style={{
        position:'absolute', left:8, bottom:8,
        padding:'3px 8px', borderRadius:6,
        background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)',
        color:'#fff', fontSize:11, fontWeight:600, letterSpacing:'0.02em',
      }}>{label}</div>
      <button
        style={{
          position:'absolute', right:8, top:8,
          width:28, height:28, borderRadius:8, border:'none',
          background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)',
          color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer',
        }}
        aria-label="Refazer foto"
      >
        <IconRefresh size={14}/>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ChoiceGroup — SIM/NÃO side-by-side (field-friendly)
// ─────────────────────────────────────────────────────────────
function YesNo({ value, onChange, style = 'segmented' }) {
  // style: 'segmented' | 'toggle' | 'stacked'
  if (style === 'toggle') {
    // Um toggle iOS-like (SIM à direita)
    const on = value === true;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={()=>onChange(on ? null : true)}
        style={{
          width:56, height:32, borderRadius:999,
          background: on ? 'var(--rc-primary)' : '#D1D5DB',
          border:'none', position:'relative', cursor:'pointer',
          transition:'background 0.2s ease',
        }}
      >
        <span style={{
          position:'absolute', top:3, left: on ? 27 : 3,
          width:26, height:26, borderRadius:999, background:'#fff',
          boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
          transition:'left 0.2s ease',
        }}/>
      </button>
    );
  }
  if (style === 'stacked') {
    // Check box tradicional
    return (
      <div style={{display:'flex', gap:8}}>
        {[
          {v:true,  label:'Sim'},
          {v:false, label:'Não'},
        ].map(opt => {
          const active = value === opt.v;
          return (
            <button key={String(opt.v)} type="button" onClick={()=>onChange(opt.v)}
              style={{
                flex:1, height:44, borderRadius:10,
                border: active ? '2px solid var(--rc-primary)' : '1px solid var(--rc-border-strong)',
                background: active ? 'var(--rc-primary-50)' : '#fff',
                color: active ? 'var(--rc-primary-700)' : 'var(--rc-fg)',
                fontWeight: active ? 700 : 500, fontSize:15,
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                cursor:'pointer',
              }}>
              <span style={{
                width:18, height:18, borderRadius:4,
                border: `1.5px solid ${active ? 'var(--rc-primary)' : 'var(--rc-border-strong)'}`,
                background: active && opt.v === true ? 'var(--rc-primary)' : '#fff',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>
                {active && opt.v === true && <IconCheck size={12} stroke="#fff" strokeWidth={3.5}/>}
                {active && opt.v === false && <IconX size={12} stroke="var(--rc-primary)" strokeWidth={3.5}/>}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }
  // 'segmented' (default — pill compacta)
  return (
    <div style={{
      display:'flex',
      padding:3,
      borderRadius:10, background:'var(--rc-bg-muted)',
      border:'1px solid var(--rc-border)',
      width:160,
    }}>
      {[
        {v:true, label:'Sim'},
        {v:false, label:'Não'},
      ].map(opt=>{
        const active = value === opt.v;
        return (
          <button key={String(opt.v)} type="button" onClick={()=>onChange(opt.v)}
            style={{
              flex:1, height:36, borderRadius:8, border:'none',
              background: active ? '#fff' : 'transparent',
              color: active
                ? (opt.v ? 'var(--rc-success)' : 'var(--rc-danger)')
                : 'var(--rc-fg-muted)',
              fontWeight:700, fontSize:14, cursor:'pointer',
              boxShadow: active ? 'var(--rc-shadow-sm)' : 'none',
              transition:'all 0.15s ease',
            }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  Badge, StatusChip, EquipIcon, PhoneHeader, ProgressBar, SectionLabel,
  PhotoPlaceholder, YesNo,
});
