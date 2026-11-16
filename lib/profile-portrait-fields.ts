// === Конфиг полей автопортрета ===
// key — имя поля (совпадает с БД в будущем)
// label — подпись на русском
export const SELF_PORTRAIT_FIELDS = [
  { key: 'education',  label: 'Ваше образование' },
  { key: 'musical',    label: 'Любимая музыка' },
  { key: 'film',       label: 'Любимые фильмы' },
  { key: 'hero',       label: 'Любимые книги' },
  { key: 'dish',       label: 'Любимые блюда' },
  { key: 'city',       label: 'Любимые города и страны' },
  { key: 'pastime',    label: 'Любимые занятия' },
  { key: 'place',      label: 'Любимые места' },
  { key: 'revelation', label: 'Самое хорошее в жизни' },
  { key: 'worse',      label: 'Самое ужасное в жизни' },
  { key: 'quality',    label: 'Какие качества вы цените в людях' },
  { key: 'mistake',    label: 'Что вы могли бы простить, а что нет' },
  { key: 'religion',   label: 'Какое место занимает в вашей жизни религия' },
  { key: 'character',  label: 'Ваши достоинства' },
  { key: 'demerit',    label: 'Ваши недостатки' },
  { key: 'job',        label: 'Чем интересна ваша работа' },
  { key: 'adventure',  label: 'Самый авантюрный поступок' },
  { key: 'tv',         label: 'Что вам нравится или не нравится в телевизоре' },
  { key: 'mat',        label: 'Как вы относитесь к мату' },
] as const;