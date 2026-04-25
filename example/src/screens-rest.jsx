/* global React, MOCK_DOC, MOCK_FIELDS */

// ─────────────────────────────────────────────────────────────
// Tela 3 — Câmera (captura nativa estilizada)
// ─────────────────────────────────────────────────────────────
function ScreenCamera({ mode = 'before', onCancel, onCapture }) {
  const [flash, setFlash] = React.useState(false);
  const [captured, setCaptured] = React.useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          paddingTop: 56,
          paddingBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '56px 14px 12px',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconX size={18} />
        </button>
        <div
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Foto {mode === 'before' ? 'antes' : 'depois'} · PDV-04
        </div>
        <button
          onClick={() => setFlash(!flash)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: flash ? '#FACC15' : 'rgba(255,255,255,0.12)',
            color: flash ? '#000' : '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconFlash size={16} />
        </button>
      </div>

      {/* Viewfinder */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          margin: '0 14px',
          borderRadius: 18,
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #0f172a, #1e293b 50%, #334155)',
        }}
      >
        {/* "live" viewport */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 380 560"
          style={{ position: 'absolute', inset: 0 }}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="vignette" cx="50%" cy="55%" r="75%">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
            </radialGradient>
          </defs>
          {/* Chão do checkout */}
          <rect x="0" y="380" width="380" height="180" fill="#0b1220" />
          {/* PDV mock */}
          <g transform="translate(60, 140)">
            <rect
              x="0"
              y="0"
              width="260"
              height="240"
              rx="6"
              fill="#475569"
              stroke="#64748b"
              strokeWidth="1"
            />
            <rect x="20" y="24" width="220" height="130" fill="#1e40af" opacity="0.6" />
            <rect x="28" y="34" width="180" height="8" fill="rgba(255,255,255,0.35)" />
            <rect x="28" y="50" width="120" height="6" fill="rgba(255,255,255,0.25)" />
            <rect x="28" y="64" width="160" height="6" fill="rgba(255,255,255,0.2)" />
            <rect x="28" y="120" width="80" height="24" fill="#22c55e" opacity="0.8" />
            {/* Keypad */}
            <g transform="translate(30, 170)">
              {[0, 1, 2, 3].map((r) =>
                [0, 1, 2, 3].map((c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={c * 48}
                    y={r * 14}
                    width="40"
                    height="10"
                    rx="2"
                    fill="rgba(255,255,255,0.15)"
                  />
                )),
              )}
            </g>
          </g>
          <rect width="380" height="560" fill="url(#vignette)" />
        </svg>

        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `
            linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)
          `,
            backgroundSize: '33.33% 33.33%',
          }}
        />

        {/* Focus frame */}
        <div
          style={{
            position: 'absolute',
            top: '28%',
            left: '18%',
            width: 70,
            height: 70,
            border: '1.5px solid #FACC15',
            borderRadius: 4,
            animation: 'rc-pulse 1.6s ease-in-out infinite',
          }}
        />
        <style>{`@keyframes rc-pulse{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}`}</style>

        {/* Hint */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          Enquadre o equipamento na moldura
        </div>
      </div>

      {/* Bottom controls */}
      <div
        style={{
          padding: '16px 14px 42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Galeria"
        >
          <IconImage size={20} />
        </button>

        <button
          onClick={() => {
            setCaptured(true);
            setTimeout(() => {
              onCapture(mode);
            }, 280);
          }}
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.2)',
            border: '3px solid #fff',
            padding: 4,
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            transform: captured ? 'scale(0.9)' : 'scale(1)',
          }}
          aria-label="Capturar"
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 999,
              background: captured ? '#fff' : 'rgba(255,255,255,0.95)',
              transition: 'background 0.1s ease',
            }}
          />
        </button>

        <button
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Alternar câmera"
        >
          <IconRotate size={20} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela 4 — Assinatura (canvas)
