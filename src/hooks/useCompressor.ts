/**
 * useCompressor Hook
 * 管理图片压缩队列，连接 UI 和 Core 引擎
 */
import { useCallback, useRef, useState } from "react"
import { isSupportedFile, type SupportedFormat } from "../core/compressor"
import { mimeToFormat } from "../core/engine-wasm"
import { compressionRatio, downloadBlob, formatFileSize, mimeToExtension } from "../utils/file-io"

export type FileStatus = "pending" | "compressing" | "done" | "error"
export interface CompressedFile {
    id: string
    /** 原始文件 */
    file: File
    /** 文件名 */
    name: string
    /** 原始大小（字节） */
    originalSize: number
    /** 压缩后大小（字节），压缩完成前为 null */
    compressedSize: number | null
    /** 压缩率（0-100），正数表示减少 */
    ratio: number | null
    /** 压缩耗时（毫秒） */
    time: number | null
    /** 压缩状态 */
    status: FileStatus
    /** 错误信息 */
    error?: string
    /** 原始图片预览 URL */
    originalUrl: string
    /** 压缩后图片预览 URL（完成后填充） */
    compressedUrl: string | null
    /** 压缩后的 Blob */
    compressedBlob: Blob | null
    /** 输出格式 */
    outputFormat: SupportedFormat
    /** 本次压缩的配置，用于UI和失败后的记录展示 */
    appliedSettings?: CompressorSettings
}

export interface CompressorSettings {
    /** 输出质量模式 */
    quality: "lossless" | "high" | "balanced" | "low"
    /** 输出格式（undefined 表示保持原格式） */
    format?: SupportedFormat
}

export interface UseCompressorReturn {
    files: CompressedFile[]
    settings: CompressorSettings
    setSettings: (s: CompressorSettings) => void
    addFiles: (newFiles: File[]) => void
    removeFile: (id: string) => void
    clearAll: () => void
    downloadFile: (id: string) => Promise<void>
    downloadAll: () => Promise<void>
    retryFile: (id: string) => Promise<void>
    resetSettings: () => void
}

let idCounter = 0
const genId = () => `file-${Date.now()}-${idCounter++}`

