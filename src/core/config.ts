// src/core/config.ts
import type { SupportedFormat } from "./compressor"

export type QualityLevel = "lossless" | "high" | "balanced" | "low"

export interface LevelConfig {
    label: string
    description: string
    value?: number
    isLossless?: boolean
    extra?: Record<string, any>
    supported: boolean
}

export const COMPRESSION_CONFIG: Record<SupportedFormat, Record<QualityLevel, LevelConfig>> = {
    jpeg: {
        lossless: {
            label: "不支持无损",
            description: "JPEG 不支持无损，回退至高质量",
            value: 90,
            supported: false
        },
        high: {
            label: "高质量",
            description: "Quality: 90",
            value: 90,
            supported: true
        },
        balanced: {
            label: "平衡",
            description: "Quality: 80",
            value: 80,
            supported: true
        },
        low: {
            label: "高压缩比",
            description: "Quality: 60",
            value: 60,
            supported: true
        },
    },
    png: {
        lossless: {
            label: "无损",
            description: "纯无损格式，压缩优化等级 2",
            value: 2,
            isLossless: true,
            supported: true
        },
        high: {
            label: "高质量",
            description: "压缩优化等级 2",
            value: 2,
            isLossless: true,
            supported: true
        },
        balanced: {
            label: "平衡",
            description: "压缩优化等级 3",
            value: 3,
            isLossless: true,
            supported: true
        },
        low: {
            label: "高压缩比",
            description: "压缩优化等级 4",
            value: 4,
            isLossless: true,
            supported: true
        },
    },
    webp: {
        lossless: {
            label: "无损",
            description: "WebP 无损模式",
            isLossless: true,
            supported: true
        },
        high: {
            label: "高质量",
            description: "Quality: 85",
            value: 85,
            extra: { method: 4 },
            supported: true
        },
        balanced: {
            label: "平衡",
            description: "Quality: 75",
            value: 75,
            extra: { method: 4 },
            supported: true
        },
        low: {
            label: "高压缩比",
            description: "Quality: 60",
            value: 60,
            extra: { method: 4 },
            supported: true
        },
    },
    avif: {
        lossless: {
            label: "无损",
            description: "AVIF 无损模式",
            isLossless: true,
            supported: true
        },
        high: {
            label: "高质量",
            description: "Quality: 75",
            value: 75,
            extra: { speed: 8 },
            supported: true
        },
        balanced: {
            label: "平衡",
            description: "Quality: 65",
            value: 65,
            extra: { speed: 8 },
            supported: true
        },
        low: {
            label: "高压缩比",
            description: "Quality: 50",
            value: 50,
            extra: { speed: 8 },
            supported: true
        },
    },
    jxl: {
        lossless: {
            label: "无损",
            description: "JXL 无损模式",
            isLossless: true,
            supported: true
        },
        high: {
            label: "高质量",
            description: "Quality: 90",
            value: 90,
            supported: true
        },
        balanced: {
            label: "平衡",
            description: "Quality: 80",
            value: 80,
            supported: true
        },
        low: {
            label: "高压缩比",
            description: "Quality: 60",
            value: 60,
            supported: true
        },
    },
    // HEIC is decode-only for now, but to satisfy types
    heic: {
        lossless: {
            label: "无损",
            description: "-",
            supported: false
        },
        high: {
            label: "高质量",
            description: "-",
            supported: false
        },
        balanced: {
            label: "平衡",
            description: "-",
            supported: false
        },
        low: {
            label: "高压缩比",
            description: "-",
            supported: false
        },
    }
}
