/**
 * 文件 I/O 工具
 * 封装 Web 和 Tauri 原生环境下的文件读写差异
 */
import { mimeToFormat } from "../core/engine-wasm"

/**
 * 触发文件下载
 * 使用 <a> 元素触发浏览器下载
 */
export async function downloadBlob(
    blob: Blob,
    filename: string
): Promise<void> {
    saveBlobViaAnchor(blob, filename)
}

/**
 * Web 端：通过隐藏 <a> 触发下载
 */
function saveBlobViaAnchor(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // 稍后释放对象 URL
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 读取文件为 ArrayBuffer
 */
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(file)
    })
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * 计算压缩率（百分比，正数表示减少）
 */
export function compressionRatio(original: number, compressed: number): number {
    if (original === 0) return 0
    return Math.round(((original - compressed) / original) * 100)
}

/**
 * 根据 MIME 类型推断扩展名
 */
export function mimeToExtension(mime: string): string {
    const format = mimeToFormat(mime)
    if (!format) return "jpg"
    return format === "jpeg" ? "jpg" : format
}
