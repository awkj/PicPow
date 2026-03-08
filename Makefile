.PHONY: dev

# 启动本地开发环境
# 分别在后台启动 Go 服务，并在前台启动 Vite。
# 按下 Ctrl+C 时会自动清理掉后台的 Go 进程。
dev:
	@echo "启动 Go 后端服务 (端口 8080)..."
	@cd server && PORT=8080 go run main.go & echo $$! > server.PID
	@echo "启动前端开发服务器..."
	@pnpm dev || true
	@echo "清理后台服务..."
	@kill `cat server.PID` 2>/dev/null || true
	@rm -f server.PID
