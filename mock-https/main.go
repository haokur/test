package main

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// 定义一个通用的响应结构体
type Response struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// 通用的返回JSON方法
func jsonResponse(w http.ResponseWriter, status int, message string, data interface{}) {
	response := Response{
		Status:  status,
		Message: message,
		Data:    data,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// 生成随机字符串
func RandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	var seededRand = rand.New(rand.NewSource(time.Now().UnixNano()))

	// 使用 strings.Builder 提高字符串拼接效率
	var builder strings.Builder
	builder.Grow(length)
	for i := 0; i < length; i++ {
		randomChar := charset[seededRand.Intn(len(charset))]
		builder.WriteByte(randomChar)
	}
	return builder.String()
}

type Cache struct {
	store sync.Map
}

// 缓存条目
type CacheItem struct {
	value      interface{}
	expiration int64 // 过期时间的时间戳（毫秒）
}

// 设置缓存条目
func (c *Cache) Set(key string, value interface{}, duration time.Duration) {
	expiration := time.Now().Add(duration).UnixNano() / int64(time.Millisecond)
	c.store.Store(key, CacheItem{
		value:      value,
		expiration: expiration,
	})
}

// 获取缓存条目
func (c *Cache) Get(key string) (interface{}, bool) {
	item, found := c.store.Load(key)
	if !found {
		return nil, false
	}

	cacheItem := item.(CacheItem)
	// 检查缓存条目是否过期
	if cacheItem.expiration > 0 && cacheItem.expiration < time.Now().UnixNano()/int64(time.Millisecond) {
		c.store.Delete(key)
		return nil, false
	}

	return cacheItem.value, true
}

// 删除缓存条目
func (c *Cache) Delete(key string) {
	c.store.Delete(key)
}

// 全局缓存实例
var cache = &Cache{}

func serveVideo(w http.ResponseWriter, r *http.Request, videoUrl string) {
	// videoPath := "./assets/output_009.mp4"
	videoPath := "./assets/" + videoUrl

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

// http方法-8081
func httpHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/video" {
		queryParams := r.URL.Query()
		videoKey := queryParams.Get("videoKey")
		if videoKey == "" {
			w.Write([]byte("找不到视频"))
		}
		value, found := cache.Get(videoKey)
		if found {
			strValue := value.(string)
			serveVideo(w, r, strValue)
		} else {
			w.Write([]byte("找不到视频2"))
		}
	} else {
		fmt.Println(r)
		w.Write([]byte("Hello, HTTPS!"))
	}
}

func startHTTPServer(wg *sync.WaitGroup) {
	defer wg.Done()
	mux1 := http.NewServeMux()
	mux1.HandleFunc("/", httpHandler)
	fmt.Println("Starting HTTP server on port 8081")
	if err := http.ListenAndServe(":8081", mux1); err != nil {
		fmt.Println("Error starting HTTP server on port 8081:", err)
	}
}

// tls绑定的方法-8080
func TLSHandler(w http.ResponseWriter, r *http.Request) {
	// 打印请求的方法和URL
	fmt.Printf("Method: %s, URL: %s\n", r.Method, r.URL.Path)

	// 打印请求头部
	fmt.Println("Headers:")
	for key, values := range r.Header {
		for _, value := range values {
			fmt.Printf("  %s: %s\n", key, value)
		}
	}

	// 解析并打印请求参数（查询参数和表单参数）
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}
	fmt.Println("Parameters:")
	for key, values := range r.Form {
		for _, value := range values {
			fmt.Printf("  %s: %s\n", key, value)
		}
	}

	// 读取并打印请求体
	var jsonData map[string]interface{}
	if r.Body != nil {
		defer r.Body.Close()
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Unable to read body", http.StatusInternalServerError)
			return
		}
		fmt.Println("Body:")
		fmt.Println(string(body))

		// 如果请求体是JSON格式，可以尝试解析它
		if err := json.Unmarshal(body, &jsonData); err == nil {
			fmt.Println("JSON Data:")
			for key, value := range jsonData {
				fmt.Printf("  %s: %v\n", key, value)
			}
		}
	}

	// 根据请求路径处理请求
	switch r.URL.Path {
	case "/cert":
		fmt.Fprintln(w, "Handling /cert")
	case "/video-url":
		// 生成随机字符串
		randomStr := RandomString(36)
		cache.Set(randomStr, jsonData["mediaUrl"], time.Minute*60)
		data := map[string]string{"videoKey": randomStr}
		jsonResponse(w, http.StatusOK, "Request successful", data)
	default:
		fmt.Fprintln(w, "Handling default case")
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
	wg.Add(1)
	go startHTTPServer(&wg)

	// 启动 HTTPS 服务
	wg.Add(1)
	go startHTTPSServer(&wg)

	// 等待所有服务完成
	wg.Wait()
}
