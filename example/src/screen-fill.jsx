/* global React, MOCK_DOC, MOCK_FIELDS, MOCK_VALUES */

// Tela 2 — Formulário de um equipamento (refinamento da referência)
function ScreenFill({ tweaks, onBack, onNext, onOpenCamera, onOpenSignature, assignmentIdx = 5 }) {
  const assignment = MOCK_DOC.assignments[assignmentIdx];
  const [values, setValues] = React.useState(MOCK_VALUES);

  const set = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));

  // Progresso local do equipamento
  const required = MOCK_FIELDS.filter((f) => f.config.required && !f.autoPopulate);
  const filled = required.filter((f) => {
    const v = values[f.id];
    if (f.type === 'checkbox') return v === true || v === false;
    return v !== null && v !== '' && v !== undefined;
  }).length;
  const equipPct = Math.round((filled / required.length) * 100);

  // Lista enxuta de equipamentos para navegação topo (mesma setor, filtro similar ao fill/page.tsx)
  const sameSetor = MOCK_DOC.assignments.filter((a) => a.setorId === assignment.setorId);
  const posInSetor = sameSetor.findIndex((a) => a.idx === assignment.idx);

  return (
    <div style={{ background: 'var(--rc-bg)', minHeight: '100%' }}>
      <PhoneHeader
        onBack={onBack}
        title={assignment.numeroEquipamento}
        subtitle={`${assignment.setorNome} · ${posInSetor + 1} de ${sameSetor.length}`}
        trailing={
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--rc-primary-700)',
              background: 'var(--rc-primary-50)',
              padding: '4px 10px',
              borderRadius: 999,
            }}
          >
            {equipPct}%
          </div>
        }
      />

      {/* Progresso do equipamento */}
      <div style={{ padding: '10px 14px 0' }}>
        <ProgressBar value={filled} max={required.length} />
      </div>

      {/* Banner offline/sync (espelha StatusBar do fill/page.tsx) */}
      <div style={{ padding: '10px 14px 0' }}>
        <OfflineBanner pending={2} />
      </div>

      <div
        style={{ padding: '14px 14px 110px', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {/* Bloco identificação (auto-populated) */}
        <div>
          <SectionLabel
            right={
              <Badge>
                <IconSparkles size={10} />
                Auto
              </Badge>
            }
          >
            Identificação
          </SectionLabel>
          <div
            style={{
              background: 'var(--rc-bg-muted)',
              borderRadius: 12,
              border: '1px solid var(--rc-border)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <ReadoutRow label="Nº Equipamento" value={values.f_num} />
            <ReadoutRow label="Série" value={values.f_ser} />
            <ReadoutRow label="Patrimônio" value={values.f_pat} />
          </div>
        </div>

        {/* Bloco checklist */}
        <div>
          <SectionLabel>Checklist</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_FIELDS.filter((f) => f.type === 'checkbox').map((f) => (
              <CheckField
                key={f.id}
                field={f}
                value={values[f.id]}
                onChange={(v) => set(f.id, v)}
                toggleStyle={tweaks.toggleStyle}
              />
            ))}
          </div>
        </div>

        {/* Bloco observações */}
        <div>
          <SectionLabel>Observações</SectionLabel>
          <TextField
            field={MOCK_FIELDS.find((f) => f.id === 'f_obs')}
            value={values.f_obs}
            onChange={(v) => set('f_obs', v)}
          />
        </div>

        {/* Bloco fotos antes/depois */}
        <div>
          <SectionLabel>Fotos da preventiva</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <PhotoSlot
              label="Antes"
              state={values.f_ph1 ? 'filled' : 'empty'}
              thumbKey="before"
              onClick={() => onOpenCamera('before', (key) => set('f_ph1', key))}
              required
            />
            <PhotoSlot
              label="Depois"
              state={values.f_ph2 ? 'filled' : 'empty'}
              thumbKey="after"
              onClick={() => onOpenCamera('after', (key) => set('f_ph2', key))}
              required
            />
          </div>
        </div>

        {/* Bloco assinatura */}
        <div>
          <SectionLabel>Assinatura do responsável</SectionLabel>
          <button
            onClick={onOpenSignature}
            style={{
              width: '100%',
              height: values.f_sig ? 110 : 72,
              borderRadius: 12,
              border: values.f_sig
                ? '1px solid var(--rc-border)'
                : '1.5px dashed var(--rc-border-strong)',
              background: values.f_sig ? '#fff' : 'var(--rc-bg-muted)',
              cursor: 'pointer',
              padding: 12,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: 'var(--rc-fg-muted)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {values.f_sig ? (
              <>
                {/* Mock signature stroke */}
                <svg width="180" height="60" viewBox="0 0 180 60" style={{ color: 'var(--rc-fg)' }}>
                  <path
                    d="M10,40 C20,10 40,55 55,30 S85,20 95,35 S130,45 145,20 S170,35 175,25"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <button
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: 10,
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--rc-bg-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--rc-fg-muted)',
                  }}
                >
                  <IconEdit size={14} />
                </button>
              </>
            ) : (
              <>
                <IconSignature size={20} />
                <span>Toque para assinar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Nav footer */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          padding: '10px 14px 42px',
          background: '#fff',
          borderTop: '1px solid var(--rc-border)',
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          className="rc-btn rc-btn--outline rc-btn--lg"
          style={{ flex: '0 0 56px', padding: 0 }}
          onClick={onBack}
          aria-label="Anterior"
        >
          <IconChevronLeft size={20} />
        </button>
        <button className="rc-btn rc-btn--lg" style={{ flex: 1 }} onClick={onNext}>
          Próximo equipamento
          <IconChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function OfflineBanner({ pending }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 10,
        background: 'var(--rc-warning-bg)',
        border: '1px solid var(--rc-warning-border)',
        color: 'var(--rc-warning)',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <IconWifiOff size={14} />
      <span style={{ flex: 1 }}>Offline — {pending} fotos aguardando upload</span>
      <span style={{ fontSize: 11, opacity: 0.7 }}>Salvo local</span>
    </div>
  );
}

function ReadoutRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 24,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--rc-fg-muted)', fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          color: 'var(--rc-fg)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function CheckField({ field, value, onChange, toggleStyle }) {
  const pending = value === null || value === undefined;
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: `1px solid ${pending && field.config.required ? 'var(--rc-border-strong)' : 'var(--rc-border)'}`,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: 'var(--rc-shadow-sm)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em' }}>
            {field.config.label}
          </span>
          {field.config.required && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--rc-danger)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Obrigatório
            </span>
          )}
        </div>
      </div>
      <YesNo value={value} onChange={onChange} style={toggleStyle} />
    </div>
  );
}

function TextField({ field, value, onChange }) {
  const Tag = field.config.multiline ? 'textarea' : 'input';
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid var(--rc-border)',
        padding: '10px 12px',
        boxShadow: 'var(--rc-shadow-sm)',
      }}
    >
      <Tag
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.config.placeholder}
        rows={field.config.multiline ? 3 : undefined}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          fontSize: 14,
          lineHeight: '20px',
          background: 'transparent',
          resize: 'none',
          minHeight: field.config.multiline ? 60 : 24,
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

function PhotoSlot({ label, state, thumbKey, onClick, required }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rc-fg)' }}>{label}</div>
        {required && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--rc-fg-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {state === 'filled' ? 'OK' : 'Obrig.'}
          </span>
        )}
      </div>
      <PhotoPlaceholder state={state} label={label} thumbKey={thumbKey} />
    </button>
  );
}

Object.assign(window, { ScreenFill });
