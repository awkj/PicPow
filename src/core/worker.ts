import { compressFile, type CompressOptions } from "./compressor"

self.onmessage = async (e: MessageEvent<{ id: string; file: File; options: CompressOptions }>) => {
    const { id, file, options } = e.data
    try {
        const start = performance.now()
        const blob = await compressFile(file, options.quality, options.format)
        const time = performance.now() - start
        self.postMessage({ id, success: true, blob, time })
    } catch (err) {
        let errorMsg = err instanceof Error ? err.message : String(err)
        if (errorMsg.includes("unreachable") || errorMsg.includes("memory") || errorMsg.includes("OOM")) {
            errorMsg = "压缩失败: 内存不足(图片尺寸过大)"
        }
        console.error("[Hamster Worker Error]", err, "Translated MSG:", errorMsg)
        self.postMessage({ id, success: false, error: errorMsg })
    }
}
