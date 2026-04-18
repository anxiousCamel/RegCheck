import * as React from 'react';
import { TemplateField, FieldConfig } from '@regcheck/shared';
import { ProgressBar, SectionLabel, YesNo } from '../ui/regcheck-ui';
import { Button, Spinner } from '@regcheck/ui';
import {
  IconChevronLeft, IconChevronRight, IconCheck, IconCamera, IconRefresh,
  IconPackage, IconPrinter, IconScale, IconWifiOff, IconSparkles,
  IconMoreVertical,
} from '@/components/ui/icons';
import { SignatureCanvas } from '@/components/document/signature-canvas';

interface ItemAssignment {
  itemIndex: number;
  setorId: string;
  setorNome: string;
  equipamentoId: string;
  numeroEquipamento: string;
  tipoEquipamento?: string;
}

// ─── Wizard wrapper (layout-only) ────────────────────────────────────────────

interface WizardProps {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  children: React.ReactNode;
}

export function Wizard({ children }: WizardProps) {
  return <>{children}</>;
}

// ─── FillListScreen ───────────────────────────────────────────────────────────

interface FillListScreenProps {
  docName: string;
  allAssignments: ItemAssignment[];
  filteredAssignments: ItemAssignment[];
  setores: { id: string; nome: string }[];
  selectedSetorId: string | null;
  onSetSetor: (id: string | null) => void;
  onStartFilling: () => void;
  onGenerate: () => void;
  generationState: 'idle' | 'queuing' | 'generating' | 'done' | 'error';
  globalFields: TemplateField[];
  getValue: (id: string, index: number) => string | boolean;
  updateField: (id: string, index: number, value: string | boolean) => void;
  isOnline: boolean;
  pendingUploads: number;
  hasPendingChanges: boolean;
  onSyncNow: () => void;
  documentId: string;
  onPopulated: () => void;
  repopulateSlot?: React.ReactNode;
}

