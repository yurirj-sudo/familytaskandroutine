import React, { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Task, TaskFrequency, TaskType } from '../../types';
import { getNextOccurrences } from '../../utils/recurrence';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(80),
  description: z.string().max(200).optional(),
  category: z.string().min(1, 'Categoria obrigatória'),
  emoji: z.string().max(4).optional(),
  type: z.enum(['mandatory', 'optional']),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'monthly_relative', 'once']),
  activeDays: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(28).optional(),
  weekOfMonth: z.number().min(1).max(4).optional(),
  dayOfWeekRelative: z.number().min(0).max(6).optional(),
  dueTime: z.string().optional(),
  // Both always positive in the UI — TaskFormPage negates pointsOnMiss when saving
  pointsOnComplete: z.number().min(0, 'Mínimo 0').max(1000),
  pointsOnMiss: z.number().min(0, 'Mínimo 0').max(1000),
  assignedTo: z.union([z.literal('all'), z.array(z.string()).min(1, 'Selecione ao menos um membro')]),
  startDate: z.string().optional(),
  requireApproval: z.boolean(),
  requirePhotoProof: z.boolean(),
  sharedCompletion: z.boolean(),
});

export type TaskFormValues = z.infer<typeof schema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CATEGORIES = ['higiene', 'escola', 'casa', 'alimentação', 'exercício', 'outro'];
const WEEK_OF_MONTH_LABELS = ['1ª', '2ª', '3ª', '4ª'];

export interface MemberOption {
  uid: string;
  displayName: string;
  avatar: string;
}

interface TaskFormProps {
  initialValues?: Partial<Task>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  members?: MemberOption[];
}

// ─── Input class helpers ──────────────────────────────────────────────────────

function fieldLabel(children: React.ReactNode) {
  return (
    <label className="block text-on-surface-variant text-sm font-headline font-bold mb-1 ml-1">
      {children}
    </label>
  );
}

function inputClass(error?: { message?: string }) {
  return `w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 ${
    error ? 'ring-2 ring-error' : 'focus:ring-primary'
  } transition-all`;
}

function selectClass(error?: { message?: string }) {
  return `w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-on-surface text-sm focus:outline-none focus:ring-2 ${
    error ? 'ring-2 ring-error' : 'focus:ring-primary'
  } transition-all`;
}

// ─── TaskForm ─────────────────────────────────────────────────────────────────

