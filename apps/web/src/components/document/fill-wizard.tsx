import * as React from 'react';
import { TemplateField, FieldType, ItemAssignment } from '@regcheck/shared';
import { ProgressBar, SectionLabel, YesNo } from '../ui/regcheck-ui';
import { Button, Badge, Spinner, cn } from '@regcheck/ui';
import { IconChevronLeft, IconChevronRight, IconCheck, IconX, IconCamera, IconRefresh } from '@/components/ui/icons'; 
import { SignatureCanvas } from '@/components/document/signature-canvas';

interface WizardProps {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  children: React.ReactNode;
}

export function Wizard({ step, totalSteps, onNext, onPrev, onFinish, children }: WizardProps) {
  const progress = (step / (totalSteps - 1)) * 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <ProgressBar value={progress} className="flex-1" height={8} />
        <span className="text-sm font-bold text-primary min-w-[3rem] text-right">
          {Math.round(progress)}%
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
  onNext: () => void;
}

export function GlobalForm({ fields, getValue, updateField, onNext }: GlobalFormProps) {
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
            {identificationFields.map(f => (
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
          {observationFields.map(f => (
            <textarea
              key={f.id}
              value={String(getValue(f.id, itemIndex) || '')}
              onChange={(e) => updateField(f.id, itemIndex, e.target.value)}
              placeholder={f.config.placeholder || 'Descreva qualquer irregularidade...'}
              className="w-full min-h-[100px] p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium resize-none"
            />
          ))}
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
}

function PhotoUploadField({ field, itemIndex, getValue, updateField, onImageChange }: PhotoUploadFieldProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const value = getValue(field.id, itemIndex);
  const hasValue = !!value;

  return (
    <div 
      className={cn(
        "relative h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
        hasValue ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      {hasValue ? (
        <>
          <div className="bg-primary text-white p-2 rounded-full shadow-lg animate-in zoom-in duration-300">
            <IconCheck size={20} />
          </div>
          <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">Foto Capturada</span>
          <button 
            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70"
            onClick={(e) => { e.stopPropagation(); updateField(field.id, itemIndex, ''); }}
          >
            <IconRefresh size={14} />
          </button>
        </>
      ) : (
        <>
          <div className="text-muted-foreground opacity-50">
            <IconCamera size={28} />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tirar Foto</span>
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
  
  const dayFields = fields.filter(f => f.config.label.toLowerCase().includes('dia'));
  
  dayFields.forEach(dayField => {
    const baseLabel = dayField.config.label.toLowerCase().replace('dia', '').trim();
    const monthField = fields.find(f => f.config.label.toLowerCase().includes('mês') && f.config.label.toLowerCase().includes(baseLabel));
    const yearField = fields.find(f => f.config.label.toLowerCase().includes('ano') && f.config.label.toLowerCase().includes(baseLabel));
    
    if (monthField && yearField) {
      groupedFields.push({
        id: `date-group-${dayField.id}`,
        type: 'date-group',
        label: dayField.config.label.replace(/dia/i, 'Data'),
        dayId: dayField.id,
        monthId: monthField.id,
        yearId: yearField.id,
        config: { ...dayField.config, label: dayField.config.label.replace(/dia/i, 'Data') }
      } as DateGroup);
      
      hiddenFieldIds.add(dayField.id);
      hiddenFieldIds.add(monthField.id);
      hiddenFieldIds.add(yearField.id);
    }
  });
  
  fields.forEach(f => {
    if (!hiddenFieldIds.has(f.id)) {
      groupedFields.push(f);
    }
  });
  
  return { groupedFields, hiddenFieldIds };
}

function DateGroupField({ group, itemIndex, getValue, updateField }: { group: any, itemIndex: number, getValue: any, updateField: any }) {
  const day = String(getValue(group.dayId, itemIndex) || '');
  const month = String(getValue(group.monthId, itemIndex) || '');
  const year = String(getValue(group.yearId, itemIndex) || '');
  
  const dateVal = year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : new Date().toISOString().split('T')[0];

  const handleDateChange = (val: string) => {
    if (!val) return;
    const [y, m, d] = val.split('-');
    updateField(group.dayId, itemIndex, d);
    updateField(group.monthId, itemIndex, m);
    updateField(group.yearId, itemIndex, y);
  };

  React.useEffect(() => {
    if (!day || !month || !year) {
      handleDateChange(dateVal);
    }
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
        {group.label}
      </label>
      <input
        type="date"
        value={dateVal}
        onChange={(e) => handleDateChange(e.target.value)}
        className="w-full h-12 px-4 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
      />
    </div>
  );
}
