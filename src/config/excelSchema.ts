export const excelSchema = {
  headerRowIndex: 0,
  columns: {
    fullName: {
      header: 'نام و نام خانوادگی',
      aliases: ['نام کامل', 'نام'],
    },
    coachName: {
      header: 'مربی',
      aliases: ['نام مربی'],
    },
    ageCategory: {
      header: 'رده سنی',
      aliases: ['گروه سنی'],
    },
    weightCategory: {
      header: 'وزن',
      aliases: ['دسته وزنی', 'وزنه'],
    },
    weightKg: {
      header: 'وزن (kg)',
      aliases: ['وزن کیلوگرم', 'کیلوگرم', 'kg', 'KG', 'Kg'],
    },
  },
} as const

export type ParticipantField = keyof typeof excelSchema.columns

/** ستون های اختیاری — نبودن شان در اکسل، ردیف را ناقص نمی کند */
export const optionalParticipantFields: readonly ParticipantField[] = ['weightKg']
