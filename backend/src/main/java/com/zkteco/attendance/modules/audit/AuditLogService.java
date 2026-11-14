package com.zkteco.attendance.modules.audit;

import com.zkteco.attendance.common.PageResponse;
import com.zkteco.attendance.modules.tenant.TenantContext;
import com.zkteco.attendance.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public PageResponse<AuditLog> getAuditLogs(Pageable pageable) {
        return getAuditLogs(null, null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLog> getAuditLogs(
            String search,
            String action,
            String entityType,
            Instant startDate,
            Instant endDate,
            Pageable pageable) {

        String activeTenant = TenantContext.resolveEffectiveTenant();

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Strict multi-tenant isolation
            if (activeTenant != null && !activeTenant.isBlank() && !"all".equalsIgnoreCase(activeTenant)) {
                predicates.add(cb.equal(cb.lower(root.get("companyCode")), activeTenant.trim().toLowerCase()));
            }

            // 2. Keyword Search
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate usernameMatch = cb.like(cb.lower(root.get("username")), pattern);
                Predicate actionMatch = cb.like(cb.lower(root.get("action")), pattern);
                Predicate entityTypeMatch = cb.like(cb.lower(root.get("entityType")), pattern);
                Predicate entityIdMatch = cb.like(cb.lower(root.get("entityId")), pattern);
                Predicate newValuesMatch = cb.like(cb.lower(root.get("newValues")), pattern);
                Predicate oldValuesMatch = cb.like(cb.lower(root.get("oldValues")), pattern);

                predicates.add(cb.or(usernameMatch, actionMatch, entityTypeMatch, entityIdMatch, newValuesMatch, oldValuesMatch));
            }

            // 3. Action Filter
            if (action != null && !action.isBlank() && !"ALL".equalsIgnoreCase(action)) {
                predicates.add(cb.equal(cb.upper(root.get("action")), action.trim().toUpperCase()));
            }

            // 4. Entity Type Filter
            if (entityType != null && !entityType.isBlank() && !"ALL".equalsIgnoreCase(entityType)) {
                predicates.add(cb.equal(cb.upper(root.get("entityType")), entityType.trim().toUpperCase()));
            }

            // 5. Date Range Filters
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // Always sort by createdAt descending unless explicitly specified
        Pageable sortedPageable = pageable;
        if (pageable.getSort().isUnsorted()) {
            sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        Page<AuditLog> page = auditLogRepository.findAll(spec, sortedPageable);
        return PageResponse.of(page);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAuditSummary() {
        String activeTenant = TenantContext.resolveEffectiveTenant();
        boolean isAll = activeTenant == null || "all".equalsIgnoreCase(activeTenant);

        Specification<AuditLog> spec = (root, query, cb) -> {
            if (isAll) return cb.conjunction();
            return cb.equal(cb.lower(root.get("companyCode")), activeTenant.trim().toLowerCase());
        };

        long total = auditLogRepository.count(spec);

        // Fetch top recent logs to get action distribution
        Page<AuditLog> recent = auditLogRepository.findAll(spec, PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "createdAt")));

        Map<String, Long> categoryCounts = new LinkedHashMap<>();
        for (AuditLog l : recent.getContent()) {
            String cat = categorizeAction(l.getAction());
            categoryCounts.put(cat, categoryCounts.getOrDefault(cat, 0L) + 1);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRecords", total);
        summary.put("recentActionCategories", categoryCounts);
        summary.put("activeTenant", activeTenant);
        summary.put("lastActivityAt", recent.hasContent() ? recent.getContent().get(0).getCreatedAt() : null);

        return summary;
    }

    private String categorizeAction(String action) {
        if (action == null) return "GENERAL";
        String a = action.toUpperCase();
        if (a.contains("LOGIN") || a.contains("LOGOUT") || a.contains("AUTH")) return "AUTHENTICATION";
        if (a.contains("EMPLOYEE") || a.contains("TEACHER") || a.contains("STUDENT") || a.contains("PERSONNEL")) return "PERSONNEL";
        if (a.contains("DEVICE") || a.contains("BIOMETRIC") || a.contains("CARD") || a.contains("REBOOT") || a.contains("SYNC")) return "HARDWARE";
        if (a.contains("BACKUP") || a.contains("RESTORE")) return "BACKUP";
        if (a.contains("ATTENDANCE") || a.contains("CORRECTION") || a.contains("PUNCH")) return "ATTENDANCE";
        if (a.contains("USER") || a.contains("ROLE") || a.contains("PERMISSION")) return "SECURITY";
        return "OPERATIONS";
    }

    /**
     * Convenient record method that automatically resolves caller context (user, tenant, IP, user-agent).
     */
    @Transactional
    public void record(String action, String entityType, String entityId, String details) {
        record(action, entityType, entityId, null, details);
    }

    @Transactional
    public void record(String action, String entityType, String entityId, String oldValues, String newValues) {
        UserPrincipal user = getCurrentUser();
        Long userId = user != null ? user.getId() : null;
        String username = user != null ? user.getUsername() : "System Worker";
        String companyCode = user != null && user.getCompanyCode() != null ? user.getCompanyCode() : TenantContext.getCompanyCode();

        record(userId, username, companyCode, action, entityType, entityId, oldValues, newValues);
    }

    /**
     * Backward-compatible record method.
     */
    @Transactional
    public void record(Long userId, String username, String action, String entityType, String entityId, String details) {
        String companyCode = TenantContext.getCompanyCode();
        record(userId, username, companyCode, action, entityType, entityId, null, details);
    }

    @Transactional
    public void record(
            Long userId,
            String username,
            String companyCode,
            String action,
            String entityType,
            String entityId,
            String oldValues,
            String newValues) {

        try {
            String ip = getClientIp();
            String ua = getUserAgent();

            String effectiveCompany = (companyCode != null && !companyCode.isBlank()) 
                    ? companyCode.trim().toLowerCase() 
                    : TenantContext.getCompanyCode();

            AuditLog entry = AuditLog.builder()
                    .userId(userId)
                    .username(username != null ? username : "System")
                    .companyCode(effectiveCompany)
                    .action(action != null ? action.toUpperCase() : "UNKNOWN")
                    .entityType(entityType != null ? entityType.toUpperCase() : "SYSTEM")
                    .entityId(entityId)
                    .oldValues(oldValues)
                    .newValues(newValues)
                    .ipAddress(ip)
                    .userAgent(ua)
                    .createdAt(Instant.now())
                    .build();

            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Failed to record audit trail for action {}: {}", action, ex.getMessage());
        }
    }

    private UserPrincipal getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                return up;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String getClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String xff = request.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) {
                    return xff.split(",")[0].trim();
                }
                return request.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return "127.0.0.1";
    }

    private String getUserAgent() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String ua = request.getHeader("User-Agent");
                if (ua != null) {
                    return ua.length() > 255 ? ua.substring(0, 255) : ua;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }
}
