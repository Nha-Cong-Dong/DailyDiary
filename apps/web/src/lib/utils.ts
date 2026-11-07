import { createCn } from 'cn/config'

// Báo cho cn biết các token tự đặt trong index.css (cỡ chữ, bóng cứng, màu) để gộp class đúng nhóm;
// nếu không, `text-label` sẽ bị coi là màu chữ và đè `text-ink-soft`.
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'title', 'heading', 'reading', 'body', 'label', 'title-1', 'title-2', 'title-3'] },
      ],
      shadow: [
        { shadow: ['accent', 'accent-lg', 'danger', 'danger-sm', 'danger-lg', 'ink-sm', 'ink', 'ink-lg'] },
      ],
      'font-family': [{ font: ['heading', 'brand'] }],
    },
  },
})
