package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
)

func main() {
	// 发送 GET 请求
	resp, err := http.Get("https://api.haokur.com")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()

	// 读取响应 body
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Response:", string(body))
}
