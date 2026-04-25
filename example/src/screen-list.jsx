/* global React, MOCK_DOC */

// Tela 1 — Lista de equipamentos com filtro por setor + progresso
function ScreenList({ onOpen }) {
  const [setorId, setSetorId] = React.useState(null);

  const filtered = setorId
    ? MOCK_DOC.assignments.filter((a) => a.setorId === setorId)
    : MOCK_DOC.assignments;

  const done = MOCK_DOC.assignments.filter((a) => a.status === 'done').length;

  return (
    <div style={{ background: 'var(--rc-bg)', minHeight: '100%' }}>
      {/* Header enxuto — título + menu */}
      <PhoneHeader
        title={MOCK_DOC.name}
        subtitle={MOCK_DOC.loja}
        trailing={
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--rc-fg-muted)',
            }}
          >
            <IconMoreVertical size={18} />
          </button>
        }
      />

      {/* Card de progresso global */}
      <div style={{ padding: '14px 14px 10px' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: 14,
            boxShadow: 'var(--rc-shadow-sm)',
            border: '1px solid var(--rc-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--rc-fg-muted)',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                Progresso
              </div>
              <div
                style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}
              >
                {done}
                <span style={{ color: 'var(--rc-fg-muted)', fontWeight: 600 }}>
                  /{MOCK_DOC.totalItems}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--rc-fg-muted)',
                    fontWeight: 500,
                    marginLeft: 6,
                  }}
                >
                  equipamentos
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--rc-primary-700)',
                background: 'var(--rc-primary-50)',
                padding: '4px 10px',
                borderRadius: 999,
              }}
            >
              {Math.round((done / MOCK_DOC.totalItems) * 100)}%
            </div>
          </div>
          <ProgressBar value={done} max={MOCK_DOC.totalItems} />
        </div>
      </div>

      {/* Filtros por setor — chips horizontais scroll */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '4px 14px 14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <style>{`.rc-chips::-webkit-scrollbar{display:none}`}</style>
        <FilterChip
          active={setorId === null}
          label="Todos"
          count={MOCK_DOC.totalItems}
          onClick={() => setSetorId(null)}
        />
        {MOCK_DOC.setores.map((s) => (
          <FilterChip
            key={s.id}
            active={setorId === s.id}
            label={s.nome}
            count={s.count}
            done={s.done}
            onClick={() => setSetorId(s.id)}
          />
        ))}
      </div>

      {/* Lista */}
      <div style={{ padding: '0 14px 110px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((a) => (
          <EquipmentRow key={a.idx} a={a} onClick={() => onOpen(a.idx)} />
        ))}
      </div>

      {/* Bottom action bar — CTA para gerar PDF */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '10px 14px 42px',
          background: 'linear-gradient(to top, rgba(245,246,248,1) 55%, rgba(245,246,248,0))',
          zIndex: 30,
        }}
      >
        <button
          onClick={() => onOpen('review')}
          disabled={done < MOCK_DOC.totalItems}
          className="rc-btn rc-btn--lg rc-btn--block"
          style={{ fontSize: 15 }}
        >
          {done < MOCK_DOC.totalItems
            ? `Faltam ${MOCK_DOC.totalItems - done} equipamentos`
            : 'Revisar e gerar PDF'}
          {done < MOCK_DOC.totalItems ? null : <IconChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}

function FilterChip({ active, label, count, done, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        height: 36,
        padding: '0 12px',
        borderRadius: 999,
        border: active ? '1px solid var(--rc-primary)' : '1px solid var(--rc-border-strong)',
        background: active ? 'var(--rc-primary)' : '#fff',
        color: active ? '#fff' : 'var(--rc-fg)',
        fontSize: 13,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
      }}
    >
      {label}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: 999,
          background: active ? 'rgba(255,255,255,0.22)' : 'var(--rc-bg-muted)',
          color: active ? '#fff' : 'var(--rc-fg-muted)',
        }}
      >
        {done !== undefined ? `${done}/${count}` : count}
      </span>
    </button>
  );
}

function EquipmentRow({ a, onClick }) {
  const color =
    a.status === 'done'
      ? 'var(--rc-success)'
      : a.status === 'progress'
        ? 'var(--rc-primary)'
        : 'var(--rc-fg-subtle)';
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: '#fff',
        borderRadius: 12,
        border: '1px solid var(--rc-border)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        boxShadow: 'var(--rc-shadow-sm)',
      }}
    >
      {/* Ícone do tipo */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background:
            a.status === 'done'
              ? 'var(--rc-success-bg)'
              : a.status === 'progress'
                ? 'var(--rc-primary-50)'
                : 'var(--rc-bg-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <EquipIcon kind={a.iconKey} size={20} color={color} />
      </div>
      {/* Título */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>
            {a.numeroEquipamento}
          </div>
          <span style={{ fontSize: 12, color: 'var(--rc-fg-muted)' }}>·</span>
          <div style={{ fontSize: 13, color: 'var(--rc-fg-muted)' }}>{a.tipo}</div>
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--rc-fg-subtle)',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {a.setorNome} · série {a.serie}
        </div>
      </div>
      {/* Status + chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <StatusChip status={a.status} />
        <IconChevronRight size={16} stroke="var(--rc-fg-subtle)" />
      </div>
    </button>
  );
}

Object.assign(window, { ScreenList });