export function FillListScreen({
  docName,
  allAssignments,
  filteredAssignments,
  setores,
  selectedSetorId,
  onSetSetor,
  onStartFilling,
  onGenerate,
  generationState,
  globalFields,
  getValue,
  updateField,
  isOnline,
  pendingUploads,
  hasPendingChanges,
  onSyncNow,
  repopulateSlot,
}: FillListScreenProps) {
  const done = allAssignments.filter((a) => isAssignmentDone(a, getValue)).length;
  const total = allAssignments.length;
  const allDone = done === total && total > 0;

  return (
    <div style={{ background: 'var(--rc-bg)', minHeight: '100vh', position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid var(--rc-border)',
        background: '#fff',
        minHeight: 56,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, lineHeight: '18px', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{docName}</div>
        </div>
        <button style={{
          width: 36, height: 36, borderRadius: 10, border: 'none',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--rc-fg-muted)',
        }}>
          <IconMoreVertical size={18} />
        </button>
      </div>

      {/* Sync banner */}
      {(!isOnline || pendingUploads > 0 || hasPendingChanges) && (
        <div style={{ padding: '10px 14px 0' }}>
          <SyncBanner
            isOnline={isOnline}
            pendingUploads={pendingUploads}
            hasPendingChanges={hasPendingChanges}
            onSyncNow={onSyncNow}
          />
        </div>
      )}

      {/* Generation state banners */}
      {generationState === 'generating' || generationState === 'queuing' ? (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--rc-primary-50)',
            border: '1px solid var(--rc-primary-100)',
            color: 'var(--rc-primary-700)',
            fontSize: 13, fontWeight: 600,
          }}>
            <Spinner className="h-4 w-4" />
            <span>Gerando PDF… Você pode continuar preenchendo.</span>
          </div>
        </div>
      ) : generationState === 'done' ? (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--rc-success-bg)',
            border: '1px solid var(--rc-success-border)',
            color: 'var(--rc-success)',
            fontSize: 13, fontWeight: 600,
          }}>
            <IconCheck size={16} strokeWidth={3} />
            <span style={{ flex: 1 }}>PDF pronto!</span>
          </div>
        </div>
      ) : generationState === 'error' ? (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--rc-danger-bg)',
            border: '1px solid var(--rc-danger-border)',
            color: 'var(--rc-danger)',
            fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ flex: 1 }}>Erro ao gerar PDF</span>
            <button
              onClick={onGenerate}
              style={{
                fontSize: 12, fontWeight: 700, color: 'var(--rc-danger)',
                textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      ) : null}

      {/* Progress card */}
      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{
          background: '#fff', borderRadius: 14, padding: 14,
          boxShadow: 'var(--rc-shadow-sm)',
          border: '1px solid var(--rc-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--rc-fg-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
                Progresso
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>
                {done}
                <span style={{ color: 'var(--rc-fg-muted)', fontWeight: 600 }}>/{total}</span>
                <span style={{ fontSize: 13, color: 'var(--rc-fg-muted)', fontWeight: 500, marginLeft: 6 }}>
                  equipamentos
                </span>
              </div>
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--rc-primary-700)',
              background: 'var(--rc-primary-50)',
              padding: '4px 10px', borderRadius: 999,
            }}>
              {total > 0 ? Math.round((done / total) * 100) : 0}%
            </div>
          </div>
          <ProgressBar value={done} max={total || 1} />
        </div>
      </div>

      {/* Sector filter chips */}
      {setores.length > 1 && (
        <div style={{
          display: 'flex', gap: 8, padding: '4px 14px 14px',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          <FilterChip active={selectedSetorId === null} label="Todos" count={total} onClick={() => onSetSetor(null)} />
          {setores.map((s) => (
            <FilterChip
              key={s.id}
              active={selectedSetorId === s.id}
              label={s.nome}
              count={filteredAssignments.filter(a => a.setorId === s.id).length}
              onClick={() => onSetSetor(s.id)}
            />
          ))}
        </div>
      )}

      {/* Global fields (if any) */}
      {globalFields.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <SectionLabel>Dados gerais</SectionLabel>
          <div style={{
            background: '#fff', borderRadius: 12,
            border: '1px solid var(--rc-border)',
            padding: '10px 12px',
            boxShadow: 'var(--rc-shadow-sm)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {globalFields.map((field) => (
              <ListGlobalField
                key={field.id}
                field={field}
                getValue={getValue}
                updateField={updateField}
              />
            ))}
          </div>
        </div>
      )}

      {/* Equipment list */}
      <div style={{ padding: '0 14px 110px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredAssignments.map((a, idx) => (
          <EquipmentCard
            key={a.equipamentoId ?? idx}
            assignment={a}
            isDone={isAssignmentDone(a, getValue)}
            onClick={onStartFilling}
          />
        ))}
        {repopulateSlot && (
          <div style={{ opacity: 0.5, marginTop: 8 }}>{repopulateSlot}</div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        padding: '10px 14px 16px',
        background: 'linear-gradient(to top, rgba(245,246,248,1) 55%, rgba(245,246,248,0))',
        zIndex: 30,
      }}>
        {allDone ? (
          <button
            onClick={onGenerate}
            disabled={generationState === 'queuing' || generationState === 'generating'}
            className="rc-btn rc-btn--lg rc-btn--block"
            style={{ fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {(generationState === 'queuing' || generationState === 'generating') && (
              <Spinner className="h-4 w-4" />
            )}
            Revisar e gerar PDF
            {generationState === 'idle' && <IconChevronRight size={18} />}
          </button>
        ) : (
          <button
            onClick={onStartFilling}
            className="rc-btn rc-btn--lg rc-btn--block"
            style={{ fontSize: 15 }}
          >
            {done === 0 ? 'Iniciar preenchimento' : 'Continuar preenchimento'}
            <IconChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── GlobalForm ───────────────────────────────────────────────────────────────

interface GlobalFormProps {
  fields: TemplateField[];
  getValue: (id: string, index: number) => string | boolean;
  updateField: (id: string, index: number, value: string | boolean) => void;
  onNext: () => void;
}

export function GlobalForm({ fields, getValue, updateField, onNext }: GlobalFormProps) {
  const { groupedFields, hiddenFieldIds } = groupDateFields(fields);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Dados Globais</h2>
        <p className="text-muted-foreground text-sm">
          Preencha as informações que serão aplicadas a todo o documento.
        </p>
      </div>

      <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm border border-border">
        {groupedFields.map((field) => {
          if (hiddenFieldIds.has(field.id)) return null;

          if (field.type === 'date-group') {
            return (
              <DateGroupField
                key={field.id}
                group={field}
                itemIndex={0}
                getValue={getValue}
                updateField={updateField}
              />
            );
          }

          if (field.type === 'signature') {
            return (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{field.config.label}</label>
                <div className="bg-white p-3 rounded-xl border border-border shadow-sm">
                  <SignatureCanvas
                    value={String(getValue(field.id, 0) || '')}
                    onChange={(dataUrl) => updateField(field.id, 0, dataUrl)}
                  />
                </div>
              </div>
            );
          }

          if (field.type === 'checkbox') {
            return (
              <div key={field.id} className="bg-white p-4 rounded-xl shadow-sm border border-border flex flex-col gap-3">
                <label className="text-[15px] font-bold text-foreground leading-tight">{field.config.label}</label>
                <YesNo
                  value={getValue(field.id, 0) === 'true' || getValue(field.id, 0) === true ? true : getValue(field.id, 0) === 'false' || getValue(field.id, 0) === false ? false : null}
                  onChange={(val) => updateField(field.id, 0, val)}
                  className="w-full"
                />
              </div>
            );
          }

          return (
            <div key={field.id} className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                {field.config.label}
                {field.config.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={String(getValue(field.id, 0) || '')}
                onChange={(e) => updateField(field.id, 0, e.target.value)}
                placeholder={field.config.placeholder}
                className="w-full h-12 px-4 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
          );
        })}
      </div>

      <Button onClick={onNext} className="w-full h-14 text-lg font-bold rounded-xl shadow-lg">
        Iniciar Equipamentos <IconChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

// ─── EquipmentStep ────────────────────────────────────────────────────────────

interface EquipmentStepProps {
  assignment: ItemAssignment;
  index: number;
  total: number;
  fields: TemplateField[];
  getValue: (id: string, index: number) => string | boolean;
  updateField: (id: string, index: number, value: string | boolean) => void;
  onImageChange: (id: string, index: number, file: File) => void;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
  isOnline?: boolean;
  pendingUploads?: number;
}

export function EquipmentStep({
  assignment,
  index,
  total,
  fields,
  getValue,
  updateField,
  onImageChange,
  onNext,
  onPrev,
  isLast,
  isOnline = true,
  pendingUploads = 0,
}: EquipmentStepProps) {
  const itemIndex = assignment.itemIndex;
  const { groupedFields, hiddenFieldIds } = groupDateFields(fields);

  const identificationFields = groupedFields.filter((f) => f.type === 'text' && f.bindingKey);
  const checklistFields = groupedFields.filter((f) => f.type === 'checkbox');
  const observationFields = groupedFields.filter((f) => f.type === 'text' && !f.bindingKey);
  const photoFields = groupedFields.filter((f) => f.type === 'image');
  const signatureFields = groupedFields.filter((f) => f.type === 'signature');
  const dateGroups = groupedFields.filter((f) => f.type === 'date-group');

  const requiredFields = groupedFields.filter(
    (f) => !hiddenFieldIds.has(f.id) && f.config?.required && f.type !== 'date-group',
  );
  const filledCount = requiredFields.filter((f) => {
    const v = getValue(f.id, itemIndex);
    if (f.type === 'checkbox') return v === true || v === false;
    return v !== '' && v !== null && v !== undefined && v !== 'false' && v !== false;
  }).length;
  const equipPct = requiredFields.length > 0 ? Math.round((filledCount / requiredFields.length) * 100) : 100;

  const setAllChecklist = (val: boolean) => {
    checklistFields.forEach((f) => updateField(f.id, itemIndex, val));
  };

  return (
    <div style={{ background: 'var(--rc-bg)', minHeight: '100vh', position: 'relative' }}>
      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid var(--rc-border)',
        background: '#fff',
        minHeight: 56,
      }}>
        <button
          onClick={onPrev}
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--rc-fg)',
          }}
          aria-label="Voltar"
        >
          <IconChevronLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, lineHeight: '18px', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {assignment.numeroEquipamento}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--rc-fg-muted)', lineHeight: '14px', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {assignment.setorNome} · {index + 1} de {total}
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: 'var(--rc-primary-700)', background: 'var(--rc-primary-50)',
          padding: '4px 10px', borderRadius: 999,
        }}>
          {equipPct}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '10px 14px 0' }}>
        <ProgressBar value={filledCount} max={requiredFields.length || 1} />
      </div>

      {/* Offline banner */}
      {(!isOnline || pendingUploads > 0) && (
        <div style={{ padding: '10px 14px 0' }}>
          <SyncBanner isOnline={isOnline} pendingUploads={pendingUploads} hasPendingChanges={false} onSyncNow={() => {}} />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '14px 14px 110px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Identification */}
        {identificationFields.length > 0 && (
          <div>
            <SectionLabel right={
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: 'var(--rc-fg-muted)',
                background: 'var(--rc-bg-muted)', padding: '2px 8px', borderRadius: 999,
              }}>
                <IconSparkles size={10} /> Auto
              </span>
            }>
              Identificação
            </SectionLabel>
            <div style={{
              background: 'var(--rc-bg-muted)', borderRadius: 12,
              border: '1px solid var(--rc-border)',
              padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {identificationFields.map((f) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
                  <span style={{ fontSize: 13, color: 'var(--rc-fg-muted)', fontWeight: 500 }}>{f.config.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--rc-fg)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {String(getValue(f.id, itemIndex) || '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist */}
        {checklistFields.length > 0 && (
          <div>
            <SectionLabel right={
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setAllChecklist(true)}
                  style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--rc-success)',
                    background: 'var(--rc-success-bg)', border: 'none',
                    padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                  }}
                >
                  TUDO SIM
                </button>
                <button
                  onClick={() => setAllChecklist(false)}
                  style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--rc-danger)',
                    background: 'var(--rc-danger-bg)', border: 'none',
                    padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                  }}
                >
                  TUDO NÃO
                </button>
              </div>
            }>
              Checklist
            </SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checklistFields.map((f) => {
                const rawVal = getValue(f.id, itemIndex);
                const val = rawVal === true || rawVal === 'true' ? true
                  : rawVal === false || rawVal === 'false' ? false
                  : null;
                const pending = val === null;
                return (
                  <div key={f.id} style={{
                    background: '#fff', borderRadius: 12,
                    border: `1px solid ${pending && f.config.required ? 'var(--rc-border-strong)' : 'var(--rc-border)'}`,
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: 'var(--rc-shadow-sm)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em' }}>
                          {f.config.label}
                        </span>
                        {f.config.required && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: 'var(--rc-danger)',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            Obrigatório
                          </span>
                        )}
                      </div>
                    </div>
                    <YesNo
                      value={val}
                      onChange={(v) => updateField(f.id, itemIndex, v)}
                      className="w-40"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Date fields */}
        {dateGroups.length > 0 && (
          <div>
            <SectionLabel>Datas</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dateGroups.map((g) => (
                <div key={g.id} style={{
                  background: '#fff', borderRadius: 12,
                  border: '1px solid var(--rc-border)',
                  padding: '10px 14px',
                  boxShadow: 'var(--rc-shadow-sm)',
                }}>
                  <DateGroupField group={g as unknown as DateGroup} itemIndex={itemIndex} getValue={getValue} updateField={updateField} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        {observationFields.length > 0 && (
          <div>
            <SectionLabel>Observações</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {observationFields.map((f) => (
                <div key={f.id} style={{
                  background: '#fff', borderRadius: 12,
                  border: '1px solid var(--rc-border)',
                  padding: '10px 12px',
                  boxShadow: 'var(--rc-shadow-sm)',
                }}>
                  <textarea
                    value={String(getValue(f.id, itemIndex) || '')}
                    onChange={(e) => updateField(f.id, itemIndex, e.target.value)}
                    placeholder={f.config.placeholder || 'Descreva qualquer irregularidade…'}
                    rows={3}
                    style={{
                      width: '100%', border: 'none', outline: 'none',
                      fontSize: 14, lineHeight: '20px',
                      background: 'transparent', resize: 'none',
                      minHeight: 60,
                      fontFamily: 'var(--rc-font)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {photoFields.length > 0 && (
          <div>
            <SectionLabel>Fotos da preventiva</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {photoFields.map((f) => (
                <PhotoUploadField
                  key={f.id}
                  field={f as TemplateField}
                  itemIndex={itemIndex}
                  getValue={getValue}
                  updateField={updateField}
                  onImageChange={onImageChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* Signatures */}
        {signatureFields.length > 0 && (
          <div>
            <SectionLabel>Assinatura do responsável</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {signatureFields.map((f) => (
                <div key={f.id} style={{
                  background: '#fff', borderRadius: 12,
                  border: '1px solid var(--rc-border)',
                  padding: '12px',
                  boxShadow: 'var(--rc-shadow-sm)',
                }}>
                  <SignatureCanvas
                    value={String(getValue(f.id, itemIndex) || '')}
                    onChange={(dataUrl) => updateField(f.id, itemIndex, dataUrl)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed footer */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
        padding: '10px 14px 16px',
        background: '#fff', borderTop: '1px solid var(--rc-border)',
        display: 'flex', gap: 8,
      }}>
        <button
          className="rc-btn rc-btn--outline rc-btn--lg"
          style={{ flex: '0 0 52px', padding: 0 }}
          onClick={onPrev}
          aria-label="Anterior"
        >
          <IconChevronLeft size={20} />
        </button>
        <button
          className="rc-btn rc-btn--lg"
          style={{ flex: 1 }}
          onClick={onNext}
        >
          {isLast ? 'Finalizar e Gerar PDF' : 'Próximo equipamento'}
          <IconChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SyncBanner({
  isOnline, pendingUploads, hasPendingChanges, onSyncNow,
}: {
  isOnline: boolean; pendingUploads: number; hasPendingChanges: boolean; onSyncNow: () => void;
}) {
  const isWarning = !isOnline || pendingUploads > 0;
  if (!isWarning && !hasPendingChanges) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 10,
      background: isWarning ? 'var(--rc-warning-bg)' : 'var(--rc-primary-50)',
      border: `1px solid ${isWarning ? 'var(--rc-warning-border)' : 'var(--rc-primary-100)'}`,
      color: isWarning ? 'var(--rc-warning)' : 'var(--rc-primary-700)',
      fontSize: 12, fontWeight: 600,
    }}>
      <IconWifiOff size={14} />
      <span style={{ flex: 1 }}>
        {!isOnline ? `Offline${pendingUploads > 0 ? ` — ${pendingUploads} foto${pendingUploads !== 1 ? 's' : ''} aguardando` : ''}` : `${pendingUploads} foto${pendingUploads !== 1 ? 's' : ''} aguardando upload`}
      </span>
      <span style={{ fontSize: 11, opacity: 0.7 }}>Salvo local</span>
      {isOnline && hasPendingChanges && (
        <button
          onClick={onSyncNow}
          style={{
            fontSize: 11, fontWeight: 700, textDecoration: 'underline',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--rc-primary-700)',
          }}
        >
          Sincronizar
        </button>
      )}
    </div>
  );
}

function FilterChip({
  active, label, count, onClick,
}: {
  active: boolean; label: string; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, height: 36, padding: '0 12px', borderRadius: 999,
        border: active ? '1px solid var(--rc-primary)' : '1px solid var(--rc-border-strong)',
        background: active ? 'var(--rc-primary)' : '#fff',
        color: active ? '#fff' : 'var(--rc-fg)',
        fontSize: 13, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: 'pointer',
      }}
    >
      {label}
      <span style={{
        fontSize: 11, fontWeight: 700,
        padding: '1px 6px', borderRadius: 999,
        background: active ? 'rgba(255,255,255,0.22)' : 'var(--rc-bg-muted)',
        color: active ? '#fff' : 'var(--rc-fg-muted)',
      }}>
        {count}
      </span>
    </button>
  );
}

function EquipIcon({ kind, size = 20, color }: { kind?: string; size?: number; color?: string }) {
  const c = color || 'var(--rc-fg-muted)';
  if (kind === 'Impressora' || kind === 'printer') return <IconPrinter size={size} stroke={c} />;
  if (kind === 'Balança' || kind === 'scale') return <IconScale size={size} stroke={c} />;
  return <IconPackage size={size} stroke={c} />;
}

function EquipmentCard({
  assignment, isDone, onClick,
}: {
  assignment: ItemAssignment; isDone: boolean; onClick: () => void;
}) {
  const color = isDone ? 'var(--rc-success)' : 'var(--rc-fg-subtle)';
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: '#fff', borderRadius: 12,
        border: '1px solid var(--rc-border)',
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
        boxShadow: 'var(--rc-shadow-sm)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: isDone ? 'var(--rc-success-bg)' : 'var(--rc-bg-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <EquipIcon kind={assignment.tipoEquipamento} size={20} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>
            {assignment.numeroEquipamento}
          </div>
          {assignment.tipoEquipamento && (
            <>
              <span style={{ fontSize: 12, color: 'var(--rc-fg-muted)' }}>·</span>
              <div style={{ fontSize: 13, color: 'var(--rc-fg-muted)' }}>{assignment.tipoEquipamento}</div>
            </>
          )}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--rc-fg-subtle)', marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {assignment.setorNome}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {isDone ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 22, padding: '0 8px', borderRadius: 999,
            fontSize: 12, fontWeight: 600,
            background: 'var(--rc-success-bg)', color: 'var(--rc-success)',
          }}>
            <IconCheck size={12} strokeWidth={3} /> Concluído
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            height: 22, padding: '0 8px', borderRadius: 999,
            fontSize: 12, fontWeight: 600,
            background: 'var(--rc-bg-muted)', color: 'var(--rc-fg-muted)',
          }}>
            Pendente
          </span>
        )}
        <IconChevronRight size={16} stroke="var(--rc-fg-subtle)" />
      </div>
    </button>
  );
}

function ListGlobalField({
  field, getValue, updateField,
}: {
  field: TemplateField;
  getValue: (id: string, index: number) => string | boolean;
  updateField: (id: string, index: number, value: string | boolean) => void;
}) {
  if (field.type === 'checkbox') {
    const raw = getValue(field.id, 0);
    const val = raw === true || raw === 'true' ? true : raw === false || raw === 'false' ? false : null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--rc-fg-muted)', fontWeight: 500 }}>{field.config.label}</span>
        <YesNo value={val} onChange={(v) => updateField(field.id, 0, v)} className="w-36" />
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--rc-fg-muted)', fontWeight: 600, marginBottom: 3, letterSpacing: '0.02em' }}>
        {field.config.label}
      </div>
      <input
        value={String(getValue(field.id, 0) || '')}
        onChange={(e) => updateField(field.id, 0, e.target.value)}
        placeholder={field.config.placeholder}
        style={{
          width: '100%', border: 'none', outline: 'none',
          fontSize: 14, fontWeight: 600, background: 'transparent',
          padding: 0, fontFamily: 'var(--rc-font)',
        }}
      />
    </div>
  );
}

// ─── PhotoUploadField ─────────────────────────────────────────────────────────

interface PhotoUploadFieldProps {
  field: TemplateField;
  itemIndex: number;
  getValue: (id: string, index: number) => string | boolean;
  updateField: (id: string, index: number, value: string | boolean) => void;
  onImageChange: (id: string, index: number, file: File) => void;
}

function PhotoUploadField({ field, itemIndex, getValue, updateField, onImageChange }: PhotoUploadFieldProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const value = getValue(field.id, itemIndex);
  const hasValue = !!value;

  const label = field.config.label || 'Foto';

  return (
    <button
      style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
      onClick={() => fileInputRef.current?.click()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rc-fg)' }}>{label}</div>
        {field.config.required && (
          <span style={{ fontSize: 10, fontWeight: 700, color: hasValue ? 'var(--rc-success)' : 'var(--rc-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {hasValue ? 'OK' : 'Obrig.'}
          </span>
        )}
      </div>

      {hasValue ? (
        <div style={{
          height: 120, borderRadius: 12, overflow: 'hidden', position: 'relative',
          border: '1px solid var(--rc-border)',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        }}>
          <svg width="100%" height="100%" viewBox="0 0 200 120" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="none">
            <rect x="60" y="30" width="80" height="60" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <rect x="72" y="42" width="56" height="22" fill="rgba(255,255,255,0.15)" />
            <rect x="72" y="70" width="20" height="6" rx="2" fill="rgba(255,255,255,0.25)" />
            <rect x="96" y="70" width="20" height="6" rx="2" fill="rgba(255,255,255,0.25)" />
          </svg>
          <div style={{
            position: 'absolute', left: 8, bottom: 8,
            padding: '3px 8px', borderRadius: 6,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', fontSize: 11, fontWeight: 600,
          }}>{label}</div>
          <button
            style={{
              position: 'absolute', right: 8, top: 8,
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Refazer foto"
            onClick={(e) => { e.stopPropagation(); updateField(field.id, itemIndex, ''); }}
          >
            <IconRefresh size={14} />
          </button>
        </div>
      ) : (
        <div style={{
          height: 120, borderRadius: 12,
          border: '1.5px dashed var(--rc-border-strong)',
          background: 'var(--rc-bg-muted)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 6, color: 'var(--rc-fg-muted)',
        }}>
          <IconCamera size={22} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Tirar foto</span>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageChange(field.id, itemIndex, file);
        }}
      />
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAssignmentDone(
  _assignment: ItemAssignment,
  _getValue: (id: string, index: number) => string | boolean,
): boolean {
  return false;
}

interface DateGroup {
  id: string;
  type: 'date-group';
  label: string;
  dayId: string;
  monthId: string;
  yearId: string;
  config: FieldConfig;
  bindingKey?: string | null;
}

function groupDateFields(fields: TemplateField[]) {
  const groupedFields: (TemplateField | DateGroup)[] = [];
  const hiddenFieldIds = new Set<string>();

  const dayFields = fields.filter((f) => f.config.label.toLowerCase().includes('dia'));

  dayFields.forEach((dayField) => {
    const baseLabel = dayField.config.label.toLowerCase().replace('dia', '').trim();
    const monthField = fields.find(
      (f) => f.config.label.toLowerCase().includes('mês') && f.config.label.toLowerCase().includes(baseLabel),
    );
    const yearField = fields.find(
      (f) => f.config.label.toLowerCase().includes('ano') && f.config.label.toLowerCase().includes(baseLabel),
    );

    if (monthField && yearField) {
      groupedFields.push({
        id: `date-group-${dayField.id}`,
        type: 'date-group',
        label: dayField.config.label.replace(/dia/i, 'Data'),
        dayId: dayField.id,
        monthId: monthField.id,
        yearId: yearField.id,
        config: { ...dayField.config, label: dayField.config.label.replace(/dia/i, 'Data') },
      } as DateGroup);

      hiddenFieldIds.add(dayField.id);
      hiddenFieldIds.add(monthField.id);
      hiddenFieldIds.add(yearField.id);
    }
  });

  fields.forEach((f) => {
    if (!hiddenFieldIds.has(f.id)) groupedFields.push(f);
  });

  return { groupedFields, hiddenFieldIds };
}

function DateGroupField({
  group, itemIndex, getValue, updateField,
}: {
  group: DateGroup; itemIndex: number;
  getValue: (id: string, index: number) => string | boolean;
  updateField: (id: string, index: number, value: string | boolean) => void;
}) {
  const day = String(getValue(group.dayId, itemIndex) || '');
  const month = String(getValue(group.monthId, itemIndex) || '');
  const year = String(getValue(group.yearId, itemIndex) || '');

  const dateVal =
    year && month && day
      ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : (new Date().toISOString().split('T')[0] ?? '');

  const handleDateChange = (val: string) => {
    if (!val) return;
    const parts = val.split('-');
    const y = parts[0] ?? '';
    const m = parts[1] ?? '';
    const d = parts[2] ?? '';
    updateField(group.dayId, itemIndex, d);
    updateField(group.monthId, itemIndex, m);
    updateField(group.yearId, itemIndex, y);
  };

  React.useEffect(() => {
    if (!day || !month || !year) handleDateChange(dateVal);
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{group.label}</label>
      <input
        type="date"
        value={dateVal}
        onChange={(e) => handleDateChange(e.target.value)}
        className="w-full h-12 px-4 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
      />
    </div>
  );
}
