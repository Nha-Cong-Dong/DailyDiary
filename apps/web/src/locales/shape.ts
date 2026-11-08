/**
 * Hình dạng của một file bản dịch: giống hệt file tiếng Việt (nguồn chuẩn), nhưng giá trị là chuỗi bất kỳ.
 * Thiếu một khóa so với tiếng Việt là lỗi biên dịch. Cho phép thêm khóa (vd. `_one` của số nhiều tiếng Anh,
 * tiếng Việt chỉ có `_other`).
 */
export type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : Shape<T[K]>
} & { [extra: string]: unknown }