// ─────────────────────────────────────────────────────────────
function ScreenSignature({ onCancel, onDone }) {
  const canvasRef = React.useRef(null);
  const [drawing, setDrawing] = React.useState(false);
  const [hasInk, setHasInk] = React.useState(false);

  // draw "demo" signature to show a plausible state on load (apagável)
  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    // Resize for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
  }, []);

  const pt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  };
  const start = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pt(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };
  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pt(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };
  const end = () => setDrawing(false);

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  return (
    <div style={{ background: 'var(--rc-bg)', minHeight: '100%' }}>
      <PhoneHeader onBack={onCancel} title="Assinatura" subtitle="Responsável da loja" />

      <div style={{ padding: 14 }}>
        <div
          style={{ fontSize: 13, color: 'var(--rc-fg-muted)', marginBottom: 12, lineHeight: 1.5 }}
        >
          Assine no espaço abaixo. O responsável confirma que a preventiva do PDV-04 foi realizada
          conforme o checklist.
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid var(--rc-border)',
            boxShadow: 'var(--rc-shadow-sm)',
            padding: 14,
          }}
        >
          <div
            style={{
              position: 'relative',
              border: '1.5px dashed var(--rc-border-strong)',
              borderRadius: 10,
              overflow: 'hidden',
              background:
                'linear-gradient(to right, transparent 0 calc(100% - 1px), rgba(15,23,42,0.06) calc(100% - 1px))',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                width: '100%',
                height: 220,
                touchAction: 'none',
                cursor: 'crosshair',
              }}
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
              onTouchStart={start}
              onTouchMove={move}
              onTouchEnd={end}
            />
            {/* baseline */}
            <div
              style={{
                position: 'absolute',
                left: 20,
                right: 20,
                bottom: 36,
                borderTop: '1px dashed var(--rc-border-strong)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 20,
                bottom: 14,
                fontSize: 11,
                color: 'var(--rc-fg-subtle)',
                fontWeight: 500,
                pointerEvents: 'none',
              }}
            >
              X ─────────────────────────────
            </div>
            {!hasInk && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--rc-fg-subtle)',
                  fontSize: 13,
                  pointerEvents: 'none',
                  fontStyle: 'italic',
                }}
              >
                Toque e deslize para assinar
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
            }}
          >
            <button onClick={clear} className="rc-btn rc-btn--ghost rc-btn--sm" disabled={!hasInk}>
              <IconTrash size={14} />
              Limpar
            </button>
            <div style={{ fontSize: 12, color: 'var(--rc-fg-muted)' }}>
              {hasInk ? 'Assinatura capturada' : 'Assinatura em branco'}
            </div>
          </div>
        </div>

        {/* Dados da pessoa */}
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Responsável</SectionLabel>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid var(--rc-border)',
              padding: '10px 12px',
              boxShadow: 'var(--rc-shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <LabeledInput label="Nome completo" defaultValue="Marcos Andrade" />
            <LabeledInput label="CPF ou matrícula" defaultValue="123.456.***-**" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '10px 14px 42px',
          background: '#fff',
          borderTop: '1px solid var(--rc-border)',
          display: 'flex',
          gap: 8,
          zIndex: 30,
        }}
      >
        <button
          className="rc-btn rc-btn--outline rc-btn--lg"
          style={{ flex: 1 }}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="rc-btn rc-btn--lg"
          style={{ flex: 2 }}
          disabled={!hasInk}
          onClick={onDone}
        >
          <IconCheck size={18} />
          Confirmar assinatura
        </button>
      </div>
    </div>
  );
}

function LabeledInput({ label, defaultValue }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--rc-fg-muted)',
          fontWeight: 600,
          marginBottom: 3,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </div>
      <input
        defaultValue={defaultValue}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontSize: 14,
          fontWeight: 600,
          background: 'transparent',
          padding: 0,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela 5 — Revisão (dados globais + lista resumo)