export function useCompressor(initialSettings?: CompressorSettings): UseCompressorReturn {
    const [files, setFiles] = useState<CompressedFile[]>([])
    const [settings, setSettings] = useState<CompressorSettings>(initialSettings ?? {
        quality: "balanced",
        format: undefined,
    })

    // 用 ref 缓存最新 settings，避免闭包过期值
    const settingsRef = useRef(settings)
    settingsRef.current = settings

    // 初始化单例 Worker
    const initWorker = () => {
        const w = new Worker(new URL("../core/worker.ts", import.meta.url), { type: "module" })
        w.onerror = (e) => {
            console.error("[Hamster Worker Fatal Error]", e.message || e)
            setFiles((prev) =>
                prev.map((f) =>
                    f.status === "compressing"
                        ? { ...f, status: "error", error: "压缩引擎崩溃(不支持该格式或内存不足)" }
                        : f
                )
            )
            // 发生致命崩溃时（如 WASM OOM 导致线程死掉），终止旧线程并重启
            w.terminate()
            workerRef.current = initWorker()
        }
        return w
    }

    const workerRef = useRef<Worker | null>(null)
    if (!workerRef.current) {
        workerRef.current = initWorker()
    }

    /** 压缩单个文件并更新状态 */
    const processFile = useCallback((id: string, file: File) => {
        setFiles((prev) =>
            prev.map((f) =>
                f.id === id ? { ...f, status: "compressing" } : f
            )
        )

        return new Promise<void>((resolve) => {
            const handleMessage = (e: MessageEvent) => {
                if (e.data.id !== id) return
                workerRef.current?.removeEventListener("message", handleMessage)

                if (e.data.success) {
                    const { blob, time } = e.data
                    const compressedUrl = URL.createObjectURL(blob)

                    setFiles((prev) =>
                        prev.map((f) => {
                            if (f.id !== id) return f
                            return {
                                ...f,
                                status: "done",
                                compressedBlob: blob,
                                compressedUrl,
                                compressedSize: blob.size,
                                ratio: compressionRatio(f.originalSize, blob.size),
                                time,
                                outputFormat: settingsRef.current.format ?? (f.outputFormat),
                            }
                        })
                    )
                } else {
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === id ? { ...f, status: "error", error: e.data.error } : f
                        )
                    )
                }
                resolve()
            }

            workerRef.current?.addEventListener("message", handleMessage)
            workerRef.current?.postMessage({
                id,
                file,
                options: {
                    quality: settingsRef.current.quality,
                    format: settingsRef.current.format
                }
            })
        })
    }, [])

    /** 添加文件并触发压缩 */
    const addFiles = useCallback(
        (newFiles: File[]) => {
            const supported = newFiles.filter(isSupportedFile)
            if (supported.length === 0) return

            const entries: CompressedFile[] = supported.map((file) => {
                const inferredFormat = mimeToFormat(file.type)

                return {
                    id: genId(),
                    file,
                    name: file.name,
                    originalSize: file.size,
                    compressedSize: null,
                    ratio: null,
                    time: null,
                    status: "pending",
                    originalUrl: URL.createObjectURL(file),
                    compressedUrl: null,
                    compressedBlob: null,
                    outputFormat:
                        settingsRef.current.format ??
                        (inferredFormat === "heic" ? "jpeg" : (inferredFormat || "jxl")),
                    appliedSettings: { ...settingsRef.current }
                }
            })

            setFiles((prev) => [...prev, ...entries])

            // 异步批量压缩
            for (const entry of entries) {
                processFile(entry.id, entry.file)
            }
        },
        [processFile]
    )

    /** 移除文件，释放对象 URL */
    const removeFile = useCallback((id: string) => {
        setFiles((prev) => {
            const target = prev.find((f) => f.id === id)
            if (target) {
                URL.revokeObjectURL(target.originalUrl)
                if (target.compressedUrl) URL.revokeObjectURL(target.compressedUrl)
            }
            return prev.filter((f) => f.id !== id)
        })
    }, [])

    /** 清空所有文件 */
    const clearAll = useCallback(() => {
        setFiles((prev) => {
            prev.forEach((f) => {
                URL.revokeObjectURL(f.originalUrl)
                if (f.compressedUrl) URL.revokeObjectURL(f.compressedUrl)
            })
            return []
        })
    }, [])

    /** 下载单个文件 */
    const downloadFile = useCallback(async (id: string) => {
        const target = files.find((f) => f.id === id)
        if (!target?.compressedBlob) return
        const ext = mimeToExtension(target.compressedBlob.type)
        const baseName = target.name.replace(/\.[^.]+$/, "")
        await downloadBlob(target.compressedBlob, `${baseName}_compressed.${ext}`)
    }, [files])

    /** 批量下载所有已完成的文件 */
    const downloadAll = useCallback(async () => {
        const done = files.filter((f) => f.status === "done" && f.compressedBlob)
        for (const f of done) {
            const ext = mimeToExtension(f.compressedBlob!.type)
            const baseName = f.name.replace(/\.[^.]+$/, "")
            await downloadBlob(f.compressedBlob!, `${baseName}_compressed.${ext}`)
            // 避免浏览器阻止多个下载
            await new Promise((r) => setTimeout(r, 300))
        }
    }, [files])

    /** 重试失败的文件 */
    const retryFile = useCallback(
        async (id: string) => {
            const target = files.find((f) => f.id === id)
            if (!target) return
            await processFile(id, target.file)
        },
        [files, processFile]
    )

    /** 恢复默认设置 */
    const resetSettings = useCallback(() => {
        setSettings({
            quality: "balanced",
            format: undefined,
        })
    }, [])

    return {
        files,
        settings,
        setSettings,
        addFiles,
        removeFile,
        clearAll,
        downloadFile,
        downloadAll,
        retryFile,
        resetSettings,
    }
}

// 重新导出方便外部使用
export { compressionRatio, formatFileSize }

