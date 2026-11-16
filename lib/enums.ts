// lib/enums.ts

// Причины жалоб (синхронизировано с App\Enums\ReportReason)
export const REPORT_REASONS = [
  { value: 'spam', label: 'Спам / Реклама' },
  { value: 'porn', label: 'Порнография / 18+' },
  { value: 'scam', label: 'Мошенничество' },
  { value: 'insult', label: 'Оскорбление' },
  { value: 'minor', label: 'Несовершеннолетний' },
  { value: 'fake', label: 'Фейк / Чужие фото' },
] as const;

// Причины блокировки (синхронизировано с App\Enums\UserBlockReason)
export const BLOCK_REASONS = [
  { value: 'spam', label: 'Спам' },
  { value: 'insult', label: 'Оскорбление' },
  { value: 'creepy', label: 'Странный / Мутный' },
  { value: 'scam', label: 'Мошенничество' },
  { value: 'other', label: 'Другое' },
] as const;