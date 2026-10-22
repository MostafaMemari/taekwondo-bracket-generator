import * as XLSX from 'xlsx'

// a 16-athlete single weight class, mixed coaches — for testing the big sheet
const names = [
  'آریا رضایی', 'بردیا کریمی', 'پویا مرادی', 'تناووس قاسمی',
  'ثنا حسینی', 'جاوید نوری', 'چانگ صادقی', 'حورا رحیمی',
  'خشایار کاظمی', 'داریوش ملکی', 'رستا فتحی', 'سینا جوادی',
  'شایان شریفی', 'صدرا طاهری', 'طاها یوسفی', 'عرفان نادری',
]
const coaches = ['استاد رضایی', 'استاد محمدی', 'استاد کریمی', 'استاد نوری', 'استاد احمدی']

const rows = names.map((name, index) => [name, coaches[index % coaches.length], 'نوجوانان', '۶۰-'])

const sheet = XLSX.utils.aoa_to_sheet([['نام و نام خانوادگی', 'مربی', 'رده سنی', 'وزن'], ...rows])
const book = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(book, sheet, 'Register')
XLSX.writeFile(book, '/home/z/my-project/scripts/test-16.xlsx')
console.log('written /home/z/my-project/scripts/test-16.xlsx with', rows.length, 'rows')
