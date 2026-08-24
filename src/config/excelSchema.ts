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
  },
} as const

export type ParticipantField = keyof typeof excelSchema.columns
