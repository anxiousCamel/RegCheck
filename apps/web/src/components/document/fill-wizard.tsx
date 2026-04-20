import * as React from 'react';
import { TemplateField, FieldType, ItemAssignment } from '@regcheck/shared';
import { ProgressBar, SectionLabel, YesNo } from '../ui/regcheck-ui';
import { Button, Badge, Spinner, cn } from '@regcheck/ui';
import { IconChevronLeft, IconChevronRight, IconCheck, IconX, IconCamera, IconRefresh } from '@/components/ui/icons'; 
import { SignatureCanvas } from '@/components/document/signature-canvas';
import { api } from '@/lib/api';

interface WizardProps {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  children: React.ReactNode;
  progress?: number;
}

export function Wizard({ step, totalSteps, onNext, onPrev, onFinish, children, progress }: WizardProps) {
  const displayProgress = progress !== undefined ? progress : (step / (totalSteps - 1)) * 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <ProgressBar value={displayProgress} className="flex-1" height={8} />
        <span className="text-sm font-bold text-primary min-w-[3rem] text-right">
          {Math.round(displayProgress)}%
        </span>
      </div>
      <div className="min-h-[400px]">
        {children}
      </div>
    </div>
  );
}

// ─── GlobalForm ───────────────────────────────────────────────────────────────

interface GlobalFormProps {
  fields: TemplateField[];
  getValue: (id: string, index: number) => string | boolean;
  updateField: (id: string, index: number, value: string | boolean) => void;
  onImageChange: (id: string, index: number, file: File) => void;
  getFileKey: (id: string, index: number) => string | undefined;
  getPendingBlobForField: (id: string, index: number) => Blob | undefined;
  onNext: () => void;
}

