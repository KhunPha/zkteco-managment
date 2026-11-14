package com.zkteco.attendance.modules.tenant;

import com.zkteco.attendance.common.ApiResponse;
import com.zkteco.attendance.modules.tenant.dto.CompanyDto;
import com.zkteco.attendance.modules.tenant.dto.CreateCompanyRequest;
import com.zkteco.attendance.modules.tenant.dto.UpdateCompanyRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/companies")
@RequiredArgsConstructor
@Tag(name = "Company / Tenant Management", description = "Multi-tenant company and client organization management")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get all registered companies / client tenants (Platform Super Admin only)")
    public ResponseEntity<ApiResponse<List<CompanyDto>>> getAllCompanies() {
        return ResponseEntity.ok(ApiResponse.ok(companyService.getAllCompanies()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get company by ID (Platform Super Admin only)")
    public ResponseEntity<ApiResponse<CompanyDto>> getCompanyById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.getCompanyById(id)));
    }

    @GetMapping("/current")
    @Operation(summary = "Get current tenant company details")
    public ResponseEntity<ApiResponse<CompanyDto>> getCurrentCompany() {
        return ResponseEntity.ok(ApiResponse.ok(companyService.getCurrentCompany()));
    }

    @PutMapping("/current")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('HR_MANAGER')")
    @Operation(summary = "Update current tenant company profile and logo")
    public ResponseEntity<ApiResponse<CompanyDto>> updateCurrentCompany(
            @Valid @RequestBody UpdateCompanyRequest request) {
        CompanyDto updated = companyService.updateCurrentCompany(request);
        return ResponseEntity.ok(ApiResponse.ok("Company profile updated successfully", updated));
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Get company details by company code (slug)")
    public ResponseEntity<ApiResponse<CompanyDto>> getCompanyByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.getCompanyByCode(code)));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Register new client company / tenant")
    public ResponseEntity<ApiResponse<CompanyDto>> createCompany(@Valid @RequestBody CreateCompanyRequest request) {
        CompanyDto created = companyService.createCompany(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Company created successfully", created));
    }

    @PostMapping("/{companyCode}/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Create or provision an administrator account for a company")
    public ResponseEntity<ApiResponse<com.zkteco.attendance.modules.user.dto.UserDto>> createCompanyAdmin(
            @PathVariable String companyCode,
            @Valid @RequestBody com.zkteco.attendance.modules.tenant.dto.CreateCompanyAdminRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Company Administrator created successfully",
                companyService.createOrResetCompanyAdmin(companyCode, request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update client company details (Platform Super Admin only)")
    public ResponseEntity<ApiResponse<CompanyDto>> updateCompany(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCompanyRequest request) {
        CompanyDto updated = companyService.updateCompany(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Company updated successfully", updated));
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Toggle company active / suspended status")
    public ResponseEntity<ApiResponse<CompanyDto>> toggleCompanyStatus(@PathVariable Long id) {
        CompanyDto updated = companyService.toggleStatus(id);
        return ResponseEntity.ok(ApiResponse.ok("Company status updated to " + updated.getStatus(), updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete company / tenant")
    public ResponseEntity<ApiResponse<Void>> deleteCompany(@PathVariable Long id) {
        companyService.deleteCompany(id);
        return ResponseEntity.ok(ApiResponse.ok("Company deleted successfully", null));
    }
}

