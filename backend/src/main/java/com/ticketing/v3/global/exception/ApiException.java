package com.ticketing.v3.global.exception;
public class ApiException extends RuntimeException {
 public final int status; public final String code;
 public ApiException(int status,String code,String message){super(message);this.status=status;this.code=code;}
 public static ApiException bad(String message){return new ApiException(400,"INVALID_REQUEST",message);}
 public static ApiException missing(){return new ApiException(404,"NOT_FOUND","Resource not found");}
 public static ApiException forbidden(){return new ApiException(403,"FORBIDDEN","Access denied");}
 public static ApiException conflict(String code){return new ApiException(409,code,"Operation conflicts with current state");}
}
