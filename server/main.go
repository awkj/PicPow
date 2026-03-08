package main

import (
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
)

func init() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
}

func main() {
	http.HandleFunc("/api/encode", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		err := r.ParseMultipartForm(50 << 20) // 50MB max memory
		if err != nil {
			http.Error(w, "Failed to parse form", http.StatusBadRequest)
			return
		}

		file, handler, err := r.FormFile("image")
		if err != nil {
			http.Error(w, "No image uploaded", http.StatusBadRequest)
			return
		}
		defer file.Close()

		quality := r.FormValue("quality")
		if quality == "" {
			quality = "80"
		}

		isLossless := r.FormValue("lossless") == "true"

		tempDir, err := os.MkdirTemp("", "heic-convert-*")
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		defer os.RemoveAll(tempDir)

		ext := filepath.Ext(handler.Filename)
		if ext == "" {
			ext = ".jpg"
		}
		inFile := filepath.Join(tempDir, "input"+ext)
		outFile := filepath.Join(tempDir, "output.heic")

		out, err := os.Create(inFile)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		io.Copy(out, file)
		out.Close()

		format := r.FormValue("format")
		if format == "" {
			format = "heic"
		}

		args := []string{"-q", quality}
		if isLossless {
			// -L flag overrides -q in heif-enc for lossless
			args = []string{"-L"}
		}

		switch format {
		case "avif":
			args = append(args, "-A")
		case "jpeg":
			args = append(args, "--jpeg")
		case "jpeg2000":
			args = append(args, "--jpeg2000")
		case "heic":
			// default for heif-enc, but can explicitly pass --hevc
			args = append(args, "--hevc")
		}

		args = append(args, inFile, "-o", outFile)

		cmd := exec.Command("heif-enc", args...)
		cmdOut, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("heif-enc failed: %v\nOutput: %s", err, cmdOut)
			http.Error(w, "HEIC conversion failed", http.StatusInternalServerError)
			return
		}

		heicData, err := os.ReadFile(outFile)
		if err != nil {
			http.Error(w, "Failed to read output file", http.StatusInternalServerError)
			return
		}

		contentType := "image/heic"
		switch format {
		case "avif":
			contentType = "image/avif"
		case "jpeg":
			contentType = "image/jpeg"
		case "jpeg2000":
			contentType = "image/jp2"
		}

		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Content-Length", strconv.Itoa(len(heicData)))
		w.Write(heicData)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
