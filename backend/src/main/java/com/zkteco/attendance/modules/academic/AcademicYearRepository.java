package com.zkteco.attendance.modules.academic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcademicYearRepository extends JpaRepository<AcademicYear, Long> {
    List<AcademicYear> findByCompanyCodeAndDeletedAtIsNullOrderByCodeDesc(String companyCode);
    List<AcademicYear> findByDeletedAtIsNullOrderByCodeDesc();
    Optional<AcademicYear> findByCompanyCodeAndCodeAndDeletedAtIsNull(String companyCode, String code);
    Optional<AcademicYear> findByCodeAndDeletedAtIsNull(String code);
    boolean existsByCompanyCodeAndCodeAndDeletedAtIsNull(String companyCode, String code);
    Optional<AcademicYear> findFirstByCompanyCodeAndIsCurrentTrueAndDeletedAtIsNull(String companyCode);
    Optional<AcademicYear> findFirstByIsCurrentTrueAndDeletedAtIsNull();
}

