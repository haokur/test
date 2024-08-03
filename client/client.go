package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
)

func main() {
	caCertFile := "./ssl/ca.crt"
	clientCertFile := "./ssl/client.crt"
	clientKeyFile := "./ssl/client.key"

	caCert, err := ioutil.ReadFile(caCertFile)
	if err != nil {
		log.Fatalf("Failed to read CA cert file: %v", err)
	}

	clientCert, err := tls.LoadX509KeyPair(clientCertFile, clientKeyFile)
	if err != nil {
		log.Fatalf("Failed to load client cert/key pair: %v", err)
	}

	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCert)

	// 启用详细的 TLS 调试信息
	os.Setenv("GODEBUG", "tls13=1,tlsdebug=1")

	tlsConfig := &tls.Config{
		RootCAs:      caCertPool,
		Certificates: []tls.Certificate{clientCert}, // 仅传递CA时，注释这行
		MinVersion:   tls.VersionTLS13,
	}

	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
	}

	client := &http.Client{
		Transport: transport,
	}

	resp, err := client.Get("https://localhost:8080")
	// 当访问一个未配置同样的ca和server.crt的服务时，不会有正确的响应
	// resp, err := client.Get("https://api.haokur.com")
	if err != nil {
		log.Fatalf("Failed to make HTTPS request: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response body: %v", err)
	}

	fmt.Printf("Response: %s\n", body)
}