// ─────────────────────────────────────────────────────────────
function ScreenReview({ onBack, onGenerate }) {
  const [globals, setGlobals] = React.useState({
    responsavel: 'Técnico: João Silva',
    data: '18/04/2026',
    empresa: 'TecManutec — Equipe Sudeste',
  });
  const done = MOCK_DOC.assignments.filter((a) => a.status === 'done').length;

  return (
    <div style={{ background: 'var(--rc-bg)', minHeight: '100%' }}>
      <PhoneHeader onBack={onBack} title="Revisar preventiva" subtitle={MOCK_DOC.loja} />

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Resumo agregado */}
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid var(--rc-border)',
            boxShadow: 'var(--rc-shadow-sm)',
            padding: 14,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Metric label="Equipamentos" value={MOCK_DOC.totalItems} />
            <Metric label="Concluídos" value={done} color="var(--rc-success)" />
            <Metric label="Fotos" value={done * 2} muted />
          </div>
          <div style={{ marginTop: 10 }}>
            <ProgressBar
              value={done}
              max={MOCK_DOC.totalItems}
              showLabel
              label={`${Math.round((done / MOCK_DOC.totalItems) * 100)}% concluído`}
            />
          </div>
        </div>

        {/* Dados globais */}
        <div>
          <SectionLabel>Dados gerais</SectionLabel>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid var(--rc-border)',
              boxShadow: 'var(--rc-shadow-sm)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <LabeledInput label="Responsável técnico" defaultValue={globals.responsavel} />
            <div style={{ borderTop: '1px solid var(--rc-border)' }} />
            <LabeledInput label="Data da preventiva" defaultValue={globals.data} />
            <div style={{ borderTop: '1px solid var(--rc-border)' }} />
            <LabeledInput label="Empresa prestadora" defaultValue={globals.empresa} />
          </div>
        </div>

        {/* Resumo por setor */}
        <div>
          <SectionLabel>Por setor</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_DOC.setores.map((s) => (
              <div
                key={s.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid var(--rc-border)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: 'var(--rc-shadow-sm)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{s.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--rc-fg-muted)', marginTop: 2 }}>
                    {s.done}/{s.count} equipamentos
                  </div>
                </div>
                <div style={{ width: 90 }}>
                  <ProgressBar value={s.done} max={s.count} height={5} />
                </div>
                {s.done === s.count ? (
                  <Badge variant="success" icon={<IconCheck size={11} strokeWidth={3.5} />}>
                    OK
                  </Badge>
                ) : (
                  <Badge>{Math.round((s.done / s.count) * 100)}%</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '10px 14px 42px',
          background: '#fff',
          borderTop: '1px solid var(--rc-border)',
          display: 'flex',
          gap: 8,
          zIndex: 30,
        }}
      >
        <button
          className="rc-btn rc-btn--outline rc-btn--lg"
          style={{ flex: '0 0 56px', padding: 0 }}
          onClick={onBack}
        >
          <IconChevronLeft size={20} />
        </button>
        <button className="rc-btn rc-btn--lg" style={{ flex: 1 }} onClick={onGenerate}>
          <IconFile size={18} />
          Gerar PDF
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, color, muted }) {
  return (
    <div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: muted ? 'var(--rc-fg-muted)' : color || 'var(--rc-fg)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--rc-fg-muted)',
          fontWeight: 600,
          marginTop: 4,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela 6 — Sucesso (PDF gerado, assíncrono estilo BullMQ)
// ─────────────────────────────────────────────────────────────
function ScreenSuccess({ onStart, onDownload }) {
  const [phase, setPhase] = React.useState('generating'); // 'generating' | 'done'
  React.useEffect(() => {
    const t = setTimeout(() => setPhase('done'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        background: 'var(--rc-bg)',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '56px 20px 42px',
      }}
    >
      {/* Generating */}
      {phase === 'generating' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'var(--rc-primary-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <IconFile size={30} stroke="var(--rc-primary-700)" />
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: 22,
                border: '3px solid var(--rc-primary)',
                borderTopColor: 'transparent',
                borderRightColor: 'transparent',
                animation: 'rc-spin 1.1s linear infinite',
              }}
            />
            <style>{`@keyframes rc-spin{to{transform:rotate(360deg)}}`}</style>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Gerando PDF…
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--rc-fg-muted)',
                marginTop: 6,
                maxWidth: 280,
                lineHeight: 1.5,
              }}
            >
              Pode fechar esta tela. Quando pronto, o PDF ficará disponível em Documentos.
            </div>
          </div>
          <div style={{ width: '100%', maxWidth: 280 }}>
            <ProgressBar value={56} max={100} />
          </div>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 999,
                background: 'var(--rc-success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--rc-success-border)',
              }}
            >
              <IconCheck size={36} stroke="var(--rc-success)" strokeWidth={3} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Preventiva concluída
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--rc-fg-muted)',
                  marginTop: 6,
                  maxWidth: 300,
                  lineHeight: 1.5,
                }}
              >
                O PDF de {MOCK_DOC.name} está pronto. Você pode baixar, compartilhar ou iniciar uma
                nova preventiva.
              </div>
            </div>

            {/* Preview card */}
            <div
              style={{
                marginTop: 8,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid var(--rc-border)',
                boxShadow: 'var(--rc-shadow-md)',
                padding: 12,
                width: '100%',
                maxWidth: 320,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 56,
                  borderRadius: 6,
                  background: 'linear-gradient(180deg, #fff, #F1F5F9)',
                  border: '1px solid var(--rc-border)',
                  position: 'relative',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  padding: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'var(--rc-primary)',
                    letterSpacing: '0.05em',
                  }}
                >
                  PDF
                </div>
                {/* stripes */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '6px 6px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {[0.9, 0.7, 0.85, 0.5, 0.75].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        height: 2,
                        width: `${w * 100}%`,
                        background: 'var(--rc-border-strong)',
                        borderRadius: 1,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  preventiva-loja-042-abr-26.pdf
                </div>
                <div style={{ fontSize: 11, color: 'var(--rc-fg-muted)', marginTop: 2 }}>
                  18 equipamentos · 36 fotos · 2.4 MB
                </div>
              </div>
              <IconChevronRight size={18} stroke="var(--rc-fg-subtle)" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="rc-btn rc-btn--lg rc-btn--block" onClick={onDownload}>
              <IconDownload size={18} /> Baixar PDF
            </button>
            <button className="rc-btn rc-btn--outline rc-btn--lg rc-btn--block" onClick={onStart}>
              Nova preventiva
            </button>
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, { ScreenCamera, ScreenSignature, ScreenReview, ScreenSuccess });
