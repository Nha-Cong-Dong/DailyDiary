// Bản dịch tiếng Việt, nhóm "common": chữ dùng ở nhiều nơi (nút chung, trạng thái, ngày giờ). Nguồn chuẩn: khóa ở đây
// quyết định khóa của mọi ngôn ngữ khác.
export default {
  meta: { title: 'Jotly · Chạm để ghi chú, mở để nhìn lại' },
  language: {
    label: 'Ngôn ngữ',
    vi: 'Tiếng Việt',
    en: 'English',
    viShort: 'VI',
    enShort: 'EN',
  },
  date: {
    weekdayShort: { '0': 'CN', '1': 'T2', '2': 'T3', '3': 'T4', '4': 'T5', '5': 'T6', '6': 'T7' },
    weekdayLong: {
      '0': 'Chủ nhật',
      '1': 'Thứ Hai',
      '2': 'Thứ Ba',
      '3': 'Thứ Tư',
      '4': 'Thứ Năm',
      '5': 'Thứ Sáu',
      '6': 'Thứ Bảy',
    },
    monthLong: {
      '1': 'tháng 1',
      '2': 'tháng 2',
      '3': 'tháng 3',
      '4': 'tháng 4',
      '5': 'tháng 5',
      '6': 'tháng 6',
      '7': 'tháng 7',
      '8': 'tháng 8',
      '9': 'tháng 9',
      '10': 'tháng 10',
      '11': 'tháng 11',
      '12': 'tháng 12',
    },
    monthShort: {
      '1': 'Th1',
      '2': 'Th2',
      '3': 'Th3',
      '4': 'Th4',
      '5': 'Th5',
      '6': 'Th6',
      '7': 'Th7',
      '8': 'Th8',
      '9': 'Th9',
      '10': 'Th10',
      '11': 'Th11',
      '12': 'Th12',
    },
    // "Chủ nhật · 18 tháng 10, 2026"
    longDate: '{{weekday}} · {{day}} {{monthLong}}, {{year}}',
    longDateNoYear: '{{weekday}} · {{day}} {{monthLong}}',
    // "Chủ nhật 18/10"
    shortDate: '{{weekday}} {{day}}/{{month}}',
    // "2 giờ 56 phút"
    durationMinutes: '{{m}} phút',
    durationHoursMinutes: '{{h}} giờ {{m}} phút',
    durationHours: '{{h}} giờ',
  },
} as const
