/**
 * App.tsx — Hamster 主应用入口
 */
import { Button } from "@heroui/react"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { CompareModal } from "./components/CompareModal"
import { DropZone } from "./components/DropZone"
import { FileList } from "./components/FileList"
import { SettingsBar } from "./components/SettingsBar"
import type { CompressedFile, CompressorSettings } from "./hooks/useCompressor"
import { useCompressor } from "./hooks/useCompressor"

const CONFIG_KEY = "Hamster_preferences"

interface AppConfig {
  isDark: boolean
  showThumbnails: boolean
  settings: CompressorSettings
}

function getInitialConfig(): AppConfig {
  const defaultCfg: AppConfig = { isDark: true, showThumbnails: false, settings: { quality: "balanced", format: undefined } }
  if (typeof window === "undefined") return defaultCfg
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) return { ...defaultCfg, ...JSON.parse(saved) }
  } catch (e) {
    console.warn("读取配置失败", e)
  }
  const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  return { ...defaultCfg, isDark: systemDark ?? true }
}

function App() {
  const [initialConfig] = useState(getInitialConfig)

  const {
    files,
    settings,
    setSettings,
    addFiles,
    downloadFile,
    downloadAll,
    retryFile,
    resetSettings
  } = useCompressor(initialConfig.settings)

  const [previewFile, setPreviewFile] = useState<CompressedFile | null>(null)
  const [isCompareOpen, setIsCompareOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // 主题切换 & 缩略图: 从初始配置读取
  const [isDark, setIsDark] = useState(initialConfig.isDark)
  const [showThumbnails, setShowThumbnails] = useState(initialConfig.showThumbnails)

  // 监听并将配置保存到 localStorage
  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ isDark, showThumbnails, settings }))
  }, [isDark, showThumbnails, settings])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  const hasFiles = files.length > 0
  const doneCount = files.filter((f) => f.status === "done").length

  const handlePreview = (file: CompressedFile) => {
    setPreviewFile(file)
    setIsCompareOpen(true)
  }

  return (
    <div className="min-h-screen hero-gradient flex flex-col items-center">
      {/* 限制宽度居中 */}
      <div className="w-full max-w-6xl flex flex-col flex-1">

        {/* ── 顶部标题栏 ── */}
        <header className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-200/60 dark:border-white/5">
              <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-slate-700 dark:text-slate-200 font-medium text-lg leading-none">
                Hamster
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">图片压缩工具</p>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {/* 设置切换 */}
            <Button
              isIconOnly
              variant="ghost"
              onPress={() => setShowSettings(!showSettings)}
              className={`bg-slate-200/50 dark:bg-white/5 ${showSettings ? 'text-indigo-500' : 'text-slate-700 dark:text-slate-300'} hover:bg-slate-300/50 dark:hover:bg-white/10`}
              aria-label="设置"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>

            {/* 深色模式切换 */}
            <Button
              isIconOnly
              variant="ghost"
              onPress={() => setIsDark(!isDark)}
              className="bg-slate-200/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-white/10"
              aria-label="切换主题"
            >
              {isDark ? (
                // 太阳图标
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // 月亮图标
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </Button>
          </div>
        </header>

        {/* ── 设置面板 ── */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pb-4">
                <SettingsBar
                  settings={settings}
                  onChange={setSettings}
                  showThumbnails={showThumbnails}
                  onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
                  doneCount={doneCount}
                  isCompressing={files.some(f => f.status === "compressing")}
                  onDownloadAll={downloadAll}
                  onResetSettings={resetSettings}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 主内容区 ── */}
        <main className="flex-1 flex flex-col gap-4 pb-12 w-full">
          {/* 文件列表 */}
          <AnimatePresence>
            {hasFiles && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full flex flex-col gap-4 z-10"
              >
                <FileList
                  files={files}
                  showThumbnails={showThumbnails}
                  onDownload={downloadFile}
                  onRetry={retryFile}
                  onPreview={handlePreview}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 拖拽区域 */}
          <DropZone onFilesAdded={addFiles} compact={hasFiles} />

          {/* 空状态提示 */}
          <AnimatePresence>
            {!hasFiles && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 mt-8"
              >
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  支持批量上传 · JPEG / PNG / WebP / AVIF / JXL
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-xs">
                  所有压缩在本地完成，图片不会上传到服务器
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── 对比弹窗 ── */}
      <CompareModal
        file={previewFile}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
      />
    </div>
  )
}

export default App
