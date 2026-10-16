# Quyết định kiến trúc (ADR)

Mỗi quyết định lớn một file `NNNN-<ten-ngan>.md`, đánh số tăng dần, không sửa nội dung quyết định cũ. Muốn đổi
quyết định thì viết ADR mới và ghi `Thay thế bởi: NNNN` vào ADR cũ.

Mẫu:

```markdown
# NNNN. <Tiêu đề>

- Trạng thái: Đề xuất | Chấp nhận | Thay thế bởi NNNN
- Ngày: DD/MM/YYYY
- Liên quan: MVP_Plan.md Qn, Project_Specs.md mục x.y

## Bối cảnh
## Quyết định
## Hệ quả
```

| Số | Quyết định | Trạng thái |
| --- | --- | --- |
| [0001](0001-mongodb.md) | Dùng MongoDB thay PostgreSQL | Chấp nhận |
| [0002](0002-session-in-db.md) | Phiên đăng nhập lưu trong DB, cookie HttpOnly + CSRF double-submit | Chấp nhận |
| [0003](0003-vendor-shadcn-css.md) | Không cài CLI shadcn, chép CSS vào dự án | Chấp nhận |
| [0004](0004-project-structure.md) | Một cây dự án chuẩn ở `docs/Project_Structure.md` | Chấp nhận |
