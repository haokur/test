package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sync"
)

func startHTTPServer(wg *sync.WaitGroup) {
	defer wg.Done()
	mux1 := http.NewServeMux()
	mux1.HandleFunc("/http", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "This is the response from HTTP service on port 8081")
	})
	fmt.Println("Starting HTTP server on port 8081")
	if err := http.ListenAndServe(":8081", mux1); err != nil {
		fmt.Println("Error starting HTTP server on port 8081:", err)
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

func startHTTPSServer(wg *sync.WaitGroup) {
	defer wg.Done()

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

func main() {
	var wg sync.WaitGroup

	// 启动 HTTP 服务
	// wg.Add(1)
	// go startHTTPServer(&wg)

	// 启动 HTTPS 服务
	wg.Add(1)
	go startHTTPSServer(&wg)

	// 等待所有服务完成
	wg.Wait()
}
