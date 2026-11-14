package com.zkteco.attendance.security;

import com.zkteco.attendance.modules.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@Order(1)
public class TenantFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        try {
            String companyCode = request.getHeader("X-Company-Code");
            if (companyCode == null || companyCode.isBlank()) {
                companyCode = request.getParameter("companyCode");
            }

            if (companyCode != null && !companyCode.isBlank()) {
                TenantContext.setTenantId(companyCode.trim().toLowerCase());
            } else {
                TenantContext.setTenantId("default");
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}

