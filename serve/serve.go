package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

func main() {
	startTLSServer()
	startHttpServer()
}

func startHttpServer() {
	httpServer := &http.Server{
		Addr:    ":8081",
		Handler: http.HandlerFunc(httpHandler),
	}

	// go func() {
	fmt.Println("Starting HTTP server on port 8081---")
	log.Println("Starting HTTP server on port 8081")
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("HTTP server ListenAndServe: %v", err)
	}
	// }()
}

func startTLSServer() {
	certFile := "./ssl/server.crt"
	keyFile := "./ssl/server.key"
	caCertFile := "./ssl/ca.crt"

	caCert, err := ioutil.ReadFile(caCertFile)
	if err != nil {
		log.Fatalf("Failed to read CA cert file: %v", err)
	}

	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCert)

	// 启用详细的 TLS 调试信息
	os.Setenv("GODEBUG", "tls13=1,tlsdebug=1")

	cfg := &tls.Config{
		MinVersion: tls.VersionTLS13,
		ClientAuth: tls.RequireAndVerifyClientCert, // 仅校验ca时，注释这行
		ClientCAs:  caCertPool,
	}
	srv := &http.Server{
		Addr:      ":8080",
		Handler:   http.HandlerFunc(TLSHandler),
		TLSConfig: cfg,
	}

	log.Printf("Starting server on https://localhost:8080")
	if err := srv.ListenAndServeTLS(certFile, keyFile); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func serveVideo(w http.ResponseWriter, r *http.Request) {
	videoPath := "./assets/input.mp4"

	file, err := os.Open(videoPath)
	if err != nil {
		http.Error(w, "Could not open video file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		http.Error(w, "Could not get file info", http.StatusInternalServerError)
		return
	}

	fileSize := fileInfo.Size()
	rangeHeader := r.Header.Get("Range")
	if rangeHeader == "" {
		// Serve the entire file
		w.Header().Set("Content-Length", strconv.FormatInt(fileSize, 10))
		w.Header().Set("Content-Type", "video/mp4")
		http.ServeContent(w, r, fileInfo.Name(), fileInfo.ModTime(), file)
		return
	}

	// Parse the range header
	rangeParts := strings.Split(rangeHeader, "=")
	if len(rangeParts) != 2 || rangeParts[0] != "bytes" {
		http.Error(w, "Invalid range header", http.StatusRequestedRangeNotSatisfiable)
		return
	}

	rangeData := strings.Split(rangeParts[1], "-")
	if len(rangeData) != 2 {
		http.Error(w, "Invalid range header", http.StatusRequestedRangeNotSatisfiable)
		return
	}

	start, err := strconv.ParseInt(rangeData[0], 10, 64)
	if err != nil {
		http.Error(w, "Invalid range start", http.StatusRequestedRangeNotSatisfiable)
		return
	}

	var end int64
	if rangeData[1] == "" {
		end = fileSize - 1
	} else {
		end, err = strconv.ParseInt(rangeData[1], 10, 64)
		if err != nil {
			http.Error(w, "Invalid range end", http.StatusRequestedRangeNotSatisfiable)
			return
		}
	}

	if start > end || end >= fileSize {
		http.Error(w, "Invalid range", http.StatusRequestedRangeNotSatisfiable)
		return
	}

	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Content-Range", "bytes "+strconv.FormatInt(start, 10)+"-"+strconv.FormatInt(end, 10)+"/"+strconv.FormatInt(fileSize, 10))
	w.Header().Set("Content-Length", strconv.FormatInt(end-start+1, 10))
	w.WriteHeader(http.StatusPartialContent)

	file.Seek(start, 0)
	buf := make([]byte, 1024*1024) // 1 MB 缓冲区
	for {
		if start > end {
			break
		}
		toRead := int64(len(buf))
		if end-start+1 < toRead {
			toRead = end - start + 1
		}
		n, err := file.Read(buf[:toRead])
		if err != nil || n == 0 {
			break
		}
		w.Write(buf[:n])
		start += int64(n)
	}
}

// http绑定的方法-8081
func httpHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("http", w, r)
	if r.URL.Path == "/video" {
		serveVideo(w, r)
	} else {
		fmt.Println(r)
		w.Write([]byte("Hello, HTTP!"))
	}
}

// tls绑定的方法-8080
func TLSHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/cert" {
		fmt.Println(w, r)
	} else {
		fmt.Println(r)
		w.Write([]byte("Hello, HTTPS!"))
	}
}
