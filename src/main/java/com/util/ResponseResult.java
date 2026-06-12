package com.hoico.util;

public class ResponseResult {
    private Integer code;
    private String message;
    private Object data;

    public ResponseResult() {
    }

    public ResponseResult(Integer code, String message) {
        this.code = code;
        this.message = message;
    }

    public ResponseResult(Integer code, String message, Object data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    // getter and setter
    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }

    // 成功返回
    public static ResponseResult success() {
        return new ResponseResult(200, "success");
    }

    public static ResponseResult success(Object data) {
        return new ResponseResult(200, "success", data);
    }

    // 失败返回
    public static ResponseResult error() {
        return new ResponseResult(500, "error");
    }

    public static ResponseResult error(String message) {
        return new ResponseResult(500, message);
    }

    public static ResponseResult error(Integer code, String message) {
        return new ResponseResult(code, message);
    }
}