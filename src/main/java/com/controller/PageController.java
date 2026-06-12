package com.hoico.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 页面控制器 - 处理前端页面路由
 */
@Controller
public class PageController {

    /**
     * 首页 - 重定向到index.html
     */
    @GetMapping("/")
    public String index() {
        return "forward:/index.html";
    }
}
