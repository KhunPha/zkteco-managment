package com.zkteco.attendance.modules.tenant;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.zkteco.attendance.security.UserPrincipal;

public class TenantContext {
    private static final String DEFAULT_TENANT = "default";
    private static final ThreadLocal<String> CURRENT_TENANT = ThreadLocal.withInitial(() -> DEFAULT_TENANT);

    public static void setTenantId(String tenantId) {
        CURRENT_TENANT.set(tenantId != null && !tenantId.isBlank() ? tenantId.trim().toLowerCase() : DEFAULT_TENANT);
    }

    public static String getTenantId() {
        String tenant = CURRENT_TENANT.get();
        return tenant != null && !tenant.isBlank() ? tenant : DEFAULT_TENANT;
    }

    public static String getCompanyCode() {
        return getTenantId();
    }

    public static boolean isSuperAdmin() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                return up.getAuthorities().stream().anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
            }
        } catch (Exception ignored) {}
        return false;
    }

    /**
     * Resolves the effective tenant for database queries:
     * - If SUPER_ADMIN: can query "all", or a specific tenant set in TenantContext.
     * - If NOT SUPER_ADMIN: strictly locked to user's companyCode. Never returns "all".
     */
    public static String resolveEffectiveTenant() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                boolean superAdmin = up.getAuthorities().stream().anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
                if (superAdmin) {
                    String tenant = getTenantId();
                    if (tenant == null || tenant.isBlank() || "all".equalsIgnoreCase(tenant)) {
                        return "all";
                    }
                    return tenant.trim().toLowerCase();
                }
                // Non-super-admin: strictly enforce companyCode from authenticated principal
                String userCompany = up.getCompanyCode();
                if (userCompany != null && !userCompany.isBlank() && !"all".equalsIgnoreCase(userCompany)) {
                    return userCompany.trim().toLowerCase();
                }
                return DEFAULT_TENANT;
            }
        } catch (Exception ignored) {}

        String tenant = getTenantId();
        return tenant != null && !tenant.isBlank() ? tenant.trim().toLowerCase() : DEFAULT_TENANT;
    }

    public static void clear() {
        CURRENT_TENANT.set(DEFAULT_TENANT);
    }
}
