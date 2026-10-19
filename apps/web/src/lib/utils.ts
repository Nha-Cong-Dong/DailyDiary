import { createCn } from 'cn/config'

// Báo cho cn biết các token tự đặt trong index.css (cỡ chữ, bóng cứng) để gộp class đúng nhóm;
// nếu không, `text-label` sẽ bị coi là màu chữ và đè `text-muted-foreground`.
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'title-1', 'title-2', 'title-3', 'reading', 'label'] }],
      shadow: [{ shadow: ['ink-sm', 'ink', 'ink-lg', 'danger-sm', 'danger'] }],
      'font-family': [{ font: ['heading', 'brand'] }],
    },
  },
})
