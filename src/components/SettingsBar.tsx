/**
 * SettingsBar 组件 — HeroUI v3 正确 API
 * 设置面板，完全对齐的 3 行布局，使用统配的 configuration 对象控制无损/质量选项。
 */
import type { SupportedFormat } from "../core/compressor"
import { COMPRESSION_CONFIG, type QualityLevel } from "../core/config"
import type { CompressorSettings } from "../hooks/useCompressor"

interface SettingsBarProps {
  settings: CompressorSettings
  onChange: (s: CompressorSettings) => void
  showThumbnails: boolean
  onToggleThumbnails: () => void
  doneCount: number
  isCompressing: boolean
  onDownloadAll: () => void
  onResetSettings: () => void
}

const TARGET_FORMATS: { label: string; value: SupportedFormat }[] = [
  { label: "JPEG", value: "jpeg" },
  { label: "PNG", value: "png" },
  { label: "WebP", value: "webp" },
  { label: "AVIF", value: "avif" },
  { label: "JXL", value: "jxl" },
]

export function SettingsBar({
  settings,
  onChange,
  showThumbnails,
  onToggleThumbnails,
  doneCount,
  isCompressing,
  onDownloadAll,
  onResetSettings,
}: SettingsBarProps) {
  const currentFormat = settings.format ?? "auto"
  const effectiveFormat = currentFormat === "heic" ? "jpeg" : currentFormat

  // 获取当前格式支持的质量配置选项
  // 强制转换为受支持的格式键，避免 auto 时取不到
  const actualConfigKey = effectiveFormat === "auto" ? "jpeg" : effectiveFormat
  const currentConfig = COMPRESSION_CONFIG[actualConfigKey]

  // 格式化需要渲染在 Row 3 的按钮列表顺序
  const qualityLevels: QualityLevel[] = ["lossless", "high", "balanced", "low"]

  return (
    <div className="glass mx-2 sm:mx-4 px-4 sm:px-6 py-4 sm:py-5 rounded-2xl flex flex-col gap-4 sm:gap-5">
      {/* ── 第 1 行：显示设置 & 操作设置 ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-16 shrink-0">显示/操作</span>
          <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 hidden sm:block" />
        </div>

        <div className="flex flex-row items-center gap-4 sm:gap-6 w-full flex-wrap">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showThumbnails}
              onChange={onToggleThumbnails}
              className="w-4 h-4 text-slate-700 border-gray-300 rounded focus:ring-slate-500 dark:border-gray-600 dark:bg-white/5 dark:focus:ring-slate-400"
            />
            显示缩略图
          </label>
          {/* 分割点 (大屏/宽屏显示) */}
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 hidden md:block" />

          <div className="flex flex-row items-center gap-2 shrink-0 ml-auto">
            {doneCount > 0 && (
              <button
                onClick={onDownloadAll}
                className="text-[13px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm hover:opacity-90 font-medium transition-opacity cursor-pointer shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                全部下载 ({doneCount})
              </button>
            )}
            {/* 恢复设置小目标圆按钮 */}
            <button
              onClick={onResetSettings}
              title="恢复默认设置"
              className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-white/10 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="w-full h-px bg-slate-200/60 dark:bg-white/5" /> {/* 行分割线 */}
      {/* ── 第 2 行：输出格式 ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-16 shrink-0">输出格式</span>
          <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 hidden sm:block" />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full">
          {/* 保持原格式 */}
          <button
            disabled={isCompressing}
            onClick={() => onChange({ ...settings, format: undefined })}
            className={`px-4 py-1.5 text-sm rounded-full transition-all border whitespace-nowrap ${
              effectiveFormat === "auto"
                ? "bg-white text-slate-800 shadow-sm border-slate-200/60 dark:bg-slate-700 dark:text-white dark:border-slate-600 font-medium"
                : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            } ${isCompressing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            保持原格式
          </button>

          {/* 具体格式区块 */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-slate-100/80 dark:bg-white/5 rounded-2xl sm:rounded-full w-full sm:w-auto">
            {TARGET_FORMATS.map((opt) => {
              const isSelected = effectiveFormat === opt.value
              return (
                <button
                  key={opt.value}
                  disabled={isCompressing}
                  onClick={() => {
                    // 切换格式时，检查当前所选画质选项在新格式下是否支持
                    let nextQuality = settings.quality
                    const newConfig = COMPRESSION_CONFIG[opt.value]
                    if (nextQuality === "lossless" && !newConfig.lossless.supported) {
                      nextQuality = "high" // 如果不支持无损(如JPEG)，回退到高质量
                    }

                    onChange({
                      ...settings,
                      format: opt.value as SupportedFormat,
                      quality: nextQuality,
                    })
                  }}
                  className={`px-4 py-1.5 text-sm rounded-full transition-all whitespace-nowrap border ${
                    isSelected
                      ? "bg-white text-slate-800 shadow-sm border-slate-200/60 dark:bg-slate-700 dark:text-white dark:border-slate-600 font-medium"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  } ${isCompressing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="w-full h-px bg-slate-200/60 dark:bg-white/5" /> {/* 行分割线 */}
      {/* ── 第 3 行：压缩设置 ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-16 shrink-0 flex items-center justify-between">
            压缩设置
          </span>
          <div className="w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0 hidden sm:block" />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 w-full">
          <div className="flex flex-wrap sm:flex-nowrap items-center p-1 bg-slate-100/80 dark:bg-white/5 rounded-2xl sm:rounded-lg w-full sm:w-auto">
            {qualityLevels.map((level) => {
              const opt = currentConfig[level]
              if (!opt.supported) return null // 假如该格式不支持该档位（比如 JPEG 无损），直接不渲染或置灰渲染

              const isActive = settings.quality === level
              return (
                <button
                  key={level}
                  disabled={isCompressing}
                  onClick={() => onChange({ ...settings, quality: level })}
                  className={`px-5 py-1.5 rounded-md text-sm transition-all whitespace-nowrap border ${
                    isActive
                      ? "bg-white text-slate-800 shadow-sm border-slate-200/60 dark:bg-slate-700 dark:text-white dark:border-slate-600 font-medium"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-normal"
                  } ${isCompressing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* 查看配置问号提示图标 (Native Tailwind Tooltip) */}
          <div className="relative group flex items-center">
            <button className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-600 dark:hover:text-white transition-colors cursor-help">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>

            {/* Tooltip Popup */}
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 bg-white dark:bg-slate-800 shadow-xl border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 w-64 pointer-events-none">
              <h3 className="text-sm font-semibold mb-3">
                当前格式 ({effectiveFormat === "auto" ? "JPEG" : effectiveFormat.toUpperCase()}) 具体参数
              </h3>
              <div className="flex flex-col gap-2">
                {qualityLevels.map((level) => {
                  const opt = currentConfig[level]
                  if (!opt.supported && level === "lossless") {
                    return (
                      <div key={level} className="flex justify-between items-center text-xs text-red-500/80">
                        <span>{opt.label} : </span>
                        <span>{opt.description}</span>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={level}
                      className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-100 w-16">{opt.label}</span>
                      <span className="flex-1 text-right text-slate-500 dark:text-slate-400">{opt.description}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
