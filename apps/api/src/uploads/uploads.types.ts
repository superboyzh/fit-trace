/** 与 multer 内存存储返回的文件结构保持一致，避免业务层依赖 multer 类型。 */
export interface UploadedImageFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
