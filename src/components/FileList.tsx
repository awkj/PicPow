/**
 * FileList 组件 — 紧凑版，独立下载和复制，更明晰的大小对比
 */
import { Button, Modal } from "@heroui/react"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import type { SupportedFormat } from "../core/compressor"
import { COMPRESSION_CONFIG } from "../core/config"
import type { CompressedFile } from "../hooks/useCompressor"
import { formatFileSize } from "../hooks/useCompressor"

interface FileListProps {
  files: CompressedFile[]
  showThumbnails: boolean
  onDownload: (id: string) => void
  onRetry: (id: string) => void
  onPreview: (file: CompressedFile) => void
}

export function FileList({ files, showThumbnails, onDownload, onRetry, onPreview }: FileListProps) {
  const [selectedErrorFile, setSelectedErrorFile] = useState<CompressedFile | null>(null)

  if (files.length === 0) return null

  return (
    <div className="mx-2 sm:mx-4 glass rounded-2xl shadow-sm">
      <div className="w-full">
        {/* 文件列表 */}
        <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden">
          <AnimatePresence initial={false}>
            {files.map((file, i) => {
              // 计算节省比例
              let ratioText = "—"
              let ratioColor = "text-slate-500"
              if (file.ratio !== null) {
                if (file.ratio > 0) {
                  ratioText = `↓${Math.abs(file.ratio)}%`
                  ratioColor = "text-emerald-500 dark:text-emerald-400 font-bold"
                } else if (file.ratio < 0) {
                  ratioText = `↑${Math.abs(file.ratio)}%`
                  ratioColor = "text-red-400 font-bold"
                } else {
                  ratioText = "0%"
                }
              }

              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                  className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 sm:gap-x-4 gap-y-1.5 px-3 sm:px-4 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-100/50 dark:hover:bg-white/5 transition-none group ${showThumbnails ? "py-2.5" : "py-2"}`}
                >
                  {/* 文件名 & 格式 (左侧) */}
                  <div
                    className="flex items-center gap-3 min-w-0 w-full sm:w-[40%] md:w-[45%] lg:w-[50%] shrink-0 cursor-pointer"
                    onClick={() => file.status === "done" && onPreview(file)}
                    title={file.status === "done" ? "点击对比预览" : file.name}
                  >
                    {showThumbnails && (
                      <div className="w-8 h-8 rounded bg-gray-200 dark:bg-white/10 shrink-0 overflow-hidden shadow-sm">
                        <img
                          src={file.originalUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-normal text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                      </div>
                      <p className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 uppercase mt-0.5 truncate">
                        <span>{file.outputFormat}</span>
                        {file.appliedSettings?.quality && file.outputFormat && COMPRESSION_CONFIG[file.outputFormat as SupportedFormat]?.[file.appliedSettings.quality] && (
                          <>
                            <span className="opacity-50">/</span>
                            <span className="text-slate-500 dark:text-slate-400">{COMPRESSION_CONFIG[file.outputFormat as SupportedFormat][file.appliedSettings.quality].label}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 数据指标 & 操作 (右/下侧) */}
                  <div
                    className={`flex items-center flex-1 w-full gap-2 sm:gap-4 mt-1 sm:mt-0 ${showThumbnails ? "sm:pl-[44px]" : "sm:pl-0"}`}
                  >
                    {/* 体积：紧凑对齐 */}
                    <div className="flex items-center justify-start font-mono text-sm w-auto min-w-[72px] sm:w-32 flex-shrink-0">
                      {file.status === "pending" || file.status === "compressing" ? (
                        <span className="text-indigo-500 dark:text-indigo-400 text-[13px] flex items-center gap-1.5 w-full">
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="3"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          处理中...
                        </span>
                      ) : file.status === "error" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto min-w-0 p-0 m-0 bg-transparent flex items-center justify-center hover:bg-transparent data-[hover=true]:bg-transparent"
                          onPress={() => {
                            setSelectedErrorFile(file)
                          }}
                        >
                          <span className="text-red-400 text-[13px] italic cursor-pointer border-b border-dashed border-red-400/50">
                            查看异常原因
                          </span>
                        </Button>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center w-full gap-0.5 sm:gap-0">
                          <span className="text-[11px] sm:text-[12px] text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-600 whitespace-nowrap leading-none sm:w-[60px] flex-shrink-0 text-left">
                            {formatFileSize(file.originalSize)}
                          </span>
                          {file.compressedSize !== null && (
                            <span className="text-slate-700 dark:text-slate-200 font-medium text-[12px] sm:text-[13px] whitespace-nowrap leading-none sm:w-[68px] flex-shrink-0 text-left">
                              {formatFileSize(file.compressedSize)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 效率和耗时：紧跟在体积后面 */}
                    <div className="flex flex-col justify-center items-start w-auto min-w-[48px] sm:w-16 pl-1 flex-shrink-0 mr-1 sm:mr-4">
                      {file.status === "done" && file.ratio !== null ? (
                        <>
                          <span className={`text-[14px] font-mono whitespace-nowrap leading-none ${ratioColor}`}>
                            {ratioText}
                          </span>
                          {file.time && (
                            <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap leading-none">
                              ⏱ {file.time >= 1000 ? (file.time / 1000).toFixed(2) + "s" : Math.round(file.time) + "ms"}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs leading-none">—</span>
                      )}
                    </div>

                    {/* 操作按钮：使用 ml-auto 推到最右侧 */}
                    <div className="flex items-center gap-1 ml-auto w-auto shrink-0">
                      {/* 复制按钮 */}
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className={`text-slate-500 hover:text-indigo-500 ${file.status === "done" ? "" : "invisible"}`}
                        isDisabled={file.status !== "done"}
                        aria-label="复制图片到剪贴板"
                        onPress={async () => {
                          if (file.compressedBlob && file.status === "done") {
                            try {
                              const item = new ClipboardItem({ [file.compressedBlob.type]: file.compressedBlob })
                              await navigator.clipboard.write([item])
                            } catch (e) {
                              console.warn("复制失败: 浏览器可能只支持直接复制 PNG", e)
                            }
                          }
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect
                            width="14"
                            height="14"
                            x="8"
                            y="8"
                            rx="2"
                            ry="2"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Button>

                      {/* 下载按钮 / 返回按钮(重试) */}
                      {file.status === "error" ? (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label="重试压缩"
                          onPress={() => onRetry(file.id)}
                        >
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </Button>
                      ) : (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          className={`text-slate-500 hover:text-indigo-500 ${file.status === "done" ? "" : "invisible"}`}
                          isDisabled={file.status !== "done"}
                          aria-label="单独下载此文件"
                          onPress={() => onDownload(file.id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* 错误详情弹窗 */}
      <Modal.Backdrop isOpen={selectedErrorFile !== null}>
        <Modal.Container>
          <Modal.Dialog className="max-w-2xl bg-white dark:bg-[#1a1b1e] text-slate-800 dark:text-slate-200">
            {({ close }) => (
              <>
                <Modal.Header className="flex flex-col gap-1 text-red-500 pt-5 px-6 pb-2 text-lg">
                  压缩失败原因分析
                </Modal.Header>
                <Modal.Body className="px-6 py-2">
                  {selectedErrorFile && (
                    <div className="space-y-4 font-mono text-sm pb-4">
                      <div>
                        <p className="font-bold mb-1 opacity-80">文件名:</p>
                        <p className="opacity-90 break-all">{selectedErrorFile.name}</p>
                      </div>
                      <div>
                        <p className="font-bold mb-1 opacity-80">错误堆栈 / 信息:</p>
                        <div className="w-full whitespace-pre-wrap break-all text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                          {selectedErrorFile.error || "未知异常"}
                        </div>
                      </div>
                      {selectedErrorFile.appliedSettings && (
                        <div>
                          <p className="font-bold mb-1 opacity-80">当时的压缩配置:</p>
                          <div className="w-full whitespace-pre-wrap text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                            {JSON.stringify(selectedErrorFile.appliedSettings, null, 2)}
                          </div>
                        </div>
                      )}
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <p className="text-amber-600 dark:text-amber-400 text-xs leading-relaxed font-sans">
                          💡 提示：对于由于 JXL 引擎崩溃 或 OOM (Out Of Memory)
                          引发的任务流产，大多数情况是因为图片分辨率和配置过于激进（Lossless 或 Effort
                          设置过高）导致超出了当前 Web Worker
                          分配的最大堆内存上限。请尝试使用有损模式（Quality）或缩小图片体积后重试。
                        </p>
                      </div>
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer className="px-6 pb-5 pt-2">
                  <Button
                    variant="secondary"
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300"
                    onPress={() => {
                      close()
                      setSelectedErrorFile(null)
                    }}
                  >
                    关闭
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
