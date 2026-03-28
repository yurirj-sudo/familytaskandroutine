import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Prize } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(60),
  description: z.string().max(200).optional(),
  emoji: z.string().max(4).optional(),
  pointsCost: z.number().min(1, 'Mínimo 1 ponto').max(99999),
  hasLimit: z.boolean(),
  quantity: z.number().min(1).max(9999).optional(),
});

export type PrizeFormValues = z.infer<typeof schema>;

interface PrizeFormProps {
  initialValues?: Partial<Prize>;
  onSubmit: (values: PrizeFormValues) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

function ic(error?: { message?: string }) {
  return `w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 ${error ? 'ring-2 ring-error' : 'focus:ring-primary'} transition-all`;
}

export const PrizeForm: React.FC<PrizeFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isEditing = false,
}) => {
  const hasInitialLimit = initialValues?.quantity != null;

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PrizeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
      emoji: initialValues?.emoji ?? '',
      pointsCost: initialValues?.pointsCost ?? 50,
      hasLimit: hasInitialLimit,
      quantity: initialValues?.quantity ?? 1,
    },
  });

  const hasLimit = watch('hasLimit');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Emoji + Title */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-on-surface-variant text-sm font-headline font-bold mb-1 ml-1">Emoji</label>
          <input {...register('emoji')} className={ic()} placeholder="🎁" maxLength={4} />
        </div>
        <div className="col-span-3">
          <label className="block text-on-surface-variant text-sm font-headline font-bold mb-1 ml-1">Título *</label>
          <input {...register('title')} className={ic(errors.title)} placeholder="Ex: Sorvete especial" />
          {errors.title && <p className="text-error text-xs mt-1 ml-2">{errors.title.message}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-on-surface-variant text-sm font-headline font-bold mb-1 ml-1">Descrição (opcional)</label>
        <textarea
          {...register('description')}
          className={`w-full bg-surface-container-low border-none rounded-DEFAULT px-4 py-3 text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none`}
          rows={2}
          placeholder="Detalhes do prêmio..."
        />
      </div>

      {/* Points cost */}
      <div>
        <label className="block text-on-surface-variant text-sm font-headline font-bold mb-1 ml-1">Custo em pontos *</label>
        <Controller
          control={control}
          name="pointsCost"
          render={({ field }) => (
            <input
              type="number"
              min={1}
              max={99999}
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className={ic(errors.pointsCost)}
            />
          )}
        />
        {errors.pointsCost && <p className="text-error text-xs mt-1 ml-2">{errors.pointsCost.message}</p>}
      </div>

      {/* Quantity limit */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input {...register('hasLimit')} type="checkbox" className="w-4 h-4 accent-primary rounded" />
          <span className="text-on-surface-variant text-sm">Limitar quantidade disponível</span>
        </label>
        {hasLimit && (
          <div className="mt-2">
            <Controller
              control={control}
              name="quantity"
              render={({ field }) => (
                <input
                  type="number"
                  min={1}
                  max={9999}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={ic(errors.quantity)}
                  placeholder="Ex: 5"
                />
              )}
            />
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
          {isEditing ? 'Salvar' : 'Criar prêmio'}
        </button>
      </div>
    </form>
  );
};

export default PrizeForm;
