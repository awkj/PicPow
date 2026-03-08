# --- 第一阶段：构建 ---
FROM node:24-alpine AS builder

# 1. 设置 pnpm/npm 全局镜像源环境变量
ENV NPM_CONFIG_REGISTRY=https://mirrors.cloud.tencent.com/npm/

# 2. 【优化】设置环境变量并启用 Corepack
# 这步不依赖你的项目文件，所以只要 Node 版本不变，这一层永远是缓存命中的！
# 无需再运行 npm install -g pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# 3. 复制依赖定义文件,这里是利用 docker缓存
COPY package.json pnpm-lock.yaml ./

# 4. 安装依赖
# --frozen-lockfile: 严格按照 lock 文件安装
RUN pnpm install --frozen-lockfile

# 5. 复制源码
COPY . .

# 6. 打包
RUN pnpm build

# --- 第二阶段：构建 Go 后端 ---
FROM golang:1.24-alpine AS go-builder

WORKDIR /server
COPY server/go.mod ./
# (由于目前没有额外的依赖，不需要 go mod download)

COPY server/main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o picman-server main.go

# --- 第三阶段：运行环境 ---
FROM caddy:alpine

# 安装 libheif-tools，使得 heif-enc 可用
RUN apk add --no-cache libheif-tools

WORKDIR /app

# 从 Node.js 构建阶段复制前端产物
COPY --from=builder /app/dist /usr/share/caddy

# 从 Go 构建阶段复制二进制后端
COPY --from=go-builder /server/picman-server /app/picman-server

# 配置 Caddy
RUN cat <<EOF > /etc/caddy/Caddyfile
:80 {
    root * /usr/share/caddy
    encode gzip
    
    handle /api/* {
        reverse_proxy 127.0.0.1:8080
    }

    handle {
        try_files {path} /index.html
        file_server
    }
}
EOF

ENV PORT=8080
EXPOSE 80

# 启动 Go 服务并在后台运行，然后前台启动 Caddy
CMD /app/picman-server & caddy run --config /etc/caddy/Caddyfile --adapter caddyfile