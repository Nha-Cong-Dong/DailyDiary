// Bản dịch tiếng Việt, nhóm "catalog": tên bộ icon, nhãn mức điểm, tên màu cờ (theo id trong shared/*.json).
export default {
  iconSets: {
    sprout: { name: 'Mầm → hoa nở', levels: { '1': 'Hạt', '2': 'Mầm', '3': 'Nụ', '4': 'Hé nở', '5': 'Nở rộ' } },
    face: { name: 'Gương mặt cảm xúc', levels: { '1': 'Tệ', '2': 'Hơi buồn', '3': 'Bình thường', '4': 'Vui', '5': 'Tuyệt vời' } },
    moon: { name: 'Pha mặt trăng', levels: { '1': 'Trăng non', '2': 'Lưỡi liềm', '3': 'Bán nguyệt', '4': 'Gần tròn', '5': 'Trăng tròn' } },
    sakura: { name: 'Hoa anh đào', levels: { '1': 'Rụng', '2': 'Héo', '3': 'Chớm nở', '4': 'Nở', '5': 'Rực rỡ' } },
    sun: { name: 'Ông mặt trời', levels: { '1': 'Mưa dông', '2': 'Nhiều mây', '3': 'Ít mây', '4': 'Nắng đẹp', '5': 'Rạng rỡ' } },
    bean: { name: 'Hạt đậu', levels: { '1': 'Khóc', '2': 'Buồn', '3': 'Bình thường', '4': 'Vui', '5': 'Hớn hở' } },
  },
  flags: {
    blush: 'Hồng phấn',
    peach: 'Đào',
    butter: 'Vàng bơ',
    sage: 'Sage',
    mint: 'Bạc hà',
    sky: 'Xanh trời',
    periwinkle: 'Dừa cạn',
    lavender: 'Oải hương',
  },
  customFlag: 'Màu riêng',
} as const