export const TaskForm: React.FC<TaskFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isEditing = false,
  members = [],
}) => {
  // pointsOnMiss is stored as negative in Firestore — show absolute value in UI
  const initialPointsOnMiss = Math.abs(initialValues?.pointsOnMiss ?? 0);

  const defaultValues: TaskFormValues = {
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
    category: initialValues?.category ?? 'casa',
    emoji: initialValues?.emoji ?? '',
    type: (initialValues?.type as TaskType) ?? 'optional',
    frequency: (initialValues?.frequency as TaskFrequency) ?? 'daily',
    activeDays: initialValues?.activeDays ?? [],
    dayOfMonth: initialValues?.dayOfMonth ?? 1,
    weekOfMonth: (initialValues?.weekOfMonth as 1 | 2 | 3 | 4) ?? 1,
    dayOfWeekRelative: initialValues?.dayOfWeekRelative ?? 1,
    dueTime: initialValues?.dueTime ?? '',
    pointsOnComplete: initialValues?.pointsOnComplete ?? 10,
    pointsOnMiss: initialPointsOnMiss,
    assignedTo: initialValues?.assignedTo ?? 'all',
    startDate: '',
    requireApproval: initialValues?.requireApproval ?? false,
    requirePhotoProof: initialValues?.requirePhotoProof ?? false,
    sharedCompletion: initialValues?.sharedCompletion ?? false,
  };

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({ resolver: zodResolver(schema), defaultValues });

  const frequency = watch('frequency');
  const type = watch('type');
  const activeDays = watch('activeDays') ?? [];
  const weekOfMonth = watch('weekOfMonth');
  const dayOfWeekRelative = watch('dayOfWeekRelative');
  const dayOfMonth = watch('dayOfMonth');
  const assignedTo = watch('assignedTo');
  const requireApproval = watch('requireApproval');
  const requirePhotoProof = watch('requirePhotoProof');
  const sharedCompletion = watch('sharedCompletion');

  // Auto-reset penalty when switching to optional
  useEffect(() => {
    if (type === 'optional') setValue('pointsOnMiss', 0);
  }, [type, setValue]);

  // ─── Next occurrences preview ────────────────────────────────────────────

  const previewDates = useMemo(() => {
    const mockTask = {
      frequency,
      activeDays: activeDays ?? [],
      dayOfMonth: dayOfMonth ?? 1,
      weekOfMonth: (weekOfMonth ?? 1) as 1 | 2 | 3 | 4,
      dayOfWeekRelative: dayOfWeekRelative ?? 1,
    } as Partial<Task>;
    return getNextOccurrences(mockTask as Task, 3);
  }, [frequency, activeDays, dayOfMonth, weekOfMonth, dayOfWeekRelative]);

  const toggleDay = (day: number) => {
    const current = activeDays ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    setValue('activeDays', next);
  };

  // ─── Assignment helpers ──────────────────────────────────────────────────

  const isAssignedToAll = assignedTo === 'all';
  const selectedUids: string[] = isAssignedToAll ? [] : (assignedTo as string[]);

  const toggleMember = (uid: string) => {
    const current = selectedUids;
    const next = current.includes(uid)
      ? current.filter((id) => id !== uid)
      : [...current, uid];
    // If all deselected, go back to 'all'
    setValue('assignedTo', next.length === 0 ? 'all' : next);
  };

  const handleFormSubmit = async (values: TaskFormValues) => {
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

      {/* Title */}
      <div>
        {fieldLabel('Título *')}
        <input
          {...register('title')}
          className={inputClass(errors.title)}
          placeholder="Ex: Escovar os dentes"
        />
        {errors.title && (
          <p className="text-error text-xs mt-1 ml-2">{errors.title.message}</p>
        )}
      </div>

      {/* Emoji + Category row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          {fieldLabel('Emoji')}
          <input
            {...register('emoji')}
            className={inputClass(errors.emoji)}
            placeholder="🦷"
            maxLength={4}
          />
        </div>
        <div>
          {fieldLabel('Categoria *')}
          <select {...register('category')} className={selectClass(errors.category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        {fieldLabel('Descrição (opcional)')}
        <textarea
          {...register('description')}
          className="w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all"
          rows={2}
          placeholder="Detalhes adicionais..."
        />
      </div>

      {/* Type */}
      <div>
        {fieldLabel('Tipo')}
        <div className="grid grid-cols-2 gap-2">
          {(['optional', 'mandatory'] as TaskType[]).map((t) => (
            <label key={t} className="cursor-pointer">
              <input {...register('type')} type="radio" value={t} className="sr-only" />
              <div
                className={`rounded-DEFAULT border-2 px-3 py-2.5 text-center text-sm transition-colors ${
                  type === t
                    ? t === 'mandatory'
                      ? 'border-error bg-error-container/15 text-error'
                      : 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {t === 'mandatory' ? '⚠️ Obrigatória' : '⭐ Opcional'}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div>
        {fieldLabel('Frequência')}
        <select {...register('frequency')} className={selectClass()}>
          <option value="daily">Diária</option>
          <option value="weekly">Semanal (dias específicos)</option>
          <option value="monthly">Mensal (dia do mês)</option>
          <option value="monthly_relative">Mensal (semana relativa)</option>
          <option value="once">Uma vez</option>
        </select>
      </div>

      {/* Weekly — Active days */}
      {frequency === 'weekly' && (
        <div>
          {fieldLabel('Dias da semana')}
          <div className="flex gap-1.5 flex-wrap">
            {WEEK_DAYS.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-10 h-10 rounded-full text-xs font-headline font-bold transition-colors ${
                  activeDays.includes(i)
                    ? 'primary-gradient text-on-primary shadow-primary-glow'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly — Day of month */}
      {frequency === 'monthly' && (
        <div>
          {fieldLabel('Dia do mês')}
          <Controller
            control={control}
            name="dayOfMonth"
            render={({ field }) => (
              <input
                type="number"
                min={1}
                max={28}
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={inputClass(errors.dayOfMonth)}
              />
            )}
          />
        </div>
      )}

      {/* Monthly relative */}
      {frequency === 'monthly_relative' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            {fieldLabel('Semana do mês')}
            <Controller
              control={control}
              name="weekOfMonth"
              render={({ field }) => (
                <select
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={selectClass()}
                >
                  {WEEK_OF_MONTH_LABELS.map((label, i) => (
                    <option key={i + 1} value={i + 1}>
                      {label} semana
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
          <div>
            {fieldLabel('Dia da semana')}
            <Controller
              control={control}
              name="dayOfWeekRelative"
              render={({ field }) => (
                <select
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={selectClass()}
                >
                  {WEEK_DAYS.map((day, i) => (
                    <option key={i} value={i}>
                      {day}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
      )}

      {/* Once — start date */}
      {frequency === 'once' && (
        <div>
          {fieldLabel('Data')}
          <input
            {...register('startDate')}
            type="date"
            className={inputClass(errors.startDate as { message?: string })}
          />
        </div>
      )}

      {/* Next occurrences preview */}
      {frequency !== 'once' && previewDates.length > 0 && (
        <div className="bg-surface-container-low rounded-DEFAULT px-4 py-3">
          <p className="text-on-surface-variant text-xs font-headline font-bold mb-2">
            📅 Próximas ocorrências:
          </p>
          <div className="flex gap-2 flex-wrap">
            {previewDates.map((d) => (
              <span
                key={d}
                className="text-xs bg-primary/10 text-primary font-headline font-bold rounded-full px-2.5 py-1"
              >
                {new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                }).format(new Date(d))}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Due time */}
      <div>
        {fieldLabel('Horário limite (opcional)')}
        <input
          {...register('dueTime')}
          type="time"
          className={inputClass()}
          placeholder="08:00"
        />
      </div>

      {/* Points */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          {fieldLabel('Pontos ao concluir')}
          <Controller
            control={control}
            name="pointsOnComplete"
            render={({ field }) => (
              <input
                type="number"
                min={0}
                max={1000}
                {...field}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return;
                  const num = Number(raw);
                  if (!isNaN(num)) field.onChange(num);
                }}
                className={inputClass(errors.pointsOnComplete)}
              />
            )}
          />
          {errors.pointsOnComplete && (
            <p className="text-error text-xs mt-1 ml-2">{errors.pointsOnComplete.message}</p>
          )}
        </div>
        <div>
          {fieldLabel(type === 'mandatory' ? 'Penalidade (pts)' : 'Penalidade')}
          <Controller
            control={control}
            name="pointsOnMiss"
            render={({ field }) => (
              <input
                type="number"
                min={0}
                max={1000}
                {...field}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return;
                  const num = Number(raw);
                  if (!isNaN(num)) field.onChange(num);
                }}
                disabled={type === 'optional'}
                className={`${inputClass(errors.pointsOnMiss)} ${
                  type === 'optional' ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            )}
          />
          {type === 'mandatory' && (
            <p className="text-on-surface-variant text-xs mt-1 ml-2">
              Será descontado automaticamente
            </p>
          )}
          {errors.pointsOnMiss && (
            <p className="text-error text-xs mt-1 ml-2">{errors.pointsOnMiss.message}</p>
          )}
        </div>
      </div>

      {/* Assignment */}
      <div>
        {fieldLabel('Atribuição')}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Livre */}
          <button
            type="button"
            onClick={() => setValue('assignedTo', 'all')}
            className={`rounded-DEFAULT border-2 px-3 py-2.5 text-sm transition-colors flex items-center justify-center gap-1.5 ${
              isAssignedToAll
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-transparent bg-surface-container-low text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">public</span>
            Livre
          </button>
          {/* Atribuir */}
          <button
            type="button"
            onClick={() => {
              if (isAssignedToAll && members.length > 0) {
                setValue('assignedTo', [members[0].uid]);
              }
            }}
            className={`rounded-DEFAULT border-2 px-3 py-2.5 text-sm transition-colors flex items-center justify-center gap-1.5 ${
              !isAssignedToAll
                ? 'border-secondary bg-secondary/5 text-secondary'
                : 'border-transparent bg-surface-container-low text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">person</span>
            Atribuir a
          </button>
        </div>

        {/* Livre description */}
        {isAssignedToAll && (
          <p className="text-on-surface-variant text-xs ml-1">
            Qualquer membro pode executar esta tarefa.
          </p>
        )}

        {/* Member chips */}
        {!isAssignedToAll && members.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {members.map((m) => {
              const selected = selectedUids.includes(m.uid);
              return (
                <button
                  key={m.uid}
                  type="button"
                  onClick={() => toggleMember(m.uid)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="text-base leading-none">{m.avatar || '👤'}</span>
                  {m.displayName}
                  {selected && (
                    <span className="material-symbols-outlined text-sm">check</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!isAssignedToAll && members.length === 0 && (
          <p className="text-on-surface-variant text-xs ml-1">
            Nenhum membro encontrado na família.
          </p>
        )}

        {errors.assignedTo && (
          <p className="text-error text-xs mt-1 ml-2">{errors.assignedTo.message as string}</p>
        )}
      </div>

      {/* Approval & Photo proof toggles */}
      <div className="bg-surface-container-low rounded-DEFAULT px-4 py-3 space-y-3">
        <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-1">
          Verificação
        </p>

        {/* Require Approval */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-on-surface text-sm font-medium">Requer aprovação do admin</p>
            <p className="text-on-surface-variant text-xs">Pontos só são creditados após aprovação</p>
          </div>
          <Controller
            control={control}
            name="requireApproval"
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  field.value ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${
                    field.value ? 'left-[26px]' : 'left-[2px]'
                  }`}
                />
              </button>
            )}
          />
        </div>

        {/* Require Photo Proof */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-on-surface text-sm font-medium">Exigir foto como prova</p>
            <p className="text-on-surface-variant text-xs">Membro deve tirar foto ao concluir</p>
          </div>
          <Controller
            control={control}
            name="requirePhotoProof"
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  field.value ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${
                    field.value ? 'left-[26px]' : 'left-[2px]'
                  }`}
                />
              </button>
            )}
          />
        </div>

        {/* Shared Completion */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-outline-variant/15">
          <div>
            <p className="text-on-surface text-sm font-medium">Tarefa única para o grupo</p>
            <p className="text-on-surface-variant text-xs">Quando alguém concluir, desaparece para os demais</p>
          </div>
          <Controller
            control={control}
            name="sharedCompletion"
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  field.value ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${
                  field.value ? 'left-[26px]' : 'left-[2px]'
                }`} />
              </button>
            )}
          />
        </div>

        {/* Combined hint */}
        {(requireApproval || requirePhotoProof || sharedCompletion) && (
          <div className="flex items-start gap-1.5 pt-1">
            <span className="material-symbols-outlined text-primary text-base mt-0.5">info</span>
            <p className="text-on-surface-variant text-xs">
              {sharedCompletion && requirePhotoProof && requireApproval
                ? 'Tarefa única: o primeiro a concluir (com foto e aprovação) libera para todos.'
                : sharedCompletion && requireApproval
                ? 'Tarefa única: o primeiro a ter aprovação libera para todos.'
                : sharedCompletion
                ? 'Tarefa única: o primeiro a concluir libera para os demais.'
                : requirePhotoProof && requireApproval
                ? 'O membro tira uma foto e o admin aprova antes dos pontos serem creditados.'
                : requirePhotoProof
                ? 'O membro deverá tirar uma foto ao concluir a tarefa.'
                : 'O admin precisará aprovar a conclusão antes dos pontos serem creditados.'}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-full py-3 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 primary-gradient text-on-primary font-headline font-bold rounded-full py-3 shadow-primary-glow flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSubmitting && (
            <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
          )}
          {isEditing ? 'Salvar alterações' : 'Criar tarefa'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