export function GlobalForm({ 
  fields, 
  getValue, 
  updateField, 
  onImageChange,
  getFileKey,
  getPendingBlobForField,
  onNext 
}: GlobalFormProps) {
  // Group fields
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

          if (field.type === 'image') {
            return (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{field.config.label}</label>
                <PhotoUploadField 
                  field={field}
                  itemIndex={0}
                  getValue={getValue}
                  updateField={updateField}
                  onImageChange={onImageChange}
                  getFileKey={getFileKey}
                  getPendingBlobForField={getPendingBlobForField}
                />
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
  getFileKey: (id: string, index: number) => string | undefined;
  getPendingBlobForField: (id: string, index: number) => Blob | undefined;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
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
  getFileKey,
  getPendingBlobForField,
}: EquipmentStepProps) {
  const itemIndex = assignment.itemIndex;

  // Group fields
  const { groupedFields, hiddenFieldIds } = groupDateFields(fields);

  // Categorize fields
  const identificationFields = groupedFields.filter(f => f.type === 'text' && f.bindingKey);
  const checklistFields = groupedFields.filter(f => f.type === 'checkbox');
  const observationFields = groupedFields.filter(f => f.type === 'text' && !f.bindingKey);
  const photoFields = groupedFields.filter(f => f.type === 'image');
  const signatureFields = groupedFields.filter(f => f.type === 'signature');
  const dateGroups = groupedFields.filter(f => f.type === 'date-group');

  const setAllChecklist = (val: boolean) => {
    checklistFields.forEach(f => updateField(f.id, itemIndex, val));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground leading-tight">
            {assignment.setorNome}
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            {assignment.numeroEquipamento} • {index + 1} de {total}
          </p>
        </div>
        <Badge variant="outline" className="h-7 px-3 text-xs font-bold bg-muted/50 border-border">
          {index + 1}/{total}
        </Badge>
      </div>

      {/* Identification */}
      {identificationFields.length > 0 && (
        <section>
          <SectionLabel right={<span className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-50"><IconCheck size={10} /> Auto</span>}>
            Identificação
          </SectionLabel>
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50 grid grid-cols-1 gap-y-3">
            {identificationFields
              // Deduplicate by bindingKey to avoid "Número da Balança" and "Nº da Balança" appearing twice
              .filter((f, i, self) => 
                i === self.findIndex((t) => t.bindingKey === f.bindingKey)
              )
              .map(f => (
                <div key={f.id} className="flex justify-between items-center gap-4">
                  <span className="text-sm text-muted-foreground font-medium">{f.config.label}</span>
                  <span className="text-sm font-bold text-foreground text-right">{String(getValue(f.id, itemIndex) || '—')}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Checklist */}
      {checklistFields.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel className="mb-0">Checklist</SectionLabel>
            <div className="flex gap-2">
              <button 
                onClick={() => setAllChecklist(true)}
                className="text-[10px] font-bold text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
              >
                TUDO SIM
              </button>
              <button 
                onClick={() => setAllChecklist(false)}
                className="text-[10px] font-bold text-destructive hover:underline bg-destructive/5 px-2 py-1 rounded"
              >
                TUDO NÃO
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {checklistFields.map(f => (
              <div key={f.id} className="bg-white p-4 rounded-xl shadow-sm border border-border flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-foreground leading-tight">{f.config.label}</span>
                  {f.config.required && <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider">Obrigatório</span>}
                </div>
                <YesNo 
                  value={getValue(f.id, itemIndex) === 'true' || getValue(f.id, itemIndex) === true ? true : getValue(f.id, itemIndex) === 'false' || getValue(f.id, itemIndex) === false ? false : null}
                  onChange={(val) => updateField(f.id, itemIndex, val)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dates */}
      {dateGroups.length > 0 && (
        <section>
          <SectionLabel>Datas</SectionLabel>
          <div className="space-y-4">
            {dateGroups.map(g => (
              <DateGroupField 
                key={g.id}
                group={g}
                itemIndex={itemIndex}
                getValue={getValue}
                updateField={updateField}
              />
            ))}
          </div>
        </section>
      )}

      {/* Observations */}
      {observationFields.length > 0 && (
        <section>
          <SectionLabel>Observações</SectionLabel>
          <div className="space-y-4">
            {observationFields.map(f => (
              <div key={f.id} className="space-y-2">
                <label className="text-[13px] font-bold text-foreground ml-1 flex items-center gap-2">
                  {f.config.label}
                  {f.config.required && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={String(getValue(f.id, itemIndex) || '')}
                  onChange={(e) => updateField(f.id, itemIndex, e.target.value)}
                  placeholder={f.config.placeholder || 'Descreva qualquer irregularidade...'}
                  className="w-full min-h-[100px] p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium resize-none shadow-sm"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Photos */}
      {photoFields.length > 0 && (
        <section>
          <SectionLabel>Fotos</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {photoFields.map(f => (
              <div key={f.id} className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground ml-1">{f.config.label}</span>
                <PhotoUploadField 
                  field={f}
                  itemIndex={itemIndex}
                  getValue={getValue}
                  updateField={updateField}
                  onImageChange={onImageChange}
                  getFileKey={getFileKey}
                  getPendingBlobForField={getPendingBlobForField}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Signatures */}
      {signatureFields.length > 0 && (
        <section>
          <SectionLabel>Assinatura</SectionLabel>
          <div className="space-y-4">
            {signatureFields.map(f => (
              <div key={f.id} className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground ml-1">{f.config.label}</span>
                <div className="bg-white p-3 rounded-xl border border-border shadow-sm">
                  <SignatureCanvas 
                    value={String(getValue(f.id, itemIndex) || '')} 
                    onChange={(dataUrl) => updateField(f.id, itemIndex, dataUrl)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-4 border-t border-border mt-8">
        <Button 
          variant="outline" 
          onClick={onPrev} 
          className="h-14 w-14 rounded-xl border-2 shrink-0"
        >
          <IconChevronLeft className="h-6 w-6" />
        </Button>
        <Button 
          onClick={onNext} 
          className="h-14 flex-1 text-lg font-bold rounded-xl shadow-lg"
        >
          {isLast ? 'Finalizar' : 'Próximo equipamento'} <IconChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
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
  getFileKey: (id: string, index: number) => string | undefined;
  getPendingBlobForField: (id: string, index: number) => Blob | undefined;
}

function PhotoUploadField({ 
  field, 
  itemIndex, 
  getValue, 
  updateField, 
  onImageChange,
  getFileKey,
  getPendingBlobForField
}: PhotoUploadFieldProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const value = getValue(field.id, itemIndex);
  const fileKey = getFileKey(field.id, itemIndex);
  const pendingBlob = getPendingBlobForField(field.id, itemIndex);
  const hasValue = !!value;

  // Refactored preview logic for maximum stability
  const [blobPreview, setBlobPreview] = React.useState<string | null>(null);
  const [serverPreview, setServerPreview] = React.useState<string | null>(null);
  const [isServerLoading, setIsServerLoading] = React.useState(false);
  
  // 1. Handle local blob changes
  React.useEffect(() => {
    if (pendingBlob) {
      const url = URL.createObjectURL(pendingBlob);
      setBlobPreview(url);
      // When we have a new blob, clear the old server preview to avoid confusion
      setServerPreview(null);
      return () => URL.revokeObjectURL(url);
    } else {
      setBlobPreview(null);
    }
  }, [pendingBlob]);

  // 2. Handle server key changes
  React.useEffect(() => {
    if (fileKey) {
      const url = `${api.getImageUrl(fileKey)}&t=${Date.now()}`;
      setServerPreview(url);
      setIsServerLoading(true);
    } else {
      setServerPreview(null);
      setIsServerLoading(false);
    }
  }, [fileKey]);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('[PhotoPreview] Error loading:', e.currentTarget.src);
    setIsServerLoading(false);
  };

  const handleImgLoad = () => {
    setIsServerLoading(false);
  };

  return (
    <div 
      className={cn(
        "relative h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden group",
        hasValue ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      {/* Priority 1: Server Preview (if loaded or loading) */}
      {serverPreview && (
        <img 
          src={serverPreview} 
          alt="Server Preview" 
          onLoad={handleImgLoad}
          onError={handleImgError}
          className={cn(
            "absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300",
            isServerLoading ? "opacity-0" : "opacity-100"
          )}
        />
      )}

      {/* Priority 2: Local Blob Preview (acts as fallback and background) */}
      {blobPreview && (
        <img 
          src={blobPreview} 
          alt="Local Preview" 
          className={cn(
            "absolute inset-0 w-full h-full object-cover z-0",
            // Keep visible if server is still loading
            "opacity-100"
          )}
        />
      )}

      {/* Loading Spinner */}
      {isServerLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] z-20">
          <Spinner className="w-6 h-6 text-white" />
        </div>
      )}

      {!blobPreview && !serverPreview && (
        <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10">
            <IconCamera size={24} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Tirar Foto</span>
        </div>
      )}

      {(blobPreview || serverPreview) && (
        <>
          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors z-30" />
          <div className="relative z-40 bg-white/90 backdrop-blur-sm text-primary px-3 py-1 rounded-full shadow-lg flex items-center gap-2 transform group-hover:scale-105 transition-transform">
            <IconCheck size={14} className="stroke-[3]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Alterar Foto</span>
          </div>
          <button 
            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-red-500 transition-colors z-50"
            onClick={(e) => { e.stopPropagation(); updateField(field.id, itemIndex, ''); }}
          >
            <IconRefresh size={14} />
          </button>
        </>
      )}
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept="image/*" 
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImageChange(field.id, itemIndex, file);
          }
        }}
      />
    </div>
  );
}

// ─── Date Grouping Logic ──────────────────────────────────────────────────────

interface DateGroup {
  id: string;
  type: 'date-group';
  label: string;
  dayId: string;
  monthId: string;
  yearId: string;
  config: any;
  bindingKey?: string | null;
}

function groupDateFields(fields: TemplateField[]) {
  const groupedFields: (any)[] = [];
  const hiddenFieldIds = new Set<string>();
  
  // 1. Group by bindingKey (e.g. global.data.dia, global.data.mes, global.data.ano)
  const bindingGroups = new Map<string, { day: string[]; month: string[]; year: string[] }>();
  
  fields.forEach(f => {
    if (!f.bindingKey) return;
    const parts = f.bindingKey.toLowerCase().split('.');
    if (parts.length < 2) return;
    
    const suffix = parts[parts.length - 1];
    const base = parts.slice(0, -1).join('.');
    
    if (['dia', 'mes', 'mês', 'ano'].includes(suffix)) {
      if (!bindingGroups.has(base)) {
        bindingGroups.set(base, { day: [], month: [], year: [] });
      }
      const group = bindingGroups.get(base)!;
      if (suffix === 'dia') group.day.push(f.id);
      else if (suffix === 'mes' || suffix === 'mês') group.month.push(f.id);
      else if (suffix === 'ano') group.year.push(f.id);
    }
  });

  bindingGroups.forEach((ids, base) => {
    if (ids.day.length > 0 && ids.month.length > 0 && ids.year.length > 0) {
      const firstDayId = ids.day[0];
      const dayField = fields.find(f => f.id === firstDayId)!;
      
      groupedFields.push({
        id: `date-group-binding-${base}`,
        type: 'date-group',
        label: dayField.config.label.replace(/dia/i, 'Data').replace(/\..*$/, ''),
        dayIds: ids.day,
        monthIds: ids.month,
        yearIds: ids.year,
        bindingKey: base,
        config: { ...dayField.config, label: dayField.config.label.replace(/dia/i, 'Data') }
      });
      
      [...ids.day, ...ids.month, ...ids.year].forEach(id => hiddenFieldIds.add(id));
    }
  });

  // 2. Fallback to label-based grouping for fields without bindingKey
  const remainingFields = fields.filter(f => !hiddenFieldIds.has(f.id));
  const dayFields = remainingFields.filter(f => {
    const label = f.config.label.toLowerCase();
    return label.includes('dia') && !label.includes('diário') && !label.includes('diagnóstico');
  });
  
  dayFields.forEach(dayField => {
    const fullLabel = dayField.config.label.toLowerCase();
    // Remove "dia" to find the base context (e.g. "do ti" from "dia do ti")
    const baseContext = fullLabel.replace('dia', '').trim();
    
    const monthField = remainingFields.find(f => {
      if (hiddenFieldIds.has(f.id)) return false;
      const l = f.config.label.toLowerCase();
      const isMonth = l.includes('mês') || l.includes('mes');
      return isMonth && (baseContext === '' || l.includes(baseContext));
    });
    
    const yearField = remainingFields.find(f => {
      if (hiddenFieldIds.has(f.id)) return false;
      const l = f.config.label.toLowerCase();
      const isYear = l.includes('ano');
      return isYear && (baseContext === '' || l.includes(baseContext));
    });
    
    if (monthField && yearField) {
      groupedFields.push({
        id: `date-group-label-${dayField.id}`,
        type: 'date-group',
        label: dayField.config.label.replace(/dia/i, 'Data'),
        dayIds: [dayField.id],
        monthIds: [monthField.id],
        yearIds: [yearField.id],
        config: { ...dayField.config, label: dayField.config.label.replace(/dia/i, 'Data') }
      });
      
      hiddenFieldIds.add(dayField.id);
      hiddenFieldIds.add(monthField.id);
      hiddenFieldIds.add(yearField.id);
    }
  });
  
  // 3. Add all other fields
  fields.forEach(f => {
    if (!hiddenFieldIds.has(f.id)) {
      groupedFields.push(f);
    }
  });
  
  return { groupedFields, hiddenFieldIds };
}

function DateGroupField({ group, itemIndex, getValue, updateField }: { group: any, itemIndex: number, getValue: any, updateField: any }) {
  const day = String(getValue(group.dayIds[0], itemIndex) || '');
  const month = String(getValue(group.monthIds[0], itemIndex) || '');
  const year = String(getValue(group.yearIds[0], itemIndex) || '');
  
  const dateVal = year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : new Date().toISOString().split('T')[0];

  const handleDateChange = (val: string) => {
    if (!val) return;
    const [y, m, d] = val.split('-');
    group.dayIds.forEach((id: string) => updateField(id, itemIndex, d));
    group.monthIds.forEach((id: string) => updateField(id, itemIndex, m));
    group.yearIds.forEach((id: string) => updateField(id, itemIndex, y));
  };

  React.useEffect(() => {
    if (!day || !month || !year) {
      handleDateChange(dateVal);
    }
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          {group.label}
        </label>
        {group.bindingKey && (
          <span className="text-[10px] text-primary/50 font-bold uppercase tracking-widest flex items-center gap-1">
            <IconCheck size={10} /> Sincronizado
          </span>
        )}
      </div>
      <input
        type="date"
        value={dateVal}
        onChange={(e) => handleDateChange(e.target.value)}
        className="w-full h-12 px-4 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
      />
    </div>
  );
}
