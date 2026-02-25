/**
 * WASM 图片引擎
 * 使用 @jsquash 系列库动态加载编解码器，在浏览器端实现高性能图片压缩
 */

export type SupportedFormat = "jpeg" | "png" | "webp" | "avif" | "jxl" | "heic"

import { COMPRESSION_CONFIG, type QualityLevel } from "./config"


/** 映射源 MIME 类型到内部格式标识 */
export const MIME_TO_FORMAT: Record<string, SupportedFormat> = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/jxl": "jxl",
    "image/heic": "heic",
    "image/heif": "heic",
}

/** 映射内部格式标识到输出 MIME 类型 */
export const FORMAT_TO_MIME: Record<SupportedFormat, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    jxl: "image/jxl",
    heic: "image/heic",
}

/** 从 MIME 类型推断格式 */
export function mimeToFormat(mime: string): SupportedFormat | null {
    return MIME_TO_FORMAT[mime.toLowerCase()] ?? null
}

/** 获取格式对应的 MIME 类型 */
export function formatToMime(format: SupportedFormat): string {
    return FORMAT_TO_MIME[format]
}

/**
 * 将 File 解码为 ImageData（原始像素数据）
 * 动态按需加载对应格式的解码器
 */
export async function decodeImage(file: File): Promise<ImageData> {
    const buffer = await file.arrayBuffer()
    const format = mimeToFormat(file.type)

    if (format === "jpeg") {
        const { decode } = await import("@jsquash/jpeg")
        return decode(buffer)
    }

    if (format === "png") {
        const { decode } = await import("@jsquash/png")
        return decode(buffer)
    }

    if (format === "webp") {
        const { decode } = await import("@jsquash/webp")
        return decode(buffer)
    }

    if (format === "avif") {
        const { decode } = await import("@jsquash/avif")
        const result = await decode(buffer)
        if (!result) throw new Error("AVIF decode failed")
        return result as ImageData
    }

    if (format === "jxl") {
        const { decode } = await import("@jsquash/jxl")
        return decode(buffer)
    }

    if (format === "heic") {
        // 使用 libheif-js (WASM) 纯前端解码，在 Web Worker 中无感运行
        // @ts-ignore
        const libheifData = await import("libheif-js/wasm-bundle")
        const libheif = libheifData.default || libheifData

        const decoder = new libheif.HeifDecoder()
        const data = decoder.decode(buffer)
        if (!data || !data.length) {
            throw new Error("HEIF decoding failed: No images found in file")
        }
        const image = data[0]
        const width = image.get_width()
        const height = image.get_height()

        const imageDataData = new Uint8ClampedArray(width * height * 4)
        await new Promise<void>((resolve, reject) => {
            image.display({ data: imageDataData, width, height }, (displayData: any) => {
                if (!displayData) {
                    reject(new Error("HEIF decoding failed during pixel data extraction"))
                    return
                }
                resolve()
            })
        })

        // 释放底层的 C++ 对象内存以免内存泄漏
        image.free?.()

        return new ImageData(imageDataData, width, height)
    }

    // 回退：使用 Canvas 解码其他格式
    return decodeWithCanvas(file)
}

/** 使用 Canvas 作为 fallback 解码图片 */
async function decodeWithCanvas(file: File): Promise<ImageData> {
    const bitmap = await createImageBitmap(file)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D
    ctx.drawImage(bitmap, 0, 0)
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height)
}

/**
 * 将 ImageData 编码为目标格式的 ArrayBuffer
 * @param imageData   原始像素数据
 * @param format      目标格式
 * @param quality     质量 0-100（PNG/AVIF 的无损模式下忽略此参数）
 * @param lossless    是否使用无损模式
 */

// 全局单例缓存，避免重复加载 WASM
let jxlModuleInstance: any = null

