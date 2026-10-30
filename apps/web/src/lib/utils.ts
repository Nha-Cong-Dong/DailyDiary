import { createCn } from 'cn/config'

// Báo cho cn biết các token tự đặt trong index.css (cỡ chữ, bóng cứng) để gộp class đúng nhóm;
// nếu không, `text-label` sẽ bị coi là màu chữ và đè `text-muted-foreground`.
export const cn = createCn({
  extend: {
    classGroups: {
      // Phải khớp thang chữ, bóng, họ chữ trong index.css (DESIGN.md mục 3–4); đổi tên token thì sửa cả ở đây.
      'font-size': [{ text: ['display', 'title', 'heading', 'reading', 'body', 'label'] }],
      shadow: [{ shadow: ['ink-sm', 'ink', 'ink-lg', 'danger-sm', 'danger', 'accent'] }],
      'font-family': [{ font: ['heading', 'display', 'brand'] }],
    },
  },
})
