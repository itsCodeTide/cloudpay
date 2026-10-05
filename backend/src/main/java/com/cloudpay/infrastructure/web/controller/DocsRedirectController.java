package com.cloudpay.infrastructure.web.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.io.IOException;

@RestController
public class DocsRedirectController {
    @GetMapping("/api/v1/docs")
    public void forwardDocs(HttpServletResponse response) throws IOException {
        response.sendRedirect("/v3/api-docs");
    }
}