export async function encodeImage(
    imageData: ImageData,
    format: SupportedFormat,
    qualityMode: QualityLevel
): Promise<ArrayBuffer> {
    // -------------------------------------------------------------
    // 解析 UI 语义化质量为具体数值与参数
    // -------------------------------------------------------------
    const config = COMPRESSION_CONFIG[format]?.[qualityMode]
    const quality = config?.value ?? 80
    const isLossless = config?.isLossless ?? false

    switch (format) {
        case "jpeg": {
            const { encode } = await import("@jsquash/jpeg")
            return encode(imageData, { quality })
        }

        case "png": {
            // oxipng：无损 PNG 优化（直接固定 Level 2，忽略画质参数）
            const { optimise } = await import("@jsquash/oxipng")
            const { encode: encodePng } = await import("@jsquash/png")
            const pngBuffer = await encodePng(imageData)
            return optimise(pngBuffer, { level: 2 })
        }

        case "webp": {
            const { encode } = await import("@jsquash/webp")
            if (isLossless) {
                // @ts-ignore jsquash webp supports lossless flag internally
                return encode(imageData, { lossless: true })
            }
            return encode(imageData, { quality, ...(config?.extra || {}) })
        }

        case "avif": {
            const { encode } = await import("@jsquash/avif")
            if (isLossless) {
                // @ts-ignore jsquash avif supports lossless via cqLevel:0 or lossless:true internally
                return encode(imageData, { lossless: true })
            }
            return encode(imageData, { quality, ...(config?.extra || { speed: 8 }) })
        }

        case "jxl": {
            // -------------------------------------------------------------
            // 1. 单例模式初始化 WASM (性能优化关键)
            // -------------------------------------------------------------
            if (!jxlModuleInstance) {
                // 强制使用单线程版 jxl_enc.js（稳定、内存可扩展），避开多线程 SIMD
                const { default: jxlEncoderFactory } = await import("@jsquash/jxl/codec/enc/jxl_enc.js")
                const wasmUrl = (await import("@jsquash/jxl/codec/enc/jxl_enc.wasm?url")).default

                jxlModuleInstance = await jxlEncoderFactory({
                    locateFile: () => wasmUrl
                })
            }
            const module = jxlModuleInstance

            // -------------------------------------------------------------
            // 2. 数据准备
            // -------------------------------------------------------------
            // 显式转为 Uint8Array 规避 Embind 兼容性及越界错误
            const inputBuffer = new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.length)

            // -------------------------------------------------------------
            // 3. 动态 Effort 策略 (防止 OOM)
            // -------------------------------------------------------------
            const totalPixels = imageData.width * imageData.height
            let dynamicEffort = 1 // 默认 Lightning (最安全)

            /*
                1	Lightning (闪电)	极速	极低	预览、实时处理
                2	Thunder (雷声)	非常快	低	-
                3	Falcon (猎鹰)	快	较低 (推荐)	大图的保守选项
                4	Cheetah (猎豹)	较快	中等	中图如果内存够大可用
                5	Hare (野兔)	中等	中高	小图常用
                6	Wombat (袋熊)	慢	高	-
                7	Squirrel (松鼠)	默认值	很高	jSquash 默认是这个，导致 OOM
                8	Kitten (小猫)	非常慢	极高	离线归档
                9	Tortoise (乌龟)	龟速	爆炸	极客专用
            */
            if (totalPixels < 250000) {
                dynamicEffort = 5 // < 25万像素 (极小图)
            } else if (totalPixels < 500000) {
                dynamicEffort = 3 // < 50万像素
            } else if (totalPixels < 1500000) {
                dynamicEffort = 2 // < 150万像素
            } else {
                dynamicEffort = 1 // > 150万像素，Lightning (极简编码防崩溃)
            }

            // -------------------------------------------------------------
            // 4. 计算最终 Quality (修复逻辑覆盖 Bug)
            // -------------------------------------------------------------
            const finalQuality = isLossless ? 100 : quality

            // -------------------------------------------------------------
            // 5. 组装参数
            // -------------------------------------------------------------
            const options = {
                effort: dynamicEffort,
                quality: finalQuality,
                progressive: false,
                epf: -1,
                lossyPalette: false, // 绝对不能开，否则会错误触发模块化有损编码导致体积暴增
                decodingSpeedTier: 0,
                photonNoiseIso: 0,
                lossyModular: false, // 绝对不能开
            }

            // -------------------------------------------------------------
            // 6. 编码 (Try-Catch 捕获 WASM 内部崩溃)
            // -------------------------------------------------------------
            let resultView
            try {
                resultView = module.encode(
                    inputBuffer,
                    imageData.width,
                    imageData.height,
                    options // 直接传入 options，不再做展开覆盖
                )
            } catch (err) {
                console.error("JXL WASM Critical Error:", err)
                throw new Error(
                    `JXL 编码内存溢出，请尝试缩小图片尺寸。\n\n` +
                    `[WASM 堆栈]: ${err}\n\n` +
                    `[引擎实际运作参数 (${imageData.width}x${imageData.height} px)]:\n` +
                    JSON.stringify(options, null, 2)
                )
            }

            if (!resultView) throw new Error("JXL Encode failed inside WASM (returned null)")

            // -------------------------------------------------------------
            // 7. 结果拷贝与内存管理
            // -------------------------------------------------------------
            // 深度拷贝 WASM Heap 数据到独立 JS 内存空间
            const resultData = new Uint8Array(resultView)

            // 注意：不要再调用 module.free?.()
            // 因为使用的是 jsquash 的 std::string 映射返回值，并在 JS 环境由 GC 管理。单例也不允许被释放。

            return resultData.buffer
        }

        case "heic": {
            // heic2any 在前端大多用来解码，如果用户强行要编码输出 HEIC（极罕见），我们直接使用更通用的 JPEG 返回
            const { encode } = await import("@jsquash/jpeg")
            return encode(imageData, { quality: quality >= 90 ? 90 : quality >= 80 ? 80 : 60 })
        }

        default:
            throw new Error(`不支持的编码格式: ${format}`)
    }
}
