package com.devkit.web;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(1)
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (response instanceof HttpServletResponse http) {
            http.setHeader("X-Content-Type-Options", "nosniff");
            http.setHeader("X-Frame-Options", "DENY");
            http.setHeader("Referrer-Policy", "no-referrer");
            http.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
            http.setHeader("Content-Security-Policy",
                    "default-src 'self'; base-uri 'self'; worker-src 'self' blob:; "
                            + "script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; "
                            + "img-src 'self' data: blob:; connect-src 'self' data: blob:");
        }
        chain.doFilter(request, response);
    }
}
