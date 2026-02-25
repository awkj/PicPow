/**
 * 统一压缩接口
 * 连接 WASM 引擎，对外暴露简洁的 compressFile 函数
 */
import {
    decodeImage,
    encodeImage,
    formatToMime,
    MIME_TO_FORMAT,
    mimeToFormat,
    type SupportedFormat,
} from "./engine-wasm"

export type { SupportedFormat }

export interface CompressOptions {
    /** 质量 */
    quality?: "high" | "balanced" | "low"
    /** 输出格式，默认与输入相同 */
    format?: SupportedFormat
}

/**
 * 压缩图片文件
 *
 * @param file     原始图片文件
 * @param quality  压缩质量 0-100（默认 80）
 * @param quality  压缩质量 模式（默认 "balanced"）
 * @param format   输出格式（默认保持原格式）
 * @returns        压缩后的 Blob
 */
export async function compressFile(
    file: File,
    quality: "lossless" | "high" | "balanced" | "low" = "balanced",
    format?: SupportedFormat
): Promise<Blob> {
    // 确定输出格式
    const inputFormat = mimeToFormat(file.type)
    if (!inputFormat) {
        throw new Error(`不支持的输入格式: ${file.type}`)
    }

    const outputFormat = format ?? inputFormat

    // 1. 解码为原始像素
    const imageData = await decodeImage(file)

    // 2. 编码为目标格式
    const buffer = await encodeImage(imageData, outputFormat, quality)

    // 3. 包装为 Blob
    return new Blob([buffer], { type: formatToMime(outputFormat) })
}

/** 支持的格式列表（推导自引擎 MIME 配置表） */
export const SUPPORTED_INPUT_FORMATS = Object.keys(MIME_TO_FORMAT)

/** 检查文件格式是否被支持 */
export function isSupportedFile(file: File): boolean {
    return SUPPORTED_INPUT_FORMATS.includes(file.type.toLowerCase())
}
